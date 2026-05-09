const axios = require('axios');
const Parser = require('rss-parser');
const parser = new Parser();

const fetchFromRemotive = async (keywords) => {
  console.log('[REMOTIVE] Fetching jobs...');
  try {
    const res = await axios.get('https://remotive.com/api/remote-jobs', { timeout: 20000 });
    const jobs = res.data.jobs || [];

    const matched = jobs.filter(job =>
      keywords.some(kw => job.title.toLowerCase().includes(kw.toLowerCase()))
    );

    console.log(`[REMOTIVE] Found ${matched.length} keyword matches. Resolving ATS...`);

    // Resolve in small batches to avoid being blocked
    const results = [];
    const batchSize = 10;
    for (let i = 0; i < Math.min(matched.length, 100); i += batchSize) {
      const batch = matched.slice(i, i + batchSize);
      const resolved = await Promise.all(batch.map(async (job) => {
        try {
          const head = await axios.head(job.url, { maxRedirects: 5, timeout: 5000 });
          const finalUrl = head.request.res.responseUrl || job.url;
          if (finalUrl.includes('greenhouse.io') || finalUrl.includes('lever.co')) {
            return {
              company: job.company_name,
              title: job.title,
              url: finalUrl,
              ats: finalUrl.includes('greenhouse.io') ? 'greenhouse' : 'lever'
            };
          }
        } catch (e) { /* skip */ }
        return null;
      }));
      results.push(...resolved.filter(r => r !== null));
      process.stdout.write('.');
    }
    return results;
  } catch (e) {
    console.error('[REMOTIVE] Error:', e.message);
    return [];
  }
};

const fetchFromWWR = async (keywords) => {
  console.log('\n[WWR] Fetching RSS feed...');
  try {
    const feed = await parser.parseURL('https://weworkremotely.com/remote-jobs.rss');
    const matched = feed.items.filter(item =>
      keywords.some(kw => item.title.toLowerCase().includes(kw.toLowerCase()))
    );

    console.log(`[WWR] Found ${matched.length} keyword matches. Resolving ATS...`);

    const results = [];
    const batchSize = 10;
    for (let i = 0; i < Math.min(matched.length, 50); i += batchSize) {
      const batch = matched.slice(i, i + batchSize);
      const resolved = await Promise.all(batch.map(async (item) => {
        try {
          const head = await axios.head(item.link, { maxRedirects: 5, timeout: 5000 });
          const finalUrl = head.request.res.responseUrl || item.link;
          if (finalUrl.includes('greenhouse.io') || finalUrl.includes('lever.co')) {
            return {
              company: item.author || 'Unknown',
              title: item.title,
              url: finalUrl,
              ats: finalUrl.includes('greenhouse.io') ? 'greenhouse' : 'lever'
            };
          }
        } catch (e) { /* skip */ }
        return null;
      }));
      results.push(...resolved.filter(r => r !== null));
      process.stdout.write('.');
    }
    return results;
  } catch (e) {
    console.error('[WWR] Error:', e.message);
    return [];
  }
};

const runGlobalFetching = async (keywords) => {
  console.log('--- Stage 1 & 2: Global Remote Hunter ---');
  console.log(`Keywords: ${keywords.slice(0, 5).join(', ')}...`);

  const [remotiveJobs, wwrJobs] = await Promise.all([
    fetchFromRemotive(keywords),
    fetchFromWWR(keywords)
  ]);

  const allJobs = [...remotiveJobs, ...wwrJobs];

  // Deduplicate by URL
  const uniqueJobs = Array.from(new Map(allJobs.map(j => [j.url, j])).values());

  console.log(`\nFound ${uniqueJobs.length} matching Greenhouse/Lever jobs globally!`);
  return uniqueJobs;
};

module.exports = { runGlobalFetching };
