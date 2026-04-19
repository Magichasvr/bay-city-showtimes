function getRuntimeMins(runtimeStr) {
  const m = runtimeStr.match(/(\d+)h\s*(\d+)m/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
}

function timeToMins(timeStr) {
  const m = timeStr.match(/(\d+):(\d+)([ap])/);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const mins = parseInt(m[2]);
  const p = m[3].toLowerCase();
  if (p === 'pm' && h !== 12) h += 12;
  if (p === 'am' && h === 12) h = 0;
  return h * 60 + mins;
}

function calcEndTime(startTime, runtimeStr) {
  try {
    const runtimeMatch = runtimeStr.match(/(\d+)h\s*(\d+)m/);
    const runtimeMins = runtimeMatch ? parseInt(runtimeMatch[1]) * 60 + parseInt(runtimeMatch[2]) : 0;
    
    const timeMatch = startTime.match(/(\d+):(\d+)([ap])/);
    if (!timeMatch) return '';
    
    let hours = parseInt(timeMatch[1]);
    const mins = parseInt(timeMatch[2]);
    const period = timeMatch[3].toLowerCase();
    
    // Convert to 24-hour
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    const startMins = hours * 60 + mins;
    const totalMins = startMins + runtimeMins;
    
    // Get end time in 24-hour, keep over 24 for display
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    
    // Determine period - if over 24 hours, it's next day (pm)
    let displayHours = endHours;
    let endPeriod = 'pm'; // Default to pm for times after noon
    
    if (endHours < 12) {
      endPeriod = 'am';
      displayHours = endHours === 0 ? 12 : endHours;
    } else if (endHours < 24) {
      endPeriod = 'pm';
      displayHours = endHours - 12;
      if (displayHours === 0) displayHours = 12;
    } else {
      // Next day - subtract 24 for display but show am/pm correctly
      displayHours = endHours - 24;
      endPeriod = displayHours < 12 ? 'am' : 'pm';
      if (displayHours === 0) displayHours = 12;
    }
    
    return displayHours + ':' + endMins.toString().padStart(2, '0') + endPeriod;
  } catch (e) {
    return '';
  }
}
}

module.exports = async function handler(req, res) {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const BAY_CITY_URL = `https://www.baycitycinemas.com/?date=${dateStr}`;
    
    const response = await fetch(BAY_CITY_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
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
        const endTime = calcEndTime(time, runtime);
        const endMins = timeToMins(time) + getRuntimeMins(runtime);
        shows.push({
          movieId: `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}-${tIdx + 1}`,
          movie: title,
          rating: rating,
          time: time,
          endTime: endTime,
          endMins: endMins,
          theater: theater,
          auditorium: auds[tIdx % auds.length],
          runtime: runtime
        });
});
  });
  
  shows.sort((a, b) => a.endMins - b.endMins);
    
    res.setHeader('Cache-Control', 's-maxage=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ shows, lastUpdated: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}