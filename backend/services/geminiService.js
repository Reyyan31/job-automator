const { GoogleGenerativeAI } = require('@google/generative-ai');

const generateAnswers = async (userProfile, job, questionsSchema) => {
  if (!userProfile.cvText || !questionsSchema || questionsSchema.length === 0) return { answers: {}, missingFields: [] };

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `
You are filling out a job application on behalf of ${userProfile.fullName}.
Answer every question truthfully and only based on the CV provided.
Do not fabricate any experience, skills, certifications, or information not present in the CV.
Return ONLY a valid JSON object where each key is the exact field name and the value is the answer.
For yes/no fields return exactly "Yes" or "No".
For fields you cannot answer from the CV, return null.
Keep text answers concise, professional, and under 100 words unless a longer answer is clearly needed.
Tailor answers to the specific job title and company where relevant.
Do not hallucinate.

Context:
- Candidate CV:
${userProfile.cvText}

- Job Title: ${job.title}
- Company: ${job.company}
- Job Description:
${job.description || 'Not provided'}

Questions to answer:
${JSON.stringify(questionsSchema, null, 2)}
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Attempt to parse JSON response. Remove markdown code blocks if present.
    let jsonStr = text;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const answers = JSON.parse(jsonStr);
    
    const missingFields = [];
    for (const [key, value] of Object.entries(answers)) {
      if (value === null) {
        missingFields.push(key);
      }
    }

    return { answers, missingFields };

  } catch (error) {
    console.error('Error generating answers with Gemini:', error.message);
    throw error;
  }
};

module.exports = {
  generateAnswers
};
