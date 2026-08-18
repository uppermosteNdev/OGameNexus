// Centralized Flying Fleet Movements Engine
// Inspired by OGLight MovementManager architecture

export interface FleetCoordinates {
  coords: string;
  isMoon: boolean;
  isOwn: boolean;
  name?: string;
}

export interface FlyingFleet {
  id: number;
  missionType: number; // 1=Attack, 2=ACS, 3=Transport, 4=Deploy, 5=Hold, 6=Spy, 7=Colonize, 8=Harvest, 9=Destroy, 15=Expedition, 18=LF Discovery
  missionName: string;
  isReturn: boolean;
  arrivalTime: number; // millisecond timestamp
  origin: FleetCoordinates;
  destination: FleetCoordinates;
  ships: Record<string, number>; // ship name -> count
  totalShips: number;
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    food: number;
  };
  isHostile: boolean;
}

export interface DispatchSlotsInfo {
  lastUpdated: number;
  usedFleetSlots: number;
  totalFleetSlots: number;
  usedExpeditionSlots: number;
  totalExpeditionSlots: number;
  idleExpeditionSlots: number;
  idleFleetSlots: number;
}

export interface FleetMovementsData {
  lastUpdated: number;
  fleets: FlyingFleet[];
  byCoordinate: Record<string, {
    incoming: number[]; // fleet ids
    outgoing: number[]; // fleet ids
    returning: number[]; // fleet ids
  }>;
  summary: {
    totalFleets: number;
    totalOwnShips: number;
    hostileCount: number;
    expeditionCount: number;
    discoveryCount: number;
    recyclingCoords: string[];
    flyingResources: {
      metal: number;
      crystal: number;
      deuterium: number;
      food: number;
    };
  };
  dispatchSlots?: DispatchSlotsInfo;
}

export const STORAGE_KEY_FLEET_MOVEMENTS = 'nexus_fleet_movements';

let memoryCache: FleetMovementsData | null = null;
let lastFetchTimestamp = 0;
const FETCH_THROTTLE_MS = 3000; // 3 second throttle for proactive fetch

const MISSION_NAMES: Record<number, string> = {
  1: 'Attack',
  2: 'ACS Attack',
  3: 'Transport',
  4: 'Deploy',
  5: 'Hold',
  6: 'Espionage',
  7: 'Colonize',
  8: 'Harvest',
  9: 'Destroy',
  15: 'Expedition',
  18: 'Discovery'
};

/**
 * Get list of coordinates belonging to the active player from DOM
 */
export function getPlayerOwnCoordinates(): string[] {
  const coordsList: string[] = [];
  try {
    const planetCoordsEls = document.querySelectorAll(
      '#planetList .planet-koords, .smallplanet .planet-koords, #myPlanets .planet-koords, #myWorlds .planet-koords'
    );
    planetCoordsEls.forEach(el => {
      const text = el.textContent?.trim().replace(/[\[\]]/g, '');
      if (text && /^\d+:\d+:\d+$/.test(text) && !coordsList.includes(text)) {
        coordsList.push(text);
      }
    });
  } catch (e) {
    console.warn('OGame Nexus: Error reading own coordinates list', e);
  }
  return coordsList;
}

/**
 * Parse an event table container (either DOM #eventContent or parsed DOM from AJAX response)
 */
