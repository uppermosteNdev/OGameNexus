// ============================================================================
// NEXUS OVERWATCH — ALLIANCE EMPIRE COMMAND DECK (HIGH-END AGENCY DESIGN)
// Archetype: Ethereal Glass / Double-Bezel Hardware Avionics
// Synchronizes and visualizes Mine Levels, Facilities, Lifeforms, Fleet, & Research
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  RefreshCw,
  Search,
  Lock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Cpu,
  Layers,
  Zap,
  Globe,
  Radio,
  ExternalLink,
  Info,
  Sparkles,
  Swords,
  Rocket,
  FlaskConical,
  Award,
  Crown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Database,
  Thermometer
} from 'lucide-react';
import { ThemeIcon } from '../components/ThemeIcon';
import { OverwatchOverviewTab } from './OverwatchOverviewTab';
import { OverwatchEmpireComparisonDeck, ComparedPlayerSlot, SLOT_COLORS } from './OverwatchEmpireComparisonDeck';
import { getLifeformBonusOverview, getBlankLifeformOverview } from '../../db/lfBonusOverviewEngine';
import { getLfTech, LIFEFORM_TECH_DATA } from '../../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../../db/lifeformBonusData';
import { db } from '../../db';
import { calculateEmpireProduction } from '../../utils/amortizationCalc';
import { calculateAccountResearchScore } from '../../utils/researchTimeCalc';
import { cleanUniverseId } from '../../utils/universe';
import { fetchPlayerHighscores } from '../../utils/ogameHighscores';

// ----------------------------------------------------------------------------
// SHIP MSU MAPPING (Metal + 1.5*Crystal + 3*Deuterium)
// ----------------------------------------------------------------------------

export const SHIP_MSU_COSTS: Record<number, number> = {
  202: 5000,     // Small Cargo: 2k M + 2k C
  203: 15000,    // Large Cargo: 6k M + 6k C
  204: 4500,     // Light Fighter: 3k M + 1k C
  205: 12000,    // Heavy Fighter: 6k M + 4k C
  206: 36500,    // Cruiser: 20k M + 7k C + 2k D
  207: 67500,    // Battleship: 45k M + 15k C
  208: 70000,    // Colony Ship: 10k M + 20k C + 10k D
  209: 25000,    // Recycler: 10k M + 6k C + 2k D
  210: 1500,     // Espionage Probe: 1k C
  211: 132500,   // Bomber: 50k M + 25k C + 15k D
  212: 4500,     // Solar Satellite: 2k C + 500 D
  213: 180000,   // Destroyer: 60k M + 50k C + 15k D
  214: 14000000, // Deathstar: 5M M + 4M C + 1M D
  215: 135000,   // Battlecruiser: 30k M + 40k C + 15k D
  217: 8000,     // Crawler: 2k M + 2k C + 1k D
  218: 227500,   // Reaper: 85k M + 55k C + 20k D
  219: 54500,    // Pathfinder: 8k M + 15k C + 8k D
};

// ----------------------------------------------------------------------------
// INTERFACES & TYPES
// ----------------------------------------------------------------------------

export interface AllianceEmpireSummary {
  playerId: string;
  playerName: string;
  role: 'admin' | 'member' | 'visitor';
  clientVersion?: string;
  avatarUrl?: string | null;
  lastSyncAt?: number;
  hasSyncedEmpire: boolean;
  isEmpireShared: boolean;
  playerClass?: string | number | null;
  totalScore?: number;
  economyScore?: number;
  militaryScore?: number;
  researchScore?: number;
  planetCount?: number;
  moonCount?: number;
  totalMines?: number;
  totalShips?: number;
  totalFleetMsu?: number;
  avgMetalMine?: number;
  avgCrystalMine?: number;
  avgDeutMine?: number;
  totalMetalHourly?: number;
  totalCrystalHourly?: number;
  totalDeutHourly?: number;
  lastEmpireSyncAt?: number;
}

export interface AllianceTotals {
  totalMembers: number;
  syncedEmpiresCount: number;
  totalPlanets: number;
  totalMoons: number;
  totalMines: number;
  totalFleetShips: number;
  totalProductionMetal: number;
  totalProductionCrystal: number;
  totalProductionDeut: number;
  totalProductionMSU: number;
  topMiner: { name: string; totalMines: number };
  topFleeter: { name: string; totalShips?: number; fleetMsu?: number };
  topResearcher: { name: string; researchScore: number };
}

export interface PlanetEmpireData {
  id: string;
  name: string;
  coords: string;
  type: 'planet' | 'moon';
  imgUrl?: string;
  fieldsUsed?: number;
  fieldsTotal?: number;
  tempMin?: number;
  tempMax?: number;
  metalMine?: number;
  crystalMine?: number;
  deuteriumMine?: number;
  solarPlant?: number;
  fusionReactor?: number;
  solarSatellites?: number;
  crawlers?: number;
  metalStorage?: number;
  crystalStorage?: number;
  deuteriumStorage?: number;
  roboticsFactory?: number;
  shipyard?: number;
  researchLab?: number;
  allianceDepot?: number;
  missileSilo?: number;
  naniteFactory?: number;
  terraformer?: number;
  spaceDock?: number;
  lunarBase?: number;
  sensorPhalanx?: number;
  jumpGate?: number;
  lifeformId?: number;
  lifeformSetup?: Array<{ slotNumber: number; selectedTechId: number | null; level: number }>;
  lifeformBuildings?: Array<{ id: number; level: number }>;
  ships?: Record<string | number, number>;
  defenses?: Record<string | number, number>;
  production?: {
    metal?: number;
    crystal?: number;
    deuterium?: number;
    energy?: number;
  };
}

export interface MemberEmpireDetail {
  playerId: string;
  playerName: string;
  playerClass?: string | number | null;
  allianceClass?: string | number | null;
  avatarUrl?: string | null;
  totalScore?: number;
  economyScore?: number;
  militaryScore?: number;
  researchScore?: number;
  totalFleetMsu?: number;
  updatedAt?: number;
  empire: {
    planets: PlanetEmpireData[];
    researches: Array<{ id: number; level: number }>;
    lifeformExperience: Array<{ lifeformId: number; level: number; currentExp?: number; nextLevelExp?: number }>;
  };
}

interface OverwatchEmpireProps {
  config: any;
  effectiveAccount: any;
  effectivePermissions: any;
  isAdmin: boolean;
  apiUrl: string;
}

// ----------------------------------------------------------------------------
// STATIC GAME MAPPINGS (SHIPS, DEFENSES, RESEARCH)
// ----------------------------------------------------------------------------

const SHIP_CATALOG: Array<{ id: number; name: string; icon: string; category: 'combat' | 'civil' }> = [
  { id: 202, name: 'Small Cargo', icon: '/icons/ships/small-cargo-large.jpg', category: 'civil' },
  { id: 203, name: 'Large Cargo', icon: '/icons/ships/large-cargo-large.jpg', category: 'civil' },
  { id: 204, name: 'Light Fighter', icon: '/icons/ships/light-fighter-large.jpg', category: 'combat' },
  { id: 205, name: 'Heavy Fighter', icon: '/icons/ships/heavy-fighter-large.jpg', category: 'combat' },
  { id: 206, name: 'Cruiser', icon: '/icons/ships/cruiser-large.jpg', category: 'combat' },
  { id: 207, name: 'Battleship', icon: '/icons/ships/battleship-large.jpg', category: 'combat' },
  { id: 208, name: 'Colony Ship', icon: '/icons/ships/colony-ship-large.jpg', category: 'civil' },
  { id: 209, name: 'Recycler', icon: '/icons/ships/recycler-large.jpg', category: 'civil' },
  { id: 210, name: 'Espionage Probe', icon: '/icons/ships/espionage-probe-large.jpg', category: 'civil' },
  { id: 211, name: 'Bomber', icon: '/icons/ships/bomber-large.jpg', category: 'combat' },
  { id: 213, name: 'Destroyer', icon: '/icons/ships/destroyer-large.jpg', category: 'combat' },
  { id: 214, name: 'Deathstar', icon: '/icons/ships/deathstar-large.jpg', category: 'combat' },
  { id: 215, name: 'Battlecruiser', icon: '/icons/ships/battlecruiser-large.jpg', category: 'combat' },
  { id: 218, name: 'Reaper', icon: '/icons/ships/reaper-large.jpg', category: 'combat' },
  { id: 219, name: 'Pathfinder', icon: '/icons/ships/pathfinder-large.jpg', category: 'combat' },
];

const DEFENSE_CATALOG: Array<{ id: number; name: string; icon: string }> = [
  { id: 401, name: 'Rocket Launcher', icon: '/icons/ships/rocket-launcher-large.jpg' },
  { id: 402, name: 'Light Laser', icon: '/icons/ships/light-laser-large.jpg' },
  { id: 403, name: 'Heavy Laser', icon: '/icons/ships/heavy-laser-large.jpg' },
  { id: 404, name: 'Gauss Cannon', icon: '/icons/ships/gauss-cannon-large.jpg' },
  { id: 405, name: 'Ion Cannon', icon: '/icons/ships/ion-cannon-large.jpg' },
  { id: 406, name: 'Plasma Turret', icon: '/icons/ships/plasma-turret-large.jpg' },
  { id: 407, name: 'Small Shield Dome', icon: '/icons/ships/small-shield-dome-large.jpg' },
  { id: 408, name: 'Large Shield Dome', icon: '/icons/ships/large-shield-dome-large.jpg' },
  { id: 502, name: 'Anti-Ballistic Missiles', icon: '/icons/ships/anti-ballistic-missiles-large.jpg' },
  { id: 503, name: 'Interplanetary Missiles', icon: '/icons/ships/interplanetary-missiles-large.jpg' },
];

const RESEARCH_CATEGORIES = [
  {
    title: 'Fundamental Sciences',
    technologies: [
      { id: 113, name: 'Energy Technology', icon: '/icons/research/energy-research-large.jpg' },
      { id: 120, name: 'Laser Technology', icon: '/icons/research/laser-tech-research-large.jpg' },
      { id: 121, name: 'Ion Technology', icon: '/icons/research/ion-tech-research-large.jpg' },
      { id: 114, name: 'Hyperspace Technology', icon: '/icons/research/hyperspace-tech-research-large.jpg' },
      { id: 122, name: 'Plasma Technology', icon: '/icons/research/plasma-tech-research-large.jpg' },
    ]
  },
  {
    title: 'Propulsion Systems',
    technologies: [
      { id: 115, name: 'Combustion Drive', icon: '/icons/research/combustion-drive-research-large.jpg' },
      { id: 117, name: 'Impulse Drive', icon: '/icons/research/impulse-drive-research-large.jpg' },
      { id: 118, name: 'Hyperspace Drive', icon: '/icons/research/hyperspace-drive-research-large.jpg' },
    ]
  },
  {
    title: 'Advanced Operations',
    technologies: [
      { id: 106, name: 'Espionage Technology', icon: '/icons/research/espionage-tech-research-large.jpg' },
      { id: 108, name: 'Computer Technology', icon: '/icons/research/computer-tech-research-large.jpg' },
      { id: 124, name: 'Astrophysics', icon: '/icons/research/expedition-tech-research-large.jpg' },
      { id: 123, name: 'Intergalactic Research Net', icon: '/icons/research/integalagtic-research-tech-research-large.jpg' },
      { id: 199, name: 'Graviton Technology', icon: '/icons/research/graviton-tech-research-large.jpg' },
    ]
  },
  {
    title: 'Combat Technologies',
    technologies: [
      { id: 109, name: 'Weapons Technology', icon: '/icons/research/weapons-tech-research-large.jpg' },
      { id: 110, name: 'Shielding Technology', icon: '/icons/research/shield-tech-research-large.jpg' },
      { id: 111, name: 'Armour Technology', icon: '/icons/research/armor-tech-research-large.jpg' },
    ]
  }
];

