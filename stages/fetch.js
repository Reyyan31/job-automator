const axios = require('axios');

const fetchJobs = async (companyInfo, keywords) => {
  const { slug, ats, company } = companyInfo;
  const filteredJobs = [];

  try {
    if (ats === 'greenhouse') {
      const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, { timeout: 10000 });
      const jobs = res.data.jobs || [];
      for (const job of jobs) {
        if (keywords.some(kw => job.title.toLowerCase().includes(kw.toLowerCase()))) {
          filteredJobs.push({
            company,
            title: job.title,
            url: job.absolute_url,
            ats: 'greenhouse'
          });
        }
      }
    } else if (ats === 'lever') {
      const res = await axios.get(`https://api.lever.co/v0/postings/${slug}`, { timeout: 10000 });
      const postings = res.data || [];
      for (const post of postings) {
        if (keywords.some(kw => post.text.toLowerCase().includes(kw.toLowerCase()))) {
          filteredJobs.push({
            company,
            title: post.text,
            url: post.applyUrl,
            ats: 'lever'
          });
        }
      }
    }
  } catch (e) {
    console.error(`Error fetching for ${company}:`, e.message);
  }

  return filteredJobs;
};

const runFetching = async (detectedCompanies, keywords) => {
  console.log('\n--- Stage 2: Job Fetching & Filtering ---');
  console.log(`Searching for keywords: ${keywords.join(', ')}`);
  
  let allJobs = [];
  for (const info of detectedCompanies) {
    try {
      const jobs = await fetchJobs(info, keywords);
      console.log(`[FETCHING] ${info.company}: found ${jobs.length} matching jobs`);
      allJobs = allJobs.concat(jobs);
    } catch (e) {
      console.log(`[ERROR] ${info.company}: ${e.message}`);
    }
  }
  
  console.log(`\nTotal matching jobs found across all companies: ${allJobs.length}`);
  return allJobs;
};

module.exports = { runFetching };
