// ============================================================================
// NEXUS OVERWATCH — PHALANX COVERAGE COMMAND DECK
// High-End Agency Tier: 499-System Panoramic Radar & Interplanetary Analysis Network
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Radio,
  Eye,
  Zap,
  Sparkles,
  Shield,
  Crosshair,
  Layers,
  ChevronRight,
  Sliders,
  Search,
  Filter,
  Globe,
  Info,
  RefreshCw,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { db } from '../../db';
import { ThemeIcon } from '../components/ThemeIcon';
import { getLfTech } from '../../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../../db/lifeformBonusData';
import { cleanUniverseId } from '../../utils/universe';
import './OverwatchPhalanxCoverage.css';

// ----------------------------------------------------------------------------
// INTERFACES & DATA TYPES
// ----------------------------------------------------------------------------

export interface PhalanxMoon {
  id: string;
  name: string;
  coords: string;
  galaxy: number;
  system: number;
  position: number;
  phalanxLevel: number;
  baseRange: number;
  effectiveRange: number;
  ianLevel: number;
  ianBoostPercent: number;
  isDiscoverer?: boolean;
  discovererClassBoostPercent?: number;
  discovererPhalanxBoost?: number;
  totalBoostPercent?: number;
  playerId: string;
  playerName: string;
  playerRole?: string;
  avatarUrl?: string | null;
  lastSyncedAt?: number | null;
  isLocal?: boolean;
}

export interface MemberPhalanxSummary {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  isDiscoverer?: boolean;
  discovererClassBoostPercent?: number;
  discovererPhalanxBoost?: number;
  moonCount: number;
  phalanxCount: number;
  maxPhalanxLevel: number;
  ianLevel: number;
  ianBoostPercent: number;
}

export interface SystemCoverageInfo {
  system: number;
  isCovered: boolean;
  coveringMoons: PhalanxMoon[];
  coverageCount: number;
}

export interface BlindSpotGap {
  start: number;
  end: number;
  length: number;
  nearestMoonDistance?: number;
  nearestMoonCoords?: string;
}

interface OverwatchPhalanxCoverageProps {
  config: any;
  effectiveAccount?: any;
  effectivePermissions?: any;
  isAdmin?: boolean;
  apiUrl: string;
  universeId: string;
  playerId: string;
  playerName: string;
  galaxiesCount?: number;
  onJumpToCoordinates?: (galaxy: number | string, system: number | string, slot?: number | string) => void;
}

// ----------------------------------------------------------------------------
// MATHEMATICAL PHALANX FORMULAS & UTILITIES
// ----------------------------------------------------------------------------

/**
 * Standard OGame Sensor Phalanx formula:
 * Base Range = Level > 1 ? (Level^2 - 1) : 0
 * Boosted Range = floor(Base Range * (1 + totalBoostPercent / 100))
 * Total Boost combines Interplanetary Analysis Network (IAN) and Discoverer Class Range Boost.
 */
export function calculatePhalanxRange(level: number, totalBoostPercent: number = 0): { baseRange: number; effectiveRange: number } {
  if (level <= 0) return { baseRange: 0, effectiveRange: 0 };
  if (level === 1) return { baseRange: 0, effectiveRange: 0 }; // Level 1 scans only current system
  const baseRange = level * level - 1;
  const effectiveRange = Math.floor(baseRange * (1 + (totalBoostPercent || 0) / 100));
  return { baseRange, effectiveRange };
}

/**
 * Calculates Discoverer class Phalanx range bonus:
 * Base bonus = 20% (if player has Discoverer class)
 * Boosted bonus = 20% * (1 + discovererClassBoostPercent / 100)
 * (Boosted by Kaelesh Discoverer Enhancement Tech 72 / 14218)
 */
export function calculateDiscovererPhalanxBoost(isDiscoverer: boolean, discovererClassBoostPercent: number = 0): number {
  if (!isDiscoverer) return 0;
  return Math.round(20 * (1 + (discovererClassBoostPercent || 0) / 100) * 100) / 100;
}

/**
 * Computes all solar systems covered by a moon in a 499-system universe.
 * Supports both standard clamped boundaries and circular (donut) topologies.
 */
export function getCoveredSystemsSet(
  moonSystem: number,
  range: number,
  isCircular: boolean = false,
  totalSystems: number = 499
): Set<number> {
  const covered = new Set<number>();
  if (range <= 0) {
    if (moonSystem >= 1 && moonSystem <= totalSystems) covered.add(moonSystem);
    return covered;
  }

  // If diameter spans entire galaxy or more
  if (isCircular && 2 * range + 1 >= totalSystems) {
    for (let s = 1; s <= totalSystems; s++) covered.add(s);
    return covered;
  }

  for (let offset = -range; offset <= range; offset++) {
    let target = moonSystem + offset;
    if (isCircular) {
      target = (((target - 1) % totalSystems) + totalSystems) % totalSystems + 1;
    } else {
      if (target < 1 || target > totalSystems) continue;
    }
    covered.add(target);
  }

  return covered;
}

// ----------------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------------

