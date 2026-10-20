import { cleanUniverseId } from '../utils/universe';

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
  flight?: 'Outbound' | 'Holding' | 'Return';
  arrivalTime: number; // millisecond timestamp of next milestone
  returnTime?: number; // millisecond timestamp of final return landing
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
  playerId?: string;
  universe?: string;
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
export const STORAGE_KEY_FLYING_FLEETS = 'nexus_flying_fleets';

export interface FormattedFlyingFleet {
  id: number;
  mission: string;
  flight: 'Return' | 'Outbound' | 'Holding';
  isOwn: boolean;
  origin: string;
  originCoords?: string;
  destination: string;
  destCoords?: string;
  arrival: string;
  returnTime?: string;
  countdown: string;
  totalShips: number;
  shipsJSON: string;
  cargoJSON: string;
  ships: Record<string, number>;
  cargo: {
    metal: number;
    crystal: number;
    deut: number;
    food: number;
  };
  playerId?: string;
  universe?: string;
}

export function getCurrentPlayerAndUniverse(explicitPlayerId?: string, explicitUniverse?: string): { playerId: string; universe: string } {
  let pId = explicitPlayerId;
  let uni = explicitUniverse;

  if (!pId && typeof document !== 'undefined') {
    pId = document.querySelector('meta[name="ogame-player-id"]')?.getAttribute('content') || '';
  }
  if (!uni && typeof document !== 'undefined') {
    const raw = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content') || '';
    uni = cleanUniverseId(raw);
  }

  return {
    playerId: pId || '',
    universe: uni ? cleanUniverseId(uni) : ''
  };
}

export function formatFlyingFleets(fleets: FlyingFleet[], playerId?: string, universe?: string): FormattedFlyingFleet[] {
  const now = Date.now();
  return fleets.map(f => {
    let countdown = '-';
    if (f.arrivalTime > now) {
      const diffSec = Math.round((f.arrivalTime - now) / 1000);
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      countdown = `${m}m ${s}s`;
    }

    const cargo = {
      metal: f.resources.metal,
      crystal: f.resources.crystal,
      deut: f.resources.deuterium,
      food: f.resources.food
    };

    const flightStatus: 'Return' | 'Outbound' | 'Holding' =
      f.flight || (f.isReturn ? 'Return' : 'Outbound');

    return {
      id: f.id,
      mission: f.missionName,
      flight: flightStatus,
      isOwn: f.origin.isOwn,
      origin: `${f.origin.coords} (${f.origin.isMoon ? 'Moon' : 'Planet'})`,
      originCoords: f.origin?.coords,
      destination: `${f.destination.coords} (${f.destination.isMoon ? 'Moon' : 'Planet'})`,
      destCoords: f.destination?.coords,
      arrival: f.arrivalTime ? new Date(f.arrivalTime).toLocaleTimeString() : '?',
      returnTime: f.returnTime ? new Date(f.returnTime).toLocaleTimeString() : undefined,
      countdown,
      totalShips: f.totalShips,
      shipsJSON: JSON.stringify(f.ships),
      cargoJSON: JSON.stringify(cargo),
      ships: f.ships,
      cargo,
      playerId: playerId || undefined,
      universe: universe || undefined
    };
  });
}

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
  16: 'Discovery',
  17: 'Lifeform Food',
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

interface RawEventLeg {
  id: number;
  missionType: number;
  missionName: string;
  isReturn: boolean;
  arrivalTime: number;
  origin: FleetCoordinates;
  destination: FleetCoordinates;
  ships: Record<string, number>;
  totalShips: number;
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    food: number;
  };
  isHostile: boolean;
  hasRecallButton: boolean;
}

