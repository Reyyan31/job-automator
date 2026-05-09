// Search for ATS links inside the job description HTML
const findAtsInDescription = (html) => {
  if (!html || typeof html !== 'string') return null;
  
  const greenhouseMatch = html.match(/https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/[^"' \n>]+/i) || 
                        html.match(/https?:\/\/[^"' \n>]+\.greenhouse\.io\/jobs\/[^"' \n>]+/i);
  if (greenhouseMatch) return greenhouseMatch[0];

  const leverMatch = html.match(/https?:\/\/jobs\.lever\.co\/[^"' \n>]+/i);
  if (leverMatch) return leverMatch[0];

  return null;
};

const detectATS = (url) => {
  if (!url) return { ats: 'unknown' };

  try {
    const urlObj = new URL(url);

    // Greenhouse detection
    // https://boards.greenhouse.io/companyname/jobs/123456
    // https://companyname.greenhouse.io/jobs/123456
    if (urlObj.hostname.includes('greenhouse.io')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Case 1: boards.greenhouse.io/companyname/jobs/jobId
      if (pathParts.length >= 3 && pathParts[1] === 'jobs') {
        return {
          ats: 'greenhouse',
          boardToken: pathParts[0],
          jobId: pathParts[2]
        };
      }
      
      // Case 2: companyname.greenhouse.io/jobs/jobId
      if (pathParts.length >= 2 && pathParts[0] === 'jobs') {
        const boardToken = urlObj.hostname.split('.')[0];
        return {
          ats: 'greenhouse',
          boardToken: boardToken === 'boards' || boardToken === 'job-boards' ? null : boardToken,
          jobId: pathParts[1]
        };
      }
    }

    // Lever detection
    // https://jobs.lever.co/companyname/uuid-string
    if (urlObj.hostname.includes('lever.co')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      // Expected: ['companyname', 'uuid-string']
      if (pathParts.length >= 2) {
        return {
          ats: 'lever',
          company: pathParts[0],
          jobId: pathParts[1]
        };
      }
    }
  } catch (error) {
    console.error(`Invalid URL parsing in atsDetector: ${url}`);
  }

  return { ats: 'unknown' };
};

module.exports = {
  detectATS,
  findAtsInDescription
};
