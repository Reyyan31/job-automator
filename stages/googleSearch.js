const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { detectATS } = require('./atsDetector'); // We'll keep using our detector logic

chromium.use(stealth);

const runGoogleSearch = async (keywords, limit = 20) => {
  console.log('--- Stage 1 & 2: Free Google Stealth Search ---');

  const browser = await chromium.launch({ headless: false }); // Visible so you can see it working
  const context = await browser.newContext();
  const page = await context.newPage();

  const allJobs = [];

  // We'll pick the top 3 keywords to keep it fast and avoid CAPTCHAs
  const searchKeywords = keywords.slice(0, 3);

  for (const kw of searchKeywords) {
    const query = `site:boards.greenhouse.io "${kw}" "remote"`;
    console.log(`\n[GOOGLE] Searching Greenhouse for: ${kw}`);

    try {
      await page.goto('https://www.google.com', { waitUntil: 'networkidle' });

      // Type like a human
      const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
      await searchBox.click();
      await searchBox.type(query, { delay: 100 });
      await page.keyboard.press('Enter');

      // Wait for results OR CAPTCHA
      console.log('[WAITING] Waiting for results (If you see a CAPTCHA, solve it and then press ENTER in this terminal)...');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const waitForEnter = () => new Promise(resolve => readline.question('\n👉 Press [ENTER] here once the search results appear in the browser...', () => {
        readline.close();
        resolve();
      }));

      // We wait for results or allow manual continuation
      await Promise.race([
        page.waitForSelector('.g', { timeout: 30000 }).catch(() => { }),
        waitForEnter()
      ]);

      console.log('[RESUMING] Scraping links...');

      // Extract links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('greenhouse.io') || href.includes('lever.co'))
          .filter(href => !href.includes('google.com')); // Remove google search tool links
      });

      console.log(`[GOOGLE] Found ${links.length} potential ATS links for "${kw}"`);

      for (const link of links) {
        // Clean the link (Google often wraps links in /url?q=...)
        let cleanUrl = link;
        if (link.includes('google.com/url?q=')) {
          cleanUrl = new URL(link).searchParams.get('q');
        }

        if (cleanUrl && (cleanUrl.includes('greenhouse.io') || cleanUrl.includes('lever.co'))) {
          allJobs.push({
            company: 'Detected from Google',
            title: `${kw} Role`,
            url: cleanUrl,
            ats: cleanUrl.includes('greenhouse.io') ? 'greenhouse' : 'lever'
          });
        }
      }

      // Small delay between keywords
      await page.waitForTimeout(3000);

    } catch (e) {
      console.error(`[GOOGLE] Error searching for ${kw}:`, e.message);
    }
  }

  await browser.close();

  // Deduplicate
  const uniqueJobs = Array.from(new Map(allJobs.map(j => [j.url, j])).values());
  console.log(`\nFound ${uniqueJobs.length} unique application links!\n`);

  return uniqueJobs;
};

module.exports = { runGoogleSearch };
