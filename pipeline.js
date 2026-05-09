const fs = require('fs');
const path = require('path');
const { runGoogleSearch } = require('./stages/googleSearch');
const { runApplication } = require('./stages/apply');
const { runLogging } = require('./stages/log');

async function main() {
  console.log('🚀 Starting Job Automator Pipeline [GREENHOUSE SPECIALIST]...\n');

  try {
    // Load Configs
    const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'profile.json')));
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

    // Stage 1 & 2: Google Search
    const jobs = await runGoogleSearch(config.keywords);

    if (jobs.length === 0) {
      console.log('No direct ATS links found on Google. Try different keywords.');
      return;
    }

    // Stage 3: Apply
    const results = await runApplication(jobs, profile, config);

    // Stage 4: Log Results
    await runLogging(results);

    console.log('✅ All done!');

  } catch (error) {
    console.error('Fatal Error in Pipeline:', error.message);
  }
}

main();
