module.exports = async function handler(req, res) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const BAY_CITY_URL = `https://www.baycitycinemas.com/?date=${dateStr}`;
  
  const response = await fetch(BAY_CITY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  const html = await response.text();
  
  const shows = [];
  const blocks = html.split('<div class="cin-movie-card');
  
  blocks.forEach((block, idx) => {
    if (idx === 0) return;
    
    const titleMatch = block.match(/hover:text-secondary[^>]*>([^<]+)</);
    const title = titleMatch ? titleMatch[1].replace(/&#039;/g, "'").replace(/&amp;/g, "&").trim() : '';
    if (!title) return;
    
    const times = block.match(/\b\d{1,2}:\d{2}[a]\b/g) || [];
    const pmTimes = block.match(/\b\d{1,2}:\d{2}[p]\b/g) || [];
    const allTimes = [...times, ...pmTimes];
    
    if (allTimes.length === 0) return;
    
    const runtimeMatch = block.match(/(\d+)h\s*(\d+)m/);
    const runtime = runtimeMatch ? `${runtimeMatch[1]}h ${runtimeMatch[2]}m` : '2h 0m';
    
    const ratingMatch = block.match(/\b(G|PG|PG-13|R|NR)\b/);
    const rating = ratingMatch ? ratingMatch[1] : 'NR';
    
    const isGDX = block.indexOf('GDX') > -1;
    const isFlashback = block.indexOf('Flashback') > -1;
    const theater = isGDX ? 'GDX' : (isFlashback ? 'Flashback' : 'General');
    const auds = isGDX ? ['6', '7'] : (isFlashback ? ['1'] : ['1', '2', '3', '4', '5']);
    
    allTimes.forEach((time, tIdx) => {
      shows.push({
        movieId: `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}-${tIdx + 1}`,
        movie: title,
        rating: rating,
        time: time,
        theater: theater,
        auditorium: auds[tIdx % auds.length],
        runtime: runtime
      });
    });
  });
  
  res.setHeader('Cache-Control', 's-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ shows, lastUpdated: new Date().toISOString() });
}