export function parseEventListDom(root: Element | Document): FleetMovementsData {
  const ownCoords = getPlayerOwnCoordinates();
  const rows = root.querySelectorAll('tr.eventFleet, .eventFleet');

  const fleets: FlyingFleet[] = [];
  const byCoordinate: Record<string, { incoming: number[]; outgoing: number[]; returning: number[] }> = {};
  const recyclingCoordsSet = new Set<string>();

  let totalOwnShips = 0;
  let hostileCount = 0;
  let expeditionCount = 0;
  let discoveryCount = 0;
  let totalMetal = 0;
  let totalCrystal = 0;
  let totalDeuterium = 0;
  let totalFood = 0;

  rows.forEach(row => {
    try {
      const rowIdAttr = row.getAttribute('id') || '';
      const fleetId = parseInt(rowIdAttr.replace(/\D/g, ''), 10) || Date.now();
      const missionType = parseInt(row.getAttribute('data-mission-type') || '0', 10);
      const isReturn = row.getAttribute('data-return-flight') === 'true';
      const arrivalTimeSec = parseInt(row.getAttribute('data-arrival-time') || '0', 10);
      const arrivalTime = arrivalTimeSec > 0 ? arrivalTimeSec * 1000 : Date.now();

      // Origin
      const originCoordsEl = row.querySelector('.coordsOrigin, .originCoords');
      const originCoords = originCoordsEl?.textContent?.trim().replace(/[\[\]]/g, '') || '';
      const originIsMoon = Boolean(row.querySelector('.originFleet figure.moon, .originFleet .moon, .originMoon'));
      const originName = row.querySelector('.originFleet .originPlanet, .originPlanet')?.textContent?.trim() || '';
      const originIsOwn = ownCoords.includes(originCoords);

      // Destination
      const destCoordsEl = row.querySelector('.destCoords, .destinationCoords');
      const destCoords = destCoordsEl?.textContent?.trim().replace(/[\[\]]/g, '') || '';
      const destIsMoon = Boolean(row.querySelector('.destFleet figure.moon, .destFleet .moon, .destMoon'));
      const destName = row.querySelector('.destFleet .destPlanet, .destinationPlanet')?.textContent?.trim() || '';
      const destIsOwn = ownCoords.includes(destCoords);

      // Hostile detection: Attack/Espionage/Destruction incoming from another player to our planet
      const isHostile = (missionType === 1 || missionType === 6 || missionType === 9) && !originIsOwn && destIsOwn && !isReturn;
      if (isHostile) hostileCount++;

      // Mission counters
      if (missionType === 15) expeditionCount++;
      if (missionType === 18) discoveryCount++;
      if (missionType === 8 && destCoords) recyclingCoordsSet.add(destCoords);

      // Parse Ship and Cargo Tooltip
      const ships: Record<string, number> = {};
      let totalShipsInFleet = 0;
      let fleetMetal = 0;
      let fleetCrystal = 0;
      let fleetDeut = 0;
      let fleetFood = 0;

      const detailsTd = row.querySelector('td.detailsFleet, .detailsFleet');
      if (detailsTd) {
        const text = detailsTd.textContent?.replace(/[,.]/g, '').trim() || '0';
        totalShipsInFleet = parseInt(text, 10) || 0;
      }

      const tooltipSpan = row.querySelector(
        'td.icon_movement span.tooltip, td.icon_movement_reserve span.tooltip, .icon_movement .tooltip, .icon_movement_reserve .tooltip'
      );
      const tooltipHtml = tooltipSpan?.getAttribute('data-tooltip-title') || tooltipSpan?.getAttribute('title') || '';

      if (tooltipHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(tooltipHtml, 'text/html');
          const infoRows = doc.querySelectorAll('table.fleetinfo tr');

          let isShipmentSection = false;
          let thIndex = 0;

          infoRows.forEach(tr => {
            const th = tr.querySelector('th');
            if (th) {
              thIndex++;
              if (thIndex >= 2 || th.textContent?.toLowerCase().includes('shipment') || th.textContent?.toLowerCase().includes('ladung')) {
                isShipmentSection = true;
              }
            } else {
              const labelTd = tr.querySelector('td:not(.value)');
              const valTd = tr.querySelector('td.value');
              if (labelTd && valTd) {
                const label = labelTd.textContent?.trim().replace(':', '') || '';
                const val = parseInt(valTd.textContent?.replace(/[,.]/g, '').trim() || '0', 10) || 0;
                const labelLow = label.toLowerCase();

                if (isShipmentSection) {
                  const isMetal = labelLow.includes('metal') || labelLow.includes('metall') || labelLow.includes('métal') || labelLow.includes('металл');
                  const isCrystal = labelLow.includes('crystal') || labelLow.includes('kristall') || labelLow.includes('cristal') || labelLow.includes('кристалл') || labelLow.includes('krysz');
                  const isDeut = labelLow.includes('deuter') || labelLow.includes('дейтерий');
                  const isFood = labelLow.includes('food') || labelLow.includes('nahr') || labelLow.includes('nourr') || labelLow.includes('comid') || labelLow.includes('пища') || labelLow.includes('żyw') || labelLow.includes('zyw');

                  if (isMetal) fleetMetal += val;
                  else if (isCrystal) fleetCrystal += val;
                  else if (isDeut) fleetDeut += val;
                  else if (isFood) fleetFood += val;
                } else {
                  if (label && val > 0) {
                    ships[label] = val;
                  }
                }
              }
            }
          });
        } catch (e) {
          // fallback if tooltip parse fails
        }
      }

      if (originIsOwn) {
        totalOwnShips += totalShipsInFleet;
        totalMetal += fleetMetal;
        totalCrystal += fleetCrystal;
        totalDeuterium += fleetDeut;
        totalFood += fleetFood;
      }

      const fleet: FlyingFleet = {
        id: fleetId,
        missionType,
        missionName: MISSION_NAMES[missionType] || `Mission ${missionType}`,
        isReturn,
        arrivalTime,
        origin: {
          coords: originCoords,
          isMoon: originIsMoon,
          isOwn: originIsOwn,
          name: originName || undefined
        },
        destination: {
          coords: destCoords,
          isMoon: destIsMoon,
          isOwn: destIsOwn,
          name: destName || undefined
        },
        ships,
        totalShips: totalShipsInFleet,
        resources: {
          metal: fleetMetal,
          crystal: fleetCrystal,
          deuterium: fleetDeut,
          food: fleetFood
        },
        isHostile
      };

      fleets.push(fleet);

      // Index by coordinate
      if (originCoords) {
        if (!byCoordinate[originCoords]) {
          byCoordinate[originCoords] = { incoming: [], outgoing: [], returning: [] };
        }
        if (isReturn) {
          byCoordinate[originCoords].returning.push(fleetId);
        } else {
          byCoordinate[originCoords].outgoing.push(fleetId);
        }
      }

      if (destCoords && destCoords !== originCoords) {
        if (!byCoordinate[destCoords]) {
          byCoordinate[destCoords] = { incoming: [], outgoing: [], returning: [] };
        }
        if (!isReturn) {
          byCoordinate[destCoords].incoming.push(fleetId);
        }
      }
    } catch (err) {
      console.warn('OGame Nexus: Error parsing single event fleet row', err);
    }
  });

  const activeExpeditions = countActiveMissions(fleets, 15);
  const activeDiscoveries = countActiveMissions(fleets, 18);

  return {
    lastUpdated: Date.now(),
    fleets,
    byCoordinate,
    summary: {
      totalFleets: fleets.length,
      totalOwnShips,
      hostileCount,
      expeditionCount: activeExpeditions,
      discoveryCount: activeDiscoveries,
      recyclingCoords: Array.from(recyclingCoordsSet),
      flyingResources: {
        metal: totalMetal,
        crystal: totalCrystal,
        deuterium: totalDeuterium,
        food: totalFood
      }
    }
  };
}

