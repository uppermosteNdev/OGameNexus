import { InventoryItem } from '../db';

/**
 * Gets cached player inventory from chrome.storage.local
 */
export async function getStoredPlayerInventory(): Promise<InventoryItem[]> {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      const cached = await chrome.storage.local.get('nexus_player_inventory');
      if (cached && Array.isArray(cached.nexus_player_inventory)) {
        return cached.nexus_player_inventory as InventoryItem[];
      }
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('[OGame Nexus] Error retrieving cached inventory', e);
    }
  }
  return [];
}

/**
 * Saves player inventory items to local storage and sends update to background for IndexedDB
 */
export async function savePlayerInventory(items: InventoryItem[], playerId?: string): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        'nexus_player_inventory': items,
        'nexus_player_inventory_time': Date.now()
      });
    }
    if (playerId && typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_PLAYER_INVENTORY',
        playerId,
        inventory: items,
        timestamp: Date.now()
      }, () => {});
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('[OGame Nexus] Error saving player inventory', e);
    }
  }
}

/**
 * Formats duration seconds / text into clean user-friendly labels ('Instant', '1w', 'Permanent', etc.)
 */
export function formatDuration(rawDuration: any, title?: string): string {
  if (rawDuration === 0 || rawDuration === '0') return 'Instant';
  if (typeof rawDuration === 'number' || (typeof rawDuration === 'string' && /^\d+$/.test(rawDuration))) {
    const sec = Number(rawDuration);
    if (sec <= 0) return 'Instant';
    const days = Math.round(sec / 86400);
    if (days >= 7 && days % 7 === 0) {
      return `${days / 7}w`;
    }
    if (days >= 1) {
      return `${days}d`;
    }
    const hours = Math.round(sec / 3600);
    return `${hours}h`;
  }
  if (title) {
    const match = title.match(/Duration:\s*([^<&]+)/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.toLowerCase() === 'now') return 'Instant';
      return clean;
    }
  }
  if (typeof rawDuration === 'string') {
    const clean = rawDuration.replace(/&lt;.*$/i, '').replace(/<.*$/i, '').replace(/&amp;.*$/i, '').trim();
    if (clean) {
      if (clean.toLowerCase() === 'now') return 'Instant';
      return clean;
    }
  }
  return 'Permanent';
}

/**
 * Classifies an item into standard categories
 */
function categorizeItem(name: string): string {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('kraken')) return 'building_speedup';
  if (lowerName.includes('newtron')) return 'research_speedup';
  if (lowerName.includes('detroid')) return 'shipyard_speedup';
  if (lowerName.includes('metal booster')) return 'metal_booster';
  if (lowerName.includes('crystal booster')) return 'crystal_booster';
  if (lowerName.includes('deuterium booster')) return 'deut_booster';
  if (lowerName.includes('energy booster')) return 'energy_booster';
  if (lowerName.includes('planet fields') || lowerName.includes('moon fields')) return 'fields';
  if (lowerName.includes('collector') || lowerName.includes('general') || lowerName.includes('discoverer')) return 'class_token';
  if (lowerName.includes('pack') || lowerName.includes('paket')) return 'resource_pack';
  if (lowerName.includes('slot')) return 'slot_booster';
  if (lowerName.includes('turbo') || lowerName.includes('expedition')) return 'expo_booster';
  return 'other';
}

/**
 * Parses raw HTML / JS string from OGame shop/inventory response to extract all stored items
 */
