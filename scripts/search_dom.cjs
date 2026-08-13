const fs = require('fs');

const content = fs.readFileSync('D:/Ideas Agentic/entire ogame page dom.txt', 'utf8');

// 1. Extract itemNames object from line 99
const itemNamesMatch = content.match(/var\s+itemNames\s*=\s*(\{[\s\S]*?\});/);
if (itemNamesMatch) {
    try {
        const itemNames = JSON.parse(itemNamesMatch[1]);
        console.log('=== OFFICIAL OGAME ITEM NAMES DICTIONARY ===');
        console.log('Total items in itemNames:', Object.keys(itemNames).length);
        console.log(JSON.stringify(itemNames, null, 2).slice(0, 2000));
    } catch (e) {
        console.error('Could not parse itemNames JSON:', e.message);
    }
}

// 2. Search for import/export / trader endpoints & scripts in DOM
console.log('\n=== TRADER / IMPORT EXPORT / SHOP ENDPOINTS IN DOM ===');
const endpoints = [];
const regex = /(?:https:\/\/s\d+-[a-z]+\.ogame\.gameforge\.com)?\/game\/index\.php\?[^"'`\s<>]*/gi;
let m;
while ((m = regex.exec(content)) !== null) {
    if (!endpoints.includes(m[0])) {
        endpoints.push(m[0]);
    }
}

endpoints.forEach(ep => {
    if (ep.includes('trader') || ep.includes('shop') || ep.includes('inventory') || ep.includes('import') || ep.includes('export') || ep.includes('component')) {
        console.log(ep);
    }
});