/**
 * Counts unique active ongoing missions in flight.
 * In OGame, every active expedition has exactly one returning leg in tr.eventFleet from dispatch until landing.
 */
export function countActiveMissions(fleets: FlyingFleet[], missionType: number): number {
  const missionFleets = fleets.filter(f => f.missionType === missionType);
  if (missionFleets.length === 0) return 0;

  const returning = missionFleets.filter(f => f.isReturn);
  if (returning.length > 0) {
    return returning.length;
  }

  // Fallback if only outgoing legs are present
  return missionFleets.length;
}

let lastSavedFingerprint = '';

/**
 * Save fleet movements to chrome.storage.local and update memory cache
 */
export async function saveFleetMovements(data: FleetMovementsData): Promise<void> {
  // Preserve existing dispatchSlots if incoming data does not contain it
  if (!data.dispatchSlots && memoryCache?.dispatchSlots) {
    data.dispatchSlots = memoryCache.dispatchSlots;
  }

  const dispatchKey = data.dispatchSlots ? `${data.dispatchSlots.usedExpeditionSlots}/${data.dispatchSlots.totalExpeditionSlots}_${data.dispatchSlots.usedFleetSlots}/${data.dispatchSlots.totalFleetSlots}` : 'none';
  const fingerprint = `${data.fleets.length}_${data.summary.totalOwnShips}_${data.summary.expeditionCount}_${dispatchKey}_${data.fleets.map(f => f.id).join(',')}`;
  
  if (fingerprint === lastSavedFingerprint && memoryCache) {
    // No changes, avoid spamming storage and event listeners
    return;
  }
  
  lastSavedFingerprint = fingerprint;
  memoryCache = data;
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_KEY_FLEET_MOVEMENTS]: data });
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('OGame Nexus: Error saving fleet movements to storage', e);
    }
  }

  // Dispatch window event for live in-page components
  window.dispatchEvent(new CustomEvent('ogame-nexus-fleet-movements-updated', {
    detail: data
  }));
}

