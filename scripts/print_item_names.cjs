const fs = require('fs');

const content = fs.readFileSync('D:/Ideas Agentic/entire ogame page dom.txt', 'utf8');

const itemNamesMatch = content.match(/var\s+itemNames\s*=\s*(\{[\s\S]*?\});/);
if (itemNamesMatch) {
    const itemNames = JSON.parse(itemNamesMatch[1]);
    console.log('Total items in OGame itemNames dictionary:', Object.keys(itemNames).length);
    console.log(JSON.stringify(itemNames, null, 2));
}
