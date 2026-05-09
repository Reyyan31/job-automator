const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Application = require('../models/Application');
const Job = require('../models/Job');
const UserProfile = require('../models/UserProfile');
const { detectATS, findAtsInDescription } = require('./atsDetector');
const { fetchFormSchema } = require('./formFetcher');
const { generateAnswers } = require('./geminiService');

const applyToJob = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');

  // Just-in-time resolution if unknown
  if (job.ats === 'unknown') {
    // Specialized bypass for known non-ATS platforms
    const nonAtsDomains = ['proxify', 'meta', 'apple', 'google', 'amazon', 'netflix'];
    if (nonAtsDomains.some(d => job.url.toLowerCase().includes(d)) || 
        nonAtsDomains.some(d => job.company.toLowerCase().includes(d))) {
      return { status: 'failed', reason: 'This company uses a custom application portal that does not support Auto-Apply.' };
    }

    console.log(`[Browser Resolve] Attempting stealth resolution for: ${job.title}`);
    try {
      const { resolveAtsWithBrowser } = require('./browserService');
      const browserResult = await resolveAtsWithBrowser(job.url);
      
      if (browserResult.ats !== 'unknown') {
        job.ats = browserResult.ats;
        job.jobId = browserResult.jobId;
        job.boardToken = browserResult.boardToken || browserResult.company;
        job.url = browserResult.url;
        await job.save();
        console.log(`[Browser Resolve] Success! Detected ${job.ats} for ${job.title}`);
      } else {
        return { status: 'failed', reason: 'Could not detect a compatible ATS (Greenhouse/Lever) even with browser simulation.' };
      }
    } catch (e) {
      console.error('Browser detection error:', e.message);
      return { status: 'failed', reason: 'Detection failed due to advanced bot protection.' };
    }
  }

  const profile = await UserProfile.findOne().sort({ _id: -1 });
  if (!profile || !profile.cvText) {
    throw new Error('User profile or CV is missing');
  }

  try {
    const formSchema = await fetchFormSchema(job.ats, job.boardToken, job.jobId, job.boardToken); // using boardToken as company for lever if needed

    if (formSchema.dynamicCount > 3) {
      await logApplication(job._id, 'review', 'Too many dynamic fields', [], {});
      return { status: 'review', reason: 'Too many dynamic fields' };
    }

    const { answers, missingFields } = await generateAnswers(profile, job, formSchema.questions);

    if (missingFields.length > 0) {
      await logApplication(job._id, 'review', 'Gemini returned null for some fields', missingFields, answers);
      return { status: 'review', reason: 'Missing fields', missingFields };
    }

    let response;
    if (job.ats === 'greenhouse') {
      response = await submitGreenhouse(job, profile, answers);
    } else if (job.ats === 'lever') {
      response = await submitLever(job, profile, answers);
    }

    if (response.status >= 200 && response.status < 300) {
      job.applied = true;
      await job.save();
      await logApplication(job._id, 'applied', null, [], answers);
      return { status: 'applied' };
    } else {
      throw new Error(`Invalid response status: ${response.status}`);
    }

  } catch (error) {
    console.error(`Apply failed for job ${jobId}:`, error.message);
    await logApplication(job._id, 'failed', error.message, [], {});
    throw error;
  }
};

const submitGreenhouse = async (job, profile, answers) => {
  const form = new FormData();
  form.append('first_name', getFirstName(profile.fullName));
  form.append('last_name', getLastName(profile.fullName));
  form.append('email', profile.email);
  form.append('phone', profile.phone);
  
  if (profile.cvFilePath && fs.existsSync(profile.cvFilePath)) {
    form.append('resume', fs.createReadStream(profile.cvFilePath));
  }
  
  if (profile.linkedinUrl) form.append('linkedin_profile_url', profile.linkedinUrl);
  if (profile.portfolioUrl) form.append('website', profile.portfolioUrl);

  // Append Gemini answers
  for (const [key, value] of Object.entries(answers)) {
    if (value !== null && value !== undefined) {
      form.append(key, value);
    }
  }

  const url = `https://boards-api.greenhouse.io/v1/boards/${job.boardToken}/jobs/${job.jobId}/applications`;
  return await axios.post(url, form, {
    headers: {
      ...form.getHeaders()
    }
  });
};

const submitLever = async (job, profile, answers) => {
  const form = new FormData();
  form.append('name', profile.fullName);
  form.append('email', profile.email);
  form.append('phone', profile.phone);
  
  if (profile.cvFilePath && fs.existsSync(profile.cvFilePath)) {
    form.append('resume', fs.createReadStream(profile.cvFilePath));
  }

  // Append Gemini answers (Lever custom questions)
  for (const [key, value] of Object.entries(answers)) {
    if (value !== null && value !== undefined) {
      form.append(key, value);
    }
  }

  const url = `https://api.lever.co/v0/postings/${job.boardToken}/${job.jobId}/apply`;
  return await axios.post(url, form, {
    headers: {
      ...form.getHeaders()
    }
  });
};

const getFirstName = (fullName) => fullName ? fullName.split(' ')[0] : '';
const getLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
};

const logApplication = async (jobId, status, errorMessage, missingFields, geminiAnswers) => {
  const application = new Application({
    job: jobId,
    status,
    errorMessage,
    missingFields,
    geminiAnswers
  });
  await application.save();
};

module.exports = {
  applyToJob
};