/**
 * Retrieve current stored fleet movements (checks memory cache first, then chrome.storage.local)
 */
export async function getStoredFleetMovements(): Promise<FleetMovementsData | null> {
  if (memoryCache && Date.now() - memoryCache.lastUpdated < 60000) {
    return memoryCache;
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_FLEET_MOVEMENTS);
      if (res && res[STORAGE_KEY_FLEET_MOVEMENTS]) {
        memoryCache = res[STORAGE_KEY_FLEET_MOVEMENTS] as FleetMovementsData;
        return memoryCache;
      }
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('OGame Nexus: Error loading fleet movements from storage', e);
    }
  }
  return null;
}

/**
 * Parse and update fleet movements from raw HTML or V13+ JSON content
 */
export async function updateFleetMovementsFromHtml(rawHtmlOrJson: string): Promise<FleetMovementsData | null> {
  if (!rawHtmlOrJson) return null;

  let html = rawHtmlOrJson.trim();
  if (html.startsWith('{') || html.startsWith('[')) {
    try {
      const json = JSON.parse(html);
      html = json?.content?.eventlist || json?.eventlist || '';
    } catch (e) {
      // keep raw string
    }
  }

  if (!html) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const data = parseEventListDom(doc);
    await saveFleetMovements(data);
    return data;
  } catch (e) {
    console.warn('OGame Nexus: Failed to parse event list HTML', e);
    return null;
  }
}

/**
 * Initialize event listeners to passively update fleet movements
 */
export function initFleetMovementListener(): void {
  // 1. Listen for AJAX responses passively intercepted from OGame's own requests
  window.addEventListener('ogame-nexus-ajax-eventlist-loaded', (e: any) => {
    const html = e?.detail?.html;
    if (html) {
      updateFleetMovementsFromHtml(html);
    }
  });

  // 2. Passive check on current page DOM
  const eventContent = document.getElementById('eventContent') || document.getElementById('eventListWrap');
  if (eventContent && eventContent.querySelectorAll('tr.eventFleet, .eventFleet').length > 0) {
    const data = parseEventListDom(eventContent);
    saveFleetMovements(data);
    return;
  }
}

/**
 * Language-agnostic, rock-solid parser for #slots on component=fleetdispatch
 */
