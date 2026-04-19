module.exports = async function handler(req, res) {
  const BAY_CITY_URL = 'https://www.baycitycinemas.com/showtimes';
  
  const response = await fetch(BAY_CITY_URL);
  const html = await response.text();
  
  const parts = html.split('cin-movie-card');
  
  res.json({ parts: parts.length, includes: html.includes('cin-movie-card') });
}