function mergeFleetLegGroup(legs: RawEventLeg[], id?: number): FlyingFleet {
  legs.sort((a, b) => a.arrivalTime - b.arrivalTime);
  const returns = legs.filter(l => l.isReturn);
  const outbounds = legs.filter(l => !l.isReturn);

  let flight: 'Outbound' | 'Holding' | 'Return' = 'Outbound';
  let arrivalTime = legs[0].arrivalTime;
  let returnTime: number | undefined = undefined;
  let isReturn = false;

  if (returns.length > 0 && outbounds.length > 0) {
    const nextLeg = outbounds[0];
    const retLeg = returns[returns.length - 1];
    const isHolding = legs[0].missionType === 15 && outbounds.length === 1 && !outbounds[0].hasRecallButton;
    flight = isHolding ? 'Holding' : 'Outbound';
    isReturn = false;
    arrivalTime = nextLeg.arrivalTime;
    returnTime = retLeg.arrivalTime;
  } else if (returns.length > 0) {
    flight = 'Return';
    isReturn = true;
    arrivalTime = returns[0].arrivalTime;
    returnTime = returns[returns.length - 1].arrivalTime;
  } else {
    flight = 'Outbound';
    isReturn = false;
    arrivalTime = outbounds[0].arrivalTime;
    returnTime = undefined;
  }

  const mergedShips: Record<string, number> = {};
  legs.forEach(l => {
    Object.entries(l.ships).forEach(([k, v]) => {
      if (v > (mergedShips[k] || 0)) mergedShips[k] = v;
    });
  });
  const totalShips = Math.max(...legs.map(l => l.totalShips), Object.values(mergedShips).reduce((a, b) => a + b, 0));

  const mergedResources = {
    metal: Math.max(...legs.map(l => l.resources.metal)),
    crystal: Math.max(...legs.map(l => l.resources.crystal)),
    deuterium: Math.max(...legs.map(l => l.resources.deuterium)),
    food: Math.max(...legs.map(l => l.resources.food))
  };

  const first = legs[0];
  return {
    id: id || first.id || Date.now(),
    missionType: first.missionType,
    missionName: first.missionName,
    isReturn,
    flight,
    arrivalTime,
    returnTime,
    origin: first.origin,
    destination: first.destination,
    ships: mergedShips,
    totalShips,
    resources: mergedResources,
    isHostile: first.isHostile
  };
}

function pairRouteLegs(legs: RawEventLeg[]): FlyingFleet[] {
  legs.sort((a, b) => a.arrivalTime - b.arrivalTime);
  const returns = legs.filter(l => l.isReturn);
  const outbounds = legs.filter(l => !l.isReturn);
  const missionType = legs[0].missionType;
  const result: FlyingFleet[] = [];

  if (missionType === 15 || missionType === 5) {
    // Expeditions / Hold
    if (returns.length > 0 && outbounds.length >= returns.length * 2) {
      // 2 outbounds per return: Outbound flight + Holding period
      for (let i = 0; i < returns.length; i++) {
        const outLeg = outbounds[i];
        const holdLeg = outbounds[i + returns.length];
        const retLeg = returns[i];
        result.push(mergeFleetLegGroup([outLeg, holdLeg, retLeg], outLeg.id || retLeg.id));
      }
      // Any remaining outbounds
      for (let i = returns.length * 2; i < outbounds.length; i++) {
        result.push(mergeFleetLegGroup([outbounds[i]], outbounds[i].id));
      }
    } else if (returns.length > 0 && outbounds.length === returns.length) {
      // 1 non-return per return: fleet is either outbound or in holding
      for (let i = 0; i < returns.length; i++) {
        const nonRetLeg = outbounds[i];
        const retLeg = returns[i];
        result.push(mergeFleetLegGroup([nonRetLeg, retLeg], nonRetLeg.id || retLeg.id));
      }
    } else if (outbounds.length === 0) {
      // Returning only
      returns.forEach(r => result.push(mergeFleetLegGroup([r], r.id)));
    } else {
      // General pair
      const pairs = Math.min(outbounds.length, returns.length);
      for (let i = 0; i < pairs; i++) {
        result.push(mergeFleetLegGroup([outbounds[i], returns[i]], outbounds[i].id || returns[i].id));
      }
      for (let i = pairs; i < outbounds.length; i++) {
        result.push(mergeFleetLegGroup([outbounds[i]], outbounds[i].id));
      }
      for (let i = pairs; i < returns.length; i++) {
        result.push(mergeFleetLegGroup([returns[i]], returns[i].id));
      }
    }
  } else {
    // Standard 2-leg or 1-leg missions (Attack, Transport, Deploy, Spy, Recycle, etc.)
    const pairs = Math.min(outbounds.length, returns.length);
    for (let i = 0; i < pairs; i++) {
      result.push(mergeFleetLegGroup([outbounds[i], returns[i]], outbounds[i].id || returns[i].id));
    }
    for (let i = pairs; i < outbounds.length; i++) {
      result.push(mergeFleetLegGroup([outbounds[i]], outbounds[i].id));
    }
    for (let i = pairs; i < returns.length; i++) {
      result.push(mergeFleetLegGroup([returns[i]], returns[i].id));
    }
  }

  return result;
}

