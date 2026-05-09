const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use Gemini to score the match between CV and job description (1-10)
const scoreJobMatch = async (cvText, jobDescription) => {
  if (!cvText || !jobDescription) return 0;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
    You are an expert technical recruiter evaluating a candidate's fit for a role.
    Compare the following candidate CV text against the provided job description.
    
    Respond ONLY with a single integer from 1 to 10 representing the match score, where:
    1 = completely unqualified
    5 = meets basic requirements
    10 = perfect match

    Do not include any explanation, just the number.
    Do not hallucinate.

    Candidate CV:
    ${cvText}

    Job Description:
    ${jobDescription}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const score = parseInt(text, 10);
    return isNaN(score) ? null : Math.min(Math.max(score, 1), 10);
  } catch (error) {
    if (error.message && error.message.includes('429')) {
      console.warn('Gemini quota exceeded, skipping scoring.');
    } else {
      console.error('Error scoring job match:', error.message);
    }
    return null;
  }
};

module.exports = {
  scoreJobMatch
};