// ----------------------------------------------------------------------------
// FORMATTING HELPERS
// ----------------------------------------------------------------------------

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.floor(num).toLocaleString();
}

function formatCompact(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const val = Number(num);
  if (Math.abs(val) >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + 'k';
  return val.toString();
}

function formatTimeAgo(timestamp?: number | null): string {
  if (!timestamp) return 'Never';
  const ageSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (ageSec < 60) return 'Just now';
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}

function resolvePlayerClass(raw: any): { label: string; color: string; bg: string; border: string } {
  const norm = String(raw || '').toLowerCase();
  if (norm.includes('1') || norm.includes('collector')) {
    return {
      label: 'Collector',
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.12)',
      border: 'rgba(251, 191, 36, 0.35)',
    };
  }
  if (norm.includes('2') || norm.includes('general') || norm.includes('warrior')) {
    return {
      label: 'General',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.35)',
    };
  }
  if (norm.includes('3') || norm.includes('discoverer')) {
    return {
      label: 'Discoverer',
      color: '#00f2ff',
      bg: 'rgba(0, 242, 255, 0.12)',
      border: 'rgba(0, 242, 255, 0.35)',
    };
  }
  return {
    label: 'Unassigned',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.25)',
  };
}

function getLfColor(lfId?: number) {
  switch (lfId) {
    case 1: return '#3b82f6'; // Humans
    case 2: return '#eab308'; // Rock'tal
    case 3: return '#a855f7'; // Mechas
    case 4: return '#06b6d4'; // Kaelesh
    default: return 'rgba(255,255,255,0.4)';
  }
}

function getLfName(lfId?: number) {
  switch (lfId) {
    case 1: return 'Humans';
    case 2: return 'Rock\'tal';
    case 3: return 'Mechas';
    case 4: return 'Kaelesh';
    default: return 'No Lifeform';
  }
}

function getLfIcon(lfId?: number) {
  const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
  if (!lfId || lfId < 1 || lfId > 4) return '';
  return `/icons/lifeforms/${lfNames[lfId - 1]}-icon-large.jpg`;
}

function getTechIconPath(techId: number) {
  const tech = getLfTech(techId);
  if (!tech) return '';
  const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
  const lfName = lfNames[tech.lifeformId - 1];
  const slotNum = Math.floor((tech.id - 1) / 4) + 1;
  return `/icons/lifeforms/${lfName}-tech-t${slotNum}-large.jpg`;
}

const LF_MATRIX_SLOTS = [
  1, 2, 7, 8, 13, 14,
  3, 4, 9, 10, 15, 16,
  5, 6, 11, 12, 17, 18,
];

// ----------------------------------------------------------------------------
// LIFEFORM BONUS ENGINE
// ----------------------------------------------------------------------------

function calculateMemberLifeformBonuses(memberEmpire: MemberEmpireDetail) {
  const bonuses: Record<string, number> = {};
  const planets = (memberEmpire.empire.planets || []).filter(p => p.type === 'planet');
  const expList = memberEmpire.empire.lifeformExperience || [];

  planets.forEach(p => {
    let buildingBonus = 0;
    if (p.lifeformBuildings) {
      const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
      p.lifeformBuildings.forEach((b: any) => {
        if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
        if (b.id === 11111) buildingBonus += b.level * 0.005;
        else if (b.id === 13107) buildingBonus += b.level * 0.003;
        else if (b.id === 13111) buildingBonus += b.level * 0.004;
      });
    }

    const expData = expList.find(e => e.lifeformId === p.lifeformId);
    const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

    const setup = p.lifeformSetup || [];
    setup.forEach(slot => {
      if (!slot || !slot.selectedTechId) return;
      const tech = getLfTech(slot.selectedTechId);
      if (!tech || !tech.target) return;

      const uniqueBonusIds: number[] = [];
      tech.target.forEach((t: any) => {
        if (!uniqueBonusIds.includes(t.bonusBreakdownId)) {
          uniqueBonusIds.push(t.bonusBreakdownId);
        }
      });

      uniqueBonusIds.forEach((bId, idx) => {
        let baseVal = idx === 0 ? tech.bonus1BaseValue : idx === 1 ? tech.bonus2BaseValue : tech.bonus3BaseValue;
        if (baseVal === null || baseVal === undefined) return;
        const bDef = LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.id === bId);
        const name = bDef?.bonusName || `Bonus_${bId}`;
        const finalVal = baseVal * slot.level * totalMultiplier;
        bonuses[name] = (bonuses[name] || 0) + finalVal;
      });
    });
  });

  return bonuses;
}

// ----------------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------------

