const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const { applyToJob } = require('../services/applyService');

const MAX_CONCURRENCY = 5;

// Process a batch of jobs with concurrency limit
const processWithConcurrency = async (jobs, concurrency) => {
  const results = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        try {
          const result = await applyToJob(job._id);
          return { jobId: job._id, ...result };
        } catch (error) {
          console.error(`Apply failed for job ${job._id}:`, error.message);
          return { jobId: job._id, status: 'failed', error: error.message };
        }
      })
    );
    results.push(...batchResults);
  }
  return results;
};

// POST bulk apply
router.post('/bulk', async (req, res) => {
  try {
    const jobs = await Job.find({
      applied: false,
      ats: { $in: ['greenhouse', 'lever'] },
      matchScore: { $gte: 5 }
    });

    if (jobs.length === 0) {
      return res.json({ message: 'No eligible jobs found', results: [] });
    }

    // Respond immediately, process in background
    res.json({ message: `Processing ${jobs.length} jobs in background` });

    processWithConcurrency(jobs, MAX_CONCURRENCY).catch((err) =>
      console.error('Bulk apply background error:', err.message)
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST single job apply
router.post('/:jobId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const result = await applyToJob(job._id);
    res.json({ message: 'Application processed', ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET apply status from MongoDB
router.get('/status', async (req, res) => {
  try {
    const [total, applied, failed, pending] = await Promise.all([
      Job.countDocuments({ ats: { $in: ['greenhouse', 'lever'] } }),
      Job.countDocuments({ applied: true }),
      Application.countDocuments({ status: 'failed' }),
      Job.countDocuments({ applied: false, ats: { $in: ['greenhouse', 'lever'] } }),
    ]);

    res.json({ total, applied, failed, pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
