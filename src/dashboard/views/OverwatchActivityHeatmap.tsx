// ============================================================================
// NEXUS OVERWATCH — TACTICAL ACTIVITY HEATMAP & STRIKE PLANNER
// Archetype: Ethereal Glass / Doppelrand Nested Architecture (High-End Visual Design)
// 100% Genuine Data (Zero Mock Fakes) | Ultra-Compact Dual Views (24h Daily / 7-Day Grid)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Clock,
  Crosshair,
  Moon,
  Sun,
  Shield,
  Radio,
  Search,
  RefreshCw,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  Sparkles,
  LayoutGrid,
  BarChart2,
  Bookmark,
  Globe,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet } from '../../db';
import { getResearchLevel, safeArray } from '../../utils/amortizationCalc';
import { getLfTech } from '../../db/lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from '../../db/lifeformBonusData';
import {
  getOverwatchApiUrl,
  fetchOverwatch,
  fetchPlayerActivityIntelligence,
  PlayerActivityHeatmapPoint,
  PlayerActivityObservation,
  PlayerColonyCoord,
  PlayerActivitySummary,
} from '../../utils/overwatchApi';

interface OverwatchActivityHeatmapProps {
  effectiveConfig: any;
  activeUniverse: string;
  activeUniverseName: string;
  ownPlanets?: any[];
  events?: any[];
}

interface ShipPreset {
  id: number;
  name: string;
  speed: number;
  lfBonusPct: number;
  allyBonusPct?: number;
  driveName: string;
  driveLevel: number;
  category: string;
}

interface QuickTarget {
  id: string;
  name: string;
  tag?: string;
}

interface TargetDossier {
  playerId: string;
  playerName: string;
  playerStatus: string | null;
  allianceTag: string | null;
  planetCount: number;
  planets: PlayerColonyCoord[];
  heatmap: PlayerActivityHeatmapPoint[];
  observations: PlayerActivityObservation[];
  summary: PlayerActivitySummary;
}

const DAYS_OF_WEEK = [
  { dayIndex: 1, label: 'Mon', full: 'Monday' },
  { dayIndex: 2, label: 'Tue', full: 'Tuesday' },
  { dayIndex: 3, label: 'Wed', full: 'Wednesday' },
  { dayIndex: 4, label: 'Thu', full: 'Thursday' },
  { dayIndex: 5, label: 'Fri', full: 'Friday' },
  { dayIndex: 6, label: 'Sat', full: 'Saturday' },
  { dayIndex: 0, label: 'Sun', full: 'Sunday' },
];

const getBonusName = (id: number) => {
  return LIFEFORM_BONUS_BREAKDOWN_DATA.find(b => b.id === id)?.bonusName || `Bonus ${id}`;
};

const getTechBonuses = (tech: any, level: number) => {
  if (!tech || !tech.target) return [];

  const uniqueBonusIds: number[] = [];
  const bonusToTargets: Record<number, any[]> = {};

  tech.target.forEach((t: any) => {
    if (!uniqueBonusIds.includes(t.bonusBreakdownId)) {
      uniqueBonusIds.push(t.bonusBreakdownId);
      bonusToTargets[t.bonusBreakdownId] = [];
    }
    bonusToTargets[t.bonusBreakdownId].push(t);
  });

  const hasOnlyBonus1 =
    tech.bonus1BaseValue !== null &&
    tech.bonus1BaseValue !== undefined &&
    (tech.bonus2BaseValue === null || tech.bonus2BaseValue === undefined) &&
    (tech.bonus3BaseValue === null || tech.bonus3BaseValue === undefined);

  return uniqueBonusIds
    .map((id, index) => {
      let baseValue = null;
      if (index === 0) baseValue = tech.bonus1BaseValue;
      else if (index === 1) baseValue = tech.bonus2BaseValue;
      else if (index === 2) baseValue = tech.bonus3BaseValue;

      if (baseValue === null && hasOnlyBonus1) {
        baseValue = tech.bonus1BaseValue;
      }

      if (baseValue === null || baseValue === undefined) return null;

      return {
        id,
        name: getBonusName(id),
        value: baseValue * level,
        targets: bonusToTargets[id],
      };
    })
    .filter(b => b !== null) as { id: number; name: string; value: number; targets: any[] }[];
};

const formatElapsedWdhm = (scannedAt: number): string => {
  if (!scannedAt || isNaN(scannedAt) || scannedAt <= 0) return 'recently';
  const totalMins = Math.max(1, Math.round((Date.now() - scannedAt) / 60000));
  const m = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const h = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const d = totalDays % 7;
  const w = Math.floor(totalDays / 7);

  const parts: string[] = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) {
    if (w === 0 || (d === 0 && h === 0)) {
      parts.push(`${m}m`);
    }
  }

  return parts.join(' ');
};

