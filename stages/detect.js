const axios = require('axios');

const detectATS = async (companyName) => {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Try Greenhouse
  try {
    const ghRes = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (ghRes.status === 200) {
      return { company: companyName, slug, ats: 'greenhouse' };
    }
  } catch (e) { /* ignore */ }

  // Try Lever
  try {
    const lvRes = await axios.get(`https://api.lever.co/v0/postings/${slug}`);
    if (lvRes.status === 200) {
      return { company: companyName, slug, ats: 'lever' };
    }
  } catch (e) { /* ignore */ }

  return null;
};

const runDetection = async (companies) => {
  console.log('--- Stage 1: Company Detection ---');
  const detected = [];
  for (const company of companies) {
    const result = await detectATS(company);
    if (result) {
      console.log(`[FOUND] ${company} uses ${result.ats}`);
      detected.push(result);
    } else {
      console.log(`[SKIP] ${company} - ATS not found`);
    }
  }
  return detected;
};

module.exports = { runDetection };
