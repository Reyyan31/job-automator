const { chromium } = require('playwright');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// AI Brain with Vision Support
const analyzeScreen = async (screenshotPath, profile, apiKey) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imageData = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(screenshotPath)).toString("base64"),
        mimeType: "image/png",
      },
    };

    const prompt = `
      Look at this job application screenshot.
      User Profile: ${JSON.stringify(profile)}
      
      Identify all fields that need to be filled.
      For each field, return:
      1. The field name (e.g., "First Name")
      2. The ACTION required (click, type, select)
      3. The VALUE to use from the profile.
      4. The estimated X and Y coordinates (center of the field) as percentages of the image (0-100).
      
      Return ONLY a JSON array: [{"name": "First Name", "action": "type", "value": "Reyyan", "x": 45, "y": 20}]
    `;

    const result = await model.generateContent([prompt, imageData]);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('[VISION] AI Analysis failed:', e.message);
    return [];
  }
};

const visionApplyToJob = async (page, job, profile, config) => {
  console.log(`\n[VISION-AGENT] Analyzing: ${job.title}`);
  
  try {
    await page.goto(job.url, { waitUntil: 'networkidle' });
    
    // Take a screenshot of the form
    const screenshotPath = path.join(__dirname, '..', 'temp_screen.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // AI identifies elements from the image
    const plan = await analyzeScreen(screenshotPath, profile, config.geminiApiKey);
    console.log(`[VISION] AI has planned ${plan.length} actions.`);

    const viewport = page.viewportSize();

    for (const action of plan) {
      const realX = (action.x / 100) * viewport.width;
      const realY = (action.y / 100) * viewport.height;

      console.log(`[ACTING] ${action.name} at (${Math.round(realX)}, ${Math.round(realY)})`);
      
      await page.mouse.move(realX, realY, { steps: 10 }); // Human-like move
      await page.mouse.click(realX, realY);
      
      if (action.action === 'type') {
        await page.keyboard.type(action.value, { delay: 50 });
      }
      
      await page.waitForTimeout(500);
    }

    console.log('[VISION] Initial actions complete. Looking for Submit button...');
    // We can repeat the see-plan-act loop here for submission
    
    return { success: true };
  } catch (e) {
    console.error(`[VISION-FAILED]`, e.message);
    return { success: false };
  }
};

const runVisionApplication = async (jobs, profile, config) => {
  console.log('\n--- Stage 3: Vision-Autonomous Agent ---');
  const userDataDir = path.join(__dirname, '..', 'browser_profile');
  const browser = await chromium.launchPersistentContext(userDataDir, { headless: false });
  const page = browser.pages()[0] || await browser.newPage();

  for (const job of jobs) {
    await visionApplyToJob(page, job, profile, config);
  }
};

module.exports = { runVisionApplication };
