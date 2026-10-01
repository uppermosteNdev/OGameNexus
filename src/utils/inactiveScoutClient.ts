// ============================================================================
// NEXUS OVERWATCH — INACTIVE SCOUT CLIENT
// ============================================================================

import { getOverwatchApiUrl, fetchOverwatch } from './overwatchApi';
import { cleanUniverseId } from './universe';

export interface InactiveTarget {
  galaxy: number;
  system: number;
  slot: number;
  coords: string;
  planetId?: string | null;
  planetName: string;
  playerId: string;
  playerName: string;
  playerStatus: string;
  allianceTag?: string | null;
  hasMoon: boolean;
  moonSize?: number | null;
  lastUpdatedAt: number;
  isCovered: boolean;
  radarProductionMsu: number;
  radarLastSpied: number;
  playerRank?: number | null;
  playerScore?: number | null;
  // Client-side computed distance & nearest colony
  distance?: number;
  nearestColony?: {
    name: string;
    coords: string;
    systemsAway: number;
  } | null;
}

export interface InactiveScoutStats {
  totalInactives: number;
  covered: number;
  uncovered: number;
  coverageRate: number;
}

export interface InactiveScoutResponse {
  success: boolean;
  universeId: string;
  galaxies?: number;
  stats: InactiveScoutStats;
  targets: InactiveTarget[];
}

/**
 * Parses coordinate string "G:S:P" into [galaxy, system, slot]
 */
export function parseCoordinates(coords: string): [number, number, number] {
  if (!coords) return [1, 1, 1];
  const parts = coords.replace(/[\[\]]/g, '').split(':').map(p => parseInt(p.trim(), 10) || 1);
  return [parts[0] || 1, parts[1] || 1, parts[2] || 1];
}

/**
 * Calculates standard OGame distance between two coordinates
 */
export function calculateOgameDistance(coordsA: string, coordsB: string): { distance: number; systemsAway: number } {
  const [g1, s1, p1] = parseCoordinates(coordsA);
  const [g2, s2, p2] = parseCoordinates(coordsB);

  let distance = 0;
  let systemsAway = Math.abs(s1 - s2);

  if (g1 !== g2) {
    distance = 20000 * Math.abs(g1 - g2);
    systemsAway = Math.abs(g1 - g2) * 499 + systemsAway;
  } else if (s1 !== s2) {
    distance = 2700 + 95 * Math.abs(s1 - s2);
  } else {
    distance = 1000 + 5 * Math.abs(p1 - p2);
  }

  return { distance, systemsAway };
}

/**
 * Fetch unscouted inactive targets from Overwatch edge API
 */
export async function fetchInactiveScoutData(
  universeId: string,
  playerId: string,
  excludeVacation: boolean = true,
  galaxy?: number | null
): Promise<InactiveScoutResponse> {
  const baseUrl = await getOverwatchApiUrl();
  const cleanUni = cleanUniverseId(universeId);
  let url = `${baseUrl}/api/v1/tools/inactive-scout?universeId=${encodeURIComponent(cleanUni)}&playerId=${encodeURIComponent(playerId)}&excludeVacation=${excludeVacation}`;
  if (galaxy && galaxy >= 1) {
    url += `&galaxy=${galaxy}`;
  }

  const res = await fetchOverwatch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Network error');
    throw new Error(`Failed to fetch inactive targets (${res.status}): ${errorText}`);
  }

  return await res.json();
}
