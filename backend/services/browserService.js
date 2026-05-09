const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { detectATS } = require('./atsDetector');

chromium.use(stealth);

/**
 * Resolves the final URL of a job posting by navigating to it in a stealth browser.
 * This bypasses Cloudflare and other bot protections.
 */
const resolveAtsWithBrowser = async (url) => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    
    console.log(`[Browser] Navigating to: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e) {
      console.warn(`[Browser] Initial load timed out, attempting partial scan...`);
    }
    
    const hunterScan = async (p) => {
      // 1. Deep Link Extraction (The most reliable way)
      const allLinks = await p.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
      const greenhouseLink = allLinks.find(l => l.includes('greenhouse.io') || l.includes('job-boards.greenhouse.io'));
      const leverLink = allLinks.find(l => l.includes('jobs.lever.co'));
      
      if (greenhouseLink) return { ...detectATS(greenhouseLink), url: greenhouseLink };
      if (leverLink) return { ...detectATS(leverLink), url: leverLink };

      // 2. Look for patterns in page content (if hidden in JS/scripts)
      const content = await p.content();
      const ghMatch = content.match(/https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/[^"' \n>]+/i);
      const lvMatch = content.match(/https?:\/\/jobs\.lever\.co\/[^"' \n>]+/i);
      
      if (ghMatch) return { ...detectATS(ghMatch[0]), url: ghMatch[0] };
      if (lvMatch) return { ...detectATS(lvMatch[0]), url: lvMatch[0] };

      return null;
    };

    // First scan
    let result = await hunterScan(page);
    if (result) return result;

    // 3. Recursive Clicking (Up to 3 steps)
    const applySelectors = ['text="Apply"', 'text="Apply Now"', 'a:has-text("Apply")', 'button:has-text("Apply")', '.apply-button', '#apply-button'];
    
    for (let i = 0; i < 3; i++) {
      console.log(`[Browser] Hunter Step ${i + 1}: Clicking and scanning...`);
      for (const sel of applySelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible()) {
            const [newPage] = await Promise.all([
              context.waitForEvent('page', { timeout: 4000 }).catch(() => null),
              btn.click({ force: true })
            ]);

            const activePage = newPage || page;
            await activePage.waitForTimeout(2000);
            
            result = await hunterScan(activePage);
            if (result) {
              if (newPage) await newPage.close();
              return result;
            }
          }
        } catch (e) { /* continue */ }
      }
      
      // If we are still on a known aggregator, we keep going
      if (!page.url().includes('workingnomads') && !page.url().includes('jobicy') && !page.url().includes('remotive')) {
        break;
      }
    }

    const finalUrl = page.url();
    return { ...detectATS(finalUrl), url: finalUrl };
  } catch (error) {
    console.error(`[Browser] Resolution failed for ${url}:`, error.message);
    return { ats: 'unknown', url };
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Future: Implement form filling with Playwright
 */
const applyWithBrowser = async (job, profile, answers) => {
  // To be implemented: This will navigate to the form and fill it using page.fill()
  console.log(`[Browser] Mock apply for ${job.title} at ${job.company}`);
  return { status: 'success' };
};

module.exports = {
  resolveAtsWithBrowser,
  applyWithBrowser
};