export const OverwatchActivityHeatmap: React.FC<OverwatchActivityHeatmapProps> = ({
  effectiveConfig,
  activeUniverse,
  activeUniverseName,
  ownPlanets = [],
  events = [],
}) => {
  // 1. Search & Target State (Default blank on page load)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [playerSuggestions, setPlayerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Optional Demo Mode (Explicitly user-toggled, never forced)
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Active Target Dossier (Default null until searched or demo clicked)
  const [targetDossier, setTargetDossier] = useState<TargetDossier | null>(null);

  // Dynamic Quick Targets stored per universe in localStorage
  const [quickTargets, setQuickTargets] = useState<QuickTarget[]>(() => {
    try {
      const saved = localStorage.getItem(`og_nexus_quick_targets_${activeUniverse}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const togglePinTarget = (target: { id?: string; name: string; tag?: string | null }) => {
    setQuickTargets(prev => {
      const exists = prev.some(
        t =>
          t.name.toLowerCase() === target.name.toLowerCase() ||
          (t.id && target.id && t.id === target.id)
      );
      let updated: QuickTarget[];
      if (exists) {
        updated = prev.filter(
          t =>
            t.name.toLowerCase() !== target.name.toLowerCase() &&
            (!t.id || !target.id || t.id !== target.id)
        );
      } else {
        updated = [
          ...prev,
          { id: target.id || '', name: target.name, tag: target.tag || undefined },
        ];
      }
      try {
        localStorage.setItem(`og_nexus_quick_targets_${activeUniverse}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeQuickTarget = (name: string, id?: string) => {
    setQuickTargets(prev => {
      const updated = prev.filter(
        t => t.name.toLowerCase() !== name.toLowerCase() && (!t.id || !id || t.id !== id)
      );
      try {
        localStorage.setItem(`og_nexus_quick_targets_${activeUniverse}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isPinned = useMemo(() => {
    if (!targetDossier) return false;
    return quickTargets.some(
      qt =>
        qt.name.toLowerCase() === targetDossier.playerName.toLowerCase() ||
        (qt.id && targetDossier.playerId && qt.id === targetDossier.playerId)
    );
  }, [quickTargets, targetDossier]);

  // Fetch active account from Nexus DB for true drive technologies and universe fleet speed
  const activeAccount = useLiveQuery(async () => {
    let acc = null;
    if (activeUniverse) {
      acc = await db.accounts.where('universe').equals(activeUniverse).first();
    }
    if (!acc) {
      acc = await db.accounts.orderBy('lastSeen').reverse().first();
    }
    return acc;
  }, [activeUniverse]);

  // Fetch user colonies for Lifeforms calculation with fallback mechanisms
  const userColonies = useLiveQuery(async () => {
    const all = await db.planets.toArray();
    return all.filter(
      p => p.type === 'planet' && (!activeAccount?.playerId || String(p.playerId) === String(activeAccount.playerId))
    );
  }, [activeAccount?.playerId]) || [];

  // Fetch all player planets and moons for Launch Base selection
  const userBases = useLiveQuery(async () => {
    const all = await db.planets.toArray();
    return all
      .filter(p => !activeAccount?.playerId || String(p.playerId) === String(activeAccount.playerId))
      .sort((a, b) => {
        const parse = (c: string) => {
          const parts = (c || '').replace(/[\[\]]/g, '').split(':').map(Number);
          return { g: parts[0] || 0, s: parts[1] || 0, p: parts[2] || 0 };
        };
        const ca = parse(a.coords);
        const cb = parse(b.coords);
        if (ca.g !== cb.g) return ca.g - cb.g;
        if (ca.s !== cb.s) return ca.s - cb.s;
        if (ca.p !== cb.p) return ca.p - cb.p;
        return a.type === 'planet' ? -1 : 1;
      });
  }, [activeAccount?.playerId]) || [];

  // Calculate lifeform speed bonuses and class boosts across all user colonies
  const lfShipBonuses = useMemo(() => {
    const bonuses: Record<number, number> = {};
    let generalBoost = 0;
    let collectorBoost = 0;

    if (!userColonies || userColonies.length === 0) {
      return { shipSpeedPct: bonuses, generalBoost, collectorBoost };
    }

    const expList = safeArray(activeAccount?.lifeformExperience);

    userColonies.forEach(p => {
      let buildingBonus = 0;
      const bldgs = p.lifeformBuildings || [];
      const activePrefix = p.lifeformId ? `1${p.lifeformId}` : null;
      if (Array.isArray(bldgs)) {
        bldgs.forEach((b: any) => {
          if (!b || !b.id) return;
          if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
          if (b.id === 11111) buildingBonus += (b.level || 0) * 0.005; // Human Metropolis
          else if (b.id === 13107) buildingBonus += (b.level || 0) * 0.003; // Mecha Transformer
          else if (b.id === 13111) buildingBonus += (b.level || 0) * 0.004; // Mecha Chip Mass Production
        });
      }
      if ((p as any).speciesBuildings && typeof (p as any).speciesBuildings === 'object') {
        Object.entries((p as any).speciesBuildings).forEach(([idStr, lvl]) => {
          const bId = Number(idStr);
          const level = Number(lvl) || 0;
          if (activePrefix && !bId.toString().startsWith(activePrefix)) return;
          if (bId === 11111) buildingBonus += level * 0.005;
          else if (bId === 13107) buildingBonus += level * 0.003;
          else if (bId === 13111) buildingBonus += level * 0.004;
        });
      }

      const expData = expList.find((e: any) => e.lifeformId === p.lifeformId || e.id === p.lifeformId);
      const totalMultiplier = 1 + (expData?.level || 0) * 0.001 + buildingBonus;

      // Prioritize live researched setup over sandbox/theorycrafting setups
      const rawSetup = (Array.isArray(p.lifeformSetup) && p.lifeformSetup.length > 0)
        ? p.lifeformSetup
        : ((p as any).speciesResearches || p.sandboxSetup || p.lifeformSetup || []);

      const entries: { techId: number; level: number }[] = [];
      if (Array.isArray(rawSetup)) {
        rawSetup.forEach((slot: any) => {
          if (!slot) return;
          if (typeof slot === 'object') {
            const tid = Number(slot.selectedTechId || slot.techId || slot.id);
            const lvl = Number(slot.level || slot.techLevel || 0);
            if (tid && lvl) entries.push({ techId: tid, level: lvl });
          }
        });
      } else if (rawSetup && typeof rawSetup === 'object') {
        Object.entries(rawSetup).forEach(([k, v]) => {
          const tid = Number(k);
          const lvl = Number(v);
          if (tid && lvl) entries.push({ techId: tid, level: lvl });
        });
      }

      entries.forEach(({ techId, level }) => {
        const tech = getLfTech(techId);
        if (!tech || !tech.target) return;

        const techBonuses = getTechBonuses(tech, level);
        techBonuses.forEach(b => {
          const finalVal = b.value * totalMultiplier;
          if (b.id === 7) {
            // Ship Speed Increase
            const targets = b.targets?.filter((t: any) => t.gameKnowledgeId).map((t: any) => t.gameKnowledgeId) || [];
            if (targets.length > 0) {
              targets.forEach((tid: number) => {
                bonuses[tid] = (bonuses[tid] || 0) + finalVal;
              });
            } else {
              const allShipIds = [202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 214, 215, 218, 219];
              allShipIds.forEach(tid => {
                bonuses[tid] = (bonuses[tid] || 0) + finalVal;
              });
            }
          } else if (b.id === 31) {
            generalBoost += finalVal;
          } else if (b.id === 30) {
            collectorBoost += finalVal;
          }
        });
      });
    });

    return { shipSpeedPct: bonuses, generalBoost, collectorBoost };
  }, [userColonies, activeAccount]);

  // Compute player drive tech levels, player class, and alliance class bonuses from Nexus
  const driveLevels = useMemo(() => {
    const combustion = getResearchLevel(activeAccount, 115);
    const impulse = getResearchLevel(activeAccount, 117);
    const hyperspace = getResearchLevel(activeAccount, 118);
    const isGeneral = activeAccount?.playerClass === 2;
    const isCollector = activeAccount?.playerClass === 1;

    // Detect Alliance Class from account record (0: None, 1: Trader in db schema / 2: Trader in OGame API, 3: Warrior/Researcher)
    const rawAllyClass = (activeAccount as any)?.allianceClass ?? (activeAccount as any)?.alliance_class ?? (activeAccount as any)?.allianceClassId;
    const isTraderAlliance = 
      rawAllyClass === 1 || 
      rawAllyClass === 2 || 
      (typeof rawAllyClass === 'string' && (rawAllyClass.toLowerCase().includes('trader') || rawAllyClass === '1' || rawAllyClass === '2'));

    const warSpeed = activeAccount?.speedFleetWar || activeAccount?.universeSpeed || 1;
    return { combustion, impulse, hyperspace, isGeneral, isCollector, isTraderAlliance, rawAllyClass, warSpeed };
  }, [activeAccount]);

  // Compute true ship speeds according to user's exact additive formula:
  // Speed = Math.floor(BaseSpeed * (1 + (LF_bonus% / 100) + (DriveLevel * DriveFactor) + ClassBonus + AllianceClassBonus))
  const dynamicShipPresets = useMemo<ShipPreset[]>(() => {
    const { combustion, impulse, hyperspace, isGeneral, isCollector, isTraderAlliance } = driveLevels;
    const { shipSpeedPct, generalBoost, collectorBoost } = lfShipBonuses;

    // General class boosts combat ships and recyclers (+100% base speed, enhanced by General Class Boost LF tech)
    const combatClassBonus = isGeneral ? 1.0 * (1 + generalBoost / 100) : 0;
    // Collector class boosts transporters (+100% base speed, enhanced by Collector Class Boost LF tech)
    const transporterClassBonus = isCollector ? 1.0 * (1 + collectorBoost / 100) : 0;
    // Trader Alliance class boosts cargo ships (+10% base speed)
    const allyCargoBonus = isTraderAlliance ? 0.10 : 0;

    const calcShipSpeed = (
      baseSpeed: number,
      driveBonus: number,
      classBonus: number,
      shipId: number,
      allyBonus: number = 0
    ) => {
      const lfBonus = shipSpeedPct[shipId] || 0;
      // Formula: Math.floor(baseSpeed * (1 + (lfBonus / 100) + driveBonus + classBonus + allyBonus))
      // In OGame, all ship stats are integer-floored (e.g. 74,138.95 -> 74,138).
      // Use rounding epsilon (round to 3 decimals before floor) to prevent IEEE-754 precision truncation (e.g. 63999.99999999999 -> 64000).
      const rawSpeed = baseSpeed * (1 + (lfBonus / 100) + driveBonus + classBonus + allyBonus);
      const finalSpeed = Math.floor(Math.round(rawSpeed * 1000) / 1000);
      return { speed: finalSpeed, lfBonusPct: lfBonus, allyBonusPct: Math.round(allyBonus * 100) };
    };

    // Battleship (207): 10000 Hyperspace (+30%/lvl)
    const bs = calcShipSpeed(10000, hyperspace * 0.30, combatClassBonus, 207);

    // Battlecruiser (215): 10000 Hyperspace (+30%/lvl)
    const bc = calcShipSpeed(10000, hyperspace * 0.30, combatClassBonus, 215);

    // Cruiser (206): 15000 Impulse (+20%/lvl)
    const cr = calcShipSpeed(15000, impulse * 0.20, combatClassBonus, 206);

    // Pathfinder (219): 12000 Hyperspace (+30%/lvl)
    const pf = calcShipSpeed(12000, hyperspace * 0.30, combatClassBonus, 219);

    // Reaper (218): 7000 Hyperspace (+30%/lvl)
    const rp = calcShipSpeed(7000, hyperspace * 0.30, combatClassBonus, 218);

    // Destroyer (213): 5000 Hyperspace (+30%/lvl)
    const ds = calcShipSpeed(5000, hyperspace * 0.30, combatClassBonus, 213);

    // Bomber (211): 4000 Impulse (+20%/lvl) -> 5000 Hyperspace (+30%/lvl) at Hyperspace >= 8
    const bmUseHyp = hyperspace >= 8;
    const bm = calcShipSpeed(
      bmUseHyp ? 5000 : 4000,
      bmUseHyp ? hyperspace * 0.30 : impulse * 0.20,
      combatClassBonus,
      211
    );

    // Large Cargo (203): 7500 Combustion (+10%/lvl) + Trader Ally (+10%)
    const lc = calcShipSpeed(7500, combustion * 0.10, transporterClassBonus, 203, allyCargoBonus);

    // Small Cargo (202): 5000 Combustion (+10%/lvl) -> 10000 Impulse (+20%/lvl) at Impulse >= 5 + Trader Ally (+10%)
    const scUseImpulse = impulse >= 5;
    const sc = calcShipSpeed(
      scUseImpulse ? 10000 : 5000,
      scUseImpulse ? impulse * 0.20 : combustion * 0.10,
      transporterClassBonus,
      202,
      allyCargoBonus
    );

    // Light Fighter (204): 12500 Combustion (+10%/lvl)
    const lf = calcShipSpeed(12500, combustion * 0.10, combatClassBonus, 204);

    // Heavy Fighter (205): 10000 Impulse (+20%/lvl)
    const hf = calcShipSpeed(10000, impulse * 0.20, combatClassBonus, 205);

    // Recycler (209): 2000 Comb -> 4000 Imp (>=17) -> 6000 Hyp (>=15)
    let recBase = 2000;
    let recDrive = 'Combustion';
    let recLvl = combustion;
    let recDriveBonus = combustion * 0.10;
    if (hyperspace >= 15) {
      recBase = 6000;
      recDrive = 'Hyperspace';
      recLvl = hyperspace;
      recDriveBonus = hyperspace * 0.30;
    } else if (impulse >= 17) {
      recBase = 4000;
      recDrive = 'Impulse';
      recLvl = impulse;
      recDriveBonus = impulse * 0.20;
    }
    const rec = calcShipSpeed(recBase, recDriveBonus, combatClassBonus, 209);

    // Deathstar (214): 100 Hyperspace (+30%/lvl)
    const rip = calcShipSpeed(100, hyperspace * 0.30, combatClassBonus, 214);

    // Espionage Probe (210): 100,000,000 Combustion (+10%/lvl)
    const ep = calcShipSpeed(100000000, combustion * 0.10, 0, 210);

    return [
      { id: 207, name: 'Battleship', speed: bs.speed, lfBonusPct: bs.lfBonusPct, allyBonusPct: bs.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Main Fleet' },
      { id: 215, name: 'Battlecruiser', speed: bc.speed, lfBonusPct: bc.lfBonusPct, allyBonusPct: bc.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Heavy Raider' },
      { id: 206, name: 'Cruiser', speed: cr.speed, lfBonusPct: cr.lfBonusPct, allyBonusPct: cr.allyBonusPct, driveName: 'Impulse', driveLevel: impulse, category: 'Fast Combat' },
      { id: 219, name: 'Pathfinder', speed: pf.speed, lfBonusPct: pf.lfBonusPct, allyBonusPct: pf.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Scout/Combat' },
      { id: 218, name: 'Reaper', speed: rp.speed, lfBonusPct: rp.lfBonusPct, allyBonusPct: rp.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Capital Ship' },
      { id: 213, name: 'Destroyer', speed: ds.speed, lfBonusPct: ds.lfBonusPct, allyBonusPct: ds.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Heavy Fleet' },
      { id: 211, name: 'Bomber', speed: bm.speed, lfBonusPct: bm.lfBonusPct, allyBonusPct: bm.allyBonusPct, driveName: bmUseHyp ? 'Hyperspace' : 'Impulse', driveLevel: bmUseHyp ? hyperspace : impulse, category: 'Siege Bomber' },
      { id: 203, name: 'Large Cargo', speed: lc.speed, lfBonusPct: lc.lfBonusPct, allyBonusPct: lc.allyBonusPct, driveName: 'Combustion', driveLevel: combustion, category: 'Transport' },
      { id: 202, name: 'Small Cargo', speed: sc.speed, lfBonusPct: sc.lfBonusPct, allyBonusPct: sc.allyBonusPct, driveName: scUseImpulse ? 'Impulse' : 'Combustion', driveLevel: scUseImpulse ? impulse : combustion, category: 'Transport' },
      { id: 204, name: 'Light Fighter', speed: lf.speed, lfBonusPct: lf.lfBonusPct, allyBonusPct: lf.allyBonusPct, driveName: 'Combustion', driveLevel: combustion, category: 'Fast Combat' },
      { id: 205, name: 'Heavy Fighter', speed: hf.speed, lfBonusPct: hf.lfBonusPct, allyBonusPct: hf.allyBonusPct, driveName: 'Impulse', driveLevel: impulse, category: 'Combat' },
      { id: 209, name: 'Recycler', speed: rec.speed, lfBonusPct: rec.lfBonusPct, allyBonusPct: rec.allyBonusPct, driveName: recDrive, driveLevel: recLvl, category: 'Harvest' },
      { id: 214, name: 'Deathstar (RIP)', speed: rip.speed, lfBonusPct: rip.lfBonusPct, allyBonusPct: rip.allyBonusPct, driveName: 'Hyperspace', driveLevel: hyperspace, category: 'Siege' },
      { id: 210, name: 'Espionage Probe', speed: ep.speed, lfBonusPct: ep.lfBonusPct, allyBonusPct: ep.allyBonusPct, driveName: 'Combustion', driveLevel: combustion, category: 'Recon' },
    ];
  }, [driveLevels, lfShipBonuses]);

  // 2. View Mode & Filters (Weekly 7-Day Matrix as Default)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [timezone, setTimezone] = useState<'server' | 'local' | 'utc'>('server');
  const [targetFilter, setTargetFilter] = useState<'all' | 'moon' | 'planet'>('all');
  const [hoveredCell, setHoveredCell] = useState<{
    dayName?: string;
    displayHour: number;
    utcHour: number;
    activePings: number;
    idleChecks: number;
    moonPings: number;
    probability: number;
    isSleep: boolean;
    isUnknown: boolean;
  } | null>(null);

  // 3. Strike Planner State (Linked to Account Bases from DB)
  const [selectedOriginId, setSelectedOriginId] = useState<string>('');
  const [originCoord, setOriginCoord] = useState<string>('1:100:4');
  const [destCoord, setDestCoord] = useState<string>('1:240:8');
  const [isDestMoon, setIsDestMoon] = useState<boolean>(true);
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0); // Battleship default
  const [customFlightMins, setCustomFlightMins] = useState<string>('');

  // Launch Base Custom Dropdown state & ref (Scrap Merchant Style)
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const baseDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (baseDropdownRef.current && !baseDropdownRef.current.contains(e.target as Node)) {
        setIsBaseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatically select attacker's first base when loaded
  useEffect(() => {
    if (userBases.length > 0 && !selectedOriginId) {
      setSelectedOriginId(userBases[0].id);
      setOriginCoord(userBases[0].coords.replace(/[\[\]]/g, '').trim());
    }
  }, [userBases, selectedOriginId]);

  const activeBase = useMemo(() => {
    if (selectedOriginId) {
      return userBases.find(b => b.id === selectedOriginId) || userBases[0];
    }
    return userBases[0];
  }, [userBases, selectedOriginId]);

  const getBaseIcon = (base: Planet) => {
    if (base.type === 'moon') {
      return base.imgUrl || '/icons/overwatch/moon.jpg';
    }
    const slotNum = Math.min(15, Math.max(1, parseInt(base.coords?.split(':')[2] || '1', 10) || 1));
    return base.imgUrl || `/icons/overwatch/planet-slot-${slotNum}.png`;
  };

  const handleBaseSelect = (baseId: string) => {
    setIsBaseDropdownOpen(false);
    setSelectedOriginId(baseId);
    const base = userBases.find(b => b.id === baseId);
    if (base) {
      setOriginCoord(base.coords.replace(/[\[\]]/g, '').trim());
    }
  };

  const searchTimeoutRef = useRef<any>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Timezone Offset Calculation
  const tzOffset = useMemo(() => {
    if (timezone === 'utc') return 0;
    if (timezone === 'server') return 1; // Standard OGame CET (UTC+1)
    return Math.round(-new Date().getTimezoneOffset() / 60);
  }, [timezone]);

  const tzLabel = useMemo(() => {
    if (timezone === 'utc') return 'UTC';
    if (timezone === 'server') return 'Server (CET)';
    return 'Local Device';
  }, [timezone]);

  // Outside click for autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Fetch Player Activity Intelligence from Server
  const loadPlayerIntelligence = useCallback(
    async (nameOrId: string, specificPlayerId?: string) => {
      if (!nameOrId || !nameOrId.trim()) return;
      setIsLoadingIntelligence(true);
      setShowSuggestions(false);

      const resolvedTarget = specificPlayerId || nameOrId.trim();

      try {
        const data = await fetchPlayerActivityIntelligence(
          activeUniverse,
          resolvedTarget,
          effectiveConfig.authToken
        );

        if (data && data.success) {
          setTargetDossier({
            playerId: data.playerId || resolvedTarget,
            playerName: data.playerName || nameOrId,
            playerStatus: data.playerStatus,
            allianceTag: data.allianceTag,
            planetCount: data.planetCount || data.planets?.length || 1,
            planets: data.planets || [],
            heatmap: data.heatmap || [],
            observations: data.observations || [],
            summary: data.summary || {
              totalActivePings: 0,
              totalIdleChecks: 0,
              totalMoonPings: 0,
              moonRatio: 0,
              detectedSleepStartUTC: 1,
              detectedSleepEndUTC: 7,
              confidence: 0,
            },
          });

          if (data.planets && data.planets.length > 0) {
            const p = data.planets[0];
            setDestCoord(`${p.galaxy}:${p.system}:${p.slot}`);
            setIsDestMoon(p.has_moon === 1);
          }

          setSearchQuery(data.playerName || nameOrId);
          setIsLoadingIntelligence(false);
          return;
        }
      } catch (err) {
        console.warn('Overwatch player activity intelligence error:', err);
      }

      // If player has not been scouted yet, set 0 scans
      setTargetDossier({
        playerId: specificPlayerId || '',
        playerName: nameOrId,
        playerStatus: null,
        allianceTag: null,
        planetCount: 1,
        planets: [
          { galaxy: 1, system: 240, slot: 8, planet_name: 'Homeworld', has_moon: 1, moon_size: 8944 }
        ],
        heatmap: [],
        observations: [],
        summary: {
          totalActivePings: 0,
          totalIdleChecks: 0,
          totalMoonPings: 0,
          moonRatio: 0,
          detectedSleepStartUTC: 1,
          detectedSleepEndUTC: 7,
          confidence: 0,
        },
      });

      setSearchQuery(nameOrId);
      setIsLoadingIntelligence(false);
    },
    [activeUniverse, effectiveConfig.authToken]
  );

  // Search Universe Players
  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const apiUrl = await getOverwatchApiUrl();
          const headers: Record<string, string> = {};
          if (effectiveConfig.authToken) {
            headers['Authorization'] = `Bearer ${effectiveConfig.authToken}`;
          }
          const res = await fetchOverwatch(
            `${apiUrl}/api/v1/players/search?universeId=${encodeURIComponent(activeUniverse)}&q=${encodeURIComponent(val.trim())}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.players && Array.isArray(data.players)) {
              setPlayerSuggestions(data.players);
              setShowSuggestions(true);
              setIsSearching(false);
              return;
            }
          }
        } catch {
          // offline fallback
        }

        const filtered = quickTargets
          .filter(p => p.name.toLowerCase().includes(val.toLowerCase()))
          .map(p => ({ playerId: p.id, playerName: p.name, allianceTag: p.tag }));
        setPlayerSuggestions(filtered);
        setShowSuggestions(true);
        setIsSearching(false);
      }, 180);
    } else {
      setPlayerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Toggle Demo Mode Preview
  const handleToggleDemoMode = () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setTargetDossier(null);
      setSearchQuery('');
    } else {
      setIsDemoMode(true);
      setTargetDossier({
        playerId: '999999',
        playerName: 'Target Player',
        playerStatus: null,
        allianceTag: 'VIPER',
        planetCount: 9,
        planets: [
          { galaxy: 1, system: 240, slot: 8, planet_name: 'Homeworld', has_moon: 1, moon_size: 8944 },
          { galaxy: 1, system: 240, slot: 9, planet_name: 'Colony 1', has_moon: 1, moon_size: 8520 },
          { galaxy: 2, system: 110, slot: 6, planet_name: 'Colony 2', has_moon: 0, moon_size: null },
          { galaxy: 2, system: 350, slot: 4, planet_name: 'Colony 3', has_moon: 1, moon_size: 8400 },
          { galaxy: 3, system: 42, slot: 12, planet_name: 'Colony 4', has_moon: 0, moon_size: null },
        ],
        heatmap: [],
        observations: [],
        summary: {
          totalActivePings: 24,
          totalIdleChecks: 12,
          totalMoonPings: 6,
          moonRatio: 0.25,
          detectedSleepStartUTC: 1,
          detectedSleepEndUTC: 7,
          confidence: 85,
        },
      });
      setSearchQuery('Target Player');
    }
  };

  // Determine if surveillance intel is present
  const hasSurveillanceData = useMemo(() => {
    if (!targetDossier) return false;
    if (isDemoMode) return true;
    return (targetDossier.summary.totalActivePings + targetDossier.summary.totalIdleChecks) > 0;
  }, [targetDossier, isDemoMode]);

  // Sleep Window Calculations: Only confirms a sleep schedule when enough samples across distinct hours exist
  const sleepWindow = useMemo(() => {
    if (!targetDossier) {
      return {
        startDisp: 1,
        endDisp: 7,
        label: 'No target selected',
        hasConfirmedSleep: false,
      };
    }
    const { detectedSleepStartUTC, detectedSleepEndUTC, totalActivePings, totalIdleChecks } = targetDossier.summary;
    const totalScans = (totalActivePings || 0) + (totalIdleChecks || 0);

    // Count how many unique hours of the day have surveillance pings
    const hoursWithData = new Set<number>();
    if (targetDossier.heatmap && targetDossier.heatmap.length > 0) {
      targetDossier.heatmap.forEach(pt => {
        if ((pt.active_pings || 0) > 0 || (pt.idle_checks || 0) > 0) {
          hoursWithData.add(Number(pt.hour_of_day) % 24);
        }
      });
    }

    // A reliable human sleep schedule requires at least 30 scans across at least 8 unique hours (or demo mode)
    const hasEnoughData = isDemoMode || (totalScans >= 30 && hoursWithData.size >= 8);

    if (!hasSurveillanceData || !hasEnoughData) {
      return {
        startDisp: 1,
        endDisp: 7,
        label: totalScans > 0 ? 'Insufficient data for sleep schedule' : 'No data yet',
        hasConfirmedSleep: false,
      };
    }

    const mod24 = (n: number) => ((n % 24) + 24) % 24;
    const startDisp = mod24(detectedSleepStartUTC + tzOffset);
    const endDisp = mod24(detectedSleepEndUTC + tzOffset);

    const startStr = String(startDisp).padStart(2, '0') + ':00';
    const endStr = String(endDisp).padStart(2, '0') + ':00';

    return {
      startDisp,
      endDisp,
      label: `${startStr} to ${endStr} ${tzLabel}`,
      hasConfirmedSleep: true,
    };
  }, [targetDossier, tzOffset, tzLabel, hasSurveillanceData, isDemoMode]);

  // Compute 24-Hour Profile Data
  const horizonProfileData = useMemo(() => {
    if (!targetDossier) return [];
    const { heatmap, playerName } = targetDossier;

    // Aggregate pings per UTC hour
    const hourlyActive = new Array(24).fill(0);
    const hourlyIdle = new Array(24).fill(0);
    const hourlyMoon = new Array(24).fill(0);

    if (heatmap && heatmap.length > 0) {
      for (const pt of heatmap) {
        const h = Number(pt.hour_of_day) % 24;
        hourlyActive[h] += Number(pt.active_pings || pt.activity_score || 0);
        hourlyIdle[h] += Number(pt.idle_checks || 0);
        hourlyMoon[h] += Number(pt.moon_pings || 0);
      }
    } else if (isDemoMode) {
      // Deterministic demo data
      let hash = 0;
      for (let i = 0; i < playerName.length; i++) hash = (hash << 5) - hash + playerName.charCodeAt(i);
      const posHash = Math.abs(hash);
      for (let h = 0; h < 24; h++) {
        const inSleep = (h >= 1 && h < 7);
        if (inSleep) {
          hourlyActive[h] = h === 3 ? 1 : 0;
          hourlyIdle[h] = 12;
        } else {
          hourlyActive[h] = 6 + (posHash % 4);
          hourlyIdle[h] = 3;
          hourlyMoon[h] = (h % 3 === 0) ? 2 : 0;
        }
      }
    }

    return Array.from({ length: 24 }).map((_, displayHour) => {
      const utcHour = (displayHour - tzOffset + 24) % 24;
      let activePings = hourlyActive[utcHour];
      const idleChecks = hourlyIdle[utcHour];
      const moonPings = hourlyMoon[utcHour];

      if (targetFilter === 'moon') {
        activePings = moonPings;
      } else if (targetFilter === 'planet') {
        activePings = Math.max(0, activePings - moonPings);
      }

      const total = activePings + idleChecks;
      const isUnknown = total === 0 && !isDemoMode;
      const probability = total > 0 ? (activePings / total) : 0;

      const inSleepRange = sleepWindow.startDisp < sleepWindow.endDisp
        ? (displayHour >= sleepWindow.startDisp && displayHour < sleepWindow.endDisp)
        : (displayHour >= sleepWindow.startDisp || displayHour < sleepWindow.endDisp);

      const isSleep = sleepWindow.hasConfirmedSleep && !isUnknown && inSleepRange;

      return {
        displayHour,
        utcHour,
        activePings,
        idleChecks,
        moonPings,
        probability,
        isSleep,
        isUnknown,
      };
    });
  }, [targetDossier, tzOffset, targetFilter, sleepWindow, isDemoMode]);

  // Compute 7x24 Matrix Data (Guaranteed Pure CSS Grid)
  const matrixData = useMemo(() => {
    if (!targetDossier) return [];
    const { heatmap, playerName } = targetDossier;

    const recordMap = new Map<string, PlayerActivityHeatmapPoint>();
    if (heatmap && heatmap.length > 0) {
      for (const pt of heatmap) {
        recordMap.set(`${pt.day_of_week}_${pt.hour_of_day}`, pt);
      }
    }

    let posHash = 100;
    if (isDemoMode) {
      let hash = 0;
      for (let i = 0; i < playerName.length; i++) hash = (hash << 5) - hash + playerName.charCodeAt(i);
      posHash = Math.abs(hash);
    }

    return DAYS_OF_WEEK.map(dayObj => {
      const dayIndex = dayObj.dayIndex;
      let dayTotalActive = 0;
      let dayTotalScans = 0;

      const hourCells = Array.from({ length: 24 }).map((_, displayHour) => {
        const utcHour = (displayHour - tzOffset + 24) % 24;
        const key = `${dayIndex}_${utcHour}`;
        const record = recordMap.get(key);

        let activePings = 0;
        let idleChecks = 0;
        let moonPings = 0;

        if (record) {
          activePings = Number(record.active_pings || record.activity_score || 0);
          idleChecks = Number(record.idle_checks || 0);
          moonPings = Number(record.moon_pings || 0);
        } else if (isDemoMode) {
          const inSleep = (utcHour >= 1 && utcHour < 7);
          if (inSleep) {
            activePings = (utcHour === 3 && dayIndex % 2 === 0) ? 1 : 0;
            idleChecks = 4;
          } else {
            activePings = 3 + ((posHash + displayHour) % 3);
            idleChecks = 1;
            moonPings = (utcHour % 4 === 0) ? 1 : 0;
          }
        }

        let filteredActive = activePings;
        if (targetFilter === 'moon') filteredActive = moonPings;
        else if (targetFilter === 'planet') filteredActive = Math.max(0, activePings - moonPings);

        const totalScans = filteredActive + idleChecks;
        const isUnknown = totalScans === 0 && !isDemoMode;
        const probability = totalScans > 0 ? (filteredActive / totalScans) : 0;

        dayTotalActive += filteredActive;
        dayTotalScans += totalScans;

        const inSleepRange = sleepWindow.startDisp < sleepWindow.endDisp
          ? (displayHour >= sleepWindow.startDisp && displayHour < sleepWindow.endDisp)
          : (displayHour >= sleepWindow.startDisp || displayHour < sleepWindow.endDisp);

        const isSleep = sleepWindow.hasConfirmedSleep && !isUnknown && inSleepRange;

        return {
          displayHour,
          utcHour,
          activePings: filteredActive,
          idleChecks,
          moonPings,
          probability,
          isSleep,
          isUnknown,
        };
      });

      const dayAverageProb = dayTotalScans > 0 ? (dayTotalActive / dayTotalScans) : 0;

      return {
        ...dayObj,
        hours: hourCells,
        dayAverageProb,
        dayTotalScans,
      };
    });
  }, [targetDossier, tzOffset, targetFilter, sleepWindow, isDemoMode]);

  // Flight Planner Calculations (True Speeds from Nexus + Lifeforms, Safe Modulo)
  const flightCalculations = useMemo(() => {
    const parseCoord = (str: string) => {
      const parts = (str || '').replace(/[\[\]]/g, '').split(':').map(p => parseInt(p.trim(), 10));
      return {
        g: isNaN(parts[0]) ? 1 : parts[0],
        s: isNaN(parts[1]) ? 1 : parts[1],
        p: isNaN(parts[2]) ? 1 : parts[2],
      };
    };

    const origin = parseCoord(originCoord);
    const dest = parseCoord(destCoord);

    let distance = 5;
    if (origin.g !== dest.g) {
      distance = 20000 * Math.abs(origin.g - dest.g);
    } else if (origin.s !== dest.s) {
      distance = 2700 + 95 * Math.abs(origin.s - dest.s);
    } else if (origin.p !== dest.p) {
      distance = 1000 + 5 * Math.abs(origin.p - dest.p);
    }

    const ship = dynamicShipPresets[selectedShipIndex] || dynamicShipPresets[0];
    let durationSeconds = 0;

    const customMinsNum = parseInt(customFlightMins, 10);
    if (!isNaN(customMinsNum) && customMinsNum > 0) {
      durationSeconds = customMinsNum * 60;
    } else {
      const warSpeed = Math.max(1, driveLevels.warSpeed);
      durationSeconds = 10 + Math.round((35000 / (10 * warSpeed)) * Math.sqrt((10 * distance) / ship.speed));
    }

    const durationHours = durationSeconds / 3600;
    const durH = Math.floor(durationSeconds / 3600);
    const durM = Math.floor((durationSeconds % 3600) / 60);
    const durS = durationSeconds % 60;
    const durationFormatted = `${durH > 0 ? `${durH}h ` : ''}${durM}m ${durS}s`;

    const mod24 = (n: number) => ((n % 24) + 24) % 24;

    const formatHourFrac = (hFrac: number) => {
      const norm = mod24(hFrac);
      const h = Math.floor(norm);
      const m = Math.floor((norm - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let windowOpen = 'Any time';
    let windowClose = 'Any time';
    let impactTimeStr = 'Awaiting Sleep Data';

    let advisoryType: 'optimal' | 'warning' | 'danger' = 'warning';
    let advisoryTitle = 'AWAITING SLEEP DATA';
    let advisoryDesc = `Flight time is ${durationFormatted}. View the player's solar systems in Galaxy View to detect their sleep hours.`;

    if (sleepWindow.hasConfirmedSleep) {
      const sleepStart = sleepWindow.startDisp;
      const sleepEnd = sleepWindow.endDisp;
      const sleepDurationHours = (sleepEnd - sleepStart + 24) % 24;

      const idealImpactHour = mod24(sleepStart + Math.floor(sleepDurationHours / 2));
      const earliestLaunchHour = mod24(sleepStart + 0.5 - durationHours);
      const latestLaunchHour = mod24(sleepEnd - 0.75 - durationHours);

      windowOpen = formatHourFrac(earliestLaunchHour);
      windowClose = formatHourFrac(latestLaunchHour);
      impactTimeStr = formatHourFrac(idealImpactHour);

      if (durationHours > sleepDurationHours) {
        advisoryType = 'danger';
        advisoryTitle = 'FLIGHT EXCEEDS SLEEP DURATION';
        advisoryDesc = `Flight time (${durationFormatted}) is longer than the detected sleep window (${sleepDurationHours}h). Launch from a closer colony or use faster ships.`;
      } else if (durationHours > sleepDurationHours * 0.75) {
        advisoryType = 'warning';
        advisoryTitle = 'NARROW LAUNCH WINDOW';
        advisoryDesc = `Launch between ${windowOpen} and ${windowClose} ${tzLabel}. Margin before predicted wake-up is tight.`;
      } else {
        advisoryType = 'optimal';
        advisoryTitle = 'OPTIMAL LAUNCH WINDOW';
        advisoryDesc = `Launch between ${windowOpen} and ${windowClose} ${tzLabel} to arrive at ~${impactTimeStr} during sleep hours.`;
      }
    }

    return {
      distance,
      durationSeconds,
      durationFormatted,
      durationHours,
      windowOpen,
      windowClose,
      impactTimeStr,
      advisoryType,
      advisoryTitle,
      advisoryDesc,
    };
  }, [originCoord, destCoord, selectedShipIndex, customFlightMins, dynamicShipPresets, driveLevels, sleepWindow, tzLabel]);

  // Cell Background Style Helper
  const getCellBackground = (prob: number, isSleep: boolean, isUnknown: boolean) => {
    if (isUnknown) {
      return {
        bg: 'rgba(2, 6, 18, 0.4)',
        border: 'rgba(255, 255, 255, 0.04)',
        textColor: '#475569',
      };
    }
    if (prob === 0) {
      return {
        bg: isSleep ? 'rgba(52, 211, 153, 0.06)' : 'rgba(2, 6, 18, 0.9)',
        border: isSleep ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 255, 255, 0.05)',
        textColor: isSleep ? '#34d399' : '#64748b',
      };
    }
    if (prob <= 0.25) {
      return {
        bg: 'rgba(8, 47, 73, 0.65)',
        border: 'rgba(14, 165, 233, 0.3)',
        textColor: '#38bdf8',
      };
    }
    if (prob <= 0.6) {
      return {
        bg: 'rgba(13, 148, 136, 0.65)',
        border: 'rgba(20, 184, 166, 0.4)',
        textColor: '#2dd4bf',
      };
    }
    if (prob <= 0.85) {
      return {
        bg: 'rgba(180, 83, 9, 0.7)',
        border: 'rgba(245, 158, 11, 0.5)',
        textColor: '#fbbf24',
      };
    }
    return {
      bg: 'rgba(190, 18, 60, 0.85)',
      border: 'rgba(244, 63, 94, 0.65)',
      textColor: '#ffffff',
    };
  };

  return (
    <div className="ow-heatmap-vanguard-container">
      {/* 1. TOP SECTION: TARGET DOSSIER & SEARCH (DOUBLE-BEZEL) */}
      <div className="ow-double-bezel-outer">
        <div className="ow-double-bezel-inner">
          {targetDossier ? (
            /* Active Target Dossier Header Bar */
            <div className="ow-dossier-bar">
              <div className="ow-dossier-player">
                <div className="ow-dossier-avatar">
                  {targetDossier.playerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                      {targetDossier.playerName}
                    </h2>
                    {targetDossier.allianceTag && (
                      <span className="ow-autocomplete-tag">[{targetDossier.allianceTag}]</span>
                    )}
                    {targetDossier.playerId && (
                      <span className="ow-autocomplete-id">#{targetDossier.playerId}</span>
                    )}
                    {isDemoMode && (
                      <span className="ow-autocomplete-status vacation" style={{ fontSize: 10, padding: '2px 8px' }}>
                        DEMO PREVIEW ACTIVE
                      </span>
                    )}
                    <button
                      type="button"
                      className="ow-btn-ghost"
                      onClick={() =>
                        togglePinTarget({
                          id: targetDossier.playerId,
                          name: targetDossier.playerName,
                          tag: targetDossier.allianceTag,
                        })
                      }
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        borderRadius: 9999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        color: isPinned ? '#fbbf24' : '#94a3b8',
                        borderColor: isPinned ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                        background: isPinned ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                      title={isPinned ? 'Remove from Quick Targets' : 'Add to Quick Targets'}
                    >
                      <Bookmark size={12} fill={isPinned ? '#fbbf24' : 'none'} />
                      <span>{isPinned ? 'In Quick Targets' : '+ Quick Target'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    Player Activity in {activeUniverseName} • {targetDossier.planetCount} Known Colonies
                  </div>
                </div>
              </div>

              <div className="ow-dossier-pills">
                <div className={`ow-dossier-pill ${sleepWindow.hasConfirmedSleep ? 'sleep' : ''}`}>
                  <Moon size={13} style={{ color: sleepWindow.hasConfirmedSleep ? '#34d399' : '#fbbf24' }} />
                  <span>
                    {sleepWindow.hasConfirmedSleep ? (
                      <>Sleep Hours: <strong>{sleepWindow.label}</strong></>
                    ) : (
                      <>Sleep Hours: <strong style={{ color: '#fbbf24' }}>{sleepWindow.label}</strong></>
                    )}
                  </span>
                </div>
                <div className="ow-dossier-pill active">
                  <Shield size={13} />
                  <span>Status: <strong>{targetDossier.playerStatus || 'Active'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            /* Blank Default State Header Bar */
            <div className="ow-dossier-bar" style={{ marginBottom: 16 }}>
              <div className="ow-dossier-player">
                <div
                  className="ow-dossier-avatar"
                  style={{ background: 'rgba(0, 242, 255, 0.1)', borderColor: 'rgba(0, 242, 255, 0.3)', color: '#00f2ff' }}
                >
                  <Crosshair size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    Target Surveillance & Recon
                  </h2>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                    Search any player in {activeUniverseName} to inspect activity schedules, sleep windows, and plan coordinated strikes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar, Action Button & Demo Toggle */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="ow-autocomplete-wrapper" style={{ flex: '1 1 300px', maxWidth: 460 }}>
              <input
                type="text"
                className="ow-text-field"
                placeholder="Search player name or ID in universe..."
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                onFocus={() => {
                  if (playerSuggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    loadPlayerIntelligence(searchQuery.trim());
                  }
                }}
                style={{ marginBottom: 0, width: '100%' }}
              />

              {showSuggestions && (
                <div className="ow-autocomplete-dropdown" ref={autocompleteRef}>
                  {isSearching ? (
                    <div className="ow-autocomplete-loading">
                      <RefreshCw size={14} className="ow-spin" />
                      <span>Searching universe database...</span>
                    </div>
                  ) : playerSuggestions.length === 0 ? (
                    <div className="ow-autocomplete-empty">
                      No players found matching "{searchQuery}"
                    </div>
                  ) : (
                    playerSuggestions.map((p, idx) => (
                      <div
                        key={`${p.playerId || p.playerName}-${idx}`}
                        className={`ow-autocomplete-item ${idx === focusedIndex ? 'focused' : ''}`}
                        onClick={() => loadPlayerIntelligence(p.playerName, p.playerId)}
                        onMouseEnter={() => setFocusedIndex(idx)}
                      >
                        <div className="ow-autocomplete-player-left">
                          <div className="ow-autocomplete-avatar">
                            {p.playerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="ow-autocomplete-name">{p.playerName}</span>
                        </div>
                        <div className="ow-autocomplete-meta">
                          {p.allianceTag && <span className="ow-autocomplete-tag">[{p.allianceTag}]</span>}
                          {p.playerId && <span className="ow-autocomplete-id">#{p.playerId}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              className="ow-btn-island"
              onClick={() => loadPlayerIntelligence(searchQuery)}
              disabled={isLoadingIntelligence || !searchQuery.trim()}
              style={{ opacity: !searchQuery.trim() ? 0.6 : 1 }}
            >
              <span>{isLoadingIntelligence ? 'Searching...' : 'Search Player'}</span>
              <div className="ow-btn-island-icon">
                {isLoadingIntelligence ? <RefreshCw size={14} className="ow-spin" /> : <Search size={14} />}
              </div>
            </button>

            {/* Demo Simulation Toggle */}
            <button
              type="button"
              className="ow-btn-ghost"
              onClick={handleToggleDemoMode}
              style={{
                padding: '8px 14px',
                fontSize: 11,
                borderRadius: 9999,
                color: isDemoMode ? '#fbbf24' : '#64748b',
                borderColor: isDemoMode ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                background: isDemoMode ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
              }}
            >
              <Sparkles size={12} style={{ marginRight: 5 }} />
              <span>{isDemoMode ? 'Exit Demo Preview' : 'Preview Demo Data'}</span>
            </button>
          </div>

          {/* Dynamic Quick Targets Row */}
          <div className="ow-quick-targets-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Targets:
            </span>
            {quickTargets.length === 0 ? (
              <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                None saved yet. Search a player and click "+ Quick Target" to pin them here.
              </span>
            ) : (
              quickTargets.map(t => (
                <div
                  key={`${t.name}-${t.id}`}
                  className={`ow-quick-target-chip ${targetDossier?.playerName === t.name ? 'selected' : ''}`}
                  onClick={() => {
                    setSearchQuery(t.name);
                    loadPlayerIntelligence(t.name, t.id);
                  }}
                >
                  <span>{t.name} {t.tag ? `[${t.tag}]` : ''}</span>
                  <span
                    className="ow-quick-target-chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQuickTarget(t.name, t.id);
                    }}
                    title="Remove from quick targets"
                  >
                    ×
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. RECON STATUS BANNER OR EMPTY PROMPT */}
      {!targetDossier ? (
        <div className="ow-recon-notice-card" style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            className="ow-recon-notice-icon"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0, 242, 255, 0.08)',
              border: '1px solid rgba(0, 242, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Search size={22} style={{ color: '#00f2ff' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
            No Target Selected
          </div>
          <p style={{ margin: '6px 0 16px 0', fontSize: 12, color: '#94a3b8', maxWidth: 480, lineHeight: 1.6 }}>
            Search for an enemy player above or select from your Quick Targets to view their 7-day activity heatmap, sleep schedules, and calculate precision fleet strikes.
          </p>
          <button
            type="button"
            className="ow-btn-ghost"
            onClick={handleToggleDemoMode}
            style={{
              padding: '6px 14px',
              fontSize: 11,
              borderRadius: 9999,
              color: '#fbbf24',
              borderColor: 'rgba(251, 191, 36, 0.4)',
              background: 'rgba(251, 191, 36, 0.08)',
            }}
          >
            <Sparkles size={12} style={{ marginRight: 6 }} />
            <span>Preview Demo Heatmap</span>
          </button>
        </div>
      ) : (
        <>
          {/* RECON STATUS BANNER (When No Real Scans Exist Yet for Target) */}
          {!hasSurveillanceData && (
            <div className="ow-recon-notice-card">
              <div className="ow-recon-notice-icon">
                <Radio size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  No Activity Data Recorded Yet for {targetDossier.playerName}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>
                  No galaxy scans have been recorded for this player yet. Data is collected automatically whenever you or an alliance member views their solar systems in Galaxy View. You can also click <strong>"Preview Demo Data"</strong> above to see how this chart looks when active.
                </p>
              </div>
            </div>
          )}

          {/* 3. ACTIVITY HEATMAP (DUAL MODE: 7-DAY MATRIX DEFAULT OR COMPACT 24H) */}
          <div className="ow-double-bezel-outer">
            <div className="ow-double-bezel-inner">
              <div className="ow-matrix-controls-bar">
                <div>
                  <div className="ow-eyebrow" style={{ color: '#00f2ff' }}>
                    ACTIVITY HEATMAP // {viewMode === 'weekly' ? '7-DAY MATRIX' : '24-HOUR PROFILE'}
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {viewMode === 'weekly' ? 'Weekly Activity Matrix (7 Days × 24h)' : '24-Hour Activity Profile'}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>View:</span>
                    <div className="ow-matrix-toggle-group">
                      <button
                        className={`ow-matrix-toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                        onClick={() => setViewMode('weekly')}
                      >
                        <LayoutGrid size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                        7-Day Matrix
                      </button>
                      <button
                        className={`ow-matrix-toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
                        onClick={() => setViewMode('daily')}
                      >
                        <BarChart2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                        24h Profile
                      </button>
                    </div>
                  </div>

                  {/* Timezone Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TZ:</span>
                    <div className="ow-matrix-toggle-group">
                      <button
                        className={`ow-matrix-toggle-btn ${timezone === 'server' ? 'active' : ''}`}
                        onClick={() => setTimezone('server')}
                      >
                        Server (CET)
                      </button>
                      <button
                        className={`ow-matrix-toggle-btn ${timezone === 'local' ? 'active' : ''}`}
                        onClick={() => setTimezone('local')}
                      >
                        Local
                      </button>
                      <button
                        className={`ow-matrix-toggle-btn ${timezone === 'utc' ? 'active' : ''}`}
                        onClick={() => setTimezone('utc')}
                      >
                        UTC
                      </button>
                    </div>
                  </div>

                  {/* Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Filter:</span>
                    <div className="ow-matrix-toggle-group">
                      <button
                        className={`ow-matrix-toggle-btn ${targetFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setTargetFilter('all')}
                      >
                        All
                      </button>
                      <button
                        className={`ow-matrix-toggle-btn ${targetFilter === 'moon' ? 'active' : ''}`}
                        onClick={() => setTargetFilter('moon')}
                      >
                        Moons
                      </button>
                      <button
                        className={`ow-matrix-toggle-btn ${targetFilter === 'planet' ? 'active' : ''}`}
                        onClick={() => setTargetFilter('planet')}
                      >
                        Planets
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIEW MODE A: 7-DAY MATRIX (DEFAULT) */}
              {viewMode === 'weekly' && (
                <div className="ow-heatmap-grid-wrapper">
                  <div className="ow-heatmap-grid-container">
                    {/* Header Row */}
                    <div className="ow-heatmap-grid-row">
                      <div className="ow-heatmap-grid-header"></div>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="ow-heatmap-grid-header">
                          {String(h).padStart(2, '0')}h
                        </div>
                      ))}
                      <div className="ow-heatmap-grid-header" style={{ color: '#00f2ff' }}>Avg</div>
                    </div>

                    {/* 7 Day Rows */}
                    {matrixData.map(day => (
                      <div key={day.dayIndex} className="ow-heatmap-grid-row">
                        <div className="ow-heatmap-grid-label">{day.label}</div>
                        {day.hours.map(cell => {
                          const style = getCellBackground(cell.probability, cell.isSleep, cell.isUnknown);
                          return (
                            <div
                              key={cell.displayHour}
                              className={`ow-heatmap-grid-cell ${cell.isSleep ? 'sleep-window' : ''}`}
                              style={{
                                background: style.bg,
                                borderColor: style.border,
                                color: style.textColor,
                              }}
                              onMouseEnter={() =>
                                setHoveredCell({
                                  dayName: day.full,
                                  ...cell,
                                })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {cell.isUnknown ? '?' : cell.isSleep ? '☾' : `${Math.round(cell.probability * 100)}%`}
                            </div>
                          );
                        })}
                        {/* Day Average Summary Column */}
                        <div
                          className="ow-heatmap-grid-cell"
                          style={{
                            fontWeight: 700,
                            background: day.dayTotalScans > 0 ? 'rgba(0, 242, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                            color: day.dayTotalScans > 0 ? '#00f2ff' : '#475569',
                            borderColor: day.dayTotalScans > 0 ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {day.dayTotalScans > 0 ? `${Math.round(day.dayAverageProb * 100)}%` : '?'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW MODE B: 24-HOUR PROFILE */}
              {viewMode === 'daily' && (
                <div className="ow-heatmap-hourly-view">
                  <div className="ow-hourly-card-grid">
                    {horizonProfileData.map(h => {
                      const style = getCellBackground(h.probability, h.isSleep, h.isUnknown);
                      return (
                        <div
                          key={h.displayHour}
                          className={`ow-hourly-hour-card ${h.isSleep ? 'sleep-window' : ''}`}
                          style={{
                            background: style.bg,
                            borderColor: style.border,
                          }}
                          onMouseEnter={() => setHoveredCell({ dayName: 'Overall 24h Average', ...h })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="ow-hourly-card-time">
                            {String(h.displayHour).padStart(2, '0')}:00
                          </div>
                          <div className="ow-hourly-card-prob" style={{ color: style.textColor }}>
                            {h.isUnknown ? '?' : `${Math.round(h.probability * 100)}%`}
                          </div>
                          <div className="ow-hourly-card-scans">
                            {h.isUnknown ? 'No Data' : `${h.activePings + h.idleChecks} scans`}
                          </div>
                          {h.isSleep && (
                            <div className="ow-hourly-card-tag">SLEEP</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cell Inspection Detail Strip (Hover Info) */}
              <div className="ow-heatmap-detail-bar">
                {hoveredCell ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', width: '100%', fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} style={{ color: '#00f2ff' }} />
                      <strong style={{ color: '#fff' }}>
                        {hoveredCell.dayName ? `${hoveredCell.dayName} ` : ''}
                        {String(hoveredCell.displayHour).padStart(2, '0')}:00 - {String((hoveredCell.displayHour + 1) % 24).padStart(2, '0')}:00 {tzLabel}
                      </strong>
                      <span style={{ color: '#64748b' }}>({String(hoveredCell.utcHour).padStart(2, '0')}:00 UTC)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#94a3b8' }}>Activity Probability:</span>
                      <strong style={{ color: hoveredCell.isUnknown ? '#94a3b8' : hoveredCell.probability > 0.6 ? '#f43f5e' : hoveredCell.probability > 0.25 ? '#38bdf8' : '#34d399' }}>
                        {hoveredCell.isUnknown ? 'Unknown (No scans recorded yet)' : `${Math.round(hoveredCell.probability * 100)}% Activity Chance`}
                      </strong>
                    </div>

                    {!hoveredCell.isUnknown && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                        <span>Active: <strong style={{ color: '#38bdf8' }}>{hoveredCell.activePings}</strong></span>
                        <span>Idle Checks: <strong style={{ color: '#64748b' }}>{hoveredCell.idleChecks}</strong></span>
                        {hoveredCell.moonPings > 0 && (
                          <span>Moon: <strong style={{ color: '#c084fc' }}>{hoveredCell.moonPings}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#64748b', fontSize: 11 }}>
                    {hasSurveillanceData
                      ? 'Hover over any hourly cell in the matrix to view detailed scan counts, moon observations, and exact probability calculations.'
                      : 'No galaxy scans recorded for this player yet. Viewing their solar systems in Galaxy View will record activity.'}
                  </span>
                )}
              </div>

              {/* Legend Strip - Horizontal Flex Row */}
              <div className="ow-matrix-legend">
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(2, 6, 18, 0.4)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}>?</div>
                  <span>No Data</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(2, 6, 18, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>0%</div>
                  <span>0% Idle</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(8, 47, 73, 0.75)', border: '1px solid rgba(14, 165, 233, 0.4)' }}></div>
                  <span>1-25% Low</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(13, 148, 136, 0.75)', border: '1px solid rgba(20, 184, 166, 0.4)' }}></div>
                  <span>26-60% Moderate</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(180, 83, 9, 0.8)', border: '1px solid rgba(245, 158, 11, 0.5)' }}></div>
                  <span>61-85% High</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(190, 18, 60, 0.9)', border: '1px solid rgba(244, 63, 94, 0.7)' }}></div>
                  <span>&gt;85% Peak</span>
                </div>
                <div className="ow-legend-item">
                  <div className="ow-legend-swatch" style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.5)', color: '#34d399' }}>☾</div>
                  <span>Sleep Window</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM DUAL PANELS: ATTACK PLANNER & LIVE SURVEILLANCE FEED */}
          <div className="ow-heatmap-bottom-grid">
            {/* Strike Planner */}
            <div className="ow-double-bezel-outer">
              <div className="ow-double-bezel-inner">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="ow-eyebrow" style={{ color: '#4ade80' }}>
                      ATTACK PLANNER // FLIGHT TIMES
                    </div>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                      Flight Time & Attack Planner
                    </h3>
                  </div>
                  <div className="ow-btn-island-icon" style={{ borderColor: 'rgba(74, 222, 128, 0.4)', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
                    <Rocket size={15} />
                  </div>
                </div>

                <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  Calculate your fleet flight time and compare it with {targetDossier.playerName}'s sleep hours to find the best launch time.
                </p>

                <div className="ow-strike-planner-grid">
                  {/* Origin Colony (Attacker Planets & Moons - Scrap Merchant Style) */}
                  <div ref={baseDropdownRef} style={{ position: 'relative' }}>
                    <label className="ow-strike-field-label">
                      <span>Launch Base</span>
                    </label>
                    {userBases && userBases.length > 0 ? (
                      <div className={`ow-base-dropdown-container ${isBaseDropdownOpen ? 'open' : ''}`}>
                        <div
                          className="ow-base-dropdown-trigger"
                          onClick={() => setIsBaseDropdownOpen(!isBaseDropdownOpen)}
                        >
                          {activeBase ? (
                            <>
                              <img
                                src={getBaseIcon(activeBase)}
                                className="ow-base-dropdown-thumb"
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    activeBase.type === 'moon' ? '/icons/overwatch/moon.jpg' : '/icons/overwatch/planet-slot-1.png';
                                }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <span style={{ color: activeBase.type === 'moon' ? '#c084fc' : '#ff9800', fontWeight: 700, fontSize: 12 }}>
                                  {activeBase.name || (activeBase.type === 'moon' ? 'Moon' : 'Planet')}
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                                  [{activeBase.coords.replace(/[\[\]]/g, '').trim()}]
                                </span>
                              </div>
                              <span className={activeBase.type === 'moon' ? 'ow-base-badge-moon' : 'ow-base-badge-planet'}>
                                {activeBase.type === 'moon' ? 'Moon' : 'Planet'}
                              </span>
                            </>
                          ) : (
                            <span style={{ opacity: 0.5 }}>Select launch base...</span>
                          )}
                          <ChevronDown size={14} style={{ marginLeft: 6, opacity: 0.6, flexShrink: 0 }} />
                        </div>

                        {isBaseDropdownOpen && (
                          <div className="ow-base-dropdown-options">
                            {userBases.map(b => {
                              const isSelected = b.id === selectedOriginId;
                              const cleanCoords = b.coords.replace(/[\[\]]/g, '').trim();
                              return (
                                <div
                                  key={b.id}
                                  className={`ow-base-dropdown-option ${isSelected ? 'selected' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBaseSelect(b.id);
                                  }}
                                >
                                  <img
                                    src={getBaseIcon(b)}
                                    className="ow-base-dropdown-thumb"
                                    style={{ width: 28, height: 28 }}
                                    alt=""
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        b.type === 'moon' ? '/icons/overwatch/moon.jpg' : '/icons/overwatch/planet-slot-1.png';
                                    }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                                      {b.name || (b.type === 'moon' ? 'Moon' : 'Planet')}
                                    </span>
                                    <span style={{ fontSize: 10.5, color: '#94a3b8' }}>
                                      [{cleanCoords}]
                                    </span>
                                  </div>
                                  <span className={b.type === 'moon' ? 'ow-base-badge-moon' : 'ow-base-badge-planet'}>
                                    {b.type === 'moon' ? 'Moon' : 'Planet'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="ow-strike-input"
                        value={originCoord}
                        onChange={e => setOriginCoord(e.target.value)}
                        placeholder="1:100:4"
                      />
                    )}
                  </div>

                  {/* Destination Target */}
                  <div>
                    <label className="ow-strike-field-label">
                      <span>Target Coordinate</span>
                    </label>
                    {targetDossier.planets && targetDossier.planets.length > 0 ? (
                      <select
                        className="ow-strike-select"
                        value={destCoord}
                        onChange={e => {
                          setDestCoord(e.target.value);
                          const matching = targetDossier.planets.find(
                            p => `${p.galaxy}:${p.system}:${p.slot}` === e.target.value
                          );
                          if (matching) setIsDestMoon(matching.has_moon === 1);
                        }}
                      >
                        {targetDossier.planets.map((p, idx) => {
                          const coordStr = `${p.galaxy}:${p.system}:${p.slot}`;
                          const icon = p.has_moon === 1 ? '🌙' : '🪐';
                          const typeStr = p.has_moon === 1 ? '(Moon)' : '(Planet)';
                          return (
                            <option key={`${coordStr}-${idx}`} value={coordStr}>
                              {icon} [{coordStr}] {p.planet_name || 'Target'} {typeStr}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="ow-strike-input"
                        value={destCoord}
                        onChange={e => setDestCoord(e.target.value)}
                        placeholder="1:240:8"
                      />
                    )}
                  </div>

                  {/* Slowest Ship / True Speeds from Nexus & Lifeforms */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="ow-strike-field-label" style={{ margin: 0 }}>
                        <span>Slowest Ship in Fleet</span>
                      </label>
                      {driveLevels && driveLevels.warSpeed > 1 && (
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          {driveLevels.warSpeed}x War Fleet
                        </span>
                      )}
                    </div>
                    <select
                      className="ow-strike-select"
                      value={selectedShipIndex}
                      onChange={e => {
                        setSelectedShipIndex(parseInt(e.target.value, 10));
                        setCustomFlightMins('');
                      }}
                    >
                      {dynamicShipPresets.map((s, idx) => (
                        <option key={s.name} value={idx}>
                          {s.name} ({s.speed.toLocaleString()} speed)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Flight Duration Override */}
                  <div>
                    <label className="ow-strike-field-label">
                      <span>Custom Flight Time (Minutes)</span>
                    </label>
                    <input
                      type="number"
                      className="ow-strike-input"
                      placeholder="e.g. 120"
                      value={customFlightMins}
                      onChange={e => setCustomFlightMins(e.target.value)}
                    />
                  </div>
                </div>

                {/* Calculation Results Card */}
                <div className="ow-strike-result-card" style={{ marginTop: 16 }}>
                  <div className="ow-strike-metrics-row">
                    <div className="ow-strike-metric-item">
                      <div className="ow-strike-metric-label">One-Way Flight Time</div>
                      <div className="ow-strike-metric-value" style={{ color: '#4ade80' }}>
                        {flightCalculations.durationFormatted}
                      </div>
                    </div>
                    <div className="ow-strike-metric-item">
                      <div className="ow-strike-metric-label">Slowest Ship Speed</div>
                      <div className="ow-strike-metric-value" style={{ color: '#00f2ff' }}>
                        {(dynamicShipPresets[selectedShipIndex] || dynamicShipPresets[0]).speed.toLocaleString()}
                      </div>
                    </div>
                    <div className="ow-strike-metric-item">
                      <div className="ow-strike-metric-label">Sleep Impact Time</div>
                      <div className="ow-strike-metric-value" style={{ color: sleepWindow.hasConfirmedSleep ? '#fbbf24' : '#64748b' }}>
                        {sleepWindow.hasConfirmedSleep ? `~${flightCalculations.impactTimeStr} ${tzLabel}` : 'Awaiting Sleep Data'}
                      </div>
                    </div>
                    <div className="ow-strike-metric-item">
                      <div className="ow-strike-metric-label">Departure Window</div>
                      <div className="ow-strike-metric-value" style={{ color: '#fff' }}>
                        {sleepWindow.hasConfirmedSleep ? `${flightCalculations.windowOpen} - ${flightCalculations.windowClose}` : 'Any time (No sleep data)'}
                      </div>
                    </div>
                  </div>

                  {/* Tactical Advisory Callout */}
                  <div className={`ow-strike-advisory ${flightCalculations.advisoryType}`}>
                    <div className="ow-strike-advisory-title">
                      {flightCalculations.advisoryType === 'optimal' && <CheckCircle2 size={13} style={{ marginRight: 6 }} />}
                      {flightCalculations.advisoryType === 'warning' && <AlertTriangle size={13} style={{ marginRight: 6 }} />}
                      {flightCalculations.advisoryType === 'danger' && <Flame size={13} style={{ marginRight: 6 }} />}
                      <span>{flightCalculations.advisoryTitle}</span>
                    </div>
                    <p className="ow-strike-advisory-desc">
                      {flightCalculations.advisoryDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Recon Stream / Galaxy View Observations */}
            <div className="ow-double-bezel-outer">
              <div className="ow-double-bezel-inner">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="ow-eyebrow" style={{ color: '#c084fc' }}>
                      RECENT SCANS // GALAXY VIEW
                    </div>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                      Recent Galaxy Scans
                    </h3>
                  </div>
                  <div className="ow-btn-island-icon" style={{ borderColor: 'rgba(192, 132, 252, 0.4)', background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc' }}>
                    <Radio size={15} />
                  </div>
                </div>

                <div className="ow-obs-stream">
                  {targetDossier.observations && targetDossier.observations.length > 0 ? (
                    targetDossier.observations.map((obs, idx) => {
                      return (
                        <div key={idx} className="ow-obs-item">
                          <div className="ow-obs-left">
                            <span className={`ow-obs-badge ${obs.target_type}`}>
                              {obs.target_type.toUpperCase()}
                            </span>
                            <span style={{ fontWeight: 700, color: '#fff' }}>
                              [{obs.galaxy}:{obs.system}:{obs.slot}]
                            </span>
                            <span style={{ color: '#00f2ff', fontWeight: 600 }}>
                              Timer: {obs.activity_marker}
                            </span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11 }}>
                            Spotted {formatElapsedWdhm(obs.scanned_at)} ago by {obs.scanned_by || 'Scout'}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <CheckCircle2 size={24} style={{ color: '#00f2ff', margin: '0 auto 8px', opacity: 0.6 }} />
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                        Ready for Galaxy Scans
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11.5, marginTop: 4, maxWidth: 360, margin: '4px auto 0' }}>
                        When you or your alliance view systems in Galaxy View, target activity timers and idle checks will appear here in real time.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Habits Profile */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={13} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                    Player Habits
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Typical Bedtime</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                      {sleepWindow.hasConfirmedSleep ? `~${String(sleepWindow.startDisp).padStart(2, '0')}:00 ${tzLabel}` : 'Awaiting data'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Typical Wake-Up</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                      {sleepWindow.hasConfirmedSleep ? `~${String(sleepWindow.endDisp).padStart(2, '0')}:00 ${tzLabel}` : 'Awaiting data'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OverwatchActivityHeatmap;
