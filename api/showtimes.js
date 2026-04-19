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
  
  for (let i = 1; i < parts.length; i++) {
    const card = parts[i];
    
    const movieLink = card.match(/href="\/movie\/(\d+)"[^>]*>([^<]+)<\/a>/);
    if (!movieLink) continue;
    const title = movieLink[2].replace(/&#039;/g, "'").replace(/&amp;/g, "&");
    
    const ratingMatch = card.match(/>(G|PG|PG-13|R|NR)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : 'NR';
    
    const runtimeMatch = card.match(/(\d+)h\s*(\d+)m/);
    const runtime = runtimeMatch ? `${runtimeMatch[1]}h ${runtimeMatch[2]}m` : '2h 0m';
    
    const times = card.match(/(\d{1,2}:\d{2}[ap]m)/g) || [];
    const isGDX = card.includes('GDX');
    const isFlashback = card.includes('Flashback');
    const auds = isGDX ? ['6', '7'] : (isFlashback ? ['1'] : ['1', '2', '3', '4', '5']);
    
    times.forEach((time, idx) => {
      shows.push({
        movie: title,
        rating: rating,
        time: time,
        theater: isGDX ? 'GDX' : (isFlashback ? 'Flashback' : 'General'),
        auditorium: auds[idx % auds.length],
        runtime: runtime
      });
    });
  }
  
  res.json({ shows, count: shows.length, sample: parts[1] ? parts[1].substring(0, 300) : 'none' });
}