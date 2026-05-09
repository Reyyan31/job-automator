const axios = require('axios');
const Job = require('../models/Job');
const UserProfile = require('../models/UserProfile');
const { detectATS, findAtsInDescription } = require('./atsDetector');
const { scoreJobMatch } = require('./scorer');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Heuristic: Try to guess the ATS URL based on company name/slug
const heuristicAtsDetect = (companyName, companySlug) => {
  if (!companySlug && !companyName) return null;
  const slug = (companySlug || companyName.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // We can't be 100% sure without visiting, but we can return a "potential" URL
  // This will be validated when the user actually tries to apply
  return {
    potentialGreenhouse: `https://boards.greenhouse.io/${slug}`,
    potentialLever: `https://jobs.lever.co/${slug}`
  };
};

// Super-stealthy resolver to find redirects without being blocked
const resolveFinalUrl = async (url) => {
  if (!url || url.includes('greenhouse.io') || url.includes('lever.co')) return url;
  
  const headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/'
  };

  try {
    // Try HEAD first (fastest)
    const headRes = await axios.head(url, { 
      maxRedirects: 10,
      timeout: 5000,
      headers,
      validateStatus: (status) => status >= 200 && status < 400
    });
    const final = headRes.request.res.responseUrl || url;
    if (final.includes('greenhouse.io') || final.includes('lever.co')) return final;

    // If HEAD didn't work or didn't find ATS, try a stealthy GET but only for the first few KB
    const getRes = await axios.get(url, {
      maxRedirects: 10,
      timeout: 8000,
      headers,
      responseType: 'text', // We only care about the URL/Redirects
      maxContentLength: 50000 // Only download the first 50KB
    });

    return getRes.request.res.responseUrl || url;
  } catch (error) {
    // Last ditch: if it's a himalayas link, sometimes we can extract the target from the URL
    return url;
  }
};

// ── CV-based keyword extraction ──────────────────────────────────
const extractKeywordsFromCV = (cvText) => {
  if (!cvText) return [];
  const techKeywords = [
    'javascript', 'typescript', 'react', 'next.js', 'nextjs', 'node', 'nodejs',
    'express', 'mongodb', 'mongoose', 'python', 'django', 'flask', 'java', 'spring',
    'angular', 'vue', 'svelte', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'graphql', 'rest', 'api', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'git', 'ci/cd', 'jenkins', 'terraform', 'linux', 'sql', 'postgresql', 'mysql',
    'redis', 'firebase', 'supabase', 'prisma', 'sequelize', 'c#', '.net', 'dotnet',
    'php', 'laravel', 'ruby', 'rails', 'go', 'golang', 'rust', 'swift', 'kotlin',
    'flutter', 'react native', 'electron', 'figma', 'ui/ux', 'frontend', 'backend',
    'fullstack', 'full-stack', 'full stack', 'devops', 'machine learning', 'ai',
    'data science', 'data engineering', 'blockchain', 'web3', 'solidity',
    'mern', 'mean', 'microservices', 'serverless', 'agile', 'scrum',
    'software engineer', 'software developer', 'web developer', 'mobile developer'
  ];
  const lower = cvText.toLowerCase();
  return techKeywords.filter(kw => lower.includes(kw));
};

// Match job against CV keywords
const isRelevantJob = (job, cvKeywords) => {
  const text = `${job.title} ${job.category || ''} ${job.description || ''}`.toLowerCase();
  // Must match at least 1 CV keyword in title OR 2 in description
  const titleMatches = cvKeywords.filter(kw => job.title.toLowerCase().includes(kw));
  if (titleMatches.length >= 1) return true;
  const descMatches = cvKeywords.filter(kw => text.includes(kw));
  return descMatches.length >= 2;
};

// Strip HTML tags from descriptions
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
};

// ── API Fetchers ─────────────────────────────────────────────────

const fetchHimalayas = async () => {
  console.log('Fetching from Himalayas...');
  const jobs = [];
  try {
    // Fetch multiple pages
    for (let offset = 0; offset < 300; offset += 100) {
      const res = await axios.get(`https://himalayas.app/jobs/api?limit=100&offset=${offset}`);
      const data = res.data.jobs || [];
      if (data.length === 0) break;
      for (const job of data) {
        jobs.push({
          title: job.title,
          company: job.companyName,
          companySlug: job.companySlug,
          url: job.applicationLink || job.jobUrl,
          source: 'himalayas',
          rawDescription: job.description,
          description: stripHtml(job.description),
          location: job.locationRestrictions ? job.locationRestrictions.join(', ') : 'Remote',
          category: job.categories ? job.categories.join(', ') : '',
          salary: job.minSalary ? `$${job.minSalary} - $${job.maxSalary}` : ''
        });
      }
      await delay(500);
    }
  } catch (error) {
    console.error('Error fetching Himalayas:', error.message);
  }
  return jobs;
};

