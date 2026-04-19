export default async function handler(req, res) {
  const BAY_CITY_URL = 'https://www.baycitycinemas.com/showtimes';
  
  try {
    const response = await fetch(BAY_CITY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();
    
    const shows = [];
    const titleRatingMap = {};
    
    const ratingSectionRegex = /<span[^>]*>(G|PG|PG-13|R|NR)<\/span>[\s\S]*?Details[\s\S]*?<a[^>]+>([^<]+)<\/a>/g;
    let ratingMatch;
    while ((ratingMatch = ratingSectionRegex.exec(html)) !== null) {
      const rating = ratingMatch[1];
      const title = ratingMatch[2].trim();
      titleRatingMap[title] = rating;
    }
    
    const movieSectionRegex = /<a[^>]+href="\/movie\/(\d+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?(\d+)h[\s\S]*?(\d+)m[\s\S]*?<span[^>]*>(\d{1,2}:\d{2}[ap]m)<\/span>/g;
    let match;
    let movieIdx = 0;
    let generalCount = 0;
    
    while ((match = movieSectionRegex.exec(html)) !== null) {
      movieIdx++;
      const movieId = match[1];
      const title = match[2].trim();
      const hours = parseInt(match[3]) || 2;
      const mins = parseInt(match[4]) || 0;
      const runtime = `${hours}h ${mins}m`;
      const time = match[5];
      
      const fullTitle = title.replace(/&#039;/g, "'").replace(/&amp;/g, "&");
      const isGDX = html.includes(fullTitle) && html.includes('GDX');
      const isFlashback = html.includes(fullTitle) && html.includes('Flashback');
      
      let auditorium;
      if (isGDX) {
        auditorium = (movieIdx % 2) === 1 ? '6' : '7';
      } else if (isFlashback) {
        auditorium = '1';
      } else {
        const auds = ['2', '3', '4', '5', '1'];
        auditorium = auds[generalCount % auds.length];
        generalCount++;
      }
      
      shows.push({
        movieId: `${fullTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}${movieIdx}`,
        movie: fullTitle,
        rating: titleRatingMap[fullTitle] || 'NR',
        time: time,
        theater: isGDX ? 'GDX' : (isFlashback ? 'Flashback' : 'General'),
        auditorium: auditorium,
        runtime: runtime
      });
    }
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ shows, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}