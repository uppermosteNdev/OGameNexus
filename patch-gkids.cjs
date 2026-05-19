const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/db/lifeformTechData.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/"id":\s*(\d+),\s*"lifeformId":\s*(\d+),/g, (match, idStr, lfIdStr) => {
    const id = parseInt(idStr, 10);
    const lifeformId = parseInt(lfIdStr, 10);
    const slot = Math.ceil(id / 4);
    let strSlot = slot.toString();
    if (strSlot.length === 1) strSlot = '0' + strSlot;
    // OGame ID structure: 1[Species]2[Slot01-18]
    const gkId = parseInt(`1${lifeformId}2${strSlot}`, 10);

    return `"id": ${id},\n                "lifeformId": ${lifeformId},\n                "gkId": ${gkId},`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated lifeformTechData.ts with gkIds.');