const fetchRemotive = async () => {
  console.log('Fetching from Remotive...');
  const jobs = [];
  try {
    // Fetch multiple categories
    const categories = ['software-dev', 'devops', 'data', 'frontend-dev', 'all-others'];
    for (const cat of categories) {
      const res = await axios.get(`https://remotive.com/api/remote-jobs?category=${cat}&limit=100`);
      const data = res.data.jobs || [];
      for (const job of data) {
        jobs.push({
          title: job.title,
          company: job.company_name,
          url: job.url,
          source: 'remotive',
          rawDescription: job.description,
          description: stripHtml(job.description),
          location: job.candidate_required_location || 'Remote',
          category: job.category,
          salary: job.salary || ''
        });
      }
      await delay(300);
    }
  } catch (error) {
    console.error('Error fetching Remotive:', error.message);
  }
  return jobs;
};

const fetchRemoteOK = async () => {
  console.log('Fetching from RemoteOK...');
  const jobs = [];
  try {
    const res = await axios.get('https://remoteok.com/api', {
      headers: { 'User-Agent': 'job-automator/1.0' }
    });
    const data = (res.data || []).slice(1);
    for (const job of data) {
      if (!job.position) continue;
      jobs.push({
        title: job.position,
        company: job.company,
        url: job.url,
        source: 'remoteok',
        rawDescription: job.description,
        description: stripHtml(job.description),
        location: job.location || 'Remote',
        category: job.tags ? job.tags.join(', ') : '',
        salary: job.salary_min ? `$${job.salary_min} - $${job.salary_max}` : ''
      });
    }
  } catch (error) {
    console.error('Error fetching RemoteOK:', error.message);
  }
  return jobs;
};

const fetchArbeitnow = async () => {
  console.log('Fetching from Arbeitnow...');
  const jobs = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await axios.get(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      const data = res.data.data || [];
      if (data.length === 0) break;
      for (const job of data) {
        if (!job.remote) continue; // remote only
        jobs.push({
          title: job.title,
          company: job.company_name,
          url: job.url,
          source: 'arbeitnow',
          rawDescription: job.description,
          description: stripHtml(job.description),
          location: job.location || 'Remote',
          category: job.tags ? job.tags.join(', ') : '',
          salary: ''
        });
      }
      await delay(500);
    }
  } catch (error) {
    console.error('Error fetching Arbeitnow:', error.message);
  }
  return jobs;
};

const fetchJobicy = async () => {
  console.log('Fetching from Jobicy...');
  const jobs = [];
  try {
    const res = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev');
    const data = res.data.jobs || [];
    for (const job of data) {
      jobs.push({
        title: job.jobTitle,
        company: job.companyName,
        url: job.url,
        source: 'jobicy',
        rawDescription: job.jobDescription,
        description: stripHtml(job.jobDescription),
        location: job.jobGeo || 'Remote',
        category: job.jobIndustry ? job.jobIndustry.join(', ') : '',
        salary: job.annualSalaryMin ? `$${job.annualSalaryMin} - $${job.annualSalaryMax}` : ''
      });
    }
  } catch (error) {
    console.error('Error fetching Jobicy:', error.message);
  }
  return jobs;
};

const fetchFindWork = async () => {
  console.log('Fetching from FindWork...');
  const jobs = [];
  try {
    const res = await axios.get('https://findwork.dev/api/jobs/', {
      headers: { 'Content-Type': 'application/json' }
    });
    const data = res.data.results || [];
    for (const job of data) {
      if (!job.remote) continue;
      jobs.push({
        title: job.role,
        company: job.company_name,
        url: job.url,
        source: 'findwork',
        description: stripHtml(job.text),
        location: job.location || 'Remote',
        category: job.keywords ? job.keywords.join(', ') : '',
        salary: ''
      });
    }
  } catch (error) {
    console.error('Error fetching FindWork:', error.message);
  }
  return jobs;
};

const fetchWorkingNomads = async () => {
  console.log('Fetching from WorkingNomads...');
  const jobs = [];
  try {
    const res = await axios.get('https://www.workingnomads.com/api/exposed_jobs/');
    const data = res.data || [];
    for (const job of data) {
      jobs.push({
        title: job.title,
        company: job.company_name,
        url: job.url,
        source: 'workingnomads',
        rawDescription: job.description,
        description: stripHtml(job.description),
        location: 'Remote',
        category: job.category_name || '',
        salary: ''
      });
    }
  } catch (error) {
    console.error('Error fetching WorkingNomads:', error.message);
  }
  return jobs;
};

