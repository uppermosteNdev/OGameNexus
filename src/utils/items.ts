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

// Resolves official OGame CDN image URL for any active item
export function getItemIconUrl(item: Partial<ActiveItem> | null | undefined, serverUrl: string = 'https://s267-en.ogame.gameforge.com'): string | null {
    if (!item) return null;

    const host = serverUrl.startsWith('http') ? serverUrl.replace(/\/$/, '') : `https://${serverUrl.replace(/\/$/, '')}`;

    // 1. Try matching by ref or itemUuid or id in items_mapping.json
    const searchRef = item.ref || item.itemUuid || (typeof item.id === 'string' ? item.id : undefined);
    let mapped = searchRef ? itemsMapping.find(m => m.ref === searchRef) : null;

    // 2. Try matching by name (e.g. "Platinum Crystal Booster", "Expedition Computer Bronze", etc.)
    if (!mapped && item.name) {
        mapped = findItemByName(item.name);
        
        // Dynamic name matching for placeholders like "Expedition Resource Booster (10%) Bronze"
        if (!mapped) {
            const cleanName = item.name.replace(/\(\d+%\)/, '').trim().toLowerCase();
            mapped = itemsMapping.find(m => {
                const mClean = m.name.replace(/\(\d+%\)/, '').trim().toLowerCase();
                return mClean === cleanName || m.name.toLowerCase().includes(cleanName);
            }) || null;
        }
    }

    if (mapped && (mapped.small_image || mapped.large_image)) {
        const imgPath = mapped.small_image || mapped.large_image;
        return imgPath.startsWith('http') ? imgPath : `${host}${imgPath}`;
    }

    return null;
}

// Format human-readable remaining duration from item expiryTimestamp or timeRemaining fallback
export function getItemDurationText(item: { expiryTimestamp?: number; timeRemaining?: string; isPermanent?: boolean }): string {
    if (item.expiryTimestamp && item.expiryTimestamp > Date.now()) {
        const diffMs = item.expiryTimestamp - Date.now();
        const totalSec = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
    if (item.timeRemaining) return item.timeRemaining;
    if (item.isPermanent) return 'Permanent';
    return 'Active';
}

// Cleans up legacy '#amount#' or '#amount#%' placeholders in item titles
export function sanitizeItemTitle(title: string, bonus?: number): string {
    if (!title) return '';
    if (title.includes('#amount#')) {
        const pctStr = (bonus && bonus > 0) ? ` (${Math.round(bonus * 100)}%) ` : ' ';
        return title.replace(/\(#amount#%\)/g, pctStr)
                    .replace(/#amount#%?/g, pctStr)
                    .replace(/\s+/g, ' ')
                    .trim();
    }
    return title;
}

// Sanitizes an active item object by resolving missing bonuses and replacing title placeholders
export function sanitizeActiveItem(item: any): any {
    if (!item) return item;
    let title = item.title || item.name || '';
    let bonus = item.bonus;

    if ((!bonus || bonus === 0) && item.ref) {
        const mapped = itemsMapping.find(m => m.ref === item.ref);
        if (mapped) {
            const legacy = getLegacyTypeAndBonus(mapped);
            if (legacy.bonus > 0) bonus = legacy.bonus;
        }
    }

    if (title.includes('#amount#')) {
        title = sanitizeItemTitle(title, bonus);
    }

    return {
        ...item,
        title,
        name: title,
        bonus
    };
}

