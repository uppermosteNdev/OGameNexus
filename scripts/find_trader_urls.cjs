const fs = require('fs');

const content = fs.readFileSync('D:/Ideas Agentic/entire ogame page dom.txt', 'utf8');

const regex = /(?:page|component|action|url|href|src)=["']?([^"'\s>]+)/gi;
const found = new Set();
let m;
while ((m = regex.exec(content)) !== null) {
    const val = m[1];
    if (val.includes('trader') || val.includes('import') || val.includes('export') || val.includes('shop') || val.includes('inventory') || val.includes('ajax')) {
        found.add(val);
    }
}

console.log('=== ALL SHOP / TRADER / IMPORT EXPORT ENDPOINTS IN DOM ===');
console.log(Array.from(found));
