const fs = require('fs');
const path = require('path');

const runLogging = async (results) => {
  console.log('\n--- Stage 4: Results Logging ---');
  
  const resultsPath = path.join(__dirname, '..', 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log('--------------------------------');
  console.log(`TOTAL JOBS FOUND: ${results.length}`);
  console.log(`SUCCESSFUL APPLICATIONS: ${successCount}`);
  console.log(`FAILED APPLICATIONS: ${failCount}`);
  console.log('--------------------------------');
  console.log(`Full log saved to: ${resultsPath}\n`);
};

module.exports = { runLogging };
