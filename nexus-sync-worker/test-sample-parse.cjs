const fs = require('fs');
const path = require('path');

// Simulate DOM parsing in Node via regex/DOM string parser to verify our extraction selectors
const html = fs.readFileSync('D:\\Ideas Agentic\\galaxyContent.txt', 'utf8');

function parseSampleHtml(htmlStr) {
  // Find all galaxyRow ctContentRow
  const rowRegex = /<div class="galaxyRow ctContentRow([^"]*)" id="galaxyRow(\d+)"[^>]*>([\s\S]*?)(?=<div class="galaxyRow ctContentRow|<div class="expeditionDebrisSlotBoxRow|<\/div>\s*<\/div>\s*<\/div>)/gi;
  
  const results = [];
  let match;
  while ((match = rowRegex.exec(htmlStr)) !== null) {
    const rowClass = match[1];
    const rowId = match[2];
    const rowContent = match[3];
    
    const isEmpty = rowClass.includes('empty_filter') || (!rowContent.includes('data-planet-id') && !rowContent.includes('cellPlanetName'));
    
    // 1. Slot
    const slot = parseInt(rowId, 10);
    
    // 2. Planet ID
    const planetIdMatch = rowContent.match(/data-planet-id="(\d+)"/);
    const planetId = planetIdMatch ? planetIdMatch[1] : null;
    
    // 3. Planet Name (clean, ignore ogl extensions)
    let planetName = null;
    if (planetId) {
      const pNameMatch = rowContent.match(/<div class="galaxyCell cellPlanetName"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                         rowContent.match(/<span class="spaceObjectName">([^<]+)<\/span>/i);
      if (pNameMatch) planetName = pNameMatch[1].trim();
    }
    
    // 4. Moon
    let hasMoon = 0;
    let moonId = null;
    let moonSize = null;
    if (rowContent.includes('micromoon') || rowContent.includes('data-moon-id')) {
      hasMoon = 1;
      const mIdMatch = rowContent.match(/data-moon-id="(\d+)"/);
      if (mIdMatch) moonId = mIdMatch[1];
      const mSizeMatch = rowContent.match(/<span id="moonsize"[^>]*>(\d+)\s*(?:km|км)?<\/span>/i) ||
                         rowContent.match(/(\d+)\s*(?:km|км)/i);
      if (mSizeMatch) moonSize = parseInt(mSizeMatch[1], 10);
    }
    
    // 5. Player ID, Name & Status
    let playerId = null;
    let playerName = null;
    let playerStatus = 'active';
    let playerRank = null;
    
    if (planetId) {
      const pIdMatch = rowContent.match(/data-playerid="(\d+)"/) ||
                       rowContent.match(/rel="player(\d+)"/) ||
                       rowContent.match(/data-uid="(\d+)"/);
      if (pIdMatch) playerId = pIdMatch[1];
      
      const pNameMatch = rowContent.match(/<span class="playerName"[^>]*>\s*([^\r\n<]+)/i) ||
                         rowContent.match(/<h1>\s*<span class="playerName">([^<]+)<\/span>/i);
      if (pNameMatch) playerName = pNameMatch[1].trim();
      
      // Status
      if (rowContent.includes('status_abbr_longinactive') || rowContent.includes('(I)')) playerStatus = 'I';
      else if (rowContent.includes('status_abbr_inactive') || rowContent.includes('(i)')) playerStatus = 'i';
      else if (rowContent.includes('status_abbr_vacation') || rowContent.includes('(v)')) playerStatus = 'v';
      else if (rowContent.includes('status_abbr_banned') || rowContent.includes('(b)')) playerStatus = 'b';
      else if (rowContent.includes('status_abbr_outlaw') || rowContent.includes('(o)')) playerStatus = 'o';
      else if (rowContent.includes('status_abbr_honorableTarget') || rowContent.includes('(hp)')) playerStatus = 'hp';
      
      // Rank
      const rankMatch = rowContent.match(/searchRelId=\d+">(\d+)<\/a>/);
      if (rankMatch) playerRank = parseInt(rankMatch[1], 10);
    }
    
    // 6. Alliance
    let allianceTag = null;
    let allianceId = null;
    if (planetId && rowContent.includes('cellAlliance')) {
      const allyIdMatch = rowContent.match(/rel="alliance(\d+)"/) ||
                          rowContent.match(/allianceId=(\d+)/);
      if (allyIdMatch) allianceId = allyIdMatch[1];
      
      const allyTagMatch = rowContent.match(/<div class="galaxyCell cellAlliance"[^>]*>\s*<span[^>]*>\s*([^\r\n<]+)/i);
      if (allyTagMatch && allyTagMatch[1].trim()) {
        allianceTag = allyTagMatch[1].trim();
      }
    }
    
    // 7. Debris
    let debrisMetal = 0;
    let debrisCrystal = 0;
    const metalMatch = rowContent.match(/Metal:\s*([\d,\.]+)/i);
    const crystalMatch = rowContent.match(/Crystal:\s*([\d,\.]+)/i);
    if (metalMatch) debrisMetal = parseInt(metalMatch[1].replace(/[^\d]/g, ''), 10) || 0;
    if (crystalMatch) debrisCrystal = parseInt(crystalMatch[1].replace(/[^\d]/g, ''), 10) || 0;
    
    results.push({
      slot,
      isColonized: !isEmpty && !!planetName,
      planetId,
      planetName,
      hasMoon,
      moonId,
      moonSize,
      playerId,
      playerName,
      playerStatus,
      playerRank,
      allianceTag,
      allianceId,
      debrisMetal,
      debrisCrystal,
    });
  }
  return results;
}

const parsed = parseSampleHtml(html);
console.log('Parsed Rows Count:', parsed.length);
console.log('Colonized Slots:', parsed.filter(p => p.isColonized));
