import { ActiveItem } from '../db';
import itemsMapping from '../db/items_mapping.json';

// Get clean filename from an image URL
function getFilenameFromUrl(url: string): string {
    if (!url) return '';
    const cleanUrl = url.replace(/url\(['"]?([^'")]+)['"]?\)/gi, '$1').trim();
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1].toLowerCase();
}

// Find item in itemsMapping by style attribute string (CSS background url)
export function findItemByStyle(styleStr: string | null) {
    if (!styleStr) return null;
    const urls: string[] = [];
    const regex = /url\(['"]?([^'")]+)['"]?\)/gi;
    let match;
    while ((match = regex.exec(styleStr)) !== null) {
        urls.push(match[1].trim());
    }
    const filenames = urls.map(url => url.split('/').pop()?.toLowerCase()).filter(Boolean);

    if (filenames.length === 0) return null;

    return itemsMapping.find(item => {
        const itemLargeFn = item.large_image.split('/').pop()?.toLowerCase();
        const itemSmallFn = item.small_image.split('/').pop()?.toLowerCase();

        return filenames.some(fn => fn === itemLargeFn || fn === itemSmallFn);
    });
}

// Find item in itemsMapping by name (case-insensitive)
export function findItemByName(name: string) {
    if (!name) return null;
    const lowerName = name.toLowerCase().trim();
    return itemsMapping.find(item => item.name.toLowerCase().trim() === lowerName);
}

// Resolves legacy type and bonus for an itemsMapping item for backward compatibility
export function getLegacyTypeAndBonus(mappedItem: any) {
    let type: ActiveItem['type'] = 'other';
    let bonus = 0;

    const name = mappedItem.name.toLowerCase();
    if (name.includes('expedition resource booster')) {
        type = 'expedition_res';
        const pctMatch = name.match(/\((\d+)%\)/);
        if (pctMatch) {
            bonus = parseInt(pctMatch[1], 10) / 100;
        }
    } else if (name.includes('expedition slots')) {
        type = 'expedition_slots';
    } else if (name.includes('fleet slots')) {
        type = 'fleet_slots';
    } else if (name.includes('planet fields') || name.includes('moon fields')) {
        type = 'fields';
    } else {
        const effects = mappedItem.effects || [];
        const prodEffect = effects.find((e: any) => e.type === 'production');
        if (prodEffect) {
            bonus = prodEffect.value / 100;
            if (prodEffect.resource === 'metal') type = 'metal';
            else if (prodEffect.resource === 'crystal') type = 'crystal';
            else if (prodEffect.resource === 'deuterium') type = 'deuterium';
            else if (prodEffect.resource === 'all') type = 'resource';
        }
    }

    return { type, bonus };
}

// Dynamically computes production boosters from active items (supporting legacy items fallback)
export function getProductionBoosters(activeItems: ActiveItem[] | undefined) {
    const boosters = { metal: 0, crystal: 0, deuterium: 0 };
    if (!activeItems) return boosters;

    const now = Date.now();
    activeItems.forEach(item => {
        // Only apply if the item has not expired
        if (item.expiryTimestamp && item.expiryTimestamp <= now) {
            return;
        }

        // If the item has a ref, resolve its effects from items_mapping
        if (item.ref) {
            const mappedItem = itemsMapping.find(m => m.ref === item.ref);
            if (mappedItem) {
                (mappedItem.effects || []).forEach((effect: any) => {
                    if (effect.type === 'production') {
                        const bonusVal = effect.value / 100;
                        if (effect.resource === 'metal') boosters.metal += bonusVal;
                        else if (effect.resource === 'crystal') boosters.crystal += bonusVal;
                        else if (effect.resource === 'deuterium') boosters.deuterium += bonusVal;
                        else if (effect.resource === 'all') {
                            boosters.metal += bonusVal;
                            boosters.crystal += bonusVal;
                            boosters.deuterium += bonusVal;
                        }
                    }
                });
                return; // Resolved successfully
            }
        }

        // Fallback for legacy items without a ref
        if (item.bonus && item.bonus > 0) {
            if (item.type === 'metal') boosters.metal += item.bonus;
            else if (item.type === 'crystal') boosters.crystal += item.bonus;
            else if (item.type === 'deuterium') boosters.deuterium += item.bonus;
            else if (item.type === 'resource') {
                boosters.metal += item.bonus;
                boosters.crystal += item.bonus;
                boosters.deuterium += item.bonus;
            }
        }
    });

    return boosters;
}
