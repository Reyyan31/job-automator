require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const scheduleJobFetch = require('./cron/fetchJobs');

// Routes
const jobRoutes = require('./routes/jobs');
const applyRoutes = require('./routes/apply');
const profileRoutes = require('./routes/profile');
const applicationRoutes = require('./routes/applications');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Schedule cron jobs
scheduleJobFetch();

// Mount routes
app.use('/api/jobs', jobRoutes);
app.use('/api/apply', applyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/applications', applicationRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Job Automator API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));