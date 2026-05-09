const cron = require('node-cron');
const { fetchAllJobs } = require('../services/jobFetcher');

// Run every 6 hours
const scheduleJobFetch = () => {
  cron.schedule('0 */6 * * *', async () => {
    console.log('Cron triggered: Fetching remote jobs...');
    try {
      await fetchAllJobs();
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });
  console.log('Job fetch cron scheduled (Every 6 hours).');
};

module.exports = scheduleJobFetch;
