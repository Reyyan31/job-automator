const axios = require('axios');

const fetchGreenhouseForm = async (boardToken, jobId) => {
  try {
    const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`);
    const questions = res.data.questions || [];
    
    // Categorize questions
    let dynamicCount = 0;
    const formSchema = {
      questions: [],
      dynamicCount: 0
    };

    const staticFields = ['first_name', 'last_name', 'email', 'phone', 'resume', 'cover_letter', 'linkedin_profile_url', 'website'];
    
    questions.forEach(q => {
      const isStatic = staticFields.some(sf => q.fields.some(f => f.name === sf));
      
      if (!isStatic && q.required) {
        dynamicCount++;
      }
      
      formSchema.questions.push(q);
    });
    
    formSchema.dynamicCount = dynamicCount;
    return formSchema;
  } catch (error) {
    console.error('Error fetching Greenhouse form:', error.message);
    throw error;
  }
};

const fetchLeverForm = async (company, jobId) => {
  try {
    const res = await axios.get(`https://api.lever.co/v0/postings/${company}/${jobId}?mode=json`);
    const data = res.data;
    
    let dynamicCount = 0;
    const formSchema = {
      questions: data.additionalQuestions || [],
      dynamicCount: 0
    };
    
    // Lever custom questions are often required and dynamic
    if (data.additionalQuestions) {
       dynamicCount = data.additionalQuestions.length;
    }
    
    formSchema.dynamicCount = dynamicCount;
    return formSchema;
  } catch (error) {
    console.error('Error fetching Lever form:', error.message);
    throw error;
  }
};

const fetchFormSchema = async (ats, boardToken, jobId, company) => {
  if (ats === 'greenhouse') {
    return await fetchGreenhouseForm(boardToken, jobId);
  } else if (ats === 'lever') {
    return await fetchLeverForm(company, jobId);
  } else {
    throw new Error(`Unknown ATS: ${ats}`);
  }
};

module.exports = {
  fetchFormSchema
};
