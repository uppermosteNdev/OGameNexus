import { InventoryItem } from '../db';
import { getStoredPlayerInventory } from './inventory';

interface SpeedupTierDef {
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  rarityLabel: string;
  reductionLabel: string;
  defaultImage: string;
}

interface BoxTargetConfig {
  id: string;
  selectors: string[];
  category: string;
  speedupTitle: string;
  itemNameKeyword: string;
  isLifeform: boolean;
  tiers: SpeedupTierDef[];
}

const SPEEDUP_TIERS: SpeedupTierDef[] = [
  {
    rarity: 'bronze',
    rarityLabel: 'Bronze',
    reductionLabel: '-30m',
    defaultImage: 'https://gf3.geo.gfsrv.net/cdn5e/dce3a2441481ff2a732ec6312da9aa.jpg'
  },
  {
    rarity: 'silver',
    rarityLabel: 'Silver',
    reductionLabel: '-2h',
    defaultImage: 'https://gf3.geo.gfsrv.net/cdn5e/dce3a2441481ff2a732ec6312da9aa.jpg'
  },
  {
    rarity: 'gold',
    rarityLabel: 'Gold',
    reductionLabel: '-6h',
    defaultImage: 'https://gf3.geo.gfsrv.net/cdn5e/dce3a2441481ff2a732ec6312da9aa.jpg'
  },
  {
    rarity: 'platinum',
    rarityLabel: 'Platinum',
    reductionLabel: '-24h',
    defaultImage: 'https://gf3.geo.gfsrv.net/cdn5e/dce3a2441481ff2a732ec6312da9aa.jpg'
  }
];

const SPEEDUP_BOX_CONFIGS: BoxTargetConfig[] = [
  {
    id: 'building',
    selectors: [
      '#productionboxbuildingcomponent',
      '.productionboxbuilding',
      'div[id*="productionboxbuilding"]',
      'div[class*="productionboxbuilding"]'
    ],
    category: 'building_speedup',
    speedupTitle: 'Kraken',
    itemNameKeyword: 'kraken',
    isLifeform: false,
    tiers: SPEEDUP_TIERS
  },
  {
    id: 'research',
    selectors: [
      '#productionboxresearchcomponent',
      '.productionboxresearch',
      'div[id*="productionboxresearch"]',
      'div[class*="productionboxresearch"]'
    ],
    category: 'research_speedup',
    speedupTitle: 'Newtron',
    itemNameKeyword: 'newtron',
    isLifeform: false,
    tiers: SPEEDUP_TIERS
  },
  {
    id: 'shipyard',
    selectors: [
      '#productionboxshipyardcomponent',
      '.productionboxshipyard',
      'div[id*="productionboxshipyard"]',
      'div[class*="productionboxshipyard"]'
    ],
    category: 'shipyard_speedup',
    speedupTitle: 'Detroid',
    itemNameKeyword: 'detroid',
    isLifeform: false,
    tiers: SPEEDUP_TIERS
  },
  {
    id: 'lfresearch',
    selectors: [
      '#productionboxlifeformresearchcomponent',
      '#productionboxlifeformsresearchcomponent',
      '#productionboxlfresearchcomponent',
      '.productionboxlifeformresearch',
      '.productionboxlifeformsresearch',
      '.productionboxlfresearch',
      '#productionboxlifeformcomponent',
      '.productionboxlifeform',
      'div[id*="lifeformresearch"]',
      'div[class*="lifeformresearch"]',
      'div[id*="lifeform"][id*="research"]',
      'div[class*="lifeform"][class*="research"]'
    ],
    category: 'lf_research_speedup',
    speedupTitle: 'Newtron (Lifeforms)',
    itemNameKeyword: 'newtron',
    isLifeform: true,
    tiers: SPEEDUP_TIERS
  },
  {
    id: 'lfbuilding',
    selectors: [
      '#productionboxlifeformbuildingcomponent',
      '#productionboxlifeformsbuildingcomponent',
      '#productionboxlfbuildingcomponent',
      '.productionboxlifeformbuilding',
      '.productionboxlifeformsbuilding',
      '.productionboxlfbuilding',
      'div[id*="lifeformbuilding"]',
      'div[class*="lifeformbuilding"]',
      'div[id*="lifeform"][id*="building"]',
      'div[class*="lifeform"][class*="building"]'
    ],
    category: 'lf_building_speedup',
    speedupTitle: 'Kraken (Lifeforms)',
    itemNameKeyword: 'kraken',
    isLifeform: true,
    tiers: SPEEDUP_TIERS
  }
];