function groupByRoute(legs: RawEventLeg[]): Map<string, RawEventLeg[]> {
  const groups = new Map<string, RawEventLeg[]>();
  legs.forEach(leg => {
    const key = `${leg.missionType}_${leg.origin.coords}_${leg.origin.isMoon ? 'M' : 'P'}_${leg.destination.coords}_${leg.destination.isMoon ? 'M' : 'P'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(leg);
  });
  return groups;
}

export function consolidateFleetLegs(rawLegs: RawEventLeg[]): FlyingFleet[] {
  const result: FlyingFleet[] = [];
  const hostileLegs = rawLegs.filter(l => l.isHostile);
  const friendlyLegs = rawLegs.filter(l => !l.isHostile);

  hostileLegs.forEach(leg => {
    result.push({
      id: leg.id || Date.now(),
      missionType: leg.missionType,
      missionName: leg.missionName,
      isReturn: false,
      flight: 'Outbound',
      arrivalTime: leg.arrivalTime,
      returnTime: undefined,
      origin: leg.origin,
      destination: leg.destination,
      ships: leg.ships,
      totalShips: leg.totalShips,
      resources: leg.resources,
      isHostile: true
    });
  });

  // Check if legs share a non-zero fleetId
  const byIdGroups = new Map<number, RawEventLeg[]>();
  const unkeyedFriendlyLegs: RawEventLeg[] = [];

  friendlyLegs.forEach(leg => {
    if (leg.id > 0) {
      if (!byIdGroups.has(leg.id)) byIdGroups.set(leg.id, []);
      byIdGroups.get(leg.id)!.push(leg);
    } else {
      unkeyedFriendlyLegs.push(leg);
    }
  });

  const hasSharedIds = Array.from(byIdGroups.values()).some(g => g.length > 1);

  if (hasSharedIds) {
    byIdGroups.forEach((legs, fleetId) => {
      result.push(mergeFleetLegGroup(legs, fleetId));
    });
    if (unkeyedFriendlyLegs.length > 0) {
      const remainingGroups = groupByRoute(unkeyedFriendlyLegs);
      remainingGroups.forEach(legs => {
        result.push(...pairRouteLegs(legs));
      });
    }
  } else {
    const routeGroups = groupByRoute(friendlyLegs);
    routeGroups.forEach(legs => {
      result.push(...pairRouteLegs(legs));
    });
  }

  return result.sort((a, b) => a.arrivalTime - b.arrivalTime);
}

/**
 * Parse an event table container (either DOM #eventContent or parsed DOM from AJAX response)
 */
export function parseEventListDom(root: Element | Document): FleetMovementsData {
  const ownCoords = getPlayerOwnCoordinates();
  const allRows = root.querySelectorAll('#eventContent tbody tr, tr.eventFleet, tr[id^="eventRow-"], .eventFleet');
  const rows = Array.from(allRows).filter(r => 
    r.hasAttribute('data-mission-type') || 
    r.id?.startsWith('eventRow-') || 
    r.classList.contains('eventFleet')
  );

  const rawLegs: RawEventLeg[] = [];

  rows.forEach(row => {
    try {
      const rowIdAttr = row.getAttribute('id') || '';
      const fleetId = parseInt(rowIdAttr.replace(/\D/g, ''), 10) || 0;
      const missionType = parseInt(row.getAttribute('data-mission-type') || '0', 10);
      const isReturn = row.getAttribute('data-return-flight') === 'true' 
                    || row.classList.contains('reverse') 
                    || Boolean(row.querySelector('.icon_movement_reserve'));
      const arrivalTimeSec = parseInt(row.getAttribute('data-arrival-time') || '0', 10);
      const arrivalTime = arrivalTimeSec > 0 ? arrivalTimeSec * 1000 : Date.now();

      // Origin
      const originCoordsEl = row.querySelector('.coordsOrigin, .originCoords');
      const originCoords = originCoordsEl?.textContent?.trim().replace(/[\[\]]/g, '') || '';
      const originIsMoon = Boolean(row.querySelector('.originFleet figure.moon, .originFleet .moon, .originMoon, figure.moon'));
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

      // Recall button detection
      const hasRecallButton = Boolean(row.querySelector('a.icon_reverse, a.reversal, .icon_movement .reversal, td.sendMail a, a[href*="sendShipsWithRecursion"]'));

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

      // Search all candidate elements inside row that could hold the tooltip HTML
      let tooltipHtml = '';
      const candidates = row.querySelectorAll(
        '.icon_movement *[title], .icon_movement_reserve *[title], *[title*="fleetinfo"], *[data-tooltip-title*="fleetinfo"], .tooltip, [title]'
      );
      const w = typeof window !== 'undefined' ? (window as any) : {};
      for (const el of Array.from(candidates)) {
        const t = el.getAttribute('title') 
               || el.getAttribute('data-tooltip-title') 
               || el.getAttribute('data-title') 
               || (el as HTMLElement).dataset?.tooltipTitle 
               || (typeof w.$ !== 'undefined' ? w.$(el).data('tooltip-title') : '') 
               || ((el as any)._tippy?.props?.content ? (typeof (el as any)._tippy.props.content === 'string' ? (el as any)._tippy.props.content : (el as any)._tippy.props.content.innerHTML) : '')
               || '';

        if (t && (t.includes('fleetinfo') || t.includes('<table') || t.includes('tr'))) {
          tooltipHtml = t;
          break;
        }
      }

      if (!tooltipHtml) {
        for (const el of Array.from(candidates)) {
          const t = el.getAttribute('title') || el.getAttribute('data-tooltip-title') || '';
          if (t && t.length > 5) {
            tooltipHtml = t;
            break;
          }
        }
      }

      if (tooltipHtml) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(tooltipHtml, 'text/html');
          const infoRows = doc.querySelectorAll('table.fleetinfo tr, table tr');

          infoRows.forEach(tr => {
            if (tr.querySelector('th')) return;

            const labelTd = tr.querySelector('td:not(.value)') || tr.querySelector('td:first-child');
            const valTd = tr.querySelector('.value, td:last-child');
            if (!labelTd || !valTd || labelTd === valTd) return;

            const name = labelTd.textContent?.trim().replace(':', '') || '';
            const val = parseInt(valTd.textContent?.replace(/[,.\s]/g, '').trim() || '0', 10);
            if (!name || isNaN(val) || val <= 0) return;

            const lower = name.toLowerCase();
            const isResource = lower.includes('metal') || lower.includes('metall') || lower.includes('métal') || lower.includes('металл')
                            || lower.includes('cryst') || lower.includes('crist') || lower.includes('krist') || lower.includes('кристалл') || lower.includes('krysz')
                            || lower.includes('deut') || lower.includes('дейтерий')
                            || lower.includes('food') || lower.includes('nahr') || lower.includes('nourr') || lower.includes('comid') || lower.includes('пища') || lower.includes('żyw') || lower.includes('zyw');

            if (isResource) {
              if (lower.includes('metal') || lower.includes('metall') || lower.includes('métal') || lower.includes('металл')) fleetMetal += val;
              else if (lower.includes('cryst') || lower.includes('crist') || lower.includes('krist') || lower.includes('кристалл') || lower.includes('krysz')) fleetCrystal += val;
              else if (lower.includes('deut') || lower.includes('дейтерий')) fleetDeut += val;
              else if (lower.includes('food') || lower.includes('nahr') || lower.includes('nourr') || lower.includes('comid') || lower.includes('пища') || lower.includes('żyw') || lower.includes('zyw')) fleetFood += val;
            } else {
              ships[name] = val;
            }
          });
        } catch (e) {
          // fallback if tooltip parse fails
        }
      }

      const calculatedTotal = Object.values(ships).reduce((a, b) => a + b, 0);
      if (totalShipsInFleet === 0 && calculatedTotal > 0) {
        totalShipsInFleet = calculatedTotal;
      }

      rawLegs.push({
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
        isHostile,
        hasRecallButton
      });
    } catch (err) {
      console.warn('OGame Nexus: Error parsing single event fleet row', err);
    }
  });

  // Consolidate raw multi-leg events into unique flying fleet missions
  const fleets = consolidateFleetLegs(rawLegs);

  // Compute summary and indexing strictly on deduplicated unique fleets
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

  fleets.forEach(fleet => {
    if (fleet.isHostile) hostileCount++;
    if (fleet.missionType === 15) expeditionCount++;
    if (fleet.missionType === 18) discoveryCount++;
    if (fleet.missionType === 8 && fleet.destination.coords) recyclingCoordsSet.add(fleet.destination.coords);

    if (fleet.origin.isOwn) {
      totalOwnShips += fleet.totalShips;
      totalMetal += fleet.resources.metal;
      totalCrystal += fleet.resources.crystal;
      totalDeuterium += fleet.resources.deuterium;
      totalFood += fleet.resources.food;
    }

    const originCoords = fleet.origin.coords;
    const destCoords = fleet.destination.coords;

    if (originCoords) {
      if (!byCoordinate[originCoords]) {
        byCoordinate[originCoords] = { incoming: [], outgoing: [], returning: [] };
      }
      if (fleet.flight === 'Return' || fleet.isReturn) {
        byCoordinate[originCoords].returning.push(fleet.id);
      } else {
        byCoordinate[originCoords].outgoing.push(fleet.id);
      }
    }

    if (destCoords && destCoords !== originCoords) {
      if (!byCoordinate[destCoords]) {
        byCoordinate[destCoords] = { incoming: [], outgoing: [], returning: [] };
      }
      if (fleet.flight !== 'Return' && !fleet.isReturn) {
        byCoordinate[destCoords].incoming.push(fleet.id);
      }
    }
  });

  return {
    lastUpdated: Date.now(),
    fleets,
    byCoordinate,
    summary: {
      totalFleets: fleets.length,
      totalOwnShips,
      hostileCount,
      expeditionCount,
      discoveryCount,
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
 */
export function countActiveMissions(fleets: FlyingFleet[], missionType: number): number {
  return fleets.filter(f => f.missionType === missionType).length;
}

let lastSavedFingerprint = '';

/**
 * Save fleet movements to chrome.storage.local and update memory cache.
 * Note: Window globals are NOT exposed to preserve isolation and security.
 */
export async function saveFleetMovements(
  data: FleetMovementsData,
  explicitPlayerId?: string,
  explicitUniverse?: string
): Promise<void> {
  const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse(explicitPlayerId, explicitUniverse);

  if (pId) data.playerId = pId;
  if (uni) data.universe = uni;

  // Preserve existing dispatchSlots if incoming data does not contain it
  if (!data.dispatchSlots && memoryCache?.dispatchSlots) {
    data.dispatchSlots = memoryCache.dispatchSlots;
  }

  const dispatchKey = data.dispatchSlots ? `${data.dispatchSlots.usedExpeditionSlots}/${data.dispatchSlots.totalExpeditionSlots}_${data.dispatchSlots.usedFleetSlots}/${data.dispatchSlots.totalFleetSlots}` : 'none';
  const fingerprint = `${pId}_${uni}_${data.fleets.length}_${data.summary.totalOwnShips}_${data.summary.expeditionCount}_${dispatchKey}_${data.fleets.map(f => f.id).join(',')}`;
  
  if (fingerprint === lastSavedFingerprint && memoryCache && (!pId || memoryCache.playerId === pId)) {
    // No changes, avoid spamming storage and event listeners
    return;
  }
  
  lastSavedFingerprint = fingerprint;
  memoryCache = data;

  const formattedFleets = formatFlyingFleets(data.fleets, pId, uni);

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      const updates: Record<string, any> = {
        [STORAGE_KEY_FLEET_MOVEMENTS]: data,
        [STORAGE_KEY_FLYING_FLEETS]: formattedFleets
      };

      if (pId) {
        if (uni) {
          updates[`${STORAGE_KEY_FLEET_MOVEMENTS}_${uni}_${pId}`] = data;
          updates[`${STORAGE_KEY_FLYING_FLEETS}_${uni}_${pId}`] = formattedFleets;
        }
        updates[`${STORAGE_KEY_FLEET_MOVEMENTS}_${pId}`] = data;
        updates[`${STORAGE_KEY_FLYING_FLEETS}_${pId}`] = formattedFleets;
      }

      await chrome.storage.local.set(updates);
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('OGame Nexus: Error saving fleet movements to storage', e);
    }
  }

  // Ensure window globals are NOT exposed in page context
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (w) {
      if ('nexusFleetMovements' in w) delete w.nexusFleetMovements;
      if ('nexusFlyingFleets' in w) delete w.nexusFlyingFleets;
    }
  } catch (e) {}

  // Dispatch window event for live in-page components
  window.dispatchEvent(new CustomEvent('ogame-nexus-fleet-movements-updated', {
    detail: data
  }));
}

/**
 * Retrieve current stored fleet movements (checks memory cache first, then chrome.storage.local)
 */
export async function getStoredFleetMovements(explicitPlayerId?: string, explicitUniverse?: string): Promise<FleetMovementsData | null> {
  const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse(explicitPlayerId, explicitUniverse);

  if (memoryCache && Date.now() - memoryCache.lastUpdated < 60000) {
    if (!pId || memoryCache.playerId === pId) {
      return memoryCache;
    }
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.local) {
      const keysToTry: string[] = [];
      if (pId) {
        if (uni) keysToTry.push(`${STORAGE_KEY_FLEET_MOVEMENTS}_${uni}_${pId}`);
        keysToTry.push(`${STORAGE_KEY_FLEET_MOVEMENTS}_${pId}`);
      }
      keysToTry.push(STORAGE_KEY_FLEET_MOVEMENTS);

      const res = await chrome.storage.local.get(keysToTry);
      for (const k of keysToTry) {
        if (res && res[k]) {
          const cached = res[k] as FleetMovementsData;
          if (!pId || !cached.playerId || cached.playerId === pId) {
            memoryCache = cached;
            return memoryCache;
          }
        }
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
export async function updateFleetMovementsFromHtml(
  rawHtmlOrJson: string,
  explicitPlayerId?: string,
  explicitUniverse?: string
): Promise<FleetMovementsData | null> {
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
    const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse(explicitPlayerId, explicitUniverse);
    await saveFleetMovements(data, pId, uni);
    return data;
  } catch (e) {
    console.warn('OGame Nexus: Failed to parse event list HTML', e);
    return null;
  }
}

/**
 * Proactively fetch, parse, and save fleet movements
 * Invoked during Nexus background sync (auto sync on page load and manual button sync).
 * Runs completely silently in the background without clicking or expanding DOM elements.
 */
export async function fetchAndSyncFleetMovements(
  force = false,
  explicitPlayerId?: string,
  explicitUniverse?: string
): Promise<FleetMovementsData | null> {
  const now = Date.now();
  if (!force && now - lastFetchTimestamp < FETCH_THROTTLE_MS && memoryCache) {
    return memoryCache;
  }
  lastFetchTimestamp = now;

  let eventHtml = '';
  try {
    // 1. Silent fetch via pageContext (which runs in MAIN world with native $.ajax and window.eventlistLink)
    const pageContextPromise = new Promise<string>((resolve) => {
      const handler = (e: any) => {
        window.removeEventListener('ogame-nexus-ajax-eventlist-loaded', handler);
        resolve(e?.detail?.html || '');
      };
      window.addEventListener('ogame-nexus-ajax-eventlist-loaded', handler);
      setTimeout(() => {
        window.removeEventListener('ogame-nexus-ajax-eventlist-loaded', handler);
        resolve('');
      }, 1500);
    });

    window.dispatchEvent(new CustomEvent('ogame-nexus-request-eventlist'));
    eventHtml = await pageContextPromise;

    // 2. Fallback: Silent direct fetch from content script if pageContext didn't return HTML
    if (!eventHtml || !eventHtml.includes('eventFleet')) {
      const url = `${window.location.origin}/game/index.php?page=componentOnly&component=eventList`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          eventHtml = json?.content?.eventlist || json?.eventlist || '';
        } catch {
          if (text.includes('eventFleet') || text.includes('eventContent')) {
            eventHtml = text;
          }
        }
      }
    }
  } catch (err) {
    console.warn('OGame Nexus: Error during silent fleet event fetch', err);
  }

  // Parse from either AJAX HTML or current DOM if already present (never click or open UI)
  let doc: Document | Element | null = null;
  if (eventHtml && (eventHtml.includes('eventFleet') || eventHtml.includes('eventContent') || eventHtml.includes('eventRow-'))) {
    doc = new DOMParser().parseFromString(eventHtml, 'text/html');
  } else {
    const existing = document.getElementById('eventContent') || document.getElementById('eventListWrap');
    if (existing && existing.querySelectorAll('tr.eventFleet, .eventFleet').length > 0) {
      doc = existing;
    }
  }

  if (!doc) {
    return memoryCache;
  }

  const data = parseEventListDom(doc);
  const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse(explicitPlayerId, explicitUniverse);
  await saveFleetMovements(data, pId, uni);
  return data;
}

/**
 * Initialize event listeners to passively update fleet movements
 */
export function initFleetMovementListener(): void {
  // 1. Listen for AJAX responses passively intercepted from OGame's own requests
  window.addEventListener('ogame-nexus-ajax-eventlist-loaded', (e: any) => {
    const html = e?.detail?.html;
    if (html) {
      const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse();
      updateFleetMovementsFromHtml(html, pId, uni);
    }
  });

  // 2. Passive check on current page DOM
  const eventContent = document.getElementById('eventContent') || document.getElementById('eventListWrap');
  if (eventContent && eventContent.querySelectorAll('tr.eventFleet, .eventFleet').length > 0) {
    const data = parseEventListDom(eventContent);
    const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse();
    saveFleetMovements(data, pId, uni);
    return;
  }

  // 3. Proactive initial fetch 2.5 seconds after page load
  setTimeout(() => {
    const { playerId: pId, universe: uni } = getCurrentPlayerAndUniverse();
    fetchAndSyncFleetMovements(false, pId, uni).catch(() => {});
  }, 2500);
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