export function parseDispatchSlotsDom(doc: Document | HTMLElement = document): DispatchSlotsInfo | null {
  const slotsContainer = doc.querySelector('#slots');
  if (!slotsContainer) return null;

  try {
    let usedFleets: number | undefined;
    let totalFleets: number | undefined;
    let usedExpeditions: number | undefined;
    let totalExpeditions: number | undefined;

    // Strategy 1: Iterate over advice / tooltip spans inside #slots
    const adviceElements = Array.from(slotsContainer.querySelectorAll('.advice, .tooltip.advice, div.fleft > span'));

    adviceElements.forEach((el, index) => {
      const text = el.textContent || '';
      const tooltip = el.getAttribute('data-tooltip-title') || el.getAttribute('title') || '';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/) || tooltip.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) return;

      const used = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (isNaN(used) || isNaN(total)) return;

      const combinedLower = (text + ' ' + tooltip).toLowerCase();
      const isExpedition = combinedLower.includes('expedition') ||
                           combinedLower.includes('ekspedycj') ||
                           combinedLower.includes('expédit') ||
                           combinedLower.includes('exped') ||
                           index === 1;

      if (isExpedition && usedExpeditions === undefined) {
        usedExpeditions = used;
        totalExpeditions = total;
      } else if (usedFleets === undefined) {
        usedFleets = used;
        totalFleets = total;
      }
    });

    // Strategy 2: Direct positional extraction on .fleft containers
    if (usedExpeditions === undefined || usedFleets === undefined) {
      const fleftDivs = Array.from(slotsContainer.querySelectorAll(':scope > div.fleft, div.fleft'));
      if (fleftDivs.length >= 2) {
        if (usedFleets === undefined) {
          const match1 = fleftDivs[0].textContent?.match(/(\d+)\s*\/\s*(\d+)/);
          if (match1) {
            usedFleets = parseInt(match1[1], 10);
            totalFleets = parseInt(match1[2], 10);
          }
        }
        if (usedExpeditions === undefined) {
          const match2 = fleftDivs[1].textContent?.match(/(\d+)\s*\/\s*(\d+)/);
          if (match2) {
            usedExpeditions = parseInt(match2[1], 10);
            totalExpeditions = parseInt(match2[2], 10);
          }
        }
      }
    }

    if (usedExpeditions === undefined && usedFleets === undefined) {
      return null;
    }

    const uExp = usedExpeditions ?? 0;
    const tExp = totalExpeditions ?? 0;
    const uFlt = usedFleets ?? 0;
    const tFlt = totalFleets ?? 0;

    return {
      lastUpdated: Date.now(),
      usedFleetSlots: uFlt,
      totalFleetSlots: tFlt,
      usedExpeditionSlots: uExp,
      totalExpeditionSlots: tExp,
      idleExpeditionSlots: Math.max(0, tExp - uExp),
      idleFleetSlots: Math.max(0, tFlt - uFlt)
    };
  } catch (err) {
    console.warn('OGame Nexus: Error parsing fleetdispatch #slots', err);
    return null;
  }
}

/**
 * Update dispatch slots from live DOM into nexus_fleet_movements storage
 */
export async function updateDispatchSlotsFromDom(doc: Document | HTMLElement = document): Promise<DispatchSlotsInfo | null> {
  const info = parseDispatchSlotsDom(doc);
  if (!info) return null;

  const currentData = await getStoredFleetMovements() || {
    lastUpdated: 0,
    fleets: [],
    byCoordinate: {},
    summary: {
      totalFleets: 0,
      totalOwnShips: 0,
      hostileCount: 0,
      expeditionCount: info.usedExpeditionSlots,
      discoveryCount: 0,
      recyclingCoords: [],
      flyingResources: { metal: 0, crystal: 0, deuterium: 0, food: 0 }
    }
  };

  currentData.dispatchSlots = info;
  // If dispatchSlots is newer than latest background sync, update summary.expeditionCount
  if (info.lastUpdated >= (currentData.lastUpdated || 0)) {
    currentData.summary.expeditionCount = info.usedExpeditionSlots;
  }

  await saveFleetMovements(currentData);
  return info;
}
