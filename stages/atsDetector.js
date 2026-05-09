const detectATS = (url) => {
  if (url.includes('greenhouse.io')) {
    return { ats: 'greenhouse' };
  }
  if (url.includes('lever.co')) {
    return { ats: 'lever' };
  }
  return { ats: 'unknown' };
};

module.exports = { detectATS };