export const OverwatchPhalanxCoverage: React.FC<OverwatchPhalanxCoverageProps> = ({
  config,
  effectiveAccount,
  effectivePermissions,
  apiUrl,
  universeId,
  playerId,
  playerName,
  galaxiesCount = 9,
  onJumpToCoordinates,
}) => {
  // Navigation & View Mode State
  const [selectedGalaxy, setSelectedGalaxy] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'stream' | 'matrix'>('stream');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // Interactive Highlighting & Reticle State
  const [highlightedMoonId, setHighlightedMoonId] = useState<string | null>(null);
  const [hoveredSystem, setHoveredSystem] = useState<number | null>(null);
  const [reticlePositionX, setReticlePositionX] = useState<number | null>(null);

  // Simulation Lab State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simPhalanxDelta, setSimPhalanxDelta] = useState<number>(1);
  const [simIanBonusDelta, setSimIanBonusDelta] = useState<number>(6.0); // +6% boost (10 IAN levels)

  // Remote & Synced Data State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [allianceMoons, setAllianceMoons] = useState<PhalanxMoon[]>([]);
  const [allianceMembers, setAllianceMembers] = useState<MemberPhalanxSummary[]>([]);

  // --------------------------------------------------------------------------
  // 1. LOCAL DEXIE GROUND-TRUTH HYDRATION & TOPOLOGY
  // --------------------------------------------------------------------------
  const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
  const effectiveAcc = effectiveAccount || activeAccount;

  // Standardize universe ID for preference keys and serverData lookups
  const currentUniverseClean = useMemo(() => {
    return cleanUniverseId(universeId || effectiveAcc?.universe || 's267-en');
  }, [universeId, effectiveAcc?.universe]);

  const storageKey = `nexus_phalanx_circular_${currentUniverseClean}`;

  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);

  // Initialize circular universe state:
  // 1. User manual override in localStorage (if previously set)
  // 2. Account data in Dexie (donutSystem === 1 || donutGalaxy === 1)
  // 3. Default to true (modern OGame universes are almost universally circular/donut)
  const [isCircularUniverse, setIsCircularUniverse] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`nexus_phalanx_circular_${cleanUniverseId(universeId || effectiveAccount?.universe || 's267-en')}`);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {}

    const acc = effectiveAccount;
    if (acc) {
      if (acc.donutSystem !== undefined) return Number(acc.donutSystem) === 1;
      if (acc.donutGalaxy !== undefined) return Number(acc.donutGalaxy) === 1;
    }
    return true;
  });

  // Auto-detect and sync circular universe topology from Dexie or serverData.xml
  useEffect(() => {
    let isCancelled = false;

    async function checkServerTopology() {
      const saved = localStorage.getItem(storageKey);
      const acc = effectiveAccount || activeAccount;

      // Check if already stored in Dexie account record
      if (acc && (acc.donutSystem !== undefined || acc.donutGalaxy !== undefined)) {
        const isDonut = Number(acc.donutSystem ?? acc.donutGalaxy) === 1;
        if (!isCancelled) {
          setIsAutoDetected(true);
          if (saved === null) {
            setIsCircularUniverse(isDonut);
          }
        }
        return;
      }

      // Fetch serverData.xml if not yet populated in Dexie
      try {
        const domain = currentUniverseClean.includes('.')
          ? currentUniverseClean
          : `${currentUniverseClean}.ogame.gameforge.com`;
        const res = await fetch(`https://${domain}/api/serverData.xml`);
        if (!res.ok) return;
        const xml = await res.text();
        const getVal = (tag: string) => {
          const match = xml.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, 'i'));
          return match ? parseFloat(match[1]) : 0;
        };

        const donutGalaxy = getVal('donutGalaxy');
        const donutSystem = getVal('donutSystem');
        const isDonut = donutSystem === 1 || donutGalaxy === 1;

        if (!isCancelled) {
          setIsAutoDetected(true);
          if (saved === null) {
            setIsCircularUniverse(isDonut);
          }
        }

        // Cache into Dexie if account exists
        if (acc && (acc as any).id) {
          await db.accounts.update((acc as any).id, {
            donutGalaxy,
            donutSystem,
            systems: getVal('systems') || 499,
            galaxies: getVal('galaxies') || 9,
          });
        }
      } catch (err) {
        console.warn('Could not auto-fetch serverData.xml topology:', err);
      }
    }

    checkServerTopology();

    return () => {
      isCancelled = true;
    };
  }, [currentUniverseClean, storageKey, effectiveAccount, activeAccount]);

  const handleToggleTopology = () => {
    setIsCircularUniverse(prev => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch (e) {}
      return next;
    });
  };

  const isLocalDiscoverer = useMemo(() => {
    const rawClass = effectiveAcc?.playerClass ?? (effectiveAcc as any)?.characterClass;
    return Number(rawClass) === 3 || rawClass === 'discoverer' || rawClass === 'explorer';
  }, [effectiveAcc]);

  const localPlanets = useLiveQuery(
    async () => {
      const p = await db.planets.toArray();
      return p.filter(item => !item.playerId || String(item.playerId) === String(playerId));
    },
    [playerId],
    []
  );

  const localIanBoost = useMemo(() => {
    if (!localPlanets || localPlanets.length === 0) return { level: 0, percent: 0 };
    let totalLevel = 0;
    let totalPercent = 0;

    localPlanets.filter(p => p.type === 'planet').forEach(p => {
      let buildingMultiplier = 1;
      if (p.lifeformBuildings && Array.isArray(p.lifeformBuildings)) {
        let bBonus = 0;
        const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
        p.lifeformBuildings.forEach((b: any) => {
          if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
          if (b.id === 11111) bBonus += (b.level || 0) * 0.005;
          else if (b.id === 13107) bBonus += (b.level || 0) * 0.003;
          else if (b.id === 13111) bBonus += (b.level || 0) * 0.004;
        });
        buildingMultiplier += bBonus;
      }

      const expList = effectiveAcc?.lifeformExperience || [];
      const expData = expList.find((e: any) => e.lifeformId === p.lifeformId);
      const totalMultiplier = buildingMultiplier + (expData?.level || 0) * 0.001;

      const setups = p.lifeformSetup || [];
      setups.forEach(slot => {
        if (!slot || !slot.selectedTechId) return;
        const tId = Number(slot.selectedTechId);
        // 14208: Interplanetary Analysis Network (Kaelesh Tech ID 32)
        if (tId === 14208 || tId === 32) {
          const lvl = Number(slot.level || 0);
          totalLevel += lvl;
          totalPercent += 0.6 * lvl * totalMultiplier;
        }
      });
    });

    return {
      level: totalLevel,
      percent: Math.round(totalPercent * 100) / 100,
    };
  }, [localPlanets, effectiveAcc]);

  const localDiscovererBoost = useMemo(() => {
    if (!localPlanets || localPlanets.length === 0) return { classBoostPercent: 0, phalanxBoostPercent: 0 };
    let totalBoost = 0;

    localPlanets.filter(p => p.type === 'planet').forEach(p => {
      let buildingMultiplier = 1;
      if (p.lifeformBuildings && Array.isArray(p.lifeformBuildings)) {
        let bBonus = 0;
        const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
        p.lifeformBuildings.forEach((b: any) => {
          if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
          if (b.id === 11111) bBonus += (b.level || 0) * 0.005;
          else if (b.id === 13107) bBonus += (b.level || 0) * 0.003;
          else if (b.id === 13111) bBonus += (b.level || 0) * 0.004;
        });
        buildingMultiplier += bBonus;
      }

      const expList = effectiveAcc?.lifeformExperience || [];
      const expData = expList.find((e: any) => e.lifeformId === p.lifeformId);
      const totalMultiplier = buildingMultiplier + (expData?.level || 0) * 0.001;

      const setups = p.lifeformSetup || [];
      setups.forEach(slot => {
        if (!slot || !slot.selectedTechId) return;
        const tId = Number(slot.selectedTechId);
        // 14218 / 72: Kaelesh Discoverer Enhancement (Base 0.2% per level)
        if (tId === 14218 || tId === 72) {
          const lvl = Number(slot.level || 0);
          totalBoost += 0.2 * lvl * totalMultiplier;
        }
      });
    });

    const classBoostPercent = Math.round(totalBoost * 100) / 100;
    // Discoverer Phalanx Boost:
    // Base bonus: 20% if Discoverer class
    // Boosted bonus: 20% * (1 + classBoostPercent / 100)
    const phalanxBoostPercent = isLocalDiscoverer
      ? Math.round(20 * (1 + classBoostPercent / 100) * 100) / 100
      : 0;

    return {
      classBoostPercent,
      phalanxBoostPercent,
    };
  }, [localPlanets, isLocalDiscoverer, effectiveAcc]);

  const localMoonsParsed: PhalanxMoon[] = useMemo(() => {
    if (!localPlanets || localPlanets.length === 0) return [];
    return localPlanets
      .filter(p => p.type === 'moon')
      .map(m => {
        const coordsStr = String(m.coords || '').trim();
        const match = coordsStr.match(/(\d+)[:\.](\d+)[:\.](\d+)/);
        const g = match ? parseInt(match[1], 10) : 1;
        const s = match ? parseInt(match[2], 10) : 1;
        const pos = match ? parseInt(match[3], 10) : 1;
        const phalanxLevel = Number(m.sensorPhalanx || 0);

        const totalBoost = Math.round((localIanBoost.percent + localDiscovererBoost.phalanxBoostPercent) * 100) / 100;
        const { baseRange, effectiveRange } = calculatePhalanxRange(phalanxLevel, totalBoost);

        return {
          id: String(m.id || `local-${g}-${s}`),
          name: m.name || `Moon [${g}:${s}:${pos}]`,
          coords: `[${g}:${s}:${pos}]`,
          galaxy: g,
          system: s,
          position: pos,
          phalanxLevel,
          baseRange,
          effectiveRange,
          ianLevel: localIanBoost.level,
          ianBoostPercent: localIanBoost.percent,
          isDiscoverer: isLocalDiscoverer,
          discovererClassBoostPercent: localDiscovererBoost.classBoostPercent,
          discovererPhalanxBoost: localDiscovererBoost.phalanxBoostPercent,
          totalBoostPercent: totalBoost,
          playerId: String(playerId || 'local'),
          playerName: playerName || 'You',
          playerRole: 'member',
          avatarUrl: effectiveAcc?.avatarUrl || null,
          lastSyncedAt: m.lastUpdated || Date.now(),
          isLocal: true,
        };
      });
  }, [localPlanets, localIanBoost, localDiscovererBoost, isLocalDiscoverer, playerId, playerName, effectiveAcc]);

  // --------------------------------------------------------------------------
  // 2. REMOTE DATA FETCHING (WORKER ENDPOINT + FALLBACK TO ROSTER)
  // --------------------------------------------------------------------------
  const fetchCoverageData = useCallback(async (isSilent = false) => {
    if (!config?.authToken || !config?.allianceId) {
      setIsLoading(false);
      return;
    }

    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorNotice(null);

      // Strategy A: Try specialized phalanx coverage endpoint
      let succeeded = false;
      try {
        const res = await fetch(`${apiUrl}/api/v1/overwatch/phalanx/coverage`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.moons)) {
            setAllianceMoons(data.moons);
            if (Array.isArray(data.members)) {
              setAllianceMembers(data.members);
            }
            succeeded = true;
          }
        }
      } catch (e) {
        // Fall through to Strategy B
      }

      // Strategy B: Fallback to roster + member details
      if (!succeeded) {
        const rosterRes = await fetch(`${apiUrl}/api/v1/overwatch/empire/roster`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
            Accept: 'application/json',
          },
        });

        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          if (rosterData.success && Array.isArray(rosterData.roster)) {
            const syncedMembers = rosterData.roster.filter((m: any) => m.hasSyncedEmpire && m.isEmpireShared !== false);

            const details = await Promise.all(
              syncedMembers.map(async (m: any) => {
                try {
                  const mRes = await fetch(`${apiUrl}/api/v1/overwatch/empire/member?playerId=${m.playerId}`, {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${config.authToken}`,
                      Accept: 'application/json',
                    },
                  });
                  if (mRes.ok) {
                    const mData = await mRes.json();
                    return mData?.member || null;
                  }
                } catch (e) {}
                return null;
              })
            );

            const parsedMoons: PhalanxMoon[] = [];
            const parsedSummaries: MemberPhalanxSummary[] = [];

            details.filter(Boolean).forEach((mem: any) => {
              const pId = String(mem.playerId);
              const pName = mem.playerName || 'Commander';
              const planets: any[] = mem.empire?.planets || [];
              const expList: any[] = mem.empire?.lifeformExperience || [];

              // Calculate IAN and Discoverer bonuses for this member
              const pClassRaw = mem.playerClass ?? mem.player_class ?? 0;
              const isDiscoverer = Number(pClassRaw) === 3 || pClassRaw === 'discoverer' || pClassRaw === 'explorer';

              let memberIanLevel = 0;
              let memberIanPercent = 0;
              let memberDiscovererClassPercent = 0;

              planets.filter(p => p.type === 'planet').forEach(p => {
                let bMult = 1;
                if (p.lifeformBuildings && Array.isArray(p.lifeformBuildings)) {
                  let bVal = 0;
                  const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
                  p.lifeformBuildings.forEach((b: any) => {
                    if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
                    if (b.id === 11111) bVal += (b.level || 0) * 0.005;
                    else if (b.id === 13107) bVal += (b.level || 0) * 0.003;
                    else if (b.id === 13111) bVal += (b.level || 0) * 0.004;
                  });
                  bMult += bVal;
                }

                const expData = expList.find((e: any) => e.lifeformId === p.lifeformId);
                const totalMultiplier = bMult + (expData?.level || 0) * 0.001;

                const setups: any[] = p.lifeformSetup || [];
                setups.forEach(slot => {
                  if (!slot || !slot.selectedTechId) return;
                  const tId = Number(slot.selectedTechId);
                  if (tId === 14208 || tId === 32) {
                    const lvl = Number(slot.level || 0);
                    memberIanLevel += lvl;
                    memberIanPercent += 0.6 * lvl * totalMultiplier;
                  } else if (tId === 14218 || tId === 72) {
                    const lvl = Number(slot.level || 0);
                    memberDiscovererClassPercent += 0.2 * lvl * totalMultiplier;
                  }
                });
              });

              memberIanPercent = Math.round(memberIanPercent * 100) / 100;
              memberDiscovererClassPercent = Math.round(memberDiscovererClassPercent * 100) / 100;

              const memberDiscovererPhalanxBoost = isDiscoverer
                ? Math.round(20 * (1 + memberDiscovererClassPercent / 100) * 100) / 100
                : 0;
              const totalMemberBoost = Math.round((memberIanPercent + memberDiscovererPhalanxBoost) * 100) / 100;

              const mList = planets.filter(p => p.type === 'moon');
              let phalanxCount = 0;
              let maxLvl = 0;

              mList.forEach(m => {
                const match = String(m.coords || '').match(/(\d+)[:\.](\d+)[:\.](\d+)/);
                if (!match) return;
                const g = parseInt(match[1], 10);
                const s = parseInt(match[2], 10);
                const pos = parseInt(match[3], 10);
                const pLevel = Number(m.sensorPhalanx || 0);

                if (pLevel > 0) phalanxCount++;
                if (pLevel > maxLvl) maxLvl = pLevel;

                const { baseRange, effectiveRange } = calculatePhalanxRange(pLevel, totalMemberBoost);

                parsedMoons.push({
                  id: String(m.id || `${pId}-${g}-${s}`),
                  name: m.name || `Moon [${g}:${s}:${pos}]`,
                  coords: `[${g}:${s}:${pos}]`,
                  galaxy: g,
                  system: s,
                  position: pos,
                  phalanxLevel: pLevel,
                  baseRange,
                  effectiveRange,
                  ianLevel: memberIanLevel,
                  ianBoostPercent: memberIanPercent,
                  isDiscoverer,
                  discovererClassBoostPercent: memberDiscovererClassPercent,
                  discovererPhalanxBoost: memberDiscovererPhalanxBoost,
                  totalBoostPercent: totalMemberBoost,
                  playerId: pId,
                  playerName: pName,
                  avatarUrl: mem.avatarUrl || null,
                  lastSyncedAt: mem.updatedAt || null,
                });
              });

              parsedSummaries.push({
                playerId: pId,
                playerName: pName,
                avatarUrl: mem.avatarUrl || null,
                isDiscoverer,
                discovererClassBoostPercent: memberDiscovererClassPercent,
                discovererPhalanxBoost: memberDiscovererPhalanxBoost,
                moonCount: mList.length,
                phalanxCount,
                maxPhalanxLevel: maxLvl,
                ianLevel: memberIanLevel,
                ianBoostPercent: memberIanPercent,
              });
            });

            setAllianceMoons(parsedMoons);
            setAllianceMembers(parsedSummaries);
          }
        }
      }
    } catch (err: any) {
      console.warn('Phalanx coverage fetch notice:', err.message);
      setErrorNotice('Could not sync with Overwatch server; utilizing local moon database.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config?.authToken, config?.allianceId, apiUrl]);

  useEffect(() => {
    fetchCoverageData();
  }, [fetchCoverageData]);

  // --------------------------------------------------------------------------
  // 3. MERGE ALLIANCE MOONS WITH LOCAL DEXIE GROUND-TRUTH
  // --------------------------------------------------------------------------
  const allEffectiveMoons: PhalanxMoon[] = useMemo(() => {
    const map = new Map<string, PhalanxMoon>();

    // 1. Add remote alliance moons
    allianceMoons.forEach(m => {
      // Key by coords or id
      map.set(m.coords, m);
    });

    // 2. Override / supplement with local player's ground-truth moons
    localMoonsParsed.forEach(lm => {
      map.set(lm.coords, lm);
    });

    return Array.from(map.values());
  }, [allianceMoons, localMoonsParsed]);

  // Filter moons for the active galaxy
  const galaxyMoons: PhalanxMoon[] = useMemo(() => {
    return allEffectiveMoons
      .filter(m => m.galaxy === selectedGalaxy)
      .filter(m => {
        if (selectedMemberFilter === 'all') return true;
        return m.playerId === selectedMemberFilter;
      })
      .filter(m => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          m.playerName.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.coords.toLowerCase().includes(q)
        );
      });
  }, [allEffectiveMoons, selectedGalaxy, selectedMemberFilter, searchFilter]);

  // --------------------------------------------------------------------------
  // 4. COMPUTE 499-SYSTEM COVERAGE GRID IN SELECTED GALAXY
  // --------------------------------------------------------------------------
  const systemCoverageMap: SystemCoverageInfo[] = useMemo(() => {
    // Array of 499 systems
    const systems: SystemCoverageInfo[] = Array.from({ length: 499 }, (_, i) => ({
      system: i + 1,
      isCovered: false,
      coveringMoons: [],
      coverageCount: 0,
    }));

    galaxyMoons.forEach(moon => {
      // If simulated, apply simulated delta for this moon or total boosts
      let effectiveLevel = moon.phalanxLevel;
      let effectiveBoost = moon.totalBoostPercent ?? (moon.ianBoostPercent + (moon.discovererPhalanxBoost || 0));

      if (isSimulating) {
        effectiveLevel += simPhalanxDelta;
        effectiveBoost += simIanBonusDelta;
      }

      const { effectiveRange } = calculatePhalanxRange(effectiveLevel, effectiveBoost);
      if (effectiveLevel <= 0) return;

      const coveredSet = getCoveredSystemsSet(moon.system, effectiveRange, isCircularUniverse, 499);
      coveredSet.forEach(sysNum => {
        if (sysNum >= 1 && sysNum <= 499) {
          const slot = systems[sysNum - 1];
          slot.isCovered = true;
          slot.coveringMoons.push(moon);
          slot.coverageCount++;
        }
      });
    });

    return systems;
  }, [galaxyMoons, isCircularUniverse, isSimulating, simPhalanxDelta, simIanBonusDelta]);

  // Summary Metrics for the Active Galaxy
  const galaxyMetrics = useMemo(() => {
    const coveredCount = systemCoverageMap.filter(s => s.isCovered).length;
    const coveragePercent = Math.round((coveredCount / 499) * 1000) / 10;
    const activePhalanxes = galaxyMoons.filter(m => m.phalanxLevel > 0).length;
    const maxPhalanx = galaxyMoons.reduce((acc, m) => Math.max(acc, m.phalanxLevel), 0);
    const ianBoostersCount = galaxyMoons.filter(m => m.ianLevel > 0).length;

    return {
      coveredCount,
      coveragePercent,
      activePhalanxes,
      maxPhalanx,
      ianBoostersCount,
    };
  }, [systemCoverageMap, galaxyMoons]);

  // Total Universe Coverage Metric across all 1..galaxiesCount
  const universeMetrics = useMemo(() => {
    let totalCovered = 0;
    const totalPossible = galaxiesCount * 499;

    const galaxyPercentages: Record<number, number> = {};

    for (let g = 1; g <= galaxiesCount; g++) {
      const gMoons = allEffectiveMoons.filter(m => m.galaxy === g);
      const covSet = new Set<number>();
      gMoons.forEach(m => {
        if (m.phalanxLevel <= 0) return;
        const set = getCoveredSystemsSet(m.system, m.effectiveRange, isCircularUniverse, 499);
        set.forEach(s => covSet.add(s));
      });
      galaxyPercentages[g] = Math.round((covSet.size / 499) * 1000) / 10;
      totalCovered += covSet.size;
    }

    const universePercent = Math.round((totalCovered / totalPossible) * 1000) / 10;
    const totalAlliancePhalanxes = allEffectiveMoons.filter(m => m.phalanxLevel > 0).length;

    return {
      totalCovered,
      totalPossible,
      universePercent,
      galaxyPercentages,
      totalAlliancePhalanxes,
    };
  }, [allEffectiveMoons, galaxiesCount, isCircularUniverse]);

  // --------------------------------------------------------------------------
  // 5. DETECT BLIND SPOTS (CONTIGUOUS UNCOVERED GAPS)
  // --------------------------------------------------------------------------
  const blindSpots: BlindSpotGap[] = useMemo(() => {
    const gaps: BlindSpotGap[] = [];
    let currentStart: number | null = null;

    systemCoverageMap.forEach((sysInfo, idx) => {
      const s = idx + 1;
      if (!sysInfo.isCovered) {
        if (currentStart === null) currentStart = s;
      } else {
        if (currentStart !== null) {
          gaps.push({
            start: currentStart,
            end: s - 1,
            length: s - currentStart,
          });
          currentStart = null;
        }
      }
    });

    if (currentStart !== null) {
      gaps.push({
        start: currentStart,
        end: 499,
        length: 499 - currentStart + 1,
      });
    }

    // Sort by largest gap first
    return gaps.sort((a, b) => b.length - a.length);
  }, [systemCoverageMap]);

  // Range highlight set for currently focused moon
  const highlightedMoonSystemsSet = useMemo(() => {
    if (!highlightedMoonId) return null;
    const moon = galaxyMoons.find(m => m.id === highlightedMoonId);
    if (!moon || moon.phalanxLevel <= 0) return null;
    return getCoveredSystemsSet(moon.system, moon.effectiveRange, isCircularUniverse, 499);
  }, [highlightedMoonId, galaxyMoons, isCircularUniverse]);

  // --------------------------------------------------------------------------
  // INTERACTIVE RETICLE & HOVER HANDLERS
  // --------------------------------------------------------------------------
  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, x / rect.width));
    const sys = Math.min(499, Math.max(1, Math.floor(relativeX * 499) + 1));
    setHoveredSystem(sys);
    setReticlePositionX(x);
  };

  const handleBarMouseLeave = () => {
    setHoveredSystem(null);
    setReticlePositionX(null);
  };

  const activeHoveredSysInfo = hoveredSystem ? systemCoverageMap[hoveredSystem - 1] : null;

  // Compute active range bonus for display in Card 4
  const activeDisplayBonus = useMemo(() => {
    if (selectedMemberFilter !== 'all') {
      const mem = allianceMembers.find(m => m.playerId === selectedMemberFilter);
      if (mem) {
        const disc = mem.discovererPhalanxBoost || 0;
        const ian = mem.ianBoostPercent || 0;
        return {
          total: Math.round((disc + ian) * 100) / 100,
          disc,
          ian,
          label: mem.playerName,
        };
      }
    }
    // Local player account bonus
    const localDisc = localDiscovererBoost.phalanxBoostPercent;
    const localIan = localIanBoost.percent;
    const localTotal = Math.round((localDisc + localIan) * 100) / 100;
    if (localTotal > 0) {
      return {
        total: localTotal,
        disc: localDisc,
        ian: localIan,
        label: 'Your Account',
      };
    }
    // Max in current galaxy
    const maxMoon = galaxyMoons.reduce((acc: PhalanxMoon | null, m) => {
      if (!acc || (m.totalBoostPercent || 0) > (acc.totalBoostPercent || 0)) return m;
      return acc;
    }, null);
    if (maxMoon && (maxMoon.totalBoostPercent || 0) > 0) {
      return {
        total: maxMoon.totalBoostPercent || 0,
        disc: maxMoon.discovererPhalanxBoost || 0,
        ian: maxMoon.ianBoostPercent || 0,
        label: maxMoon.playerName,
      };
    }
    return { total: 0, disc: 0, ian: 0, label: 'No Bonus Active' };
  }, [selectedMemberFilter, allianceMembers, localDiscovererBoost, localIanBoost, galaxyMoons]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="ow-phalanx-container">
      {/* 1. HERO HEADER */}
      <section className="ow-phalanx-outer-shell">
        <div className="ow-phalanx-hero">
          <div className="ow-phalanx-hero-left">
            <div className="ow-phalanx-avatar-radar">
              <div className="ow-phalanx-radar-sweep" />
              <Radio size={24} style={{ color: '#00f2ff', zIndex: 2 }} />
            </div>
            <div className="ow-phalanx-hero-text">
              <div className="ow-phalanx-eyebrow">
                <Sparkles size={11} />
                <span>Universe Intel // Sensor Phalanx</span>
              </div>
              <h2>
                <span>Phalanx Coverage</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', padding: '2px 8px', background: 'rgba(0,242,255,0.1)', borderRadius: '6px', border: '1px solid rgba(0,242,255,0.25)' }}>
                  499 Systems
                </span>
              </h2>
              <p>
                Overview of Sensor Phalanx coverage across alliance moons. Calculates phalanx range including <strong>Discoverer class</strong> (+20% base boosted by Kaelesh enhancement) and <strong>Interplanetary Analysis Network</strong> (IAN) lifeform tech.
              </p>
            </div>
          </div>

          <div className="ow-phalanx-controls">
            {/* Universe Topology Switch */}
            <button
              type="button"
              className={`ow-phalanx-pill-btn ${isCircularUniverse ? 'active' : ''}`}
              onClick={handleToggleTopology}
              title={
                isCircularUniverse
                  ? `Circular Universe (Wrap-around active${isAutoDetected ? ' • Detected from server configuration' : ''})`
                  : 'Standard Universe (Wrap-around disabled)'
              }
            >
              <Globe size={13} />
              <span>{isCircularUniverse ? 'Circular Universe' : 'Standard Universe'}</span>
              {isAutoDetected && isCircularUniverse && (
                <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(0, 242, 255, 0.2)', padding: '1px 5px', borderRadius: '4px', marginLeft: '2px' }}>
                  Auto
                </span>
              )}
            </button>

            {/* View Mode Switch */}
            <button
              type="button"
              className={`ow-phalanx-pill-btn ${viewMode === 'stream' ? 'active' : ''}`}
              onClick={() => setViewMode('stream')}
            >
              <Layers size={13} />
              <span>Bar View</span>
            </button>
            <button
              type="button"
              className={`ow-phalanx-pill-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewMode('matrix')}
            >
              <Crosshair size={13} />
              <span>Grid View</span>
            </button>

            {/* Simulation Lab Toggle */}
            <button
              type="button"
              className={`ow-phalanx-pill-btn ${isSimulating ? 'active' : ''}`}
              onClick={() => setIsSimulating(prev => !prev)}
            >
              <Sliders size={13} />
              <span>{isSimulating ? 'Close Simulator' : 'Phalanx Simulator'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              className="ow-phalanx-pill-btn"
              onClick={() => fetchCoverageData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw size={13} className={isRefreshing ? 'ow-spinning' : ''} />
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 2. STAT CARDS */}
        <div className="ow-phalanx-stats-grid" style={{ marginTop: '16px' }}>
          {/* Card 1: Universe Total */}
          <div className="ow-phalanx-stat-card">
            <div className="ow-phalanx-stat-card-top">
              <span>Universe Coverage</span>
              <Globe size={13} style={{ color: '#00f2ff' }} />
            </div>
            <div className="ow-phalanx-stat-card-val">
              <span>{universeMetrics.universePercent}%</span>
            </div>
            <div className="ow-phalanx-stat-card-sub highlight">
              <span>{universeMetrics.totalCovered.toLocaleString()} / {universeMetrics.totalPossible.toLocaleString()} Systems Covered</span>
            </div>
          </div>

          {/* Card 2: Selected Galaxy Total */}
          <div className="ow-phalanx-stat-card">
            <div className="ow-phalanx-stat-card-top">
              <span>Galaxy {selectedGalaxy} Coverage</span>
              <Radio size={13} style={{ color: '#10b981' }} />
            </div>
            <div className="ow-phalanx-stat-card-val" style={{ color: galaxyMetrics.coveragePercent >= 80 ? '#34d399' : galaxyMetrics.coveragePercent >= 50 ? '#38bdf8' : '#f87171' }}>
              <span>{galaxyMetrics.coveragePercent}%</span>
            </div>
            <div className="ow-phalanx-stat-card-sub emerald">
              <span>{galaxyMetrics.coveredCount} of 499 Systems</span>
            </div>
          </div>

          {/* Card 3: Active Sensors */}
          <div className="ow-phalanx-stat-card">
            <div className="ow-phalanx-stat-card-top">
              <span>Alliance Phalanxes</span>
              <Moon size={13} style={{ color: '#f59e0b' }} />
            </div>
            <div className="ow-phalanx-stat-card-val">
              <span>{galaxyMetrics.activePhalanxes}</span>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                in G{selectedGalaxy} ({universeMetrics.totalAlliancePhalanxes} Total)
              </span>
            </div>
            <div className="ow-phalanx-stat-card-sub">
              <span>Highest: Phalanx Lv {galaxyMetrics.maxPhalanx}</span>
            </div>
          </div>

          {/* Card 4: Phalanx Range Bonus (Discoverer + IAN) */}
          <div className="ow-phalanx-stat-card">
            <div className="ow-phalanx-stat-card-top">
              <span>Phalanx Range Bonus</span>
              <Zap size={13} style={{ color: '#c084fc' }} />
            </div>
            <div className="ow-phalanx-stat-card-val" style={{ color: '#c084fc' }}>
              <span>+{activeDisplayBonus.total}%</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Range Boost</span>
            </div>
            <div className="ow-phalanx-stat-card-sub violet">
              <Sparkles size={11} />
              <span>
                {activeDisplayBonus.disc > 0 && activeDisplayBonus.ian > 0
                  ? `Discoverer +${activeDisplayBonus.disc}% • IAN +${activeDisplayBonus.ian}%`
                  : activeDisplayBonus.disc > 0
                  ? `Discoverer class (+${activeDisplayBonus.disc}%)`
                  : activeDisplayBonus.ian > 0
                  ? `IAN Lifeform Tech (+${activeDisplayBonus.ian}%)`
                  : 'No active range bonus'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GALAXY TABS */}
      <div className="ow-phalanx-galaxy-nav">
        {Array.from({ length: galaxiesCount }, (_, i) => i + 1).map(g => {
          const pct = universeMetrics.galaxyPercentages[g] ?? 0;
          const moonsInG = allEffectiveMoons.filter(m => m.galaxy === g && m.phalanxLevel > 0).length;
          const badgeClass = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';

          return (
            <div
              key={g}
              className={`ow-phalanx-galaxy-tab ${selectedGalaxy === g ? 'active' : ''}`}
              onClick={() => {
                setSelectedGalaxy(g);
                setHighlightedMoonId(null);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="ow-phalanx-tab-title">
                <span>Galaxy {g}</span>
                <span className={`ow-phalanx-tab-badge ${badgeClass}`}>{pct}%</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Moon size={10} style={{ color: moonsInG > 0 ? '#f59e0b' : '#64748b' }} />
                <span>{moonsInG} {moonsInG === 1 ? 'Phalanx' : 'Phalanxes'}</span>
              </div>
              <div className="ow-phalanx-tab-bar">
                <div className="ow-phalanx-tab-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 499-SYSTEM COVERAGE VIEW (CHART) */}
      <section className="ow-phalanx-outer-shell">
        <div className="ow-phalanx-radar-card">
          <div className="ow-phalanx-radar-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Radio size={16} style={{ color: '#00f2ff' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                Galaxy {selectedGalaxy} Coverage (499 Systems)
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Member Filter */}
              <div className="ow-phalanx-search-input-wrap">
                <Filter size={12} style={{ color: '#94a3b8' }} />
                <select
                  value={selectedMemberFilter}
                  onChange={e => setSelectedMemberFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#f1f5f9', outline: 'none', fontSize: '12px', cursor: 'pointer' }}
                >
                  <option value="all" style={{ background: '#0f172a' }}>All Alliance Members ({galaxyMoons.length} Moons)</option>
                  {allianceMembers.map(m => (
                    <option key={m.playerId} value={m.playerId} style={{ background: '#0f172a' }}>
                      {m.playerName} {m.isDiscoverer ? '🧭' : ''} ({m.moonCount} Moons)
                    </option>
                  ))}
                </select>
              </div>

              {/* Legend */}
              <div className="ow-phalanx-radar-legend">
                <div className="ow-phalanx-legend-item">
                  <div className="ow-phalanx-legend-dot void" />
                  <span>Uncovered (0)</span>
                </div>
                <div className="ow-phalanx-legend-item">
                  <div className="ow-phalanx-legend-dot single" />
                  <span>1 Phalanx</span>
                </div>
                <div className="ow-phalanx-legend-item">
                  <div className="ow-phalanx-legend-dot dual" />
                  <span>2 Phalanxes</span>
                </div>
                <div className="ow-phalanx-legend-item">
                  <div className="ow-phalanx-legend-dot multi" />
                  <span>3+ Phalanxes</span>
                </div>
                <div className="ow-phalanx-legend-item">
                  <div className="ow-phalanx-legend-dot moon" />
                  <span>Moon</span>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATOR DRAWER (IF ACTIVE) */}
          {isSimulating && (
            <div className="ow-phalanx-sim-deck" style={{ margin: '14px 0' }}>
              <div className="ow-phalanx-sim-header">
                <div className="ow-phalanx-sim-title">
                  <Sliders size={14} />
                  <span>Phalanx Simulator</span>
                </div>
                <span style={{ fontSize: '11px', color: '#c084fc' }}>
                  Simulate how phalanx levels and range bonuses affect coverage in Galaxy {selectedGalaxy}
                </span>
              </div>

              <div className="ow-phalanx-sim-controls">
                <div className="ow-phalanx-sim-control-group">
                  <label>
                    <span>Phalanx Level Upgrade:</span>
                    <strong style={{ color: '#00f2ff' }}>+{simPhalanxDelta} Level{simPhalanxDelta > 1 ? 's' : ''}</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    className="ow-phalanx-sim-range-input"
                    value={simPhalanxDelta}
                    onChange={e => setSimPhalanxDelta(Number(e.target.value))}
                  />
                </div>

                <div className="ow-phalanx-sim-control-group">
                  <label>
                    <span>Tech / Discoverer Range Bonus:</span>
                    <strong style={{ color: '#c084fc' }}>+{simIanBonusDelta}% Range</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="2"
                    className="ow-phalanx-sim-range-input"
                    value={simIanBonusDelta}
                    onChange={e => setSimIanBonusDelta(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: BAR VIEW */}
          {viewMode === 'stream' && (
            <div className="ow-phalanx-stream-viewport">
              {/* Axis Ticks */}
              <div className="ow-phalanx-axis-ticks">
                <span>Sys 1</span>
                <span>50</span>
                <span>100</span>
                <span>150</span>
                <span>200</span>
                <span>250</span>
                <span>300</span>
                <span>350</span>
                <span>400</span>
                <span>450</span>
                <span>Sys 499</span>
              </div>

              {/* Moon Marker Beacon Pins above the chart */}
              <div className="ow-phalanx-moon-pins-track">
                {galaxyMoons.map(moon => {
                  const leftPercent = ((moon.system - 1) / 498) * 100;
                  const isSelected = highlightedMoonId === moon.id;

                  return (
                    <div
                      key={moon.id}
                      className={`ow-phalanx-moon-pin ${isSelected ? 'selected' : ''}`}
                      style={{ left: `${leftPercent}%` }}
                      onClick={() => setHighlightedMoonId(prev => (prev === moon.id ? null : moon.id))}
                      title={`${moon.playerName}: ${moon.name} ${moon.coords} — Phalanx Lv ${moon.phalanxLevel}${moon.effectiveRange ? ` (Range: ±${moon.effectiveRange} sys)` : ''}`}
                    >
                      <div className="ow-phalanx-moon-pin-beacon">
                        <Moon size={9} style={{ color: '#03060c' }} />
                      </div>
                      <div className="ow-phalanx-moon-pin-stem" />
                    </div>
                  );
                })}
              </div>

              {/* The 499 Discrete Interactive Columns */}
              <div
                className="ow-phalanx-bars-container"
                onMouseMove={handleBarMouseMove}
                onMouseLeave={handleBarMouseLeave}
              >
                {/* Scrubbing Reticle Line */}
                {reticlePositionX !== null && (
                  <div
                    className="ow-phalanx-scrub-reticle"
                    style={{ left: `${reticlePositionX}px` }}
                  />
                )}

                {systemCoverageMap.map(sysInfo => {
                  const s = sysInfo.system;
                  const count = sysInfo.coverageCount;
                  const hasMoon = galaxyMoons.some(m => m.system === s);
                  const inFocusedRange = highlightedMoonSystemsSet ? highlightedMoonSystemsSet.has(s) : false;
                  const isDimmed = highlightedMoonSystemsSet ? !inFocusedRange : false;

                  const levelClass = count === 0 ? 'void' : count === 1 ? 'level-1' : count === 2 ? 'level-2' : 'level-3';

                  return (
                    <div
                      key={s}
                      className={`ow-phalanx-system-bar ${levelClass} ${hasMoon ? 'is-moon-location' : ''} ${inFocusedRange ? 'in-selected-range' : ''} ${isDimmed ? 'dimmed' : ''}`}
                      onClick={() => {
                        if (onJumpToCoordinates) {
                          onJumpToCoordinates(selectedGalaxy, s);
                        }
                      }}
                    >
                      <div className="ow-phalanx-system-bar-fill" />
                    </div>
                  );
                })}
              </div>

              {/* HUD Popover Float */}
              {activeHoveredSysInfo && reticlePositionX !== null && (
                <div
                  className="ow-phalanx-hover-hud"
                  style={{
                    left: `${Math.min(Math.max(reticlePositionX - 120, 10), 1200)}px`,
                  }}
                >
                  <div className="ow-phalanx-hud-coords">
                    <span className="ow-phalanx-hud-sys">
                      [{selectedGalaxy}:{activeHoveredSysInfo.system}]
                    </span>
                    <span className={`ow-phalanx-hud-status-badge ${activeHoveredSysInfo.isCovered ? 'secure' : 'blind'}`}>
                      {activeHoveredSysInfo.isCovered ? `${activeHoveredSysInfo.coverageCount} Phalanxes` : 'Uncovered'}
                    </span>
                  </div>

                  <div className="ow-phalanx-hud-list">
                    {activeHoveredSysInfo.isCovered ? (
                      activeHoveredSysInfo.coveringMoons.map((m, idx) => {
                        let dist = Math.abs(m.system - activeHoveredSysInfo.system);
                        if (isCircularUniverse && dist > 499 / 2) {
                          dist = 499 - dist;
                        }
                        return (
                          <div key={idx} className="ow-phalanx-hud-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{m.playerName}</span>
                              {m.isDiscoverer && (
                                <span style={{ fontSize: '9px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                  Discoverer {m.discovererPhalanxBoost ? `+${m.discovererPhalanxBoost}%` : ''}
                                </span>
                              )}
                              {m.ianLevel > 0 && (
                                <span style={{ fontSize: '9px', color: '#c084fc', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                  IAN +{m.ianBoostPercent}%
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{m.coords}</span>
                              <span style={{ color: '#00f2ff' }}>Lv {m.phalanxLevel} (Range ±{m.effectiveRange})</span>
                              <span style={{ color: '#64748b' }}>({dist} sys away)</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#f87171', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} />
                        <span>No alliance phalanxes reach this system.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: GRID VIEW */}
          {viewMode === 'matrix' && (
            <div className="ow-phalanx-matrix-grid">
              {Array.from({ length: 10 }, (_, bankIdx) => {
                const startSys = bankIdx * 50 + 1;
                const endSys = Math.min(499, (bankIdx + 1) * 50);
                const bankSystems = systemCoverageMap.slice(startSys - 1, endSys);
                const coveredInBank = bankSystems.filter(s => s.isCovered).length;

                return (
                  <div key={bankIdx} className="ow-phalanx-matrix-bank">
                    <div className="ow-phalanx-matrix-bank-header">
                      <span>Systems {startSys} – {endSys}</span>
                      <span style={{ color: coveredInBank === bankSystems.length ? '#10b981' : '#38bdf8' }}>
                        {coveredInBank}/{bankSystems.length}
                      </span>
                    </div>
                    <div className="ow-phalanx-matrix-bank-cells">
                      {bankSystems.map(sysInfo => {
                        const count = sysInfo.coverageCount;
                        const lvlClass = count === 0 ? 'void' : count === 1 ? 'level-1' : count === 2 ? 'level-2' : 'level-3';

                        return (
                          <div
                            key={sysInfo.system}
                            className={`ow-phalanx-matrix-cell ${lvlClass}`}
                            title={`System [${selectedGalaxy}:${sysInfo.system}]: ${count > 0 ? `${count} Phalanxes covering` : 'Uncovered'}`}
                            onClick={() => {
                              if (onJumpToCoordinates) {
                                onJumpToCoordinates(selectedGalaxy, sysInfo.system);
                              }
                            }}
                          >
                            {sysInfo.system % 10 === 0 ? sysInfo.system : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. UNCOVERED SYSTEMS GAPS */}
      {blindSpots.length > 0 && (
        <div className="ow-phalanx-blindspots-deck">
          <div className="ow-phalanx-blindspots-header">
            <div className="ow-phalanx-blindspots-title">
              <AlertTriangle size={14} />
              <span>Galaxy {selectedGalaxy} Uncovered Systems ({blindSpots.length} Gaps)</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Click any gap to jump to the Galaxy view
            </span>
          </div>

          <div className="ow-phalanx-gaps-scroll">
            {blindSpots.map((gap, idx) => (
              <div
                key={idx}
                className="ow-phalanx-gap-pill"
                onClick={() => {
                  if (onJumpToCoordinates) {
                    onJumpToCoordinates(selectedGalaxy, gap.start);
                  }
                }}
              >
                <span style={{ fontWeight: 800 }}>Systems {gap.start}–{gap.end}</span>
                <span style={{ color: '#f87171' }}>({gap.length} systems)</span>
                <ChevronRight size={12} style={{ opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverwatchPhalanxCoverage;
