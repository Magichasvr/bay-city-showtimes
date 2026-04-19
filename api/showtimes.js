module.exports = async function handler(req, res) {
  const BAY_CITY_URL = 'https://www.baycitycinemas.com/showtimes';
  
  const response = await fetch(BAY_CITY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await response.text();
  
  const shows = [];
  const parts = html.split('<div class="cin-movie-card');
  
  for (let i = 1; i < parts.length; i++) {
    const card = parts[i];
    
    // Find movie title - it's an <a> with href="/movie/NUMBER"
    const movieLinkMatch = card.match(/<a[^>]+href="\/movie\/(\d+)"[^>]*>([^<]+)<\/a>/);
    if (!movieLinkMatch) continue;
    const movieId = movieLinkMatch[1];
    const title = movieLinkMatch[2].replace(/&#039;/g, "'").replace(/&amp;/g, "&").trim();
    
    // Find rating - span with G, PG, PG-13, R, NR
    const ratingMatch = card.match(/<span[^>]*>(G|PG|PG-13|R|NR)<\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : 'NR';
    
    // Find runtime  
    const runtimeMatch = card.match(/(\d+)h\s*(\d+)m/);
    const runtime = runtimeMatch ? `${runtimeMatch[1]}h ${runtimeMatch[2]}m` : '2h 0m';
    
    // Find all showtimes
    const times = card.match(/(\d{1,2}:\d{2}[ap]m)/g) || [];
    
    // Determine theater type
    const isGDX = card.includes('GDX');
    const isFlashback = card.includes('Flashback Cinema');
    const auds = isGDX ? ['6', '7'] : (isFlashback ? ['1'] : ['1', '2', '3', '4', '5']);
    
    // Assign auditorium and add each showtime
    times.forEach((time, idx) => {
      shows.push({
        movieId: `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${movieId}-${idx + 1}`,
        movie: title,
        rating: rating,
        time: time,
        theater: isGDX ? 'GDX' : (isFlashback ? 'Flashback' : 'General'),
        auditorium: auds[idx % auds.length],
        runtime: runtime
      });
    });
  }
  
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({ shows, lastUpdated: new Date().toISOString() });
}