const SHOP_INVENTORY_URL = '/game/index.php?page=ingame&component=shop#category=dc9ec90e5a2163cc063b8bb3e9fe392782f565c8&page=inventory&panel1-1=';

// Singleton floating tooltip
let floatingTooltipEl: HTMLElement | null = null;

function showSpeedupTooltip(
  e: MouseEvent,
  name: string,
  reduction: string,
  amount: number,
  rarity: string
) {
  if (!floatingTooltipEl) {
    floatingTooltipEl = document.createElement('div');
    floatingTooltipEl.className = 'nexus-speedup-floating-tooltip';
    document.body.appendChild(floatingTooltipEl);
  }

  const rarityColors: Record<string, string> = {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#00f2ff'
  };
  const color = rarityColors[rarity] || '#00f2ff';

  floatingTooltipEl.innerHTML = `
    <div class="tt-header" style="color: ${color}; font-weight: 800; font-size: 11px; letter-spacing: 0.02em; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 3px; margin-bottom: 4px;">
      ${name}
    </div>
    <div class="tt-body" style="font-size: 10.5px; line-height: 1.45; color: #cbd5e1;">
      <div>Reduces time by <b style="color: #ffffff;">${reduction}</b></div>
      <div style="margin-top: 2px;">In Inventory: <b style="color: #38bdf8;">${amount}</b></div>
    </div>
  `;

  floatingTooltipEl.style.display = 'block';
  positionFloatingTooltip(e);
}

function positionFloatingTooltip(e: MouseEvent) {
  if (!floatingTooltipEl) return;
  const tooltipWidth = floatingTooltipEl.offsetWidth || 150;
  const tooltipHeight = floatingTooltipEl.offsetHeight || 55;

  let left = e.clientX - (tooltipWidth / 2);
  let top = e.clientY - tooltipHeight - 10;

  // Boundary checks
  if (left < 10) left = 10;
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }
  if (top < 10) {
    top = e.clientY + 18; // Flip below cursor if too close to top
  }

  floatingTooltipEl.style.left = `${left}px`;
  floatingTooltipEl.style.top = `${top}px`;
}

function hideSpeedupTooltip() {
  if (floatingTooltipEl) {
    floatingTooltipEl.style.display = 'none';
  }
}

/**
 * Finds the production box element using selectors and header text fallbacks
 */
function findProductionBox(config: BoxTargetConfig): HTMLElement | null {
  for (const selector of config.selectors) {
    const found = document.querySelector(selector) as HTMLElement | null;
    if (found) return found;
  }

  // Fallback: search by header text across all production boxes
  const allBoxes = document.querySelectorAll('div[id*="productionbox"], div[class*="productionbox"], .injectedComponent');
  for (const box of Array.from(allBoxes)) {
    const el = box as HTMLElement;
    const h3 = el.querySelector('.header h3, h3')?.textContent?.trim().toLowerCase() || '';

    if (config.id === 'lfresearch' && (h3.includes('lifeform research') || h3.includes('lf research'))) {
      return el;
    }
    if (config.id === 'lfbuilding' && (h3.includes('lifeform building') || h3.includes('lf building') || h3.includes('lifeforms'))) {
      return el;
    }
    if (config.id === 'building' && h3 === 'buildings') {
      return el;
    }
    if (config.id === 'research' && h3 === 'research') {
      return el;
    }
    if (config.id === 'shipyard' && (h3.includes('shipyard') || h3.includes('defense') || h3.includes('defences'))) {
      return el;
    }
  }

  return null;
}

/**
 * Extracts live items from the DOM #js_inventorySlider if available on the current page
 */