// ── Main fetch orchestrator ──────────────────────────────────────

const fetchAllJobs = async () => {
  console.log('Starting job fetch cycle...');
  
  const profile = await UserProfile.findOne().sort({ _id: -1 });
  const cvText = profile ? profile.cvText : null;
  const cvKeywords = extractKeywordsFromCV(cvText);
  
  if (cvKeywords.length > 0) {
    console.log(`CV keywords detected: ${cvKeywords.join(', ')}`);
  } else {
    console.log('No CV found or no keywords extracted. Fetching all dev jobs.');
  }
  
  const allFetchedJobs = [];
  
  // Fetch from all APIs in parallel where possible
  const fetchers = [
    fetchHimalayas(),
    fetchRemotive(),
    fetchRemoteOK(),
    fetchArbeitnow(),
    fetchJobicy(),
    // fetchFindWork(), // Disabled: Requires API Key (401 error)
    fetchWorkingNomads()
  ];
  
  const results = await Promise.allSettled(fetchers);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allFetchedJobs.push(...result.value);
    }
  }
  
  console.log(`Total fetched from all APIs: ${allFetchedJobs.length}`);
  
  // Filter: CV-based relevance if CV exists, else fallback to broad dev filter
  let filteredJobs;
  if (cvKeywords.length > 0) {
    filteredJobs = allFetchedJobs.filter(job => isRelevantJob(job, cvKeywords));
    console.log(`Filtered to ${filteredJobs.length} CV-relevant jobs.`);
  } else {
    const broadKeywords = [
      'developer', 'engineer', 'software', 'frontend', 'backend', 'fullstack', 'devops', 
      'data', 'analyst', 'manager', 'lead', 'director', 'specialist', 'consultant', 
      'marketing', 'sales', 'product', 'design', 'ux', 'ui', 'creative', 'pr', 'hr',
      'support', 'admin', 'coordinator', 'operations', 'project', 'program'
    ];
    filteredJobs = allFetchedJobs.filter(job => {
      const text = `${job.title} ${job.category || ''}`.toLowerCase();
      return broadKeywords.some(kw => text.includes(kw));
    });
    console.log(`Filtered to ${filteredJobs.length} broad matches (no CV).`);
  }
  
  console.log(`Total jobs found after filtering: ${filteredJobs.length}. Starting URL resolution...`);
  
  let newJobsCount = 0;
  let scoringDisabled = false;
  
  for (const jobData of filteredJobs) {
    try {
      if (!jobData.url) continue;
      
      const existingJob = await Job.findOne({ url: jobData.url });
      if (existingJob) continue;
      
      // 1. Check if the URL is already Greenhouse/Lever
      let finalUrl = jobData.url;
      let atsInfo = detectATS(finalUrl);
      
      // 2. Scan RAW HTML description from API (Plan A)
      if (atsInfo.ats === 'unknown' && jobData.rawDescription) {
        const detectedUrl = findAtsInDescription(jobData.rawDescription);
        if (detectedUrl) {
          finalUrl = detectedUrl;
          atsInfo = detectATS(finalUrl);
        }
      }

      // 3. Stealthy HEAD request fallback (Plan B)
      if (atsInfo.ats === 'unknown') {
        const resolved = await resolveFinalUrl(jobData.url);
        if (resolved !== jobData.url) {
          finalUrl = resolved;
          atsInfo = detectATS(finalUrl);
        }
      }
      
      // Update job data if ATS detected
      if (atsInfo.ats !== 'unknown') {
        jobData.url = finalUrl;
        console.log(`[ATS MATCH] Found ${atsInfo.ats} for: ${jobData.title}`);
      }
      
      let matchScore = null;
      if (cvText && jobData.description && !scoringDisabled) {
        matchScore = await scoreJobMatch(cvText, jobData.description);
        if (matchScore === null) {
          scoringDisabled = true;
          console.warn('Scoring disabled for remaining jobs (quota likely exceeded).');
        }
        await delay(500);
      }
      
      const newJob = new Job({
        ...jobData,
        ats: atsInfo.ats,
        jobId: atsInfo.jobId,
        boardToken: atsInfo.boardToken || atsInfo.company,
        matchScore
      });
      
      await newJob.save();
      newJobsCount++;
    } catch (error) {
      if (error.code !== 11000) {
        console.error(`Error saving job ${jobData.url}:`, error.message);
      }
    }
  }
  
  console.log(`Fetch complete. Added ${newJobsCount} new jobs.`);
  return newJobsCount;
};

module.exports = {
  fetchAllJobs,
  resolveFinalUrl
};
