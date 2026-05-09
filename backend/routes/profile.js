const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const UserProfile = require('../models/UserProfile');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// GET profile
router.get('/', async (req, res) => {
  try {
    const profile = await UserProfile.findOne().sort({ _id: -1 });
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST update profile
router.post('/', async (req, res) => {
  try {
    let profile = await UserProfile.findOne().sort({ _id: -1 });
    if (profile) {
      Object.assign(profile, req.body);
      await profile.save();
    } else {
      profile = new UserProfile(req.body);
      await profile.save();
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload CV
router.post('/upload-cv', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const cvFilePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let cvText = '';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(cvFilePath);
      const parser = new PDFParse({ data: new Uint8Array(dataBuffer), verbosity: 0 });
      const pdfData = await parser.getText();
      cvText = pdfData.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: cvFilePath });
      cvText = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' });
    }

    // Extract profile info from CV using Gemini
    let extracted = {};
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Extract the following fields from this CV/resume text. Return ONLY a valid JSON object with these exact keys. If a field cannot be found, return an empty string for that field. Do not fabricate information.

Keys: fullName, email, phone, linkedinUrl, githubUrl, portfolioUrl, location

CV Text:
${cvText}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      let jsonStr = text;
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/```\n?$/, '');
      }
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Gemini profile extraction failed:', e.message);
    }

    let profile = await UserProfile.findOne().sort({ _id: -1 });
    if (profile) {
      profile.cvFilePath = cvFilePath;
      profile.cvText = cvText;
      // Only fill empty fields, don't overwrite existing data
      for (const [key, value] of Object.entries(extracted)) {
        if (value && !profile[key]) {
          profile[key] = value;
        }
      }
      await profile.save();
    } else {
      profile = new UserProfile({ ...extracted, cvFilePath, cvText });
      await profile.save();
    }

    res.json({ message: 'CV uploaded successfully', profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
