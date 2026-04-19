module.exports = async function handler(req, res) {
  const BAY_CITY_URL = 'https://www.baycitycinemas.com/showtimes';
  
  const response = await fetch(BAY_CITY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  const html = await response.text();
  
  const shows = [];
  const parts = html.split('cin-movie-card');
  
  res.json({ parts: parts.length, hasCard: html.includes('cin-movie-card'), html180: html.substring(0, 180) });
}