function getLiveSliderItems(): Map<string, { ref: string; name: string; amount: number; element: HTMLElement; imgUrl?: string }> {
  const map = new Map<string, { ref: string; name: string; amount: number; element: HTMLElement; imgUrl?: string }>();
  const slider = document.querySelector('#js_inventorySlider');
  if (!slider) return map;

  const detailButtons = slider.querySelectorAll('a.detail_button');
  detailButtons.forEach(btn => {
    const el = btn as HTMLElement;
    const ref = el.getAttribute('ref') || '';
    const tooltip = el.getAttribute('data-tooltip-title') || el.getAttribute('title') || '';
    const name = tooltip.split('|')[0]?.trim() || '';
    const amountText = el.querySelector('.level.amount')?.textContent?.trim() || '';
    const amount = parseInt(amountText.replace(/[,.]/g, ''), 10) || 1;

    let imgUrl: string | undefined;
    const itemImg = el.closest('.item_img') as HTMLElement | null;
    if (itemImg && itemImg.style.backgroundImage) {
      const match = itemImg.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (match && match[1]) imgUrl = match[1];
    }

    if (ref && name) {
      map.set(name.toLowerCase().trim(), { ref, name, amount, element: el, imgUrl });
    }
  });

  return map;
}

/**
 * Renders speedup rows for active ongoing projects in all 5 production boxes
 */
