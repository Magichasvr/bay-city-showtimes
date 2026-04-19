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
    
    const movieSectionRegex = /<div class="cin-movie-card[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"[^>]*>[\s\S]*?<div class="cin-movie-info"[^>]*>[\s\S]*?<div class="cin-movie-details"[^>]*>([\s\S]*?)<div class="cin-showtimes-list"/g;
    
    let match;
    while ((match = movieSectionRegex.exec(html)) !== null) {
      const title = match[1].replace(' Movie Poster', '').trim();
      const detailsHtml = match[2];
      
      const ratingMatch = detailsHtml.match(/<span class="cin-movie-rating">([^<]+)<\/span>/);
      const rating = ratingMatch ? ratingMatch[1].trim() : 'NR';
      
      const runtimeMatch = detailsHtml.match(/(\d+)h\s*(\d+)m/);
      const runtime = runtimeMatch ? `${runtimeMatch[1]}h ${runtimeMatch[2]}m` : '2h 0m';
      
      const theaterMatch = detailsHtml.match(/<span class="cin-movie-venue">([^<]+)<\/span>/);
      const theaterType = theaterMatch ? theaterMatch[1].trim() : 'General';
      
      const timeRegex = /<a[^>]+href="\/movie\/[^"]+"[^>]*>(\d{1,2}:\d{2}[ap]m)<\/a>/g;
      let timeMatch;
      let showId = 0;
      while ((timeMatch = timeRegex.exec(detailsHtml)) !== null) {
        showId++;
        const time = timeMatch[1];
        shows.push({
          movieId: `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${showId}`,
          movie: title,
          rating: rating,
          time: time,
          theater: theaterType,
          runtime: runtime
        });
      }
    }
    
    const auditoriumMap = {
      'GDX': ['6', '7'],
      'General Admission': ['1', '2', '3', '4', '5'],
      'Flashback Cinema': ['1']
    };
    
    shows.forEach(show => {
      if (show.theater.includes('GDX')) {
        const gdxAuditoriums = auditoriumMap['GDX'];
        show.auditorium = gdxAuditoriums[(shows.indexOf(show) % gdxAuditoriums.length)];
        show.theater = 'GDX';
      } else if (show.theater.includes('Flashback')) {
        show.auditorium = '1';
        show.theater = 'Flashback';
      } else {
        const generalAuditoriums = auditoriumMap['General Admission'];
        show.auditorium = generalAuditoriums[(shows.indexOf(show) % generalAuditoriums.length)];
        show.theater = 'General';
      }
    });
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ shows, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