export const OverwatchEmpire: React.FC<OverwatchEmpireProps> = ({
  config,
  effectiveAccount,
  effectivePermissions,
  isAdmin,
  apiUrl,
}) => {
  // Roster & Totals State
  const [roster, setRoster] = useState<AllianceEmpireSummary[]>([]);
  const [totals, setTotals] = useState<AllianceTotals | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [isRefreshingRoster, setIsRefreshingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const rosterRef = useRef<AllianceEmpireSummary[]>([]);
  rosterRef.current = roster;

  const accountRef = useRef(effectiveAccount);
  accountRef.current = effectiveAccount;

  // Auto-resolve local account highscores (economy, military, total) against official Gameforge highscores
  useEffect(() => {
    const uni = cleanUniverseId(effectiveAccount?.universe || config?.universeId || 's267-en');
    const pId = effectiveAccount?.playerId;
    if (uni && pId) {
      fetchPlayerHighscores(uni, String(pId), true).then(hs => {
        const updates: any = {};
        if (hs.totalScore && hs.totalScore > 0 && hs.totalScore !== effectiveAccount.score) {
          updates.score = hs.totalScore;
        }
        if (hs.economyScore && hs.economyScore > 0 && hs.economyScore !== effectiveAccount.economyScore) {
          updates.economyScore = hs.economyScore;
          if (hs.economyRank) updates.economyRank = hs.economyRank;
        }
        if (hs.militaryScore && hs.militaryScore > 0 && hs.militaryScore !== effectiveAccount.militaryScore) {
          updates.militaryScore = hs.militaryScore;
          if (hs.militaryRank) updates.militaryRank = hs.militaryRank;
        }
        if (hs.ships && hs.ships > 0 && hs.ships !== effectiveAccount.shipCount) {
          updates.shipCount = hs.ships;
        }
        if (Object.keys(updates).length > 0) {
          db.accounts.update(pId, updates).catch(() => {});
        }
      }).catch(err => console.warn('[OverwatchEmpire] Background player highscore fetch failed:', err));
    }
  }, [effectiveAccount?.playerId, effectiveAccount?.universe, config.universeId]);

  // Selected Member Drilldown State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberEmpireDetail | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [drilldownTab, setDrilldownTab] = useState<'overview' | 'mines' | 'facilities' | 'lifeforms' | 'fleet' | 'research'>('overview');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'all' | 'collector' | 'general' | 'discoverer'>('all');

  // Manual Force Sync State
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Comparison Mode State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoadingCompareData, setIsLoadingCompareData] = useState(false);
  const [compareDetailsMap, setCompareDetailsMap] = useState<Record<string, MemberEmpireDetail>>({});
  const [compareNotice, setCompareNotice] = useState<string | null>(null);

  const handleTogglePlayerCompare = useCallback((playerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const member = rosterRef.current.find(m => String(m.playerId) === String(playerId));
    if (!member || !member.hasSyncedEmpire) {
      setCompareNotice(`Commander ${member?.playerName || `#${playerId}`} has not synced empire data yet.`);
      setTimeout(() => setCompareNotice(null), 3500);
      return;
    }

    setSelectedCompareIds(prev => {
      const pIdStr = String(playerId);
      if (prev.includes(pIdStr)) {
        return prev.filter(id => id !== pIdStr);
      }
      if (prev.length >= 4) {
        setCompareNotice('Maximum 4 alliance members can be compared simultaneously.');
        setTimeout(() => setCompareNotice(null), 3500);
        return prev;
      }
      return [...prev, pIdStr];
    });
  }, []);

  const handleStartComparison = useCallback(async () => {
    if (selectedCompareIds.length < 2) return;
    setIsLoadingCompareData(true);
    setCompareNotice(null);

    try {
      const currentAccount = accountRef.current;
      const neededIds = selectedCompareIds.filter(id => !compareDetailsMap[id]);
      if (neededIds.length > 0) {
        const fetchedEntries = await Promise.all(
          neededIds.map(async (pId) => {
            // Check local Dexie first if it's the current player
            if (currentAccount && String(currentAccount.playerId) === String(pId)) {
              try {
                const localPlanets = await db.planets.where('playerId').equals(pId).toArray();
                if (localPlanets && localPlanets.length > 0) {
                  let localFleetMsu = 0;
                  localPlanets.forEach(p => {
                    if (p.ships) {
                      Object.entries(p.ships).forEach(([sId, c]: [string, any]) => {
                        const count = Number(c) || 0;
                        if (count > 0) {
                          localFleetMsu += count * (SHIP_MSU_COSTS[Number(sId)] || 0);
                        }
                      });
                    }
                  });

                  const localResearches = currentAccount.researches || [];
                  const calculatedRScore = calculateAccountResearchScore(localResearches);
                  const formattedLocal: MemberEmpireDetail = {
                    playerId: currentAccount.playerId,
                    playerName: currentAccount.playerName,
                    playerClass: currentAccount.playerClass,
                    allianceClass: currentAccount.allianceClass,
                    avatarUrl: currentAccount.avatarUrl || null,
                    totalScore: currentAccount.score,
                    economyScore: (rosterRef.current.find(r => String(r.playerId) === String(pId))?.economyScore) || currentAccount.economyScore || 0,
                    militaryScore: (rosterRef.current.find(r => String(r.playerId) === String(pId))?.militaryScore) || currentAccount.militaryScore || 0,
                    researchScore: Math.max(currentAccount.researchScore || 0, calculatedRScore),
                    totalFleetMsu: localFleetMsu,
                    updatedAt: Date.now(),
                    empire: {
                      planets: localPlanets as any,
                      researches: localResearches,
                      lifeformExperience: currentAccount.lifeformExperience || [],
                    },
                  };
                  return [pId, formattedLocal] as const;
                }
              } catch (e) {}
            }

            // Otherwise fetch from Cloudflare Worker
            try {
              const res = await fetch(`${apiUrl}/api/v1/overwatch/empire/member?playerId=${pId}`, {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${config.authToken}`,
                  Accept: 'application/json',
                },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.member) {
                  return [pId, data.member] as const;
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch empire detail for compare player ${pId}:`, err);
            }
            return [pId, null] as const;
          })
        );

        setCompareDetailsMap(prev => {
          const next = { ...prev };
          fetchedEntries.forEach(([id, detail]) => {
            if (detail) next[id] = detail;
          });
          return next;
        });
      }
      setIsComparing(true);
    } catch (e) {
      console.warn('Comparison data initialization error:', e);
      setIsComparing(true);
    } finally {
      setIsLoadingCompareData(false);
    }
  }, [selectedCompareIds, compareDetailsMap, apiUrl, config.authToken]);

  const comparedPlayerSlots: ComparedPlayerSlot[] = useMemo(() => {
    const slots: ComparedPlayerSlot[] = [];
    selectedCompareIds.forEach(id => {
      const summary = roster.find(r => String(r.playerId) === String(id));
      if (summary) {
        const detail = compareDetailsMap[id] || null;
        const lfOverview = detail ? getLifeformBonusOverview(detail) : getBlankLifeformOverview();
        slots.push({
          summary,
          detail,
          lfOverview,
        });
      }
    });
    return slots;
  }, [selectedCompareIds, roster, compareDetailsMap]);

  // --------------------------------------------------------------------------
  // FETCH ALLIANCE EMPIRE ROSTER
  // --------------------------------------------------------------------------
  const fetchRoster = useCallback(async (isSilent = false) => {
    if (!config.authToken || !config.allianceId) {
      setIsLoadingRoster(false);
      setIsRefreshingRoster(false);
      return;
    }

    const hasData = rosterRef.current.length > 0;
    try {
      if (!hasData && !isSilent) {
        setIsLoadingRoster(true);
      } else {
        setIsRefreshingRoster(true);
      }
      setRosterError(null);

      const res = await fetch(`${apiUrl}/api/v1/overwatch/empire/roster`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load empire roster: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const rawRoster = data.roster || [];
        const rawTotals = data.allianceTotals || data.aggregates;

        const currentAccount = accountRef.current;
        const currentMyPlayerId = currentAccount?.playerId ? String(currentAccount.playerId) : '';

        // Flatten each roster member so root properties are always populated
        const flattenedRoster: AllianceEmpireSummary[] = await Promise.all(
          rawRoster.map(async (m: any) => {
            const emp = m.empire || {};
            const isMe = Boolean(currentMyPlayerId && currentMyPlayerId === String(m.playerId));

            let totalScore = Number(m.totalScore ?? emp.totalScore ?? emp.total_score ?? 0);
            let playerClass = m.playerClass ?? emp.playerClass ?? emp.player_class ?? null;
            let planetCount = Number(m.planetCount ?? emp.planetCount ?? emp.planet_count ?? 0);
            let moonCount = Number(m.moonCount ?? emp.moonCount ?? emp.moon_count ?? 0);
            let totalMines = Number(m.totalMines ?? emp.totalMines ?? emp.total_mines ?? 0);
            let totalShips = Number(m.totalShips ?? emp.totalShips ?? emp.total_ships ?? 0);
            let totalFleetMsu = Number(m.totalFleetMsu ?? emp.totalFleetMsu ?? emp.total_fleet_msu ?? 0);
            let avatarUrl = m.avatarUrl || emp.avatarUrl || emp.avatar_url || (isMe ? currentAccount?.avatarUrl : null);
            let avgMetalMine = Number(m.avgMetalMine ?? emp.avgMetalMine ?? emp.avg_metal_mine ?? 0);
            let avgCrystalMine = Number(m.avgCrystalMine ?? emp.avgCrystalMine ?? emp.avg_crystal_mine ?? 0);
            let avgDeutMine = Number(m.avgDeutMine ?? emp.avgDeutMine ?? emp.avg_deut_mine ?? 0);
            let totalMetalHourly = Number(m.totalMetalHourly ?? emp.totalMetalHourly ?? emp.total_metal_hourly ?? 0);
            let totalCrystalHourly = Number(m.totalCrystalHourly ?? emp.totalCrystalHourly ?? emp.total_crystal_hourly ?? 0);
            let totalDeutHourly = Number(m.totalDeutHourly ?? emp.totalDeutHourly ?? emp.total_deut_hourly ?? 0);
            let hasSyncedEmpire = Boolean(m.hasSyncedEmpire || m.empire || totalScore > 0);
            let lastEmpireSyncAt = m.lastEmpireSyncAt ?? emp.lastSyncedAt ?? emp.last_synced_at ?? m.lastSyncedAt ?? m.last_sync_at ?? null;

            // If this is the current player, ensure local Dexie ground-truth is always applied
            if (isMe && currentAccount) {
              avatarUrl = currentAccount?.avatarUrl || avatarUrl;
              try {
                const localPlanets = await db.planets.where('playerId').equals(currentAccount.playerId).toArray();
                if (localPlanets && localPlanets.length > 0) {
                  const pEnt = localPlanets.filter(p => p.type === 'planet');
                  const mEnt = localPlanets.filter(p => p.type === 'moon');
                  const localPlanetCount = pEnt.length;
                  const localMoonCount = mEnt.length;

                  let mmSum = 0;
                  let cmSum = 0;
                  let dmSum = 0;
                  let localMines = 0;
                  let mH = 0;
                  let cH = 0;
                  let dH = 0;

                  pEnt.forEach(p => {
                    const mm = p.metalMine || 0;
                    const cm = p.crystalMine || 0;
                    const dm = p.deuteriumMine || 0;
                    mmSum += mm;
                    cmSum += cm;
                    dmSum += dm;
                    localMines += (mm + cm + dm);
                    if (p.production) {
                      mH += (p.production.metal || 0);
                      cH += (p.production.crystal || 0);
                      dH += (p.production.deuterium || 0);
                    }
                  });

                  // Always calculate comprehensive production via amortization engine
                  // (including full Lifeform tech tree setups, Crawlers, Plasma, Officers, and Boosters)
                  try {
                    const calcResults = calculateEmpireProduction({ account: currentAccount, planets: localPlanets });
                    if (calcResults?.planets) {
                      let calcM = 0;
                      let calcC = 0;
                      let calcD = 0;
                      Object.values(calcResults.planets).forEach(pData => {
                        if (pData?.total) {
                          calcM += pData.total.metal || 0;
                          calcC += pData.total.crystal || 0;
                          calcD += pData.total.deuterium || 0;
                        }
                      });
                      mH = Math.max(mH, calcM);
                      cH = Math.max(cH, calcC);
                      dH = Math.max(dH, calcD);
                    }
                  } catch (e) {
                    console.warn('Overwatch Empire: offline production fallback notice:', e);
                  }

                  let localShips = 0;
                  let localFleetMsu = 0;
                  localPlanets.forEach(p => {
                    if (p.ships) {
                      Object.entries(p.ships).forEach(([sId, c]: [string, any]) => {
                        const count = Number(c) || 0;
                        if (count > 0) {
                          localShips += count;
                          const cost = SHIP_MSU_COSTS[Number(sId)] || 0;
                          localFleetMsu += count * cost;
                        }
                      });
                    }
                  });

                  if (localMines > 0) {
                    totalMines = Math.max(totalMines, localMines);
                    avgMetalMine = pEnt.length > 0 ? parseFloat((mmSum / pEnt.length).toFixed(1)) : avgMetalMine;
                    avgCrystalMine = pEnt.length > 0 ? parseFloat((cmSum / pEnt.length).toFixed(1)) : avgCrystalMine;
                    avgDeutMine = pEnt.length > 0 ? parseFloat((dmSum / pEnt.length).toFixed(1)) : avgDeutMine;
                  }
                  if (localShips > 0) {
                    totalShips = Math.max(totalShips, localShips);
                  }
                  if (localFleetMsu > 0) {
                    totalFleetMsu = Math.max(totalFleetMsu, localFleetMsu);
                  }
                  if (localPlanetCount > 0) {
                    planetCount = Math.max(planetCount, localPlanetCount);
                    moonCount = Math.max(moonCount, localMoonCount);
                  }
                  if (mH > 0 || cH > 0 || dH > 0) {
                    totalMetalHourly = Math.max(totalMetalHourly, Math.floor(mH));
                    totalCrystalHourly = Math.max(totalCrystalHourly, Math.floor(cH));
                    totalDeutHourly = Math.max(totalDeutHourly, Math.floor(dH));
                  }

                  totalScore = currentAccount.score || totalScore;
                  playerClass = currentAccount.playerClass || playerClass;
                  hasSyncedEmpire = true;
                  lastEmpireSyncAt = lastEmpireSyncAt || Date.now();
                }
              } catch (e) {}
            }

            let resolvedResearchScore = Number(m.researchScore ?? emp.researchScore ?? emp.research_score ?? 0);
            if (isMe && currentAccount?.researches) {
              const localR = calculateAccountResearchScore(currentAccount.researches);
              if (localR > 0) resolvedResearchScore = Math.max(resolvedResearchScore, localR);
            } else if (emp?.researches || emp?.empire?.researches) {
              const remoteR = calculateAccountResearchScore(emp.researches || emp.empire.researches);
              if (remoteR > 0) resolvedResearchScore = Math.max(resolvedResearchScore, remoteR);
            }

            return {
              playerId: String(m.playerId || m.player_id),
              playerName: m.playerName || m.player_name || 'Commander',
              role: m.role || 'member',
              avatarUrl,
              isEmpireShared: m.isEmpireShared ?? true,
              hasSyncedEmpire,
              playerClass,
              allianceClass: m.allianceClass ?? emp.allianceClass ?? emp.alliance_class ?? null,
              totalScore,
              economyScore: Number(m.economyScore ?? emp.economyScore ?? emp.economy_score ?? (isMe ? currentAccount?.economyScore : 0) ?? 0),
              militaryScore: Number(m.militaryScore ?? emp.militaryScore ?? emp.military_score ?? (isMe ? currentAccount?.militaryScore : 0) ?? 0),
              researchScore: resolvedResearchScore,
              planetCount,
              moonCount,
              totalMines,
              totalShips,
              totalFleetMsu,
              avgMetalMine,
              avgCrystalMine,
              avgDeutMine,
              totalMetalHourly,
              totalCrystalHourly,
              totalDeutHourly,
              lastEmpireSyncAt,
            };
          })
        );

        setRoster(flattenedRoster);

        // Dynamically compute totals across all roster members in flattenedRoster
        let calcTotalPlanets = 0;
        let calcTotalMoons = 0;
        let calcTotalMines = 0;
        let calcTotalFleetShips = 0;
        let calcTotalFleetMsu = 0;
        let calcTotalProductionMetal = 0;
        let calcTotalProductionCrystal = 0;
        let calcTotalProductionDeut = 0;
        let topMiner = { name: '-', totalMines: 0 };
        let topFleeter = { name: '-', fleetMsu: 0, totalShips: 0 };
        let topResearcher = { name: '-', researchScore: 0 };

        flattenedRoster.forEach(member => {
          if (!member.hasSyncedEmpire || !member.isEmpireShared) return;
          calcTotalPlanets += (member.planetCount || 0);
          calcTotalMoons += (member.moonCount || 0);
          calcTotalMines += (member.totalMines || 0);
          calcTotalFleetShips += (member.totalShips || 0);
          calcTotalFleetMsu += (member.totalFleetMsu || 0);
          calcTotalProductionMetal += (member.totalMetalHourly || 0);
          calcTotalProductionCrystal += (member.totalCrystalHourly || 0);
          calcTotalProductionDeut += (member.totalDeutHourly || 0);

          if ((member.totalMines || 0) > topMiner.totalMines) {
            topMiner = { name: member.playerName, totalMines: member.totalMines || 0 };
          }
          const playerFleetMsu = member.totalFleetMsu || 0;
          if (playerFleetMsu > (topFleeter.fleetMsu || 0) || (topFleeter.fleetMsu === 0 && (member.totalShips || 0) > (topFleeter.totalShips || 0))) {
            topFleeter = {
              name: member.playerName,
              fleetMsu: playerFleetMsu,
              totalShips: member.totalShips || 0,
            };
          }
          if ((member.researchScore || 0) > topResearcher.researchScore) {
            topResearcher = { name: member.playerName, researchScore: member.researchScore || 0 };
          }
        });

        const calcTotalProductionMSU = Math.round(calcTotalProductionMetal + calcTotalProductionCrystal * 1.5 + calcTotalProductionDeut * 3);
        const syncedCount = flattenedRoster.filter(r => r.hasSyncedEmpire).length;

        setTotals({
          totalMembers: rawTotals?.totalMembers ?? flattenedRoster.length,
          syncedEmpiresCount: Math.max(syncedCount, rawTotals?.syncedEmpiresCount ?? rawTotals?.syncedMembersCount ?? 0),
          totalPlanets: Math.max(calcTotalPlanets, rawTotals?.totalPlanets ?? 0),
          totalMoons: Math.max(calcTotalMoons, rawTotals?.totalMoons ?? 0),
          totalMines: Math.max(calcTotalMines, rawTotals?.totalMines ?? rawTotals?.totalMinesSum ?? 0),
          totalFleetShips: Math.max(calcTotalFleetShips, rawTotals?.totalFleetShips ?? 0),
          totalProductionMetal: Math.max(calcTotalProductionMetal, rawTotals?.totalProductionMetal ?? 0),
          totalProductionCrystal: Math.max(calcTotalProductionCrystal, rawTotals?.totalProductionCrystal ?? 0),
          totalProductionDeut: Math.max(calcTotalProductionDeut, rawTotals?.totalProductionDeut ?? 0),
          totalProductionMSU: Math.max(calcTotalProductionMSU, rawTotals?.totalProductionMSU ?? rawTotals?.totalMsuHourly ?? 0),
          topMiner: topMiner.totalMines > 0 ? topMiner : (rawTotals?.topMiner || { name: '-', totalMines: 0 }),
          topFleeter: (topFleeter.fleetMsu > 0 || topFleeter.totalShips > 0) ? topFleeter : (rawTotals?.topFleeter || { name: '-', fleetMsu: 0, totalShips: 0 }),
          topResearcher: topResearcher.researchScore > 0 ? topResearcher : (rawTotals?.topResearcher || { name: '-', researchScore: 0 }),
        });
      } else {
        throw new Error(data.error || 'Failed to fetch roster');
      }
    } catch (err: any) {
      console.warn('Overwatch Empire roster load notice:', err.message);
      if (rosterRef.current.length === 0) {
        setRosterError(err.message);
      }
    } finally {
      setIsLoadingRoster(false);
      setIsRefreshingRoster(false);
    }
  }, [config.authToken, config.allianceId, apiUrl]);

  useEffect(() => {
    fetchRoster();

    // Proactively verify & trigger automatic background sync when the user opens the Overwatch Empire page
    const pId = accountRef.current?.playerId;
    if (pId && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'OVERWATCH_AUTO_SYNC_EMPIRE',
        action: 'OVERWATCH_AUTO_SYNC_EMPIRE',
        playerId: pId,
      }).then(res => {
        if (res?.success && !res.skipped) {
          fetchRoster(true);
        }
      }).catch(() => {});
    }
  }, [fetchRoster]);

  // --------------------------------------------------------------------------
  // FETCH SPECIFIC MEMBER EMPIRE ON DRILLDOWN
  // --------------------------------------------------------------------------
  const handleSelectMember = async (playerId: string) => {
    setSelectedPlayerId(playerId);
    setIsLoadingMember(true);
    setMemberError(null);
    setMemberDetail(null);

    try {
      // First check if user clicked on their own local account — fallback from Dexie instantly if offline
      if (effectiveAccount && String(effectiveAccount.playerId) === String(playerId)) {
        const localPlanets = await db.planets.where('playerId').equals(playerId).toArray();
        if (localPlanets && localPlanets.length > 0) {
          let localFleetMsu = 0;
          localPlanets.forEach(p => {
            if (p.ships) {
              Object.entries(p.ships).forEach(([sId, c]: [string, any]) => {
                const count = Number(c) || 0;
                if (count > 0) {
                  localFleetMsu += count * (SHIP_MSU_COSTS[Number(sId)] || 0);
                }
              });
            }
          });

          const formattedLocal: MemberEmpireDetail = {
            playerId: effectiveAccount.playerId,
            playerName: effectiveAccount.playerName,
            playerClass: effectiveAccount.playerClass,
            allianceClass: effectiveAccount.allianceClass,
            avatarUrl: effectiveAccount.avatarUrl || null,
            totalScore: effectiveAccount.score,
            economyScore: (rosterRef.current.find(r => String(r.playerId) === String(effectiveAccount.playerId))?.economyScore) || effectiveAccount.economyScore || 0,
            militaryScore: (rosterRef.current.find(r => String(r.playerId) === String(effectiveAccount.playerId))?.militaryScore) || effectiveAccount.militaryScore || 0,
            researchScore: effectiveAccount.researchScore,
            totalFleetMsu: localFleetMsu,
            updatedAt: Date.now(),
            empire: {
              planets: localPlanets as any,
              researches: effectiveAccount.researches || [],
              lifeformExperience: effectiveAccount.lifeformExperience || [],
            },
          };
          setMemberDetail(formattedLocal);
        }
      }

      // Fetch official payload from Cloudflare Worker
      const res = await fetch(`${apiUrl}/api/v1/overwatch/empire/member?playerId=${playerId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load member empire: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.member) {
        if (effectiveAccount?.playerId && String(effectiveAccount.playerId) === String(playerId)) {
          try {
            const localPlanets = await db.planets.where('playerId').equals(effectiveAccount.playerId).toArray();
            if (localPlanets && localPlanets.length > 0) {
              const lpMap = new Map(localPlanets.map((lp: any) => [`${lp.coords}_${lp.type || 'planet'}`, lp.imgUrl]));
              if (data.member.empire?.planets) {
                data.member.empire.planets.forEach((p: any) => {
                  if (!p.imgUrl) {
                    const key = `${p.coords}_${p.type || 'planet'}`;
                    if (lpMap.has(key)) {
                      p.imgUrl = lpMap.get(key);
                    }
                  }
                });
              }
            }
          } catch (e) {
            console.warn('Could not map local planet images:', e);
          }
        }
        setMemberDetail(data.member);
      } else {
        throw new Error(data.error || 'Failed to fetch member details');
      }
    } catch (err: any) {
      console.warn('Could not fetch server empire detail:', err.message);
      // Keep local detail if available
      if (!memberDetail) {
        setMemberError(err.message);
      }
    } finally {
      setIsLoadingMember(false);
    }
  };

  // --------------------------------------------------------------------------
  // FORCE SYNC CURRENT ACCOUNT
  // --------------------------------------------------------------------------
  const handleForceSyncMyEmpire = async () => {
    if (!effectiveAccount?.playerId) return;
    setIsSyncingLocal(true);
    setSyncStatusNotice(null);

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: 'OVERWATCH_FORCE_SYNC_EMPIRE',
          action: 'OVERWATCH_FORCE_SYNC_EMPIRE',
          playerId: effectiveAccount.playerId,
        });

        if (res?.success) {
          setSyncStatusNotice('Empire successfully broadcast to Overwatch Empire.');
          await fetchRoster();
          if (selectedPlayerId === effectiveAccount.playerId) {
            handleSelectMember(effectiveAccount.playerId);
          }
        } else {
          setSyncStatusNotice(res?.reason || 'Sync completed.');
          await fetchRoster();
        }
      } else {
        setSyncStatusNotice('Synced in browser runtime.');
      }
    } catch (err: any) {
      setSyncStatusNotice('Sync request dispatched.');
    } finally {
      setIsSyncingLocal(false);
      setTimeout(() => setSyncStatusNotice(null), 4000);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED ROSTER
  // --------------------------------------------------------------------------
  const filteredRoster = useMemo(() => {
    return roster.filter(m => {
      const matchQuery = !searchQuery.trim() ||
        m.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.playerId.includes(searchQuery);

      if (!matchQuery) return false;

      if (classFilter === 'all') return true;
      const c = resolvePlayerClass(m.playerClass).label.toLowerCase();
      return c === classFilter;
    });
  }, [roster, searchQuery, classFilter]);

  // ==========================================================================
  // RENDER: EMPIRE COMPARISON DECK VIEW
  // ==========================================================================
  if (isComparing && comparedPlayerSlots.length >= 2) {
    return (
      <OverwatchEmpireComparisonDeck
        players={comparedPlayerSlots}
        universeId={cleanUniverseId(effectiveAccount?.universe || config?.universeId || 's267-en')}
        onBack={() => setIsComparing(false)}
        onRemovePlayer={(pId) => {
          setSelectedCompareIds(prev => {
            const next = prev.filter(id => id !== pId);
            if (next.length < 2) {
              setIsComparing(false);
            }
            return next;
          });
        }}
        onReorderPlayers={(newOrderIds) => setSelectedCompareIds(newOrderIds)}
      />
    );
  }

  // ==========================================================================
  // RENDER: MEMBER DRILLDOWN VIEW
  // ==========================================================================
  if (selectedPlayerId && (memberDetail || isLoadingMember)) {
    const pClass = resolvePlayerClass(memberDetail?.playerClass);
    const planets = (memberDetail?.empire.planets || []).filter(p => p.type === 'planet');
    const moons = (memberDetail?.empire.planets || []).filter(p => p.type === 'moon');

    // Aggregate fleet and defense totals for this member
    const fleetMap: Record<number, number> = {};
    const defenseMap: Record<number, number> = {};
    (memberDetail?.empire.planets || []).forEach(loc => {
      if (loc.ships) {
        Object.entries(loc.ships).forEach(([id, count]) => {
          const num = Number(count) || 0;
          if (num > 0) fleetMap[Number(id)] = (fleetMap[Number(id)] || 0) + num;
        });
      }
      if (loc.defenses) {
        Object.entries(loc.defenses).forEach(([id, count]) => {
          const num = Number(count) || 0;
          if (num > 0) defenseMap[Number(id)] = (defenseMap[Number(id)] || 0) + num;
        });
      }
    });

    const isMeDrilldown = effectiveAccount && String(effectiveAccount.playerId) === String(selectedPlayerId);
    const selectedRosterMember = roster.find(m => String(m.playerId) === String(selectedPlayerId));
    const displayedPlayerName = selectedRosterMember?.playerName || memberDetail?.playerName || 'Commander';
    const drilldownAvatarSrc = memberDetail?.avatarUrl || selectedRosterMember?.avatarUrl || (isMeDrilldown ? effectiveAccount?.avatarUrl : null);

    return (
      <div className="ow-empire-drilldown-root">
        {/* Navigation Breadcrumb Bar */}
        <div className="ow-drilldown-nav-row">
          <button
            type="button"
            className="ow-btn-back"
            onClick={() => setSelectedPlayerId(null)}
          >
            <ArrowLeft size={16} />
            <span>Overwatch Empire</span>
          </button>

          <div className="ow-drilldown-sync-tag">
            <span className="ow-pulse-dot active" />
            <span>Updated {formatTimeAgo(memberDetail?.updatedAt)}</span>
          </div>
        </div>

        {/* Member Profile Header Bezel */}
        <div className="ow-drilldown-header-bezel">
          <div className="ow-drilldown-header-inner">
            <div className="ow-drilldown-identity">
              <div className="ow-drilldown-avatar">
                {drilldownAvatarSrc ? (
                  <img
                    src={drilldownAvatarSrc}
                    alt={displayedPlayerName}
                    className="ow-drilldown-avatar-img"
                  />
                ) : (
                  <ThemeIcon name="army-star" size={26} />
                )}
              </div>
              <div className="ow-drilldown-titles">
                <div className="ow-drilldown-name-row">
                  <h2 className="ow-drilldown-player-name">
                    {displayedPlayerName}
                  </h2>
                  <span
                    className="ow-class-badge"
                    style={{
                      color: pClass.color,
                      backgroundColor: pClass.bg,
                      borderColor: pClass.border,
                    }}
                  >
                    {pClass.label}
                  </span>
                  <span className="ow-player-id-badge">#{selectedPlayerId}</span>
                </div>
                <div className="ow-drilldown-meta-row">
                  <span>Colonies: <strong>{planets.length} 🪐</strong></span>
                  <span className="ow-meta-separator">•</span>
                  <span>Moons: <strong>{moons.length} 🌙</strong></span>
                  <span className="ow-meta-separator">•</span>
                  <span>Total Score: <strong>{formatNumber(memberDetail?.totalScore)}</strong></span>
                </div>
              </div>
            </div>

            {/* Tactical Score Badges */}
            <div className="ow-drilldown-score-matrix">
              <div className="ow-score-cell">
                <span className="ow-score-label">Economy</span>
                <span className="ow-score-val cyan">{formatCompact(memberDetail?.economyScore)}</span>
              </div>
              <div className="ow-score-cell">
                <span className="ow-score-label">Military</span>
                <span className="ow-score-val red">{formatCompact(memberDetail?.militaryScore)}</span>
              </div>
              <div className="ow-score-cell">
                <span className="ow-score-label">Research</span>
                <span className="ow-score-val violet">
                  {formatCompact(
                    Math.max(
                      memberDetail?.researchScore || 0,
                      calculateAccountResearchScore(memberDetail?.empire?.researches || [])
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Matrix Subtab Navigator (Overview + 5 Matrices) */}
        <div className="ow-matrix-tab-bar">
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'overview' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('overview')}
          >
            <ThemeIcon name="radar" size={16} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'mines' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('mines')}
          >
            <ThemeIcon name="city-buildings" size={16} />
            <span>Mines & Energy</span>
          </button>
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'facilities' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('facilities')}
          >
            <ThemeIcon name="factory" size={16} />
            <span>Facilities & Moons</span>
          </button>
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'lifeforms' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('lifeforms')}
          >
            <ThemeIcon name="leaf" size={16} />
            <span>Lifeforms</span>
          </button>
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('fleet')}
          >
            <ThemeIcon name="defense" size={16} />
            <span>Fleet & Defenses</span>
          </button>
          <button
            type="button"
            className={`ow-matrix-tab-btn ${drilldownTab === 'research' ? 'active' : ''}`}
            onClick={() => setDrilldownTab('research')}
          >
            <ThemeIcon name="flask" size={16} />
            <span>Research</span>
          </button>
        </div>

        {isLoadingMember && (
          <div className="ow-loading-state">
            <RefreshCw size={24} className="ow-spin" />
            <span>Loading member empire data...</span>
          </div>
        )}

        {memberError && (
          <div className="ow-notice-box error">
            <AlertTriangle size={18} />
            <span>{memberError}</span>
          </div>
        )}

        {memberDetail && !isLoadingMember && (
          <div className="ow-matrix-body">
            {/* MATRIX 0: ALL LIFEFORM OVERVIEW */}
            {drilldownTab === 'overview' && (
              <OverwatchOverviewTab
                memberDetail={{ ...memberDetail, playerName: displayedPlayerName }}
                effectiveAccount={effectiveAccount}
              />
            )}

            {/* MATRIX 1: MINES & ENERGY */}
            {drilldownTab === 'mines' && (
              <div className="ow-matrix-section">
                {/* Aggregate Production Banner */}
                <div className="ow-prod-banner-bezel">
                  <div className="ow-prod-banner-inner">
                    <div className="ow-prod-stat-group">
                      <span className="ow-prod-label">Daily Metal</span>
                      <span className="ow-prod-value metal">
                        +{formatNumber(Math.round(planets.reduce((acc, p) => acc + (p.production?.metal || 0), 0) * 24))}/day
                      </span>
                    </div>
                    <div className="ow-prod-stat-group">
                      <span className="ow-prod-label">Daily Crystal</span>
                      <span className="ow-prod-value crystal">
                        +{formatNumber(Math.round(planets.reduce((acc, p) => acc + (p.production?.crystal || 0), 0) * 24))}/day
                      </span>
                    </div>
                    <div className="ow-prod-stat-group">
                      <span className="ow-prod-label">Daily Deuterium</span>
                      <span className="ow-prod-value deut">
                        +{formatNumber(Math.round(planets.reduce((acc, p) => acc + (p.production?.deuterium || 0), 0) * 24))}/day
                      </span>
                    </div>
                    <div className="ow-prod-stat-group highlight">
                      <span className="ow-prod-label">Total Daily Output (MSU)</span>
                      <span className="ow-prod-value msu">
                        +{formatCompact(
                          Math.round(
                            planets.reduce((acc, p) => {
                              const m = p.production?.metal || 0;
                              const c = p.production?.crystal || 0;
                              const d = p.production?.deuterium || 0;
                              return acc + m + c * 1.5 + d * 3;
                            }, 0) * 24
                          )
                        )} MSU/day
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per-Colony Mine Cards */}
                <div className="ow-planet-grid">
                  {planets.map(p => {
                    const slotNum = Math.min(15, Math.max(1, parseInt(p.coords?.split(':')[2] || '1', 10) || 1));
                    const planetFallback = `/icons/overwatch/planet-slot-${slotNum}.png`;
                    const planetIcon = p.imgUrl || planetFallback;
                    const matchedMoon = moons.find(m => m.coords === p.coords);
                    const moonFallback = '/icons/overwatch/moon.jpg';
                    const moonIcon = matchedMoon?.imgUrl || moonFallback;
                    return (
                      <div key={p.id || p.coords} className="ow-colony-bezel-card ow-mines-colony-card">
                        <div className="ow-colony-card-inner">
                          {/* Corner Planet Visual: Lower-right quarter emerging from top-left (no glow) */}
                          <div className="ow-card-corner-planet-anchor" aria-hidden="true">
                            <img
                              src={planetIcon}
                              alt=""
                              className="ow-card-corner-planet-img"
                              onError={(e) => { e.currentTarget.src = planetFallback; }}
                            />
                          </div>

                          {/* Top Half: Left = Colony Identity, Right = 3 Core Mines Vertically Aligned */}
                          <div className="ow-mines-card-top-half">
                            {/* Left: Celestial Identity */}
                            <div className="ow-mines-top-left">
                              <div className="ow-colony-header-top">
                                <span className="ow-colony-coords-badge">{p.coords}</span>
                              </div>
                              <div className="ow-colony-name-row">
                                <span className="ow-colony-name">{p.name || 'Colony'}</span>
                              </div>
                            </div>

                            {/* Right: 3 Core Mines Vertically Aligned in Top Right Half */}
                            <div className="ow-mines-top-right">
                              <div className="ow-mine-v-card metal" title={`Metal Mine Lvl ${p.metalMine ?? 0}`}>
                                <img src="/icons/resources/metal_mine_large.jpg" alt="M" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Metal Mine</span>
                                  <strong className="ow-mine-v-lvl metal">Lvl {p.metalMine ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-mine-v-card crystal" title={`Crystal Mine Lvl ${p.crystalMine ?? 0}`}>
                                <img src="/icons/resources/crystal_mine_large.jpg" alt="C" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Crystal Mine</span>
                                  <strong className="ow-mine-v-lvl crystal">Lvl {p.crystalMine ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-mine-v-card deut" title={`Deuterium Synthesizer Lvl ${p.deuteriumMine ?? 0}`}>
                                <img src="/icons/resources/deuterium_mine_large.jpg" alt="D" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Deut Synth</span>
                                  <strong className="ow-mine-v-lvl deut">Lvl {p.deuteriumMine ?? 0}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Space Under the Mines: Energy & Utility 2x2 Grid */}
                          <div className="ow-energy-matrix-box">
                            <div className="ow-energy-box-eyebrow">
                              <Zap size={11} className="ow-icon-pulse-amber" />
                              <span>Energy & Utility</span>
                            </div>
                            <div className="ow-energy-grid-2x2">
                              <div className="ow-energy-chip">
                                <img src="/icons/resources/solar-plant-large.jpg" alt="Solar Plant" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Solar Plant</span>
                                  <strong className="ow-energy-chip-val">Lvl {p.solarPlant ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip">
                                <img src="/icons/resources/fusion-reactor-large.jpg" alt="Fusion Reactor" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Fusion Reactor</span>
                                  <strong className="ow-energy-chip-val">Lvl {p.fusionReactor ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip">
                                <img src="/icons/ships/solar-satellite-large.jpg" alt="Satellites" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Satellites</span>
                                  <strong className="ow-energy-chip-val">{formatNumber(p.solarSatellites ?? 0)}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip">
                                <img src="/icons/ships/crawler-large.jpg" alt="Crawlers" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Crawlers</span>
                                  <strong className="ow-energy-chip-val highlight">{formatNumber(p.crawlers ?? 0)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Daily Production Telemetry Strip */}
                          <div className="ow-colony-prod-strip">
                            <div className="ow-colony-prod-chip metal" title="Daily Metal Yield">
                              <img src="/icons/resources/metal-icon-medium.jpg" alt="M" className="ow-prod-res-icon" />
                              <span>+{formatCompact(Math.round((p.production?.metal || 0) * 24))} M/d</span>
                            </div>
                            <div className="ow-colony-prod-chip crystal" title="Daily Crystal Yield">
                              <img src="/icons/resources/crystal-icon-medium.jpg" alt="C" className="ow-prod-res-icon" />
                              <span>+{formatCompact(Math.round((p.production?.crystal || 0) * 24))} C/d</span>
                            </div>
                            <div className="ow-colony-prod-chip deut" title="Daily Deuterium Yield">
                              <img src="/icons/resources/deuterium-icon-medium.jpg" alt="D" className="ow-prod-res-icon" />
                              <span>+{formatCompact(Math.round((p.production?.deuterium || 0) * 24))} D/d</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MATRIX 2: FACILITIES & MOONS */}
            {drilldownTab === 'facilities' && (
              <div className="ow-matrix-section">
                <div className="ow-planet-grid">
                  {planets.map(p => {
                    const slotNum = Math.min(15, Math.max(1, parseInt(p.coords?.split(':')[2] || '1', 10) || 1));
                    const planetFallback = `/icons/overwatch/planet-slot-${slotNum}.png`;
                    const planetIcon = p.imgUrl || planetFallback;
                    const matchedMoon = moons.find(m => m.coords === p.coords);
                    const moonFallback = '/icons/overwatch/moon.jpg';
                    const moonIcon = matchedMoon?.imgUrl || moonFallback;
                    return (
                      <div key={p.id || p.coords} className="ow-colony-bezel-card ow-facilities-colony-card">
                        <div className="ow-colony-card-inner">
                          {/* Corner Planet Visual: Lower-right quarter emerging from top-left (no glow) */}
                          <div className="ow-card-corner-planet-anchor" aria-hidden="true">
                            <img
                              src={planetIcon}
                              alt=""
                              className="ow-card-corner-planet-img"
                              onError={(e) => { e.currentTarget.src = planetFallback; }}
                            />
                          </div>

                          {/* Top Half: Left = Colony Identity, Right = 3 Core Facilities Vertically Aligned */}
                          <div className="ow-mines-card-top-half">
                            {/* Left: Celestial Identity */}
                            <div className="ow-mines-top-left">
                              <div className="ow-colony-header-top">
                                <span className="ow-colony-coords-badge">{p.coords}</span>
                              </div>
                              <div className="ow-colony-name-row">
                                <span className="ow-colony-name">{p.name || 'Colony'}</span>
                              </div>
                            </div>

                            {/* Right: 3 Core Facilities (Robotics, Shipyard, Research Lab) Vertically Aligned */}
                            <div className="ow-mines-top-right">
                              <div className="ow-mine-v-card facility" title={`Robotics Factory Lvl ${p.roboticsFactory ?? 0}`}>
                                <img src="/icons/facilities/robotics_factory_large.jpg" alt="Robotics" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Robotics</span>
                                  <strong className="ow-mine-v-lvl cyan">Lvl {p.roboticsFactory ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-mine-v-card facility" title={`Shipyard Lvl ${p.shipyard ?? 0}`}>
                                <img src="/icons/facilities/shipyard_large.jpg" alt="Shipyard" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Shipyard</span>
                                  <strong className="ow-mine-v-lvl cyan">Lvl {p.shipyard ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-mine-v-card facility" title={`Research Lab Lvl ${p.researchLab ?? 0}`}>
                                <img src="/icons/facilities/research_lab_large.jpg" alt="Research Lab" className="ow-mine-v-icon" />
                                <div className="ow-mine-v-meta">
                                  <span className="ow-mine-v-label">Research Lab</span>
                                  <strong className="ow-mine-v-lvl cyan">Lvl {p.researchLab ?? 0}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4 Core Facilities Below in 2x2 Grid (Nanite, Terraformer, Missile Silo, Space Dock) */}
                          <div className="ow-energy-matrix-box">
                            <div className="ow-energy-grid-2x2">
                              <div className="ow-energy-chip" title={`Nanite Factory Lvl ${p.naniteFactory ?? 0}`}>
                                <img src="/icons/facilities/nanite_factory_large.jpg" alt="Nanite" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Nanite</span>
                                  <strong className="ow-energy-chip-val highlight">Lvl {p.naniteFactory ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip" title={`Terraformer Lvl ${p.terraformer ?? 0}`}>
                                <img src="/icons/facilities/terraformer_large.jpg" alt="Terraformer" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Terraformer</span>
                                  <strong className="ow-energy-chip-val">Lvl {p.terraformer ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip" title={`Missile Silo Lvl ${p.missileSilo ?? 0}`}>
                                <img src="/icons/facilities/missile_silo_large.jpg" alt="Missile Silo" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Missile Silo</span>
                                  <strong className="ow-energy-chip-val">Lvl {p.missileSilo ?? 0}</strong>
                                </div>
                              </div>

                              <div className="ow-energy-chip" title={`Space Dock Lvl ${p.spaceDock ?? 0}`}>
                                <img src="/icons/facilities/space_dock_large.jpg" alt="Space Dock" className="ow-energy-chip-icon" />
                                <div className="ow-energy-chip-meta">
                                  <span className="ow-energy-chip-label">Space Dock</span>
                                  <strong className="ow-energy-chip-val">Lvl {p.spaceDock ?? 0}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Lunar Orbital Deck (With Real Artwork Icons!) */}
                          {matchedMoon ? (
                            <div className="ow-lunar-orbital-deck">
                              <div className="ow-lunar-deck-header">
                                <div className="ow-lunar-header-left">
                                  <img
                                    src={moonIcon}
                                    alt="Moon"
                                    className="ow-lunar-sphere-icon"
                                    onError={(e) => { e.currentTarget.src = moonFallback; }}
                                  />
                                  <div className="ow-lunar-title-wrap">
                                    <div className="ow-lunar-name-row">
                                      <span className="ow-lunar-name">{matchedMoon.name || 'Moon'}</span>
                                      <span className="ow-lunar-coords">[{matchedMoon.coords}]</span>
                                    </div>
                                    <span className="ow-lunar-meta-fields">
                                      {matchedMoon.fieldsUsed ?? 0}/{matchedMoon.fieldsTotal ?? 0} fields • {matchedMoon.tempMin ?? '—'}°C to {matchedMoon.tempMax ?? '—'}°C
                                    </span>
                                  </div>
                                </div>
                                <span className="ow-lunar-deck-pill">LUNAR DECK</span>
                              </div>

                              <div className="ow-lunar-facilities-grid">
                                <div className="ow-lunar-fac-cell">
                                  <img src="/icons/facilities/lunar_base_large.jpg" alt="Lunar Base" className="ow-lunar-fac-icon" />
                                  <div className="ow-lunar-fac-meta">
                                    <span className="ow-lunar-fac-name">Lunar Base</span>
                                    <strong className="ow-lunar-fac-val">Lvl {matchedMoon.lunarBase ?? 0}</strong>
                                  </div>
                                </div>

                                <div className={`ow-lunar-fac-cell ${matchedMoon.sensorPhalanx ? 'phalanx-active' : ''}`}>
                                  <img src="/icons/facilities/sensor_phalanx_large.jpg" alt="Phalanx" className="ow-lunar-fac-icon" />
                                  <div className="ow-lunar-fac-meta">
                                    <span className="ow-lunar-fac-name">Phalanx</span>
                                    <strong className="ow-lunar-fac-val amber">Lvl {matchedMoon.sensorPhalanx ?? 0}</strong>
                                  </div>
                                </div>

                                <div className={`ow-lunar-fac-cell ${matchedMoon.jumpGate ? 'gate-active' : ''}`}>
                                  <img src="/icons/facilities/jump_gate_large.jpg" alt="Jump Gate" className="ow-lunar-fac-icon" />
                                  <div className="ow-lunar-fac-meta">
                                    <span className="ow-lunar-fac-name">Jump Gate</span>
                                    <strong className="ow-lunar-fac-val portal">Lvl {matchedMoon.jumpGate ?? 0}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="ow-no-moon-bar">
                              <div className="ow-no-moon-orbit-icon" />
                              <span>No Lunar Body in Orbit</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MATRIX 3: LIFEFORM MATRIX */}
            {drilldownTab === 'lifeforms' && (
              <div className="ow-matrix-section">
                {/* Per-Colony 18-Slot Lifeform Tech Trees */}
                <div className="ow-lf-colonies-list">
                  <div className="ow-matrix-heading-row">
                    <h3 className="ow-subheading">Planetary Lifeform Research</h3>
                    <span className="ow-subheading-tag">{planets.length} Colonies</span>
                  </div>
                  {planets.map(p => {
                    const slotNum = Math.min(15, Math.max(1, parseInt(p.coords?.split(':')[2] || '1', 10) || 1));
                    const planetFallback = `/icons/overwatch/planet-slot-${slotNum}.png`;
                    const planetIcon = p.imgUrl || planetFallback;
                    const lfColor = getLfColor(p.lifeformId);
                    const lfName = getLfName(p.lifeformId);
                    const slots = p.lifeformSetup || [];
                    const activeTechs = slots.filter(s => (s.level || 0) > 0);
                    const totalTechLevels = slots.reduce((sum, s) => sum + (s.level || 0), 0);

                    return (
                      <div key={p.id || p.coords} className="ow-lf-colony-card">
                        {/* Left Side: Planetary Identity & Telemetry */}
                        <div className="ow-lf-card-left">
                          <div className="ow-lf-planet-visual-col">
                            <div className="ow-lf-planet-sphere-frame">
                              <img
                                src={planetIcon}
                                alt={p.name}
                                className="ow-lf-planet-sphere-img"
                                onError={(e) => { e.currentTarget.src = planetFallback; }}
                              />
                            </div>
                          </div>

                          <div className="ow-lf-planet-info-col">
                            <div className="ow-lf-colony-title-bar">
                              <span className="ow-colony-coords-badge">{p.coords}</span>
                              <span className="ow-colony-name">{p.name || 'Colony'}</span>
                              <div className="ow-lf-badge" style={{ color: lfColor, borderColor: lfColor }}>
                                {getLfIcon(p.lifeformId) && (
                                  <img src={getLfIcon(p.lifeformId)} alt="" className="ow-lf-badge-icon" />
                                )}
                                <span>{lfName}</span>
                              </div>
                            </div>

                            <div className="ow-lf-stats-matrix">
                              <div className="ow-lf-stat-box">
                                <span className="ow-lf-stat-label">Fields</span>
                                <strong className="ow-lf-stat-val">{p.fieldsUsed ?? '—'}/{p.fieldsTotal ?? '—'}</strong>
                              </div>
                              <div className="ow-lf-stat-box">
                                <span className="ow-lf-stat-label">Temperature</span>
                                <strong className="ow-lf-stat-val">{p.tempMin ?? '—'}° to {p.tempMax ?? '—'}°C</strong>
                              </div>
                              <div className="ow-lf-stat-box">
                                <span className="ow-lf-stat-label">Active Techs</span>
                                <strong className="ow-lf-stat-val cyan">{activeTechs.length}/18</strong>
                              </div>
                              <div className="ow-lf-stat-box">
                                <span className="ow-lf-stat-label">Tech Mastery</span>
                                <strong className="ow-lf-stat-val amber">Σ Lvl {totalTechLevels}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="ow-lf-card-divider" />

                        {/* Right Side: Tier 1-3 Unified 6x3 Matrix (Col 1-2: T1, Col 3-4: T2, Col 5-6: T3) */}
                        <div className="ow-lf-card-right">
                          <div className="ow-lf-matrix-wrapper">
                            <div className="ow-lf-matrix-headers">
                              <div className="ow-tier-header-badge t1">TIER 1</div>
                              <div className="ow-tier-header-badge t2">TIER 2</div>
                              <div className="ow-tier-header-badge t3">TIER 3</div>
                            </div>
                            <div className="ow-lf-matrix-grid">
                              {LF_MATRIX_SLOTS.map(sNum => {
                                const slotData = slots.find(s => s.slotNumber === sNum);
                                const techId = slotData?.selectedTechId;
                                const level = slotData?.level || 0;
                                const techInfo = techId ? getLfTech(techId) : null;
                                const iconPath = techId ? getTechIconPath(techId) : null;

                                return (
                                  <div
                                    key={sNum}
                                    className={`ow-lf-slot-cell ${level > 0 ? 'active' : 'empty'}`}
                                    title={techInfo ? `${techInfo.name} (Lvl ${level})` : `Slot ${sNum}: Empty`}
                                  >
                                    <span className="ow-slot-overlay-tier">T{sNum}</span>
                                    {iconPath ? (
                                      <img src={iconPath} alt="" className="ow-slot-full-img" />
                                    ) : (
                                      <div className="ow-slot-full-placeholder" />
                                    )}
                                    <span className={`ow-slot-overlay-lvl ${level > 0 ? 'active' : 'empty'}`}>
                                      {level > 0 ? `L${level}` : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MATRIX 4: FLEET & DEFENSES */}
            {drilldownTab === 'fleet' && (
              <div className="ow-matrix-section">
                {/* Fleet Overview Header */}
                <div className="ow-matrix-heading-row">
                  <h3 className="ow-subheading">Total Fleet</h3>
                  <span className="ow-subheading-tag">
                    {formatNumber(Object.values(fleetMap).reduce((a, b) => a + b, 0))} Total Ships
                  </span>
                </div>

                <div className="ow-fleet-bento-grid">
                  {SHIP_CATALOG.map(ship => {
                    const count = fleetMap[ship.id] || 0;
                    return (
                      <div key={ship.id} className={`ow-ship-unit-card ${count > 0 ? 'active' : 'zero'}`}>
                        <img src={ship.icon} alt={ship.name} className="ow-ship-avatar" />
                        <div className="ow-ship-info">
                          <span className="ow-ship-name">{ship.name}</span>
                          <span className="ow-ship-count">{formatNumber(count)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Planetary Defenses Section */}
                <div className="ow-matrix-heading-row" style={{ marginTop: 32 }}>
                  <h3 className="ow-subheading">Total Defenses</h3>
                  <span className="ow-subheading-tag">
                    {formatNumber(Object.values(defenseMap).reduce((a, b) => a + b, 0))} Units
                  </span>
                </div>

                <div className="ow-fleet-bento-grid">
                  {DEFENSE_CATALOG.map(def => {
                    const count = defenseMap[def.id] || 0;
                    return (
                      <div key={def.id} className={`ow-ship-unit-card ${count > 0 ? 'active' : 'zero'}`}>
                        <img src={def.icon} alt={def.name} className="ow-ship-avatar" />
                        <div className="ow-ship-info">
                          <span className="ow-ship-name">{def.name}</span>
                          <span className="ow-ship-count">{formatNumber(count)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MATRIX 5: RESEARCH & TECH */}
            {drilldownTab === 'research' && (
              <div className="ow-matrix-section">
                <div className="ow-tech-category-stack">
                  {RESEARCH_CATEGORIES.map(cat => (
                    <div key={cat.title} className="ow-tech-category-card">
                      <h4 className="ow-tech-cat-title">{cat.title}</h4>
                      <div className="ow-tech-items-grid">
                        {cat.technologies.map(tech => {
                          const resMatch = (memberDetail?.empire.researches || []).find(r => r.id === tech.id);
                          const level = resMatch?.level ?? 0;

                          return (
                            <div key={tech.id} className={`ow-tech-card ${level > 0 ? 'active' : 'zero'}`}>
                              <img src={tech.icon} alt={tech.name} className="ow-tech-avatar" />
                              <div className="ow-tech-meta">
                                <span className="ow-tech-name">{tech.name}</span>
                                <span className="ow-tech-level">Level {level}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ALLIANCE ROSTER & AGGREGATES (DEFAULT VIEW)
  // ==========================================================================
  return (
    <div className="ow-empire-roster-root">
      {/* Telemetry Header & Controls */}
      <div className="ow-empire-header-cluster">
        <div className="ow-empire-brand-block">
          <div className="ow-empire-icon-bezel">
            <ThemeIcon name="city-buildings" size={26} glow />
          </div>
          <div>
            <div className="ow-eyebrow">ALLIANCE EMPIRE // OVERVIEW</div>
            <h2 className="ow-empire-title">Alliance Empire Overview</h2>
            <p className="ow-empire-subtitle">
              Combined economy, mine production, fleet sizes, and member empires
            </p>
          </div>
        </div>

        <div className="ow-empire-actions-row">
          {syncStatusNotice && (
            <div className="ow-sync-notice-pill">
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
              <span>{syncStatusNotice}</span>
            </div>
          )}

          {/* Comparison Mode Toggle */}
          <div className="ow-compare-toggle-wrap">
            <button
              type="button"
              className={`ow-compare-toggle-btn ${isCompareMode ? 'active' : ''}`}
              onClick={() => {
                setIsCompareMode(prev => {
                  const next = !prev;
                  if (!next) setSelectedCompareIds([]);
                  return next;
                });
              }}
              title={isCompareMode ? "Exit comparison mode" : "Compare up to 4 alliance members"}
            >
              <span className="ow-compare-toggle-track">
                <span className="ow-compare-toggle-thumb" />
              </span>
              <span>Compare Empires</span>
              {isCompareMode && selectedCompareIds.length > 0 && (
                <span className="ow-compare-count-pill">{selectedCompareIds.length}/4</span>
              )}
            </button>
          </div>

          {/* Dynamic Compare Launch Button */}
          {isCompareMode && (
            <div className="ow-compare-launch-wrap">
              <button
                type="button"
                className={`ow-btn-compare-launch ${selectedCompareIds.length >= 2 ? 'ready' : 'disabled'}`}
                onClick={handleStartComparison}
                disabled={selectedCompareIds.length < 2 || isLoadingCompareData}
                title={selectedCompareIds.length < 2 ? "Select at least 2 members to compare" : `Compare ${selectedCompareIds.length} members`}
              >
                <ThemeIcon name="radar" size={14} />
                <span>
                  {isLoadingCompareData
                    ? 'Loading...'
                    : selectedCompareIds.length < 2
                      ? `Select 2–4 (${selectedCompareIds.length}/4)`
                      : `Compare (${selectedCompareIds.length})`}
                </span>
                {selectedCompareIds.length >= 2 && !isLoadingCompareData && (
                  <ArrowRight size={13} />
                )}
              </button>
              {selectedCompareIds.length > 0 && (
                <button
                  type="button"
                  className="ow-btn-compare-clear"
                  onClick={() => setSelectedCompareIds([])}
                  title="Clear selected members"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            className={`ow-btn-force-sync ${isSyncingLocal ? 'loading' : ''}`}
            onClick={handleForceSyncMyEmpire}
            disabled={isSyncingLocal}
          >
            <RefreshCw size={15} className={isSyncingLocal ? 'ow-spin' : ''} />
            <span>{isSyncingLocal ? 'Syncing...' : 'Sync My Empire'}</span>
          </button>
        </div>
      </div>

      {/* Alliance Totals Bento Matrix */}
      {totals && (
        <div className="ow-totals-bento-grid">
          {/* Card 1: Production MSU */}
          <div className="ow-bento-metric-card highlight">
            <div className="ow-bento-label">
              <ThemeIcon name="combo-chart" size={16} />
              <span>Total Daily Production</span>
            </div>
            <div className="ow-bento-huge-val">
              +{formatCompact(Math.round((totals.totalProductionMSU || 0) * 24))} <span className="unit">MSU/day</span>
            </div>
            <div className="ow-bento-sub-breakdown">
              <span className="metal">+{formatCompact(Math.round((totals.totalProductionMetal || 0) * 24))} M/d</span>
              <span className="crystal">+{formatCompact(Math.round((totals.totalProductionCrystal || 0) * 24))} C/d</span>
              <span className="deut">+{formatCompact(Math.round((totals.totalProductionDeut || 0) * 24))} D/d</span>
            </div>
          </div>

          {/* Card 2: Armaments */}
          <div className="ow-bento-metric-card">
            <div className="ow-bento-label">
              <Swords size={16} className="ow-icon-glow red" />
              <span>Alliance Fleet</span>
            </div>
            <div className="ow-bento-huge-val">
              {formatCompact(totals.totalFleetShips || 0)} <span className="unit">Ships</span>
            </div>
            <div className="ow-bento-sub-breakdown">
              <span>{totals.totalPlanets || 0} Colonies</span>
              <span className="ow-dot-sep">•</span>
              <span>{totals.totalMoons || 0} Moons</span>
              <span className="ow-dot-sep">•</span>
              <span>{totals.syncedEmpiresCount}/{totals.totalMembers} Synced</span>
            </div>
          </div>

          {/* Card 3: Geological Depths */}
          <div className="ow-bento-metric-card">
            <div className="ow-bento-label">
              <ThemeIcon name="factory" size={16} />
              <span>Alliance Mines</span>
            </div>
            <div className="ow-bento-huge-val">
              {totals.totalMines ? formatNumber(totals.totalMines) : '—'} <span className="unit">Mines</span>
            </div>
            <div className="ow-bento-sub-breakdown">
              <span>M: <strong>{((totals.totalProductionMetal || 0) > 0 ? 'High' : 'Active')}</strong></span>
              <span className="ow-dot-sep">•</span>
              <span>C: <strong>Active</strong></span>
              <span className="ow-dot-sep">•</span>
              <span>D: <strong>Active</strong></span>
            </div>
          </div>

          {/* Card 4: Hall of Command */}
          <div className="ow-bento-metric-card leaders">
            <div className="ow-bento-label">
              <Crown size={16} style={{ color: '#fbbf24' }} />
              <span>Alliance Leaders</span>
            </div>
            <div className="ow-leaders-stack">
              <div className="ow-leader-line">
                <span className="leader-role">⛏️ Top Miner:</span>
                <span className="leader-name">{totals.topMiner?.name || '—'}</span>
                <span className="leader-stat">({totals.topMiner?.totalMines || 0} mines)</span>
              </div>
              <div className="ow-leader-line">
                <span className="leader-role">🚀 Top Fleeter:</span>
                <span className="leader-name">{totals.topFleeter?.name || '—'}</span>
                <span className="leader-stat">
                  ({formatCompact(totals.topFleeter?.fleetMsu || totals.topFleeter?.totalShips || 0)} MSU)
                </span>
              </div>
              <div className="ow-leader-line">
                <span className="leader-role">🔬 Top Researcher:</span>
                <span className="leader-name">{totals.topResearcher?.name || '—'}</span>
                <span className="leader-stat">({formatCompact(totals.topResearcher?.researchScore || 0)} pts)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="ow-filter-control-row">
        <div className="ow-search-input-box">
          <Search size={15} className="ow-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter members by name or ID..."
            className="ow-search-field"
          />
          {searchQuery && (
            <button
              type="button"
              className="ow-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="ow-class-filter-pills">
          <button
            type="button"
            className={`ow-filter-pill ${classFilter === 'all' ? 'active' : ''}`}
            onClick={() => setClassFilter('all')}
          >
            All Classes
          </button>
          <button
            type="button"
            className={`ow-filter-pill collector ${classFilter === 'collector' ? 'active' : ''}`}
            onClick={() => setClassFilter('collector')}
          >
            Collector
          </button>
          <button
            type="button"
            className={`ow-filter-pill general ${classFilter === 'general' ? 'active' : ''}`}
            onClick={() => setClassFilter('general')}
          >
            General
          </button>
          <button
            type="button"
            className={`ow-filter-pill discoverer ${classFilter === 'discoverer' ? 'active' : ''}`}
            onClick={() => setClassFilter('discoverer')}
          >
            Discoverer
          </button>

          {isRefreshingRoster && (
            <div className="ow-refreshing-inline" title="Syncing alliance empire data in background...">
              <RefreshCw size={11} className="ow-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Roster Cards Grid */}
      {isLoadingRoster && roster.length === 0 && (
        <div className="ow-loading-state">
          <RefreshCw size={24} className="ow-spin" />
          <span>Loading alliance members...</span>
        </div>
      )}

      {rosterError && roster.length === 0 && (
        <div className="ow-notice-box error">
          <AlertTriangle size={18} />
          <span>{rosterError}</span>
        </div>
      )}

      {!isLoadingRoster && filteredRoster.length === 0 && (
        <div className="ow-empty-roster-bezel">
          <ThemeIcon name="city-buildings" size={40} />
          <h3>No Member Empires Synced</h3>
          <p>
            Alliance members can click <strong>"Sync My Empire"</strong> to share their mine levels,
            fleet, and research with the alliance.
          </p>
        </div>
      )}

      {isCompareMode && (
        <div className="ow-compare-instruction-bar">
          <div className="ow-compare-instruction-left">
            <Sparkles size={15} />
            <span>
              Select <strong>2 to 4 alliance members</strong> to compare their empires.
            </span>
          </div>
          <div>
            <strong>{selectedCompareIds.length}</strong> of 4 selected
          </div>
        </div>
      )}

      {compareNotice && (
        <div className="ow-compare-instruction-bar" style={{ borderColor: 'rgba(251, 191, 36, 0.45)', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
          <div className="ow-compare-instruction-left">
            <AlertTriangle size={15} />
            <span>{compareNotice}</span>
          </div>
        </div>
      )}

      <div className="ow-roster-cards-grid">
        {filteredRoster.map(member => {
          const pClass = resolvePlayerClass(member.playerClass);
          const hasData = member.hasSyncedEmpire;
          const isMe = effectiveAccount && String(effectiveAccount.playerId) === String(member.playerId);
          const avatarSrc = member.avatarUrl || (isMe && effectiveAccount?.avatarUrl ? effectiveAccount.avatarUrl : null);
          const isSelectedCompare = selectedCompareIds.includes(String(member.playerId));
          const slotIndex = selectedCompareIds.indexOf(String(member.playerId));

          return (
            <div
              key={member.playerId}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isCompareMode) {
                  handleTogglePlayerCompare(member.playerId);
                } else {
                  handleSelectMember(member.playerId);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (isCompareMode) {
                    handleTogglePlayerCompare(member.playerId);
                  } else {
                    handleSelectMember(member.playerId);
                  }
                }
              }}
              className={`ow-roster-bezel-card ${!hasData ? 'unsynced' : ''} ${isCompareMode ? 'compare-active' : ''} ${isSelectedCompare ? 'compare-selected' : ''}`}
              title={
                isCompareMode
                  ? isSelectedCompare
                    ? `Click to deselect ${member.playerName} (Slot ${slotIndex + 1})`
                    : `Click to select ${member.playerName} for comparison`
                  : `Click to view empire details for ${member.playerName}`
              }
              aria-label={`View Empire details for ${member.playerName}`}
              style={isSelectedCompare && slotIndex >= 0 ? {
                '--slot-border': SLOT_COLORS[slotIndex].color,
                '--slot-glow': SLOT_COLORS[slotIndex].glow,
              } as React.CSSProperties : undefined}
            >
              <div className="ow-roster-card-inner">
                {/* Top Identity Line */}
                <div className="ow-roster-card-top">
                  <div className="ow-roster-card-identity">
                    <div className="ow-roster-card-avatar">
                      <svg
                        className="ow-roster-avatar-ring"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="47"
                          fill="none"
                          stroke="var(--primary, #00f2ff)"
                          strokeWidth="2.5"
                          strokeDasharray="6 8"
                          opacity="0.55"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="ow-roster-avatar-core">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={member.playerName}
                            className="ow-roster-avatar-img"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.ow-avatar-char') as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span
                          className="ow-avatar-char"
                          style={{ display: avatarSrc ? 'none' : 'block' }}
                        >
                          {member.playerName[0]?.toUpperCase() || 'C'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="ow-roster-card-name-row">
                        <h4 className="ow-roster-card-name">{member.playerName}</h4>
                        {isMe && <span className="ow-you-badge">YOU</span>}
                        <span
                          className="ow-class-badge mini"
                          style={{
                            color: pClass.color,
                            backgroundColor: pClass.bg,
                            borderColor: pClass.border,
                          }}
                        >
                          {pClass.label}
                        </span>
                      </div>
                      <div className="ow-roster-sync-line">
                        <span className={`ow-live-dot ${hasData ? 'green' : 'gray'}`} />
                        <span>{hasData ? `Synced ${formatTimeAgo(member.lastEmpireSyncAt)}` : 'No Sync Yet'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ow-roster-card-top-right">
                    {isCompareMode && hasData && (
                      <div
                        className={`ow-compare-select-badge ${isSelectedCompare ? 'selected' : ''}`}
                        onClick={(e) => handleTogglePlayerCompare(member.playerId, e)}
                        style={isSelectedCompare && slotIndex >= 0 ? {
                          '--slot-color': SLOT_COLORS[slotIndex].color,
                          '--slot-bg': SLOT_COLORS[slotIndex].bg,
                          '--slot-glow': SLOT_COLORS[slotIndex].glow,
                        } as React.CSSProperties : undefined}
                      >
                        {isSelectedCompare ? (
                          <>
                            <span>✓</span>
                            <span>Slot {slotIndex + 1}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ opacity: 0.6 }}>○</span>
                            <span>Select</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="ow-roster-score-capsule">
                      <span className="score-num">{formatCompact(member.totalScore)}</span>
                      <span className="score-label">Points</span>
                    </div>
                  </div>
                </div>

                {/* Tactical Metrics Strip */}
                {hasData ? (
                  <div className="ow-roster-metrics-strip">
                    <div className="ow-strip-cell">
                      <span className="cell-lbl">Avg Mines</span>
                      <span className="cell-val">
                        {member.avgMetalMine ?? 0} / {member.avgCrystalMine ?? 0} / {member.avgDeutMine ?? 0}
                      </span>
                    </div>
                    <div className="ow-strip-cell">
                      <span className="cell-lbl">MSU/d</span>
                      <span className="cell-val cyan">
                        +{formatCompact(
                          Math.round(
                            ((member.totalMetalHourly || 0) +
                            (member.totalCrystalHourly || 0) * 1.5 +
                            (member.totalDeutHourly || 0) * 3) * 24
                          )
                        )}
                      </span>
                    </div>
                    <div className="ow-strip-cell">
                      <span className="cell-lbl">Colonies</span>
                      <span className="cell-val">{member.planetCount || 0} 🪐 / {member.moonCount || 0} 🌙</span>
                    </div>
                    <div className="ow-strip-cell">
                      <span className="cell-lbl">Fleet</span>
                      <span className="cell-val">{formatCompact(member.totalShips || 0)} 🚀</span>
                    </div>
                  </div>
                ) : (
                  <div className="ow-roster-pending-strip">
                    <Lock size={14} style={{ color: '#94a3b8' }} />
                    <span>Awaiting first sync from player</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default OverwatchEmpire;