export function parseInventoryHtml(html: string): InventoryItem[] {
  const results: InventoryItem[] = [];
  if (!html) return results;

  const now = Date.now();

  // Strategy 1: Look for embedded items_inventory JavaScript array
  try {
    const jsonMatch = html.match(/inventoryObj\.items_inventory\s*=\s*(\[\s*\{.*?\}\s*\])\s*(\n|;|<)/s)
                   || html.match(/items_inventory\s*=\s*(\[\s*\{.*?\}\s*\])/s);

    if (jsonMatch && jsonMatch[1]) {
      const rawArr = JSON.parse(jsonMatch[1]);
      if (Array.isArray(rawArr) && rawArr.length > 0) {
        rawArr.forEach(item => {
          if (item && item.ref && item.name) {
            const amount = Number(item.amount ?? item.amount_free ?? 1);
            if (amount > 0) {
              const duration = formatDuration(item.duration, item.title);

              let description: string | undefined = item.effect;
              if (!description && item.title) {
                description = item.title.split('|')[1]?.split(/Duration:/i)[0]?.trim();
              }
              if (description) {
                const temp = document.createElement('div');
                temp.innerHTML = description;
                description = temp.textContent?.trim() || undefined;
              }

              const iconUrl = item.image ? `/cdn/img/item-images/${item.image}.png` : undefined;
              const imageLargeUrl = item.imageLarge ? `/cdn/img/item-images/${item.imageLarge}.png` : undefined;
              const images: string[] = [];
              if (imageLargeUrl) images.push(imageLargeUrl);
              if (iconUrl) images.push(iconUrl);

              results.push({
                ref: item.ref,
                name: item.name,
                amount,
                rarity: item.rarity || 'common',
                category: categorizeItem(item.name),
                duration,
                priceDm: typeof item.costs === 'number' ? item.costs : undefined,
                description,
                iconUrl,
                imageLargeUrl,
                images: images.length > 0 ? images : undefined,
                lastUpdated: now
              });
            }
          }
        });

        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (err) {
    console.warn('[OGame Nexus] Error parsing items_inventory JSON array', err);
  }

  // Strategy 2: DOM Parser for #js_inventorySlider
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const slider = doc.querySelector('#js_inventorySlider');
    if (slider) {
      const itemBoxes = slider.querySelectorAll('.item_img_box');
      itemBoxes.forEach(box => {
        const a = box.querySelector('a.detail_button');
        if (!a) return;

        const ref = a.getAttribute('ref') || '';
        const tooltip = a.getAttribute('data-tooltip-title') || a.getAttribute('title') || '';
        const parts = tooltip.split('|');
        const name = (parts[0] || '').trim();
        const body = parts.slice(1).join('|');

        const amountText = a.querySelector('.level.amount')?.textContent?.trim()
          || (tooltip.match(/In Inventory:\s*([0-9,]+)/i)?.[1])
          || '1';
        const amount = parseInt(amountText.replace(/[,.]/g, ''), 10) || 1;

        const itemImg = box.closest('.item_img') as HTMLElement | null;
        let rarity = 'common';
        if (itemImg) {
          if (itemImg.classList.contains('r_uncommon')) rarity = 'uncommon';
          else if (itemImg.classList.contains('r_rare')) rarity = 'rare';
          else if (itemImg.classList.contains('r_epic')) rarity = 'epic';
        }

        const images: string[] = [];
        let iconUrl: string | undefined = undefined;
        let imageLargeUrl: string | undefined = undefined;

        if (itemImg && itemImg.style.backgroundImage) {
          const bgMatches = itemImg.style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g);
          for (const m of bgMatches) {
            if (m[1]) images.push(m[1]);
          }
          if (images.length > 0) {
            iconUrl = images[images.length - 1];
            imageLargeUrl = images[0];
          }
        }

        const duration = formatDuration(null, tooltip);

        const priceMatch = body.match(/Price:\s*([0-9,]+)\s*Dark Matter/i);
        const priceDm = priceMatch ? parseInt(priceMatch[1].replace(/[,.]/g, ''), 10) : undefined;

        let description: string | undefined = undefined;
        const descPart = body.split(/Duration:/i)[0] || '';
        if (descPart) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = descPart;
          description = tempDiv.textContent?.trim() || undefined;
        }

        if (ref && name) {
          results.push({
            ref,
            name,
            amount,
            rarity,
            category: categorizeItem(name),
            duration,
            priceDm,
            description,
            iconUrl,
            imageLargeUrl,
            images: images.length > 0 ? images : undefined,
            lastUpdated: now
          });
        }
      });
    }
  } catch (err) {
    console.warn('[OGame Nexus] Error parsing inventory HTML DOM', err);
  }

  return results;
}

/**
 * Generic inventory fetch: fetches shop/inventory component via POST, parses items, and persists to DB and local storage
 */
export async function fetchPlayerInventory(playerId?: string): Promise<InventoryItem[]> {
  try {
    const url = '/game/index.php?page=ingame&component=shop&ajax=1&action=inventoryGet';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      console.warn(`[OGame Nexus] Inventory fetch failed with HTTP ${response.status}`);
      return [];
    }

    const text = await response.text();
    let html = text;
    try {
      const json = JSON.parse(text);
      if (json.html) {
        html = json.html;
      }
    } catch {}

    const items = parseInventoryHtml(html);

    if (items && items.length > 0) {
      await savePlayerInventory(items, playerId);
    }

    return items;
  } catch (err) {
    console.warn('[OGame Nexus] Error during fetchPlayerInventory', err);
    return [];
  }
}
