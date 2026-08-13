const fs = require('fs');
const path = require('path');

function decodeEntities(str) {
    if (!str) return '';
    return str
        .replace(/&#43;/g, '+')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

const rawPath = 'D:/Ideas Agentic/all shop items.txt';
if (!fs.existsSync(rawPath)) {
    console.error('File not found:', rawPath);
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const mapped = raw.map(item => {
    let effects = [];
    const nameLower = (item.name || '').toLowerCase();
    const rawEffect = decodeEntities(item.effect || '');

    // Production boosters
    if (nameLower.includes('metal booster')) {
        const pct = nameLower.includes('platinum') ? 40 : nameLower.includes('gold') ? 30 : nameLower.includes('silver') ? 20 : nameLower.includes('bronze') ? 10 : 0;
        effects.push({ type: 'production', resource: 'metal', value: pct, unit: 'percent' });
    } else if (nameLower.includes('crystal booster')) {
        const pct = nameLower.includes('platinum') ? 40 : nameLower.includes('gold') ? 30 : nameLower.includes('silver') ? 20 : nameLower.includes('bronze') ? 10 : 0;
        effects.push({ type: 'production', resource: 'crystal', value: pct, unit: 'percent' });
    } else if (nameLower.includes('deuterium booster')) {
        const pct = nameLower.includes('platinum') ? 40 : nameLower.includes('gold') ? 30 : nameLower.includes('silver') ? 20 : nameLower.includes('bronze') ? 10 : 0;
        effects.push({ type: 'production', resource: 'deuterium', value: pct, unit: 'percent' });
    } else if (nameLower.includes('expedition resource booster')) {
        const pctMatch = nameLower.match(/(\d+)%/);
        const pct = pctMatch ? parseInt(pctMatch[1]) : 0;
        effects.push({ type: 'expedition_res', resource: 'expedition', value: pct, unit: 'percent' });
    } else if (nameLower.includes('fields')) {
        const numMatch = rawEffect.match(/\+(\d+)/);
        const fields = numMatch ? parseInt(numMatch[1]) : 0;
        effects.push({ type: 'fields', value: fields, unit: 'amount' });
    } else if (nameLower.includes('fleet slots')) {
        const numMatch = rawEffect.match(/\+(\d+)/);
        const slots = numMatch ? parseInt(numMatch[1]) : 0;
        effects.push({ type: 'fleet_slots', value: slots, unit: 'amount' });
    } else if (nameLower.includes('expedition slots')) {
        const numMatch = rawEffect.match(/\+(\d+)/);
        const slots = numMatch ? parseInt(numMatch[1]) : 0;
        effects.push({ type: 'expedition_slots', value: slots, unit: 'amount' });
    } else if (nameLower.includes('package')) {
        const res = nameLower.includes('metal') ? 'metal' : nameLower.includes('crystal') ? 'crystal' : nameLower.includes('deuterium') ? 'deuterium' : 'all';
        effects.push({ type: 'resource_package', resource: res, value: 1, unit: 'daily_production' });
    }

    const smallImg = item.image ? (item.image.startsWith('/') ? item.image : '/cdn/img/item-images/' + item.image + '.png') : '';
    const largeImg = item.imageLarge ? (item.imageLarge.startsWith('/') ? item.imageLarge : '/cdn/img/item-images/' + item.imageLarge + '.png') : '';

    return {
        name: item.name,
        ref: item.ref,
        rarity: item.rarity || 'common',
        small_image: smallImg,
        large_image: largeImg,
        effect: rawEffect,
        description: rawEffect || item.name,
        costs: item.costs || 0,
        currency: item.currency || 'dm',
        duration: item.duration || null,
        effects
    };
});

const target1 = 'c:/_repos/OGameNexus/src/db/items_mapping.json';
const target2 = 'c:/ogame/extension work/ideas/items_mapping.json';

fs.writeFileSync(target1, JSON.stringify(mapped, null, 2));
if (fs.existsSync(path.dirname(target2))) {
    fs.writeFileSync(target2, JSON.stringify(mapped, null, 2));
}

console.log(`Successfully generated ${mapped.length} items in ${target1}!`);
