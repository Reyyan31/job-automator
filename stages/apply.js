const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const Groq = require("groq-sdk");

// Tier 3: Local Cache
const cachePath = path.join(__dirname, '..', 'ai_cache.json');
let aiCache = {};
if (fs.existsSync(cachePath)) {
  aiCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
}

const saveCache = () => fs.writeFileSync(cachePath, JSON.stringify(aiCache, null, 2));

const solveQuestionWithGroq = async (question, options, profile, apiKey) => {
  const cacheKey = `${question}-${options.join(',')}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];
  if (!apiKey) return { index: 0, text: 'See resume for details.' };

  try {
    const groq = new Groq({ apiKey });
    const prompt = `User: ${profile.firstName}. Profile: ${JSON.stringify(profile)}. Question: "${question}". Options: [${options.join(', ')}]. Return ONLY a raw JSON object like this, with no markdown formatting: {"index": 0, "text": "short professional answer"}`;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0,
    });

    let rawOutput = chatCompletion.choices[0]?.message?.content || "";
    rawOutput = rawOutput.replace(/```json|```/g, '').trim();
    
    // Attempt to parse the JSON
    let res;
    try {
        res = JSON.parse(rawOutput);
    } catch(e) {
        // Fallback parsing if Llama returns weird text
        const indexMatch = rawOutput.match(/"index":\s*(\d+)/);
        const textMatch = rawOutput.match(/"text":\s*"([^"]+)"/);
        res = {
            index: indexMatch ? parseInt(indexMatch[1]) : 0,
            text: textMatch ? textMatch[1] : "Expert professional."
        };
    }
    
    aiCache[cacheKey] = res;
    saveCache();
    return res;
  } catch (e) { 
      console.log(`[GROQ ERROR] ${e.message}`);
      return { index: 0, text: "Expert." }; 
  }
};

const applyToJob = async (page, job, profile, config) => {
  console.log(`\n[GROQ-AGENT] Starting: ${job.title}`);
  
  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // 1. BRUTE FORCE RESUME UPLOAD
    try {
      const resumeInput = await page.$('input[type="file"]');
      if (resumeInput) {
        console.log('[FILE] Forcing CV Upload...');
        await resumeInput.setInputFiles(profile.resumePath);
        // Dispatch change event to trigger Greenhouse's internal parsers
        await resumeInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
        await page.waitForTimeout(3000);
      }
    } catch (err) { console.warn('[FILE] Resume warning:', err.message); }

    // Let the page settle so validation messages appear
    await page.waitForTimeout(2000);

    // 2. INPUT-FIRST BRUTE FORCE FILLING
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      console.log(`[ATTEMPT ${attempts}] Scanning all inputs on the page...`);
      
      // A. Text Fields & Textareas
      const textInputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"], textarea');
      for (const input of textInputs) {
        try {
          const val = await input.inputValue();
          if (val && val.length > 1) continue; // Skip filled

          // Find label text
          let labelText = await input.evaluate(el => {
            const id = el.id;
            let lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
            if (!lbl) {
               const wrapper = el.closest('div, li, p');
               if (wrapper) lbl = wrapper.querySelector('label, span, div');
            }
            return lbl ? lbl.innerText : el.name || el.placeholder || '';
          });
          
          if (!labelText) continue;
          const l = labelText.toLowerCase();

          if (l.includes('first name')) await input.fill(profile.firstName, { force: true });
          else if (l.includes('last name')) await input.fill(profile.lastName, { force: true });
          else if (l.includes('full name') || l.includes('name')) await input.fill(`${profile.firstName} ${profile.lastName}`, { force: true });
          else if (l.includes('email')) await input.fill(profile.email, { force: true });
          else if (l.includes('phone')) await input.fill(profile.phone, { force: true });
          else if (l.includes('linkedin')) await input.fill(profile.linkedin, { force: true });
          else if (l.includes('github')) await input.fill(profile.github || '', { force: true });
          else if (l.includes('portfolio') || l.includes('website')) await input.fill(profile.portfolio || profile.linkedin, { force: true });
          else {
            console.log(`[AI] Solving Text Question: ${labelText.substring(0, 30)}...`);
            const decision = await solveQuestionWithGroq(labelText, [], profile, config.groqApiKey);
            await input.fill(decision.text, { force: true });
          }
        } catch (e) { /* ignore single input failure */ }
      }

      // B. Dropdowns (Selects)
      const selects = await page.$$('select');
      for (const select of selects) {
         try {
            const val = await select.inputValue();
            if (val && val !== '') continue; // Skip filled
            
            let labelText = await select.evaluate(el => {
               const id = el.id;
               let lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
               if (!lbl) {
                  const wrapper = el.closest('div, li, p');
                  if (wrapper) lbl = wrapper.querySelector('label, h3');
               }
               return lbl ? lbl.innerText : el.name || '';
            });

            const options = await select.$$eval('option', opts => opts.map((o) => ({ text: o.innerText, value: o.value })).filter(o => o.text.trim() && !o.text.includes('Select') && !o.text.includes('Choose')));
            if (options.length > 0) {
               console.log(`[AI] Solving Dropdown: ${labelText.substring(0, 30)}...`);
               const decision = await solveQuestionWithGroq(labelText, options.map(o => o.text), profile, config.groqApiKey);
               const bestOption = options[decision.index] || options[0];
               await select.selectOption(bestOption.value, { force: true });
            }
         } catch (e) {}
      }

      // C. Radio / Checkbox Groups
      // We look for wrappers that likely contain radios
      const radioGroups = await page.$$('.application-question, .field, .checkbox, .radio');
      for (const group of radioGroups) {
         try {
            const radios = await group.$$('input[type="radio"], input[type="checkbox"]');
            if (radios.length === 0) continue;
            
            const isChecked = await group.$('input:checked');
            if (isChecked) continue; // Already answered

            const questionText = await group.evaluate(el => {
               const lbl = el.querySelector('label, h3');
               return lbl ? lbl.innerText : '';
            });

            const radioLabels = await group.$$('label');
            if (radioLabels.length > 0) {
               console.log(`[AI] Solving Multiple Choice: ${questionText.substring(0, 30)}...`);
               const decision = await solveQuestionWithGroq(questionText, await Promise.all(radioLabels.map(rl => rl.innerText())), profile, config.groqApiKey);
               await radioLabels[Math.min(decision.index, radioLabels.length - 1)].click({ force: true });
            }
         } catch(e) {}
      }

      // 3. SUBMIT & VERIFY
      const submitBtn = await page.$('#submit_app, #apply_button, button[type="submit"]');
      if (submitBtn) {
        console.log('[SUBMITTING] Clicking submit...');
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click({ force: true });
        await page.waitForTimeout(4000);
        
        const success = await page.evaluate(() => {
          const t = document.body.innerText.toLowerCase();
          return t.includes('thank you') || t.includes('submitted') || t.includes('received') || window.location.href.includes('confirmation');
        });

        if (success) {
          console.log('✅ SUCCESS!');
          return { success: true };
        } else {
           const hasErrors = await page.$('.error, .required-error, .field-error-message, [aria-invalid="true"]');
           if (hasErrors) {
              console.log('⚠️ Form errors detected. Looping back to fix...');
              continue;
           } else {
              // If no clear success and no clear errors, break the loop to avoid infinite stuck state
              break;
           }
        }
      } else {
         break; // No submit button found
      }
    }
    
    console.log('❌ FAILED: Maximum attempts reached. Skipping to next job.');
    return { success: false };

  } catch (e) {
    console.error(`[CRITICAL ERROR]`, e.message);
    return { success: false };
  }
};

const runApplication = async (jobs, profile, config) => {
  console.log('\n--- Stage 3: Groq Unlimited Agent ---');
  const userDataDir = path.join(__dirname, '..', 'browser_profile');
  const browser = await chromium.launchPersistentContext(userDataDir, { headless: config.headless });
  const page = browser.pages()[0] || await browser.newPage();
  for (const job of jobs) { await applyToJob(page, job, profile, config); }
  return [];
};

module.exports = { runApplication };
