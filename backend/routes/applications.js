const express = require('express');
const router = express.Router();
const Application = require('../models/Application');

// GET all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().populate('job').sort({ appliedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const applied = await Application.countDocuments({ status: 'applied' });
    const failed = await Application.countDocuments({ status: 'failed' });
    const skipped = await Application.countDocuments({ status: 'skipped' });
    const review = await Application.countDocuments({ status: 'review' });

    res.json({ applied, failed, skipped, review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
