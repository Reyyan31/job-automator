const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { fetchAllJobs } = require('../services/jobFetcher');

// GET all fetched jobs with pagination
router.get('/', async (req, res) => {
  try {
    const { ats, minScore, applied } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    let query = {};
    if (ats) query.ats = ats;
    if (minScore) query.matchScore = { $gte: parseInt(minScore) };
    if (applied !== undefined) query.applied = applied === 'true';

    const jobs = await Job.find(query)
      .sort({ fetchedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalJobs: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST manually trigger job fetch (Asynchronous)
router.post('/fetch', async (req, res) => {
  try {
    // Respond immediately to prevent browser timeout
    res.json({ message: 'Job fetch started in background. Please refresh in a minute.' });

    // Run fetch in background
    fetchAllJobs().catch(error => {
      console.error('Background fetch failed:', error.message);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE all jobs (bulk delete) — must be before /:id
router.delete('/all', async (req, res) => {
  try {
    const result = await Job.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} jobs` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE single job
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