export async function updateProductionBoxSpeedups(playerId?: string): Promise<void> {
  const targetPlayerId = playerId || document.querySelector("meta[name='ogame-player-id']")?.getAttribute("content") || '';
  const inventory = await getStoredPlayerInventory(targetPlayerId);
  const liveSliderItems = getLiveSliderItems();

  for (const config of SPEEDUP_BOX_CONFIGS) {
    const boxEl = findProductionBox(config);
    if (!boxEl) continue;

    // Check if there is an active ongoing project in the construction table
    const tableEl = (boxEl.querySelector('table.construction.active, table.construction, table') || boxEl.querySelector('.content')) as HTMLElement | null;
    const isIdle = !tableEl || !!boxEl.querySelector('.idle, td.idle');
    const countdownEl = boxEl.querySelector('time.countdown, .buildingCountdown, .countdown, [data-end], [data-time-client]');

    // If queue is idle or has no active construction table, remove existing speedup row if present
    if (isIdle || !countdownEl || !tableEl) {
      const existingRow = boxEl.querySelector(`.nexus-queue-speedup-row[data-config-id="${config.id}"]`);
      if (existingRow) existingRow.remove();
      continue;
    }

    // Filter relevant inventory items for this specific speedup category
    const matchingInventoryItems = inventory.filter(item => {
      const lower = (item.name || '').toLowerCase();
      const isLf = lower.includes('lifeform') || lower.includes('life form') || lower.includes('lifeforms') || lower.includes('(lf)') || lower.includes('lf');

      if (config.isLifeform) {
        return isLf && lower.includes(config.itemNameKeyword);
      } else {
        return !isLf && lower.includes(config.itemNameKeyword);
      }
    });

    // Build available cards (ONLY items with amount > 0)
    let cardsHtml = '';
    let availableCount = 0;

    for (const tier of config.tiers) {
      // Find matching item in stored inventory
      const matchedItem = matchingInventoryItems.find(i => {
        const lower = (i.name || '').toLowerCase();
        const r = (i.rarity || '').toLowerCase();
        return lower.includes(tier.rarity) || r.includes(tier.rarity);
      });

      // Also check live slider
      const liveItem = Array.from(liveSliderItems.values()).find(li => {
        const lower = li.name.toLowerCase();
        const isLf = lower.includes('lifeform') || lower.includes('life forms') || lower.includes('lifeforms') || lower.includes('(lf)') || lower.includes('lf');
        const matchesLf = config.isLifeform ? isLf : !isLf;
        return matchesLf && lower.includes(config.itemNameKeyword) && lower.includes(tier.rarity);
      });

      const amount = (liveItem ? liveItem.amount : (matchedItem?.amount || 0));
      const ref = liveItem?.ref || matchedItem?.ref || '';

      // Skip unavailable tiers completely (don't show 0-count grayed out items)
      if (amount <= 0) continue;

      availableCount++;

      const itemName = matchedItem?.name || liveItem?.name || `${tier.rarityLabel} ${config.speedupTitle}`;
      const imgUrl = liveItem?.imgUrl || matchedItem?.iconUrl || matchedItem?.imageLargeUrl || tier.defaultImage;

      cardsHtml += `
        <div class="nexus-speedup-card r-${tier.rarity}"
             data-ref="${ref}"
             data-item-name="${itemName}"
             data-amount="${amount}"
             data-reduction="${tier.reductionLabel}"
             data-rarity="${tier.rarity}">
          <div class="nexus-speedup-img-wrapper">
            <img class="nexus-speedup-img" src="${imgUrl}" alt="${itemName}" onerror="this.style.opacity='0.4';" />
            <span class="nexus-speedup-count-pill">x${amount}</span>
          </div>
        </div>
      `;
    }

    // If player has no speedup items of this type at all, remove/hide the row
    if (availableCount === 0) {
      const existingRow = boxEl.querySelector(`.nexus-queue-speedup-row[data-config-id="${config.id}"]`);
      if (existingRow) existingRow.remove();
      continue;
    }

    // Check if row already exists
    let rowEl = boxEl.querySelector(`.nexus-queue-speedup-row[data-config-id="${config.id}"]`) as HTMLElement | null;
    if (!rowEl) {
      rowEl = document.createElement('div');
      rowEl.className = 'nexus-queue-speedup-row';
      rowEl.setAttribute('data-config-id', config.id);

      // Put the row directly under table or inside content
      if (tableEl.tagName.toLowerCase() === 'table') {
        tableEl.insertAdjacentElement('afterend', rowEl);
      } else {
        tableEl.appendChild(rowEl);
      }

      // Attach delegated event listeners once to avoid dropped clicks
      rowEl.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.nexus-speedup-card') as HTMLElement | null;
        if (!card) return;

        e.preventDefault();
        e.stopPropagation();
        hideSpeedupTooltip();

        const ref = card.getAttribute('data-ref') || '';
        const itemParam = ref ? `&item=${encodeURIComponent(ref)}` : '';
        const targetHash = `category=dc9ec90e5a2163cc063b8bb3e9fe392782f565c8${itemParam}&page=inventory&panel1-1=`;
        const targetUrl = `/game/index.php?page=ingame&component=shop#${targetHash}`;

        if (window.location.href.includes('component=shop')) {
          window.location.hash = targetHash;
          window.location.reload();
        } else {
          window.location.href = targetUrl;
        }
      });

      rowEl.addEventListener('mouseover', (e) => {
        const card = (e.target as HTMLElement).closest('.nexus-speedup-card') as HTMLElement | null;
        if (!card) return;
        const name = card.getAttribute('data-item-name') || '';
        const reduction = card.getAttribute('data-reduction') || '';
        const amount = parseInt(card.getAttribute('data-amount') || '1', 10);
        const rarity = card.getAttribute('data-rarity') || 'bronze';
        showSpeedupTooltip(e as MouseEvent, name, reduction, amount, rarity);
      });

      rowEl.addEventListener('mousemove', (e) => {
        positionFloatingTooltip(e as MouseEvent);
      });

      rowEl.addEventListener('mouseout', (e) => {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && rowEl?.contains(related) && related.closest('.nexus-speedup-card')) return;
        hideSpeedupTooltip();
      });
    }

    // Only update innerHTML if the content has actually changed to prevent destroying elements mid-click
    const prevRenderHash = rowEl.getAttribute('data-render-hash') || '';
    if (prevRenderHash !== cardsHtml) {
      rowEl.setAttribute('data-render-hash', cardsHtml);
      rowEl.innerHTML = `
        <div class="nexus-speedup-grid">
          ${cardsHtml}
        </div>
      `;
    }
  }
}

/**
 * Initializes listeners and throttled triggers for production box speedups
 */
let speedupsInitDone = false;
export function initProductionBoxSpeedups(): void {
  if (speedupsInitDone) return;
  speedupsInitDone = true;

  const getPlayerId = () => document.querySelector("meta[name='ogame-player-id']")?.getAttribute("content") || '';

  // Run on initial load
  updateProductionBoxSpeedups(getPlayerId());

  // Re-run whenever inventory is updated
  window.addEventListener('ogame-nexus-empire-sync-completed', () => {
    updateProductionBoxSpeedups(getPlayerId());
  });

  // Re-run on storage change
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        const curPlayerId = getPlayerId();
        const playerInvKey = `nexus_player_inventory_${curPlayerId}`;
        const queueKey = `nexus_production_queue_${curPlayerId}`;
        if (changes[playerInvKey] || changes.nexus_player_inventory || changes[queueKey] || changes.nexus_production_queue) {
          updateProductionBoxSpeedups(curPlayerId);
        }
      }
    });
  }
}
