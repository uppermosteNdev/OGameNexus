import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AnomalyMission, AnomalyWaveReceipt } from '../../db';
import { getCombatPlayerAndEnemyLosses, recalculateAllAnomalyMissionLosses } from '../../utils/anomalyCombat';
import { cleanUniverseId, isSameUniverse } from '../../utils/universe';
import {
  Info,
  Sparkles,
  Swords,
  Truck,
  ShieldAlert,
  Award,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  X,
  Calendar,
  Compass,
  Zap,
  Crosshair,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
  Activity,
  Database,
  Ship,
  Star,
  BatteryCharging
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function formatNumber(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return '0';
  if (Math.abs(num) >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return Math.round(num).toLocaleString();
}

function formatDate(ts: number | undefined): string {
  if (!ts) return '-';
  const d = new Date(ts > 1_000_000_000_000 ? ts : ts * 1000);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatYAxis(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e12) return (value / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  if (absValue >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return value.toString();
}

const toLocaleDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function getMissionDate(m: AnomalyMission): Date {
  const ts = m.createdAt || m.spawnedTimestamp || Date.now();
  return new Date(ts > 1_000_000_000_000 ? ts : ts * 1000);
}

function getUniqueMissionMetrics(m: AnomalyMission) {
  let uniqueWaves: AnomalyWaveReceipt[] = [];
  if (m.waves && m.waves.length > 0) {
    const map = new Map<number, AnomalyWaveReceipt>();
    m.waves.forEach((w) => {
      const cur = map.get(w.waveNumber);
      if (!cur || (w.claimMethod === 'modal_confirmation' && cur.claimMethod !== 'modal_confirmation')) {
        map.set(w.waveNumber, w);
      }
    });
    uniqueWaves = Array.from(map.values()).sort((a, b) => a.waveNumber - b.waveNumber);
  }
  const waveGross = uniqueWaves.length > 0
    ? uniqueWaves.reduce((sum, w) => sum + (w.msuValue || 0), 0)
    : (m.totalClaimedMsu || 0);

  const debrisHarvests = m.debrisHarvests || [];
  const debrisMsu = m.totalDebrisHarvestedMsu || debrisHarvests.reduce((sum, d) => sum + (d.msuValue || 0), 0);
  const gross = waveGross + debrisMsu;

  const canonicalWaveCost = uniqueWaves.find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost ||
    (m.completionLithiumCost && uniqueWaves.length > 0 ? Math.round(m.completionLithiumCost / uniqueWaves.length) : 0) ||
    (m.totalLithiumBudget && (m.totalWaves || uniqueWaves.length) ? Math.round(m.totalLithiumBudget / (m.totalWaves || uniqueWaves.length)) : 0);

  const wavesLithium = uniqueWaves.length > 0
    ? uniqueWaves.reduce((sum, w) => {
        const cost = (w.lithiumCost && w.lithiumCost >= 1000)
          ? w.lithiumCost
          : (canonicalWaveCost > 0 ? canonicalWaveCost : (w.lithiumCost || 0));
        return sum + cost;
      }, 0)
    : (m.totalClaimedLithium || 0);
  const completionLithium = m.completionLithiumCost || m.totalClaimedLithium || 0;
  const lithium = (completionLithium > 0 && completionLithium > wavesLithium)
    ? completionLithium
    : wavesLithium;
  const losses = m.fleetLossesMsu || 0;
  const net = gross - losses;
  const yieldRatio = lithium > 0 ? gross / lithium : 0;

  const artifacts = uniqueWaves.length > 0
    ? uniqueWaves.reduce((sum, w) => sum + (w.artifacts || 0), 0)
    : (m.cumulativeRewards?.artifacts || 0);

  const lifeformXp = uniqueWaves.length > 0
    ? uniqueWaves.reduce((sum, w) => sum + (w.lifeformXp || 0), 0)
    : (m.cumulativeRewards?.lifeformXp || 0);

  return {
    uniqueWaves,
    waveGross,
    debrisHarvests,
    debrisMsu,
    gross,
    lithium,
    losses,
    net,
    yieldRatio,
    artifacts,
    lifeformXp,
    canonicalWaveCost
  };
}

function getLevelBadgeStyle(level: number): { color: string; background: string; border: string; textShadow: string } {
  const lvl = Math.max(1, Math.min(1000, level || 1));
  const interpolate = (c1: [number, number, number], c2: [number, number, number], factor: number): [number, number, number] => [
    Math.round(c1[0] + (c2[0] - c1[0]) * factor),
    Math.round(c1[1] + (c2[1] - c1[1]) * factor),
    Math.round(c1[2] + (c2[2] - c1[2]) * factor),
  ];

  const GRAY: [number, number, number] = [148, 163, 184];   // #94a3b8
  const BLUE: [number, number, number] = [56, 189, 248];    // #38bdf8
  const YELLOW: [number, number, number] = [250, 204, 21];  // #facc15
  const ORANGE: [number, number, number] = [249, 115, 22];  // #f97316
  const PINK: [number, number, number] = [244, 63, 94];     // #f43f5e

  let rgb: [number, number, number];
  if (lvl <= 250) {
    rgb = interpolate(GRAY, BLUE, (lvl - 1) / 249);
  } else if (lvl <= 500) {
    rgb = interpolate(BLUE, YELLOW, (lvl - 250) / 250);
  } else if (lvl <= 750) {
    rgb = interpolate(YELLOW, ORANGE, (lvl - 500) / 250);
  } else {
    rgb = interpolate(ORANGE, PINK, (lvl - 750) / 250);
  }

  const [r, g, b] = rgb;
  return {
    color: `rgb(${r}, ${g}, ${b})`,
    background: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.38)`,
    textShadow: `0 0 8px rgba(${r}, ${g}, ${b}, 0.3)`
  };
}

// --- Custom Recharts Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const regularPayload = payload.filter((entry: any) => entry.dataKey !== 'msu');
    const total = regularPayload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
    const msuEntry = payload.find((entry: any) => entry.dataKey === 'msu');

    return (
      <div
        className="glass"
        style={{
          padding: '12px 14px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          background: 'rgba(8, 14, 24, 0.96)',
          borderRadius: '8px',
          minWidth: '200px',
          pointerEvents: 'none'
        }}
      >
        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: entry.color || entry.fill }} />
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>{entry.name}</span>
              </div>
              <span style={{ fontWeight: 700, color: '#fff' }}>
                {entry.dataKey === 'yield' || (entry.name && String(entry.name).toLowerCase().includes('yield'))
                  ? `${Number(entry.value).toFixed(1)}x`
                  : Math.round(Number(entry.value) || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {regularPayload.length > 1 && !msuEntry && (
          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total</span>
            <span style={{ color: '#fff' }}>{Math.round(total).toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// --- Constants ---
const OVERVIEW_CATEGORIES = [
  { id: 'pvp_combat', label: 'PvP Combat', color: '#f43f5e' },
  { id: 'pve_combat', label: 'PvE Combat', color: '#38bdf8' },
  { id: 'pvp_delivery', label: 'PvP Delivery', color: '#f97316' },
  { id: 'pve_delivery', label: 'PvE Delivery', color: '#10b981' }
] as const;

const RESOURCE_SERIES = [
  { id: 'metal', label: 'Metal', color: '#E6953C' },
  { id: 'crystal', label: 'Crystal', color: '#4CAEE6' },
  { id: 'deuterium', label: 'Deuterium', color: '#43D159' },
  { id: 'msu', label: 'Resource Units (MSU)', color: '#38bdf8', isDashed: true }
] as const;

const SHIP_COLORS: Record<string, string> = {
  'Light Fighter': '#38bdf8',
  'Heavy Fighter': '#0284c7',
  'Cruiser': '#818cf8',
  'Battleship': '#6366f1',
  'Battlecruiser': '#a855f7',
  'Bomber': '#ec4899',
  'Destroyer': '#f43f5e',
  'Deathstar': '#e11d48',
  'Reaper': '#fb923c',
  'Pathfinder': '#facc15',
  'Small Cargo': '#4ade80',
  'Large Cargo': '#22c55e',
  'Colony Ship': '#14b8a6',
  'Recycler': '#06b6d4',
  'Espionage Probe': '#94a3b8',
};

const DEFAULT_SHIP_COLORS = [
  '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e',
  '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#06b6d4',
  '#e2e8f0', '#94a3b8', '#64748b'
];

function getShipColor(shipName: string, index: number): string {
  if (SHIP_COLORS[shipName]) return SHIP_COLORS[shipName];
  return DEFAULT_SHIP_COLORS[index % DEFAULT_SHIP_COLORS.length];
}

type AnomalyTabId = 'info' | 'overview' | 'resources' | 'ships' | 'lifeform_xp' | 'artifacts' | 'lithium' | 'lithium_yield';

const ANOMALY_TABS: { id: AnomalyTabId; label: string; icon: any }[] = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'resources', label: 'Resources', icon: Database },
  { id: 'ships', label: 'Ships', icon: Ship },
  { id: 'lifeform_xp', label: 'Lifeform XP', icon: Zap },
  { id: 'artifacts', label: 'Artifacts', icon: Star },
  { id: 'lithium', label: 'Lithium', icon: BatteryCharging },
  { id: 'lithium_yield', label: 'Lithium Yield', icon: TrendingUp }
];

interface AnomalyBuildingMeta {
  id: number;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  type: 'facility' | 'bonus';
  getEffect: (level: number) => string;
  description: string;
}

const ANOMALY_BUILDINGS: AnomalyBuildingMeta[] = [
  // Line 1: IAS levels, bonus for metal, bonus for crystal, bonus for deuterium
  {
    id: 45,
    name: 'Interstellar Anomaly Scanner',
    shortName: 'Scanner',
    icon: '/icons/facilities/interstellar_anomaly_scanner_large.jpg',
    color: '#00f2ff',
    type: 'facility',
    getEffect: (lvl) => `Level ${lvl} (Produces Lithium)`,
    description: 'Finds anomalies and produces Lithium on the planet.'
  },
  {
    id: 4003,
    name: 'Metal Recycling Unit',
    shortName: 'Metal',
    icon: '/icons/facilities/metal_recycling_unit_large.jpg',
    color: '#f97316',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% Metal found`,
    description: 'Increases the Metal you find on anomaly missions (+0.2% per level).'
  },
  {
    id: 4004,
    name: 'Crystal Finishing Station',
    shortName: 'Crystal',
    icon: '/icons/facilities/crystal_finishing_station_large.jpg',
    color: '#38bdf8',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% Crystal found`,
    description: 'Increases the Crystal you find on anomaly missions (+0.2% per level).'
  },
  {
    id: 4006,
    name: 'High-Pressure Deut Tanks',
    shortName: 'Deuterium',
    icon: '/icons/facilities/high-pressure_deuterium_tanks_large.jpg',
    color: '#22c55e',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% Deut found`,
    description: 'Increases the Deuterium you find on anomaly missions (+0.2% per level).'
  },

  // Line 2: bonus for Lithium, bonus for Ships, bonus for species XP & Artefacts, bonus for Resource Transformation Costs (Catalytic Convertor)
  {
    id: 4002,
    name: 'Lithium Electrolysis Lab',
    shortName: 'Lithium',
    icon: '/icons/facilities/lithium_electrolysis_lab_large.jpg',
    color: '#06b6d4',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% Lithium gathered`,
    description: 'Increases the amount of Lithium gathered from anomaly missions (+0.2% per level).'
  },
  {
    id: 4001,
    name: 'Intergalactic Recovery Centre',
    shortName: 'Ships',
    icon: '/icons/facilities/intergalactic_recovery_centre_large.jpg',
    color: '#facc15',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% Ships found`,
    description: 'Increases the ships you find on anomaly missions (+0.2% per level).'
  },
  {
    id: 4005,
    name: 'Anomaly Analysis Centre',
    shortName: 'XP & Artefacts',
    icon: '/icons/facilities/anomaly_analysis_centre_large.jpg',
    color: '#a855f7',
    type: 'bonus',
    getEffect: (lvl) => `+${(lvl * 0.2).toFixed(1)}% XP & Artefacts`,
    description: 'Increases Lifeform XP and Artifacts found on anomaly missions (+0.2% per level).'
  },
  {
    id: 4007,
    name: 'Catalytic Convertor',
    shortName: 'Transformation Costs',
    icon: '/icons/facilities/catalytic_convertor_large.jpg',
    color: '#f59e0b',
    type: 'bonus',
    getEffect: (lvl) => `-${(lvl * 0.05).toFixed(2)}% Conversion cost`,
    description: 'Reduces the resource cost when converting Lithium into other resources (-0.05% per level).'
  }
];

const getPlanetAnomalyLevel = (planet: any, techId: number): number => {
  if (techId === 45) {
    if (typeof planet.iaScanner === 'number') return planet.iaScanner;
    const fac = planet.facilities?.find((f: any) => f.id === 45);
    if (fac && typeof fac.level === 'number') return fac.level;
    const b = planet.buildings;
    if (b) {
      if (typeof b['45'] === 'number') return b['45'];
      if (typeof b['45']?.level === 'number') return b['45'].level;
    }
    return 0;
  }
  const cc = planet.controlCenterBuildings?.find((b: any) => b.id === techId);
  if (cc && typeof cc.level === 'number') return cc.level;
  const b = planet.buildings;
  if (b) {
    const key = String(techId);
    if (typeof b[key] === 'number') return b[key];
    if (typeof b[key]?.level === 'number') return b[key].level;
  }
  return 0;
};

const getLfColor = (lfId?: number) => {
  if (!lfId) return 'rgba(255,255,255,0.2)';
  switch (lfId) {
    case 1: return '#3b82f6'; // Humans
    case 2: return '#eab308'; // Rock'tal
    case 3: return '#a855f7'; // Mechas
    case 4: return '#06b6d4'; // Kaelesh
    default: return '#00f2ff';
  }
};

const getLfIcon = (lfId?: number) => {
  if (!lfId) return '';
  const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
  return `/icons/lifeforms/${lfNames[lfId - 1]}-icon-large.jpg`;
};


const AnomalyResourcePill: React.FC<{
  type: 'metal' | 'crystal' | 'deuterium';
  amount: number;
}> = ({ type, amount }) => {
  if (!amount || amount <= 0) return null;

  const config = {
    metal: {
      icon: '/icons/resources/metal-icon-medium.jpg',
      label: 'Metal',
      color: '#fdba74',
      bg: 'rgba(249, 115, 22, 0.08)',
      border: 'rgba(249, 115, 22, 0.22)',
    },
    crystal: {
      icon: '/icons/resources/crystal-icon-medium.jpg',
      label: 'Crystal',
      color: '#7dd3fc',
      bg: 'rgba(56, 189, 248, 0.08)',
      border: 'rgba(56, 189, 248, 0.22)',
    },
    deuterium: {
      icon: '/icons/resources/deuterium-icon-medium.jpg',
      label: 'Deuterium',
      color: '#5eead4',
      bg: 'rgba(45, 212, 191, 0.08)',
      border: 'rgba(45, 212, 191, 0.22)',
    },
  }[type];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '6px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        fontSize: '0.78rem',
        fontWeight: 600,
        color: config.color,
        fontVariantNumeric: 'tabular-nums',
      }}
      title={`${config.label}: ${amount.toLocaleString()}`}
    >
      <img
        src={config.icon}
        alt={config.label}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '3px',
          objectFit: 'cover',
          display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
      <span>{amount.toLocaleString()}</span>
    </div>
  );
};

const AnomalyShipPill: React.FC<{
  name: string;
  count: number;
  hideName?: boolean;
  prefix?: string;
}> = ({ name, count, hideName, prefix }) => {
  if (!count || count <= 0) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const iconUrl = `/icons/ships/${slug}-large.jpg`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 7px',
        borderRadius: '5px',
        background: prefix === '-' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(250, 204, 21, 0.08)',
        border: `1px solid ${prefix === '-' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(250, 204, 21, 0.22)'}`,
        fontSize: '0.78rem',
        fontWeight: 700,
        color: prefix === '-' ? '#fda4af' : '#fef08a',
        fontVariantNumeric: 'tabular-nums',
      }}
      title={`${prefix || ''}${count.toLocaleString()}x ${name}`}
    >
      <img
        src={iconUrl}
        alt={name}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/icons/misc/expedition-ships-icon-medium.png';
        }}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '3px',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <span>{prefix || ''}{count.toLocaleString()}{hideName ? '' : ` ${name}`}</span>
    </div>
  );
};

export default function Anomalies(): React.JSX.Element {
  // 1. Resolve active account (checking URL parameters, localStorage, and lastSeen)
  const activeAccount = useLiveQuery(
    async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const qPid = params.get('player') || params.get('playerId');
        const qUni = params.get('universe') || params.get('uni');
        if (qPid) {
          const acc = await db.accounts.get(String(qPid));
          if (acc) return acc;
        }
        if (qUni) {
          const accs = await db.accounts.toArray();
          const found = accs.find(a => isSameUniverse(a.universe, qUni));
          if (found) return found;
        }
        const savedPid = localStorage.getItem('ognexus_active_player_id');
        const savedUni = localStorage.getItem('ognexus_active_universe');
        if (savedPid) {
          const acc = await db.accounts.get(String(savedPid));
          if (acc) return acc;
        }
        if (savedUni) {
          const accs = await db.accounts.toArray();
          const found = accs.find(a => isSameUniverse(a.universe, savedUni));
          if (found) return found;
        }
        return await db.accounts.orderBy('lastSeen').reverse().first();
      } catch {
        return await db.accounts.toCollection().last();
      }
    },
    []
  );

  const allMissions = useLiveQuery(
    () => db.anomalyMissions.orderBy('createdAt').reverse().toArray(),
    []
  ) ?? [];

  const planets = useLiveQuery(
    () => db.planets.toArray(),
    []
  ) ?? [];

  const accounts = useLiveQuery(
    () => db.accounts.toArray(),
    []
  ) ?? [];



  const userPlanets = useMemo(() => {
    const list = planets.filter(p => {
      if (activeAccount && p.playerId && String(p.playerId) !== String(activeAccount.playerId)) {
        return false;
      }
      return p.type === 'planet';
    });
    return list.sort((a, b) => {
      const [gA, sA, pA] = (a.coords || '0:0:0').split(':').map(Number);
      const [gB, sB, pB] = (b.coords || '0:0:0').split(':').map(Number);
      if (gA !== gB) return (gA || 0) - (gB || 0);
      if (sA !== sB) return (sA || 0) - (sB || 0);
      return (pA || 0) - (pB || 0);
    });
  }, [planets, activeAccount]);

  // Strictly filter anomaly missions to the active account: never spill across players/universes
  const missions = useMemo(() => {
    if (!activeAccount) return [];
    const activePid = String(activeAccount.playerId || '').trim();
    const activeUni = activeAccount.universe ? cleanUniverseId(activeAccount.universe) : '';

    return allMissions.filter(m => {
      const mPid = m.playerId ? String(m.playerId).trim() : '';
      const mUni = m.universe ? cleanUniverseId(m.universe) : '';

      // 1. Strict Player ID match if mission has a valid playerId
      if (mPid && mPid !== 'unknown') {
        if (mPid !== activePid) return false;
      }

      // 2. Universe match if mission has universe
      if (mUni && activeUni) {
        if (!isSameUniverse(mUni, activeUni)) return false;
      }

      // 3. Fallback origin coords match if mission playerId/universe was missing or unknown
      if (!mPid || mPid === 'unknown' || !mUni) {
        if (m.originCoords) {
          const cleanOrigin = m.originCoords.replace(/[\[\]]/g, '').trim();
          const planetBelongsToActive = userPlanets.some(p => {
            const pCoords = (p.coords || '').replace(/[\[\]]/g, '').trim();
            return pCoords === cleanOrigin;
          });
          if (!planetBelongsToActive) return false;
        } else {
          // If no origin coords and no matching playerId/universe, never leak to active account
          return false;
        }
      }

      return true;
    });
  }, [allMissions, activeAccount, userPlanets]);

  // Filters
  const [filterCategory, setFilterCategory] = useState<'all' | 'combat' | 'delivery'>('all');
  const [filterEnvironment, setFilterEnvironment] = useState<'all' | 'pvp' | 'pve'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMission, setSelectedMission] = useState<AnomalyMission | null>(null);

  // Clear selected mission when switching active account
  useEffect(() => {
    if (selectedMission && !missions.some(m => m.id === selectedMission.id)) {
      setSelectedMission(null);
    }
  }, [activeAccount?.playerId, activeAccount?.universe, missions, selectedMission]);

    // Close mission modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMission(null);
      }
    };
    if (selectedMission) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedMission]);

  const activeSelectedMission = useMemo(() => {
    if (!selectedMission) return null;
    return missions.find(m => m.id === selectedMission.id) || selectedMission;
  }, [missions, selectedMission]);

  const linkedCombats = useLiveQuery(async () => {
    if (!activeSelectedMission?.combatReportIds || activeSelectedMission.combatReportIds.length === 0) return [];
    return await db.combatReports.bulkGet(activeSelectedMission.combatReportIds);
  }, [activeSelectedMission?.id, activeSelectedMission?.combatReportIds]) ?? [];

  const currentAccount = useMemo(() => {
    if (activeSelectedMission?.playerId) {
      const match = accounts.find(a => String(a.playerId) === String(activeSelectedMission.playerId));
      if (match) return match;
    }
    return activeAccount || accounts[0];
  }, [accounts, activeSelectedMission, activeAccount]);

  const [activeGraphTab, setActiveGraphTab] = useState<AnomalyTabId>('info');
  const [lithiumSubTab, setLithiumSubTab] = useState<'spent' | 'yield'>('spent');

  const [hoveredBuilding, setHoveredBuilding] = useState<{
    building: AnomalyBuildingMeta;
    level: number;
    planet: any;
    rect: DOMRect | null;
  } | null>(null);

  const empireTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    ANOMALY_BUILDINGS.forEach(b => {
      totals[b.id] = userPlanets.reduce((sum, p) => sum + getPlanetAnomalyLevel(p, b.id), 0);
    });
    return totals;
  }, [userPlanets]);

  // Series Visibility Sets for Toggles
  const [visibleOverview, setVisibleOverview] = useState<Set<string>>(
    new Set(OVERVIEW_CATEGORIES.map(c => c.id))
  );
  const [visibleResources, setVisibleResources] = useState<Set<string>>(
    new Set(RESOURCE_SERIES.map(r => r.id))
  );
  const [visibleShips, setVisibleShips] = useState<Set<string>>(new Set());

  // Auto-repair existing legacy/corrupted anomaly mission records in Dexie
  useEffect(() => {
    (async () => {
      try {
                await recalculateAllAnomalyMissionLosses();
        const all = await db.anomalyMissions.toArray();
        const allPlanets = await db.planets.toArray();
        const allAccounts = await db.accounts.toArray();
        for (const m of all) {
          let needsUpdate = false;
          let category = m.category;
          let environment = m.environment;
          let totalWaves = m.totalWaves;
          let currentWave = m.currentWave;
          let playerId = m.playerId;
          let universe = m.universe;

          // Heal missing or unknown playerId or universe using origin coords matched against user planets
          if (!playerId || playerId === 'unknown' || !universe) {
            const cleanOrigin = m.originCoords ? m.originCoords.replace(/[\[\]]/g, '').trim() : '';
            if (cleanOrigin) {
              const matchedPlanet = allPlanets.find(p => (p.coords || '').replace(/[\[\]]/g, '').trim() === cleanOrigin);
              if (matchedPlanet) {
                if ((!playerId || playerId === 'unknown') && matchedPlanet.playerId) {
                  playerId = String(matchedPlanet.playerId);
                  needsUpdate = true;
                }
                const matchedAcc = allAccounts.find(a => String(a.playerId) === String(matchedPlanet.playerId));
                if (!universe && matchedAcc?.universe) {
                  universe = matchedAcc.universe;
                  needsUpdate = true;
                }
              }
            }
          }

          const isCombat = category === 'combat' ||
                           (m.fleetLossesMsu || 0) > 0 ||
                           (m.combatReportIds && m.combatReportIds.length > 0) ||
                           m.name?.toLowerCase().includes('rescue') ||
                           m.name?.toLowerCase().includes('combat') ||
                           m.name?.toLowerCase().includes('resource:');
          if (isCombat && category !== 'combat') {
            category = 'combat';
            needsUpdate = true;
          }

          if (m.name?.toLowerCase().includes('rescue') && environment !== 'pve') {
            environment = 'pve';
            needsUpdate = true;
          }

          const derivedTotal = Math.max(
            totalWaves || 1,
            m.waves?.length || 1,
            m.combatReportIds?.length || 1
          );
          if (derivedTotal > totalWaves) {
            totalWaves = derivedTotal;
            needsUpdate = true;
          }

          let status = m.status;
          const nowSec = Math.floor(Date.now() / 1000);
          if (status === 'in_progress') {
            const isPastDespawn = m.despawnTimestamp ? nowSec >= m.despawnTimestamp : false;
            const isAllWavesCollected = (m.waves && totalWaves && m.waves.length >= totalWaves);
            const isOld = (Date.now() - (m.updatedAt || m.createdAt || 0)) > 24 * 3600 * 1000;
            if (isPastDespawn || isAllWavesCollected || isOld) {
              status = 'completed';
              currentWave = Math.max(currentWave || 1, totalWaves || 1);
              needsUpdate = true;
            }
          }

          if (status === 'completed' && currentWave < totalWaves) {
            currentWave = totalWaves;
            needsUpdate = true;
          }

          // Backfill: Heal mission 33857983 wave 2 lifeform XP
          if (m.id === '33857983' && m.waves) {
            const w2 = m.waves.find(w => w.waveNumber === 2);
            if (w2 && (!w2.lifeformXp || w2.lifeformXp === 0) && w2.metal === 10919114) {
              w2.lifeformXp = 5577;
              if (m.cumulativeRewards) {
                m.cumulativeRewards.lifeformXp = (m.cumulativeRewards.lifeformXp || 0) + 5577;
              }
              needsUpdate = true;
            }
          }

          // Backfill / Heal corrupted wave lithium costs (e.g. 172, 173, 169 matched from MSU badges)
          if (m.waves && m.waves.length > 0) {
            const hasCorruptedCosts = m.waves.some((w) => (w.lithiumCost || 0) < 1000);
            if (hasCorruptedCosts) {
              let canonicalCost = m.waves.find((w) => (w.lithiumCost || 0) >= 1000)?.lithiumCost;
              if (!canonicalCost && m.id === '33859832') {
                canonicalCost = 507791;
              }
              if (!canonicalCost && m.completionLithiumCost && m.completionLithiumCost >= 1000) {
                canonicalCost = Math.round(m.completionLithiumCost / m.waves.length);
              }
              if (!canonicalCost && m.totalLithiumBudget && m.totalLithiumBudget >= 1000) {
                canonicalCost = Math.round(m.totalLithiumBudget / (m.totalWaves || m.waves.length));
              }

              if (canonicalCost && canonicalCost >= 1000) {
                for (const w of m.waves) {
                  if ((w.lithiumCost || 0) < 1000) {
                    w.lithiumCost = canonicalCost;
                  }
                }
                const recordedWavesLithium = m.waves.reduce((sum, w) => sum + (w.lithiumCost || 0), 0);
                const completionLithium = m.completionLithiumCost || 0;
                m.totalClaimedLithium = (completionLithium > 0 && completionLithium > recordedWavesLithium)
                  ? completionLithium
                  : recordedWavesLithium;

                const grossTotal = (m.totalClaimedMsu || 0) + (m.totalDebrisHarvestedMsu || 0);
                m.msuPerLithium = m.totalClaimedLithium > 0 ? grossTotal / m.totalClaimedLithium : 0;
                needsUpdate = true;
              }
            }
          }

          if (needsUpdate) {
            await db.anomalyMissions.update(m.id, {
              status,
              playerId,
              universe,
              category,
              environment,
              totalWaves,
              currentWave,
              waves: m.waves,
              totalClaimedLithium: m.totalClaimedLithium,
              msuPerLithium: m.msuPerLithium,
              cumulativeRewards: m.cumulativeRewards,
              updatedAt: Date.now()
            });
          }
        }
      } catch (err) {
        console.warn('Failed to auto-repair anomaly records in Dexie', err);
      }
    })();
  }, []);

  // Filtered dataset
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      if (filterCategory !== 'all') {
        const isCombat = m.category === 'combat' ||
                         (m.fleetLossesMsu || 0) > 0 ||
                         (m.combatReportIds && m.combatReportIds.length > 0) ||
                         m.name?.toLowerCase().includes('rescue') ||
                         m.name?.toLowerCase().includes('combat') ||
                         m.name?.toLowerCase().includes('resource:');
        const effCat = isCombat ? 'combat' : 'delivery';
        if (effCat !== filterCategory) return false;
      }
      if (filterEnvironment !== 'all') {
        const isPve = m.environment === 'pve' || m.name?.toLowerCase().includes('rescue');
        const effEnv = isPve ? 'pve' : 'pvp';
        if (effEnv !== filterEnvironment) return false;
      }
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchCoords = m.coords?.toLowerCase().includes(q);
        const matchLevel = String(m.level).includes(q);
        const matchOrigin = (m.originName?.toLowerCase().includes(q)) || (m.originCoords?.toLowerCase().includes(q));
        if (!matchName && !matchCoords && !matchLevel && !matchOrigin) return false;
      }
      return true;
    });
  }, [missions, filterCategory, filterEnvironment, filterStatus, searchQuery]);

  // Global KPIs across filtered missions
  const stats = useMemo(() => {
    let totalGrossMsu = 0;
    let totalLossesMsu = 0;
    let totalLithiumSpent = 0;
    let completedCount = 0;

    filteredMissions.forEach((m) => {
      const metrics = getUniqueMissionMetrics(m);
      totalGrossMsu += metrics.gross;
      totalLossesMsu += metrics.losses;
      totalLithiumSpent += metrics.lithium;
      if (m.status === 'completed') completedCount += 1;
    });

    const netProfitMsu = totalGrossMsu - totalLossesMsu;
    const avgYield = totalLithiumSpent > 0 ? totalGrossMsu / totalLithiumSpent : 0;
    const completionRate = filteredMissions.length > 0 ? (completedCount / filteredMissions.length) * 100 : 0;

    return {
      totalCount: filteredMissions.length,
      completedCount,
      completionRate,
      totalGrossMsu,
      totalLossesMsu,
      netProfitMsu,
      totalLithiumSpent,
      avgYield
    };
  }, [filteredMissions]);

  // 30-Day Timeline Baseline for Charts
  const dateTimeline = useMemo(() => {
    const results: { date: string; displayDate: string }[] = [];
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 29);
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const key = toLocaleDateKey(d);
      results.push({
        date: key,
        displayDate: d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })
      });
    }
    return results;
  }, []);

  // 1. Overview Chart Dataset (PvP Combat, PvE Combat, PvP Delivery, PvE Delivery)
  const overviewData = useMemo(() => {
    const map: Record<string, { pvp_combat: number; pve_combat: number; pvp_delivery: number; pve_delivery: number }> = {};
    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = { pvp_combat: 0, pve_combat: 0, pvp_delivery: 0, pve_delivery: 0 };

      const isCombat = m.category === 'combat' ||
        (m.fleetLossesMsu || 0) > 0 ||
        (m.combatReportIds && m.combatReportIds.length > 0) ||
        m.name?.toLowerCase().includes('rescue') ||
        m.name?.toLowerCase().includes('combat') ||
        m.name?.toLowerCase().includes('resource:');
      const isPve = m.environment === 'pve' || m.name?.toLowerCase().includes('rescue');

      if (isPve && isCombat) map[key].pve_combat++;
      else if (!isPve && isCombat) map[key].pvp_combat++;
      else if (isPve && !isCombat) map[key].pve_delivery++;
      else map[key].pvp_delivery++;
    });

    return dateTimeline.map((t) => ({
      ...t,
      ...(map[t.date] || { pvp_combat: 0, pve_combat: 0, pvp_delivery: 0, pve_delivery: 0 })
    }));
  }, [filteredMissions, dateTimeline]);

  // 2. Resources Chart Dataset (Metal, Crystal, Deuterium, MSU)
  const resourcesData = useMemo(() => {
    const map: Record<string, { metal: number; crystal: number; deuterium: number; msu: number }> = {};
    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = { metal: 0, crystal: 0, deuterium: 0, msu: 0 };

      const metrics = getUniqueMissionMetrics(m);
      let met = 0;
      let cry = 0;
      let deut = 0;
      let msu = 0;

      if (metrics.uniqueWaves.length > 0) {
        metrics.uniqueWaves.forEach((w) => {
          met += w.metal || 0;
          cry += w.crystal || 0;
          deut += w.deuterium || 0;
          msu += w.msuValue || 0;
        });
      } else if (m.cumulativeRewards) {
        met += m.cumulativeRewards.metal || 0;
        cry += m.cumulativeRewards.crystal || 0;
        deut += m.cumulativeRewards.deuterium || 0;
        msu += m.cumulativeRewards.msu || 0;
      } else if (metrics.waveGross > 0) {
        msu += metrics.waveGross;
      }

      if (metrics.debrisHarvests.length > 0) {
        metrics.debrisHarvests.forEach((dh) => {
          met += dh.metal || 0;
          cry += dh.crystal || 0;
          deut += dh.deuterium || 0;
          msu += dh.msuValue || 0;
        });
      }

      map[key].metal += met;
      map[key].crystal += cry;
      map[key].deuterium += deut;
      map[key].msu += msu;
    });

    return dateTimeline.map((t) => ({
      ...t,
      ...(map[t.date] || { metal: 0, crystal: 0, deuterium: 0, msu: 0 })
    }));
  }, [filteredMissions, dateTimeline]);

  // 3. Ships Chart Dataset
  const { shipsData, availableShips } = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const shipSet = new Set<string>();

    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = {};

      const metrics = getUniqueMissionMetrics(m);
      if (metrics.uniqueWaves.length > 0) {
        metrics.uniqueWaves.forEach((w) => {
          if (w.ships) {
            Object.entries(w.ships).forEach(([shipName, count]) => {
              if (count > 0) {
                shipSet.add(shipName);
                map[key][shipName] = (map[key][shipName] || 0) + count;
              }
            });
          }
        });
      } else if (m.cumulativeRewards?.ships) {
        Object.entries(m.cumulativeRewards.ships).forEach(([shipName, count]) => {
          if (count > 0) {
            shipSet.add(shipName);
            map[key][shipName] = (map[key][shipName] || 0) + count;
          }
        });
      }
    });

    const available = Array.from(shipSet);
    const data = dateTimeline.map((t) => {
      const row: any = { ...t };
      available.forEach((s) => {
        row[s] = (map[t.date] && map[t.date][s]) || 0;
      });
      return row;
    });

    return { shipsData: data, availableShips: available };
  }, [filteredMissions, dateTimeline]);

  // Sync visible ships when availableShips changes
  useEffect(() => {
    if (availableShips.length > 0) {
      setVisibleShips((prev) => {
        const next = new Set(prev);
        availableShips.forEach((s) => next.add(s));
        return next;
      });
    }
  }, [availableShips]);

  // 4. Lifeform XP Dataset
  const lifeformXpData = useMemo(() => {
    const map: Record<string, { lifeformXp: number }> = {};
    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = { lifeformXp: 0 };

      const metrics = getUniqueMissionMetrics(m);
      let xp = 0;
      if (metrics.uniqueWaves.length > 0) {
        metrics.uniqueWaves.forEach((w) => {
          xp += w.lifeformXp || 0;
        });
      } else if (m.cumulativeRewards) {
        xp += m.cumulativeRewards.lifeformXp || 0;
      }
      map[key].lifeformXp += xp;
    });

    return dateTimeline.map((t) => ({
      ...t,
      ...(map[t.date] || { lifeformXp: 0 })
    }));
  }, [filteredMissions, dateTimeline]);

  // 5. Artifacts Dataset
  const artifactsData = useMemo(() => {
    const map: Record<string, { artifacts: number }> = {};
    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = { artifacts: 0 };

      const metrics = getUniqueMissionMetrics(m);
      let art = 0;
      if (metrics.uniqueWaves.length > 0) {
        metrics.uniqueWaves.forEach((w) => {
          art += w.artifacts || 0;
        });
      } else if (m.cumulativeRewards) {
        art += m.cumulativeRewards.artifacts || 0;
      }
      map[key].artifacts += art;
    });

    return dateTimeline.map((t) => ({
      ...t,
      ...(map[t.date] || { artifacts: 0 })
    }));
  }, [filteredMissions, dateTimeline]);

  // 6. Lithium Spent Dataset
  const lithiumData = useMemo(() => {
    const map: Record<string, { lithium: number; gross: number; missionCount: number }> = {};
    filteredMissions.forEach((m) => {
      const d = getMissionDate(m);
      const key = toLocaleDateKey(d);
      if (!map[key]) map[key] = { lithium: 0, gross: 0, missionCount: 0 };

      const metrics = getUniqueMissionMetrics(m);
      map[key].lithium += metrics.lithium;
      map[key].gross += metrics.gross;
      map[key].missionCount += 1;
    });

    return dateTimeline.map((t) => ({
      ...t,
      lithium: (map[t.date] && map[t.date].lithium) || 0,
      gross: (map[t.date] && map[t.date].gross) || 0,
      missionCount: (map[t.date] && map[t.date].missionCount) || 0,
      yield: (map[t.date] && map[t.date].lithium > 0) ? Number((map[t.date].gross / map[t.date].lithium).toFixed(1)) : 0
    }));
  }, [filteredMissions, dateTimeline]);

  // Peak daily yield across 30 days
  const peakDailyYield = useMemo(() => {
    let peak = { displayDate: '-', yield: 0 };
    lithiumData.forEach((d: any) => {
      if (d.yield > peak.yield) {
        peak = { displayDate: d.displayDate, yield: d.yield };
      }
    });
    return peak;
  }, [lithiumData]);

  // Graph Tab Aggregate Summaries
  const graphSummaries = useMemo(() => {
    // Overview counts
    let pvpCombatCount = 0;
    let pveCombatCount = 0;
    let pvpDeliveryCount = 0;
    let pveDeliveryCount = 0;

    // Resource totals
    let totalMetal = 0;
    let totalCrystal = 0;
    let totalDeut = 0;
    let totalMsu = 0;

    // Ship totals
    let totalShips = 0;
    const shipCounts: Record<string, number> = {};

    // LF XP & Artifacts & Lithium
    let totalLfXp = 0;
    let totalArtifacts = 0;
    let totalLithium = 0;

    filteredMissions.forEach((m) => {
      const isCombat = m.category === 'combat' ||
        (m.fleetLossesMsu || 0) > 0 ||
        (m.combatReportIds && m.combatReportIds.length > 0) ||
        m.name?.toLowerCase().includes('rescue') ||
        m.name?.toLowerCase().includes('combat') ||
        m.name?.toLowerCase().includes('resource:');
      const isPve = m.environment === 'pve' || m.name?.toLowerCase().includes('rescue');

      if (isPve && isCombat) pveCombatCount++;
      else if (!isPve && isCombat) pvpCombatCount++;
      else if (isPve && !isCombat) pveDeliveryCount++;
      else pvpDeliveryCount++;

      const metrics = getUniqueMissionMetrics(m);
      totalLithium += metrics.lithium;

      if (metrics.uniqueWaves.length > 0) {
        metrics.uniqueWaves.forEach((w) => {
          totalMetal += w.metal || 0;
          totalCrystal += w.crystal || 0;
          totalDeut += w.deuterium || 0;
          totalMsu += w.msuValue || 0;
          totalLfXp += w.lifeformXp || 0;
          totalArtifacts += w.artifacts || 0;
          if (w.ships) {
            Object.entries(w.ships).forEach(([s, c]) => {
              totalShips += c;
              shipCounts[s] = (shipCounts[s] || 0) + c;
            });
          }
        });
      } else if (m.cumulativeRewards) {
        totalMetal += m.cumulativeRewards.metal || 0;
        totalCrystal += m.cumulativeRewards.crystal || 0;
        totalDeut += m.cumulativeRewards.deuterium || 0;
        totalMsu += m.cumulativeRewards.msu || 0;
        totalLfXp += m.cumulativeRewards.lifeformXp || 0;
        totalArtifacts += m.cumulativeRewards.artifacts || 0;
        if (m.cumulativeRewards.ships) {
          Object.entries(m.cumulativeRewards.ships).forEach(([s, c]) => {
            totalShips += c;
            shipCounts[s] = (shipCounts[s] || 0) + c;
          });
        }
      }

      if (metrics.debrisHarvests.length > 0) {
        metrics.debrisHarvests.forEach((dh) => {
          totalMetal += dh.metal || 0;
          totalCrystal += dh.crystal || 0;
          totalDeut += dh.deuterium || 0;
          totalMsu += dh.msuValue || 0;
        });
      }
    });

    let topShip = '-';
    let topShipCount = 0;
    Object.entries(shipCounts).forEach(([s, c]) => {
      if (c > topShipCount) {
        topShip = s;
        topShipCount = c;
      }
    });

    return {
      pvpCombatCount,
      pveCombatCount,
      pvpDeliveryCount,
      pveDeliveryCount,
      totalMetal,
      totalCrystal,
      totalDeut,
      totalMsu,
      totalShips,
      topShip,
      topShipCount,
      totalLfXp,
      totalArtifacts,
      totalLithium
    };
  }, [filteredMissions]);

  // Series toggle handlers
  const toggleOverviewSeries = (id: string) => {
    setVisibleOverview((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleResourceSeries = (id: string) => {
    setVisibleResources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleShipSeries = (name: string) => {
    setVisibleShips((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', height: '100%', overflowY: 'auto' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.3) 0%, rgba(249, 115, 22, 0.1) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(249, 115, 22, 0.25)'
            }}
          >
            <Sparkles size={22} color="#f97316" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Project Orion Anomalies
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Deep-space anomaly mission telemetry, wave combat casualties, and reward returns.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top KPI Command Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* KPI 1: Missions Cleared */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Missions Cleared</span>
            <Crosshair size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats.completedCount} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>/ {stats.totalCount}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
            {stats.completionRate.toFixed(1)}% Completion Rate
          </div>
        </div>

        {/* KPI 2: Gross Value Won */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Gross Rewards Won</span>
            <Award size={16} color="#facc15" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#facc15' }}>
            +{formatNumber(stats.totalGrossMsu)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MSU</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Resources + Ship Fleets
          </div>
        </div>

        {/* KPI 3: Fleet Casualties */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Fleet Casualties</span>
            <ShieldAlert size={16} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e' }}>
            {stats.totalLossesMsu > 0 ? `-${formatNumber(stats.totalLossesMsu)}` : '0'}{' '}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MSU</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Permanent Wave Losses
          </div>
        </div>

        {/* KPI 4: Net Profit */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Net Profit</span>
            <TrendingUp size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.netProfitMsu >= 0 ? '#34d399' : '#f43f5e' }}>
            {stats.netProfitMsu >= 0 ? '+' : ''}{formatNumber(stats.netProfitMsu)}{' '}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MSU</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Gross Won - Casualties
          </div>
        </div>

        {/* KPI 5: Fuel Efficiency */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Fuel Efficiency</span>
            <Sparkles size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
            {stats.avgYield > 0 ? stats.avgYield.toFixed(1) + 'x' : '-'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {formatNumber(stats.totalLithiumSpent)} Lithium invested
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left (Table 50%) & Right (Graphs 50%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start', width: '100%' }}>
        
        {/* --- RIGHT COLUMN: Graphs with Vertical Tabs (Expeditions Architecture) --- */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            minWidth: 0,
            minHeight: '760px'
          }}
        >
          {/* Vertical Tabs Sidebar */}
          <div
            style={{
              width: '85px',
              flexShrink: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px 6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {ANOMALY_TABS.map((tab) => {
              const isActive = (tab.id === 'lithium' && (activeGraphTab === 'lithium' && lithiumSubTab === 'spent')) ||
                               (tab.id === 'lithium_yield' && ((activeGraphTab === 'lithium' && lithiumSubTab === 'yield') || activeGraphTab === 'lithium_yield')) ||
                               (tab.id !== 'lithium' && tab.id !== 'lithium_yield' && activeGraphTab === tab.id);
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'lithium') {
                      setActiveGraphTab('lithium');
                      setLithiumSubTab('spent');
                    } else if (tab.id === 'lithium_yield') {
                      setActiveGraphTab('lithium_yield');
                      setLithiumSubTab('yield');
                    } else {
                      setActiveGraphTab(tab.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 4px',
                    borderRadius: '8px',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.9) 0%, rgba(249, 115, 22, 0.9) 50%, rgba(251, 146, 60, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    boxShadow: isActive ? '0 0 14px rgba(249, 115, 22, 0.45)' : 'none',
                    border: isActive ? '1px solid rgba(251, 146, 60, 0.7)' : '1px solid rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.7rem',
                    fontWeight: isActive ? 800 : 500,
                    textAlign: 'center',
                    minHeight: '56px',
                    gap: '4px'
                  }}
                >
                  <TabIcon size={16} color={isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Graph Panel */}
          <div style={{ flex: 1, minWidth: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '760px', overflowY: 'auto' }}>
            
            {/* 1. Tab: Overview */}
            {/* 0. Tab: Info (Empire Intelligence for Anomaly Buildings) */}
            {activeGraphTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0, 242, 255, 0.1)',
                      border: '1px solid rgba(0, 242, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Info size={18} color="#00f2ff" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                        Anomaly Infrastructure & Bonuses
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Planetary Anomaly Scanners and colony bonus facilities
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 242, 255, 0.08)', border: '1px solid rgba(0, 242, 255, 0.25)', borderRadius: '6px', padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00f2ff' }}>
                      {userPlanets.length} Planets
                    </span>
                  </div>
                </div>

                {/* Empire Cumulative Totals (Bento Grid matching user's console table) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '8px'
                }}>
                  {ANOMALY_BUILDINGS.map(b => {
                    const totalLvl = empireTotals[b.id] || 0;
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: `1px solid ${totalLvl > 0 ? b.color + '33' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <img
                          src={b.icon}
                          alt={b.name}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: `1px solid ${b.color}66`,
                            flexShrink: 0,
                            opacity: totalLvl > 0 ? 1 : 0.4
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.shortName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: totalLvl > 0 ? b.color : '#64748b', whiteSpace: 'nowrap' }}>
                              {b.id === 45
                                ? `${totalLvl} lvl`
                                : b.id === 4007
                                ? `-${(totalLvl * 0.05).toFixed(2)}%`
                                : `+${(totalLvl * 0.2).toFixed(1)}%`}
                            </span>
                            {b.type === 'bonus' && (
                              <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ({totalLvl} lvl)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Colonies List Header & Container with shared scroll */}
                <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '4px' }}>
                  <div style={{ minWidth: '662px' }}>
                    {/* Colonies List Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <div style={{ width: '150px', flexShrink: 0 }}>Planet</div>
                      <div style={{ width: '16px', flexShrink: 0 }} />
                      <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Scanner</div>
                      <div style={{ width: '24px', flexShrink: 0 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Metal</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Crystal</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Deut</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Lithium</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Ships</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>XP / Art</div>
                        <div style={{ width: '46px', textAlign: 'center', flexShrink: 0 }}>Convert</div>
                      </div>
                    </div>

                    {/* Scrollable Colonies List */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      maxHeight: '480px',
                      paddingRight: '4px'
                    }}>
                      {userPlanets.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                          No colony data synchronized yet. Visit your empire or facilities in OGame to synchronize.
                        </div>
                      ) : (
                        userPlanets.map((p, idx) => {
                          const iasLevel = getPlanetAnomalyLevel(p, 45);
                          return (
                            <motion.div
                              key={p.id || p.coords || idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(12, 18, 28, 0.7)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '12px 16px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                position: 'relative',
                                minHeight: '68px'
                              }}
                            >
                              {/* Colony Identity */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '150px',
                                flexShrink: 0,
                                minWidth: 0
                              }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                  <img
                                    src={p.imgUrl || '/icons/planets/dry-large.jpg'}
                                    style={{
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '8px',
                                      border: `1.5px solid ${getLfColor(p.lifeformId)}`,
                                      opacity: p.lifeformId ? 1 : 0.7,
                                      objectFit: 'cover'
                                    }}
                                    alt=""
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    right: '-4px',
                                    background: '#000',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    fontSize: '8px',
                                    fontWeight: 900,
                                    color: '#00f2ff',
                                    border: '1px solid rgba(0,242,255,0.4)',
                                    lineHeight: 1
                                  }}>
                                    {p.coords === '0:0:0' ? 'Unknown' : p.coords}
                                  </div>
                                </div>
                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.name}
                                  </div>
                                  {p.lifeformId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <img src={getLfIcon(p.lifeformId)} style={{ width: '12px', height: '12px', borderRadius: '2px' }} alt="" />
                                      <span style={{ fontSize: '8px', color: getLfColor(p.lifeformId), fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {['Humans', 'Rock\'tal', 'Mechas', 'Kaelesh'][p.lifeformId - 1]}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '8px', color: '#64748b' }}>No Lifeform</span>
                                  )}
                                </div>
                              </div>

                              {/* Spacer between Colony and Scanner */}
                              <div style={{ width: '16px', flexShrink: 0 }} />

                              {/* Scanner Tile */}
                              <div
                                style={{ width: '46px', height: '46px', position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  setHoveredBuilding({
                                    building: ANOMALY_BUILDINGS[0],
                                    level: iasLevel,
                                    planet: p,
                                    rect: e.currentTarget.getBoundingClientRect()
                                  });
                                }}
                                onMouseLeave={() => setHoveredBuilding(null)}
                              >
                                <img
                                  src={ANOMALY_BUILDINGS[0].icon}
                                  alt="Scanner"
                                  style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '6px',
                                    border: `1.5px solid ${iasLevel > 0 ? '#00f2ff88' : 'rgba(255,255,255,0.1)'}`,
                                    objectFit: 'cover',
                                    opacity: iasLevel > 0 ? 1 : 0.4,
                                    filter: iasLevel > 0 ? 'none' : 'grayscale(0.5)'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '-2px',
                                  right: '-2px',
                                  background: iasLevel > 0 ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.6)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  fontWeight: 1000,
                                  color: iasLevel > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
                                  border: `1px solid ${iasLevel > 0 ? '#00f2ff' : 'rgba(255,255,255,0.15)'}`,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.8)'
                                }}>
                                  {iasLevel}
                                </div>
                              </div>

                              {/* Vertical Divider in 24px container */}
                              <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.1)' }} />
                              </div>

                              {/* Bonus Facilities with gap: 12px */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                {ANOMALY_BUILDINGS.slice(1).map(b => {
                                  const lvl = getPlanetAnomalyLevel(p, b.id);
                                  return (
                                    <div
                                      key={b.id}
                                      style={{ width: '46px', height: '46px', position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                                      onMouseEnter={(e) => {
                                        setHoveredBuilding({
                                          building: b,
                                          level: lvl,
                                          planet: p,
                                          rect: e.currentTarget.getBoundingClientRect()
                                        });
                                      }}
                                      onMouseLeave={() => setHoveredBuilding(null)}
                                    >
                                      <img
                                        src={b.icon}
                                        alt={b.name}
                                        style={{
                                          width: '46px',
                                          height: '46px',
                                          borderRadius: '6px',
                                          border: `1.5px solid ${lvl > 0 ? b.color + 'aa' : 'rgba(255,255,255,0.1)'}`,
                                          objectFit: 'cover',
                                          opacity: lvl > 0 ? 1 : 0.35,
                                          filter: lvl > 0 ? 'none' : 'grayscale(0.6)'
                                        }}
                                      />
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        right: '-2px',
                                        background: lvl > 0 ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.6)',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        fontSize: '11px',
                                        fontWeight: 1000,
                                        color: lvl > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                                        border: `1px solid ${lvl > 0 ? b.color : 'rgba(255,255,255,0.15)'}`,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.8)'
                                      }}>
                                        {lvl}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGraphTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="#f97316" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Anomaly Types Breakdown
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Daily frequency (30 Days)
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                  <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <AreaChart data={overviewData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} allowDecimals={false} tickFormatter={formatYAxis} width={45} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                        {OVERVIEW_CATEGORIES.map((cat) => (
                          <Area
                            key={cat.id}
                            name={cat.label}
                            type="monotone"
                            dataKey={cat.id}
                            stackId="1"
                            stroke={cat.color}
                            fill={cat.color}
                            fillOpacity={visibleOverview.has(cat.id) ? 0.6 : 0}
                            strokeOpacity={visibleOverview.has(cat.id) ? 1 : 0}
                            strokeWidth={2}
                            hide={!visibleOverview.has(cat.id)}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends & Toggles */}
                  <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {OVERVIEW_CATEGORIES.map((cat) => {
                      const isVis = visibleOverview.has(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => toggleOverviewSeries(cat.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isVis ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: cat.color, opacity: isVis ? 1 : 0.3, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', color: isVis ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                            {cat.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Mini KPI Deck */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PvP Combat</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f43f5e' }}>{graphSummaries.pvpCombatCount}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PvE Combat</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{graphSummaries.pveCombatCount}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PvP Delivery</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f97316' }}>{graphSummaries.pvpDeliveryCount}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PvE Delivery</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{graphSummaries.pveDeliveryCount}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Tab: Resources */}
            {activeGraphTab === 'resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Resource Finds & MSU Yield
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Daily loot + debris (30 Days)
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                  <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <AreaChart data={resourcesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatYAxis} width={45} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                        <Area name="Metal" type="monotone" dataKey="metal" stackId="1" stroke="#E6953C" fill="#E6953C" fillOpacity={visibleResources.has('metal') ? 0.6 : 0} strokeOpacity={visibleResources.has('metal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('metal')} />
                        <Area name="Crystal" type="monotone" dataKey="crystal" stackId="1" stroke="#4CAEE6" fill="#4CAEE6" fillOpacity={visibleResources.has('crystal') ? 0.6 : 0} strokeOpacity={visibleResources.has('crystal') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('crystal')} />
                        <Area name="Deuterium" type="monotone" dataKey="deuterium" stackId="1" stroke="#43D159" fill="#43D159" fillOpacity={visibleResources.has('deuterium') ? 0.6 : 0} strokeOpacity={visibleResources.has('deuterium') ? 1 : 0} strokeWidth={2} hide={!visibleResources.has('deuterium')} />
                        <Area name="Resource Units (MSU)" type="monotone" dataKey="msu" stroke="#38bdf8" fill="#38bdf8" fillOpacity={visibleResources.has('msu') ? 0.15 : 0} strokeOpacity={visibleResources.has('msu') ? 0.85 : 0} strokeWidth={2.5} strokeDasharray="5 5" hide={!visibleResources.has('msu')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends & Toggles */}
                  <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {RESOURCE_SERIES.map((res) => {
                      const isVis = visibleResources.has(res.id);
                      return (
                        <div
                          key={res.id}
                          onClick={() => toggleResourceSeries(res.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isVis ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: res.color, opacity: isVis ? 1 : 0.3, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', color: isVis ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                            {res.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Mini KPI Deck */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(230,149,60,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Metal</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#E6953C' }}>+{formatNumber(graphSummaries.totalMetal)}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(76,174,230,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Crystal</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4CAEE6' }}>+{formatNumber(graphSummaries.totalCrystal)}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(67,209,89,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Deuterium</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#43D159' }}>+{formatNumber(graphSummaries.totalDeut)}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total MSU</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>+{formatNumber(graphSummaries.totalMsu)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Tab: Ships */}
            {activeGraphTab === 'ships' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ship size={18} color="#a855f7" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Ship Findings
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    All ship types found (30 Days)
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                  <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                    {availableShips.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <AreaChart data={shipsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatYAxis} width={45} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                          {availableShips.map((shipName, idx) => {
                            const clr = getShipColor(shipName, idx);
                            const isVis = visibleShips.has(shipName);
                            return (
                              <Area
                                key={shipName}
                                name={shipName}
                                type="monotone"
                                dataKey={shipName}
                                stackId="1"
                                stroke={clr}
                                fill={clr}
                                fillOpacity={isVis ? 0.6 : 0}
                                strokeOpacity={isVis ? 1 : 0}
                                strokeWidth={2}
                                hide={!isVis}
                              />
                            );
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.85rem' }}>
                        No ship findings logged in recent anomaly wave rewards yet.
                      </div>
                    )}
                  </div>

                  {/* Legends & Toggles */}
                  <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
                    {availableShips.map((shipName, idx) => {
                      const clr = getShipColor(shipName, idx);
                      const isVis = visibleShips.has(shipName);
                      return (
                        <div
                          key={shipName}
                          onClick={() => toggleShipSeries(shipName)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isVis ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: clr, opacity: isVis ? 1 : 0.3, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.7rem', color: isVis ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {shipName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Mini KPI Deck */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Ships Found</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7' }}>{graphSummaries.totalShips.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Top Ship Class</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{graphSummaries.topShip}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Tab: Lifeform Experience */}
            {activeGraphTab === 'lifeform_xp' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="#a855f7" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Lifeform Experience
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Daily XP finds (30 Days)
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                  <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <AreaChart data={lifeformXpData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatYAxis} width={45} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                        <Area name="Lifeform XP" type="monotone" dataKey="lifeformXp" stroke="#a855f7" fill="#a855f7" fillOpacity={0.55} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Metric Card */}
                  <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL LF XP</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
                        +{formatNumber(graphSummaries.totalLfXp)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                        Across all waves
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Mini KPI Deck */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Experience</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7' }}>+{formatNumber(graphSummaries.totalLfXp)} XP</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Daily Average</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{Math.round(graphSummaries.totalLfXp / 30).toLocaleString()} / day</div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Tab: Artifacts */}
            {activeGraphTab === 'artifacts' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={18} color="#facc15" />
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Ancient Artifacts
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Daily artifact finds (30 Days)
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                  <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                      <AreaChart data={artifactsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatYAxis} width={45} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                        <Area name="Artifacts" type="monotone" dataKey="artifacts" stroke="#facc15" fill="#facc15" fillOpacity={0.55} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Metric Card */}
                  <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '6px', padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL ARTIFACTS</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
                        +{graphSummaries.totalArtifacts.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                        Lifeform Tech Tech Tree
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Mini KPI Deck */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: 'auto' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Artifacts</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#facc15' }}>+{graphSummaries.totalArtifacts}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Daily Average</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{(graphSummaries.totalArtifacts / 30).toFixed(1)} / day</div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Tab: Lithium Spent */}
            {(activeGraphTab === 'lithium' || activeGraphTab === 'lithium_yield') && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                {/* Header with Subtabs Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {lithiumSubTab === 'spent' ? (
                      <BatteryCharging size={18} color="#06b6d4" />
                    ) : (
                      <TrendingUp size={18} color="#34d399" />
                    )}
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      {lithiumSubTab === 'spent' ? 'Lithium Spent on Mission Rewards' : 'Lithium Yield Efficiency'}
                    </span>
                  </div>

                  {/* Subtabs Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.45)', borderRadius: '6px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      onClick={() => { setLithiumSubTab('spent'); setActiveGraphTab('lithium'); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: lithiumSubTab === 'spent' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                        color: lithiumSubTab === 'spent' ? '#38bdf8' : '#94a3b8',
                        border: lithiumSubTab === 'spent' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <BatteryCharging size={13} />
                      <span>Lithium Spent</span>
                    </button>
                    <button
                      onClick={() => { setLithiumSubTab('yield'); setActiveGraphTab('lithium_yield'); }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: lithiumSubTab === 'yield' ? 'rgba(52, 211, 153, 0.25)' : 'transparent',
                        color: lithiumSubTab === 'yield' ? '#34d399' : '#94a3b8',
                        border: lithiumSubTab === 'yield' ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <TrendingUp size={13} />
                      <span>Lithium Yield</span>
                    </button>
                  </div>
                </div>

                {/* Subtab 1: Lithium Spent Chart */}
                {lithiumSubTab === 'spent' && (
                  <>
                    <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                      <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <AreaChart data={lithiumData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={formatYAxis} width={45} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                            <Area name="Lithium Spent" type="monotone" dataKey="lithium" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.55} strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Summary Metric Card */}
                      <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '6px', padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>LITHIUM FUEL</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>
                            {formatNumber(graphSummaries.totalLithium)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            Yield: {graphSummaries.totalLithium > 0 ? (graphSummaries.totalMsu / graphSummaries.totalLithium).toFixed(1) + 'x' : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Mini KPI Deck */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: 'auto' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Lithium Spent</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#06b6d4' }}>{formatNumber(graphSummaries.totalLithium)} Lith</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>MSU per Lithium</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{graphSummaries.totalLithium > 0 ? (graphSummaries.totalMsu / graphSummaries.totalLithium).toFixed(1) + 'x' : '-'}</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Subtab 2: Lithium Yield Chart */}
                {lithiumSubTab === 'yield' && (
                  <>
                    <div style={{ display: 'flex', flex: 1, gap: '14px', minHeight: '380px' }}>
                      <div style={{ flex: 1, minWidth: 0, minHeight: '380px' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                          <AreaChart data={lithiumData}>
                            <defs>
                              <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} dy={8} minTickGap={25} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={(v) => `${v}x`} width={45} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(52, 211, 153, 0.3)', strokeWidth: 1 }} />
                            <Area name="Average Yield" type="monotone" dataKey="yield" stroke="#34d399" fill="url(#yieldGradient)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Summary Metric Cards */}
                      <div style={{ width: '145px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.28)', borderRadius: '6px', padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>AVG 30D YIELD</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                            {stats.avgYield > 0 ? stats.avgYield.toFixed(1) + 'x' : '-'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            MSU per Lithium
                          </div>
                        </div>

                        <div style={{ background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.28)', borderRadius: '6px', padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>PEAK DAY YIELD</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
                            {peakDailyYield.yield > 0 ? peakDailyYield.yield.toFixed(1) + 'x' : '-'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                            {peakDailyYield.displayDate !== '-' ? peakDailyYield.displayDate : 'No Data'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Mini KPI Deck */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: 'auto' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(250, 204, 21, 0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Gross Won</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#facc15' }}>+{formatNumber(stats.totalGrossMsu)}</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Lithium Fuel</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#06b6d4' }}>{formatNumber(stats.totalLithiumSpent)}</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Weighted Yield</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>{stats.avgYield > 0 ? stats.avgYield.toFixed(1) + 'x' : '-'}</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Peak Day Efficiency</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{peakDailyYield.yield > 0 ? `${peakDailyYield.displayDate} (${peakDailyYield.yield}x)` : '-'}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* --- LEFT COLUMN: Filters + Ledger Table --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '10px 14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px' }}>
                {(['all', 'combat', 'delivery'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    style={{
                      background: filterCategory === cat ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      border: filterCategory === cat ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                      borderRadius: '4px',
                      color: filterCategory === cat ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {cat === 'all' ? 'All Types' : cat}
                  </button>
                ))}
              </div>

              {/* Environment Filter */}
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px' }}>
                {(['all', 'pvp', 'pve'] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => setFilterEnvironment(env)}
                    style={{
                      background: filterEnvironment === env ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                      border: filterEnvironment === env ? '1px solid rgba(249, 115, 22, 0.5)' : '1px solid transparent',
                      borderRadius: '4px',
                      color: filterEnvironment === env ? '#fb923c' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {env === 'all' ? 'All Modes' : env}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px' }}>
                {(['all', 'completed', 'in_progress'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    style={{
                      background: filterStatus === st ? (st === 'in_progress' ? 'rgba(64, 224, 208, 0.2)' : 'rgba(52, 211, 153, 0.2)') : 'transparent',
                      border: filterStatus === st ? (st === 'in_progress' ? '1px solid rgba(64, 224, 208, 0.5)' : '1px solid rgba(52, 211, 153, 0.5)') : '1px solid transparent',
                      borderRadius: '4px',
                      color: filterStatus === st ? (st === 'in_progress' ? '#40e0d0' : '#34d399') : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    {st === 'all' ? 'All Status' : st === 'completed' ? 'Done' : 'Ongoing'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search missions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.75rem',
                padding: '5px 10px',
                outline: 'none',
                width: '160px'
              }}
            />
          </div>

          {/* Table Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto', maxHeight: '720px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.4)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', position: 'sticky', top: 0, zIndex: 5 }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>DATE</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>TARGET</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>LEVEL</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>TYPE</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>WAVES</th>


                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>NET PROFIT</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>LITHIUM</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>YIELD</th>

                  </tr>
                </thead>
                <tbody>
                  {filteredMissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No anomaly mission telemetry recorded yet. Visit the in-game Missions tab to log active anomalies!
                      </td>
                    </tr>
                  ) : (
                    filteredMissions.map((m) => {
                      const metrics = getUniqueMissionMetrics(m);
                      const net = metrics.net;
                      const yieldVal = metrics.yieldRatio;
                      const isCompleted = m.status === 'completed';

                      const isPve = m.environment === 'pve' || m.name?.toLowerCase().includes('rescue');
                      const isCombat = m.category === 'combat' ||
                                       (m.fleetLossesMsu || 0) > 0 ||
                                       (m.combatReportIds && m.combatReportIds.length > 0) ||
                                       m.name?.toLowerCase().includes('rescue') ||
                                       m.name?.toLowerCase().includes('combat') ||
                                       m.name?.toLowerCase().includes('resource:');

                      const originCleanCoords = m.originCoords?.replace(/[\[\]]/g, '').trim();
                      const cleanTargetCoords = m.coords?.replace(/[\[\]]/g, '').trim();

                      const matchedOrigin = planets.find((p) => {
                        const pCoords = p.coords?.replace(/[\[\]]/g, '').trim();
                        if (originCleanCoords && pCoords === originCleanCoords) {
                          if (m.originName && p.name && p.name.trim().toLowerCase() === m.originName.trim().toLowerCase()) {
                            return true;
                          }
                          return true;
                        }
                        if (m.originName && p.name && p.name.trim().toLowerCase() === m.originName.trim().toLowerCase()) {
                          return true;
                        }
                        return false;
                      });

                      const isMoon = matchedOrigin?.type === 'moon' ||
                                     matchedOrigin?.imgUrl?.includes('e8e1e3df9981514adef4a1572d3605') ||
                                     matchedOrigin?.imgUrl?.includes('moon') ||
                                     m.originImgUrl?.includes('e8e1e3df9981514adef4a1572d3605') ||
                                     m.originImgUrl?.includes('moon');

                      const defaultMoonImg = 'https://gf1.geo.gfsrv.net/cdn61/e8e1e3df9981514adef4a1572d3605.png';
                      const defaultPlanetImg = 'https://gf1.geo.gfsrv.net/cdnf3/803539d15ff317c4f7b03262ef5e64.png';
                      const originImg = m.originImgUrl || matchedOrigin?.imgUrl || (isMoon ? defaultMoonImg : defaultPlanetImg);
                      const originName = m.originName || matchedOrigin?.name || 'Homeworld';

                      return (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'all 0.15s ease',
                            opacity: isCompleted ? 0.55 : 1,
                            background: isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(64, 224, 208, 0.08)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedMission(m)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(64, 224, 208, 0.16)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(64, 224, 208, 0.08)'; }}
                        >
                          {/* Status */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                background: isCompleted ? 'rgba(52, 211, 153, 0.10)' : 'rgba(64, 224, 208, 0.16)',
                                color: isCompleted ? '#34d399' : '#40e0d0',
                                border: `1px solid ${isCompleted ? 'rgba(52, 211, 153, 0.25)' : 'rgba(64, 224, 208, 0.4)'}`,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isCompleted ? 'COMPLETED' : 'ONGOING'}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                            {formatDate(m.createdAt || m.spawnedTimestamp)}
                          </td>

                          {/* Target Route */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* Origin Planet/Moon */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <img
                                  src={originImg}
                                  alt={originName}
                                  title={`${originName} [${originCleanCoords || ''}]`}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: '#0b111e',
                                    flexShrink: 0
                                  }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = isMoon ? defaultMoonImg : defaultPlanetImg;
                                  }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                                  <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.76rem' }}>
                                    {originName}
                                  </span>
                                  {originCleanCoords && (
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                      [{originCleanCoords}]
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Route Arrow */}
                              <span style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 2px', userSelect: 'none' }}>→</span>

                              {/* Destination Anomaly */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <img
                                  src="https://gf2.geo.gfsrv.net/cdn44/7ef2d95e5a8c85f029967869e8ac5b.png"
                                  alt="Anomaly"
                                  title={`${m.name || 'Anomaly'} [${cleanTargetCoords || ''}] (${isPve ? 'PvE' : 'PvP'})`}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    objectFit: 'contain',
                                    flexShrink: 0,
                                    filter: isPve
                                      ? 'none'
                                      : 'sepia(1) saturate(700%) hue-rotate(-25deg) brightness(1.05)'
                                  }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.78rem' }}>
                                    {m.name || 'Anomaly'}
                                  </span>
                                  {cleanTargetCoords && (
                                    <span style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                                      [{cleanTargetCoords}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Mission Level */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {m.level > 0 ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  ...getLevelBadgeStyle(m.level)
                                }}
                              >
                                Lv {m.level}
                              </span>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.72rem' }}>-</span>
                            )}
                          </td>

                          {/* Type Badges */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: isPve ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                  color: isPve ? '#38bdf8' : '#f43f5e',
                                  border: isPve ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {isPve ? 'PvE' : 'PvP'}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: isCombat ? 'rgba(234, 88, 12, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                                  color: isCombat ? '#fb923c' : '#34d399',
                                  border: isCombat ? '1px solid rgba(234, 88, 12, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {isCombat ? 'Combat' : 'Delivery'}
                              </span>
                            </div>
                          </td>

                          {/* Waves Progress */}
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#38bdf8' }}>
                            {m.currentWave || 1} / {m.totalWaves || 1}
                          </td>

                          {/* Net Profit */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#34d399' : '#f43f5e' }}>
                            <div>{net >= 0 ? '+' : ''}{formatNumber(net)}</div>
                            {(metrics.lifeformXp > 0 || metrics.artifacts > 0) && (
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '2px' }}>
                                {metrics.lifeformXp > 0 && <span style={{ color: '#c084fc' }}>+{formatNumber(metrics.lifeformXp)} XP</span>}
                                {metrics.artifacts > 0 && <span style={{ color: '#facc15' }}>+{formatNumber(metrics.artifacts)} Art</span>}
                              </div>
                            )}
                          </td>

                          {/* Lithium Spent */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: metrics.lithium > 0 ? '#94a3b8' : '#64748b' }}>
                            {formatNumber(metrics.lithium)}
                          </td>

                          {/* Fuel Yield Ratio */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: yieldVal > 0 ? '#38bdf8' : '#64748b' }}>
                            {yieldVal > 0 ? yieldVal.toFixed(1) + 'x' : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Mission Details Modal */}
      <AnimatePresence>
        {activeSelectedMission && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(3, 7, 18, 0.82)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedMission(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                width: '100%',
                maxWidth: '820px',
                maxHeight: '88vh',
                background: 'linear-gradient(180deg, #0e1726 0%, #090e17 100%)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                borderRadius: '16px',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  background: 'linear-gradient(180deg, rgba(17, 27, 44, 0.95) 0%, rgba(13, 21, 35, 0.95) 100%)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                      {activeSelectedMission.name || 'Anomaly Mission'}
                    </h2>

                    {activeSelectedMission.level > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          ...getLevelBadgeStyle(activeSelectedMission.level)
                        }}
                      >
                        Level {activeSelectedMission.level}
                      </span>
                    )}

                    {activeSelectedMission.environment && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#94a3b8',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {activeSelectedMission.environment.toUpperCase()}
                      </span>
                    )}

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: activeSelectedMission.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(64, 224, 208, 0.12)',
                        border: `1px solid ${
                          activeSelectedMission.status === 'completed'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'rgba(64, 224, 208, 0.3)'
                        }`,
                        color: activeSelectedMission.status === 'completed' ? '#34d399' : '#40e0d0',
                        letterSpacing: '0.04em'
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: activeSelectedMission.status === 'completed' ? '#34d399' : '#40e0d0',
                          boxShadow: `0 0 6px ${activeSelectedMission.status === 'completed' ? '#34d399' : '#40e0d0'}`
                        }}
                      />
                      {activeSelectedMission.status === 'completed' ? 'COMPLETED' : 'ONGOING'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Crosshair size={13} color="#38bdf8" />
                      <span style={{ color: '#64748b' }}>Target:</span>
                      <strong style={{ color: '#e2e8f0' }}>[{activeSelectedMission.coords}]</strong>
                    </span>

                    {activeSelectedMission.originCoords && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Compass size={13} color="#94a3b8" />
                        <span style={{ color: '#64748b' }}>From:</span>
                        <span style={{ color: '#cbd5e1' }}>
                          {activeSelectedMission.originName ? `${activeSelectedMission.originName} ` : ''}
                          [{activeSelectedMission.originCoords.replace(/[\[\]]/g, '')}]
                        </span>
                      </span>
                    )}

                    {(activeSelectedMission.createdAt || activeSelectedMission.spawnedTimestamp) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="#64748b" />
                        <span>{formatDate(activeSelectedMission.createdAt || activeSelectedMission.spawnedTimestamp)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMission(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: '22px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                {(() => {
                  const metrics = getUniqueMissionMetrics(activeSelectedMission);
                  return (
                    <>
                      {/* Summary KPI Balance Sheet */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {/* Total Loot */}
                        <div
                          style={{
                            background: 'linear-gradient(180deg, rgba(20, 28, 44, 0.7) 0%, rgba(12, 18, 30, 0.85) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderTop: '2px solid rgba(250, 204, 21, 0.45)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>TOTAL LOOT</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#facc15', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            +{formatNumber(metrics.gross)} MSU
                          </div>
                          <div style={{ fontSize: '0.7rem', color: metrics.debrisMsu > 0 ? '#38bdf8' : '#64748b', marginTop: '3px' }}>
                            {metrics.debrisMsu > 0 ? `(includes +${formatNumber(metrics.debrisMsu)} debris)` : 'Direct rewards'}
                          </div>
                        </div>

                        {/* Fleet Losses */}
                        <div
                          style={{
                            background: 'linear-gradient(180deg, rgba(20, 28, 44, 0.7) 0%, rgba(12, 18, 30, 0.85) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderTop: metrics.losses > 0 ? '2px solid rgba(244, 63, 94, 0.45)' : '2px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>FLEET LOSSES</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: metrics.losses > 0 ? '#fb7185' : '#64748b', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            {metrics.losses > 0 ? `-${formatNumber(metrics.losses)} MSU` : '0 MSU'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: metrics.losses > 0 ? '#fda4af' : '#34d399', marginTop: '3px' }}>
                            {metrics.losses > 0 ? 'Casualties suffered' : 'Flawless (No losses)'}
                          </div>
                        </div>

                        {/* Net Profit */}
                        <div
                          style={{
                            background: 'linear-gradient(180deg, rgba(20, 28, 44, 0.7) 0%, rgba(12, 18, 30, 0.85) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderTop: metrics.net >= 0 ? '2px solid rgba(52, 211, 153, 0.45)' : '2px solid rgba(244, 63, 94, 0.45)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>NET PROFIT</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: metrics.net >= 0 ? '#34d399' : '#f43f5e', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            {metrics.net >= 0 ? '+' : ''}{formatNumber(metrics.net)} MSU
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                            After losses & costs
                          </div>
                        </div>

                        {/* Fuel Efficiency */}
                        <div
                          style={{
                            background: 'linear-gradient(180deg, rgba(20, 28, 44, 0.7) 0%, rgba(12, 18, 30, 0.85) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderTop: '2px solid rgba(56, 189, 248, 0.45)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>FUEL EFFICIENCY</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                            {metrics.yieldRatio > 0 ? metrics.yieldRatio.toFixed(1) + 'x' : '-'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                            {metrics.lithium > 0 ? `${formatNumber(metrics.lithium)} Lithium used` : 'No fuel recorded'}
                          </div>
                        </div>
                      </div>

                      {/* Special Loot Badges (Lifeform XP & Artifacts) */}
                      {(metrics.lifeformXp > 0 || metrics.artifacts > 0) && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {metrics.lifeformXp > 0 && (
                            <div
                              style={{
                                flex: 1,
                                background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.12) 0%, rgba(147, 51, 234, 0.06) 100%)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img
                                  src="/icons/resources/lifeform-icon-medium.jpg"
                                  alt="Lifeform XP"
                                  style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#e9d5ff', fontWeight: 700 }}>Lifeform Experience</span>
                              </div>
                              <span style={{ fontSize: '1rem', color: '#c084fc', fontWeight: 800 }}>+{metrics.lifeformXp.toLocaleString()} XP</span>
                            </div>
                          )}

                          {metrics.artifacts > 0 && (
                            <div
                              style={{
                                flex: 1,
                                background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.12) 0%, rgba(234, 179, 8, 0.06) 100%)',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img
                                  src="/icons/lifeforms/artifact-icon-large.png"
                                  alt="Artifacts"
                                  style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#fef08a', fontWeight: 700 }}>Ancient Artifacts</span>
                              </div>
                              <span style={{ fontSize: '1rem', color: '#facc15', fontWeight: 800 }}>+{metrics.artifacts.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Section 1: Wave Rewards */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Wave Rewards
                            </h3>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                              {metrics.uniqueWaves.length} {metrics.uniqueWaves.length === 1 ? 'wave' : 'waves'}
                            </span>
                          </div>
                        </div>

                        {metrics.uniqueWaves.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {metrics.uniqueWaves.map((w, idx) => {
                              const waveCostDisplay = (w.lithiumCost && w.lithiumCost >= 1000) ? w.lithiumCost : (metrics.canonicalWaveCost > 0 ? metrics.canonicalWaveCost : w.lithiumCost);
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.6) 0%, rgba(11, 17, 30, 0.75) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                  }}
                                >
                                  {/* Wave header line */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span
                                        style={{
                                          fontWeight: 800,
                                          fontSize: '0.8rem',
                                          color: '#38bdf8',
                                          background: 'rgba(56, 189, 248, 0.12)',
                                          border: '1px solid rgba(56, 189, 248, 0.25)',
                                          padding: '2px 9px',
                                          borderRadius: '5px'
                                        }}
                                      >
                                        Wave {w.waveNumber}
                                      </span>
                                      {w.claimedAt && (
                                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                          {formatDate(w.claimedAt)}
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      {waveCostDisplay > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                          Costs: <strong style={{ color: '#e2e8f0' }}>{formatNumber(waveCostDisplay)}</strong> Lith
                                        </span>
                                      )}
                                      <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#facc15', fontVariantNumeric: 'tabular-nums' }}>
                                        +{formatNumber(w.msuValue)} MSU
                                      </span>
                                    </div>
                                  </div>

                                  {/* Resource and item badges */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                    <AnomalyResourcePill type="metal" amount={w.metal} />
                                    <AnomalyResourcePill type="crystal" amount={w.crystal} />
                                    <AnomalyResourcePill type="deuterium" amount={w.deuterium} />

                                    {w.ships && Object.entries(w.ships).map(([sName, sCount]) => (
                                      <AnomalyShipPill key={sName} name={sName} count={sCount} />
                                    ))}

                                    {w.lifeformXp > 0 && (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          background: 'rgba(168, 85, 247, 0.1)',
                                          border: '1px solid rgba(168, 85, 247, 0.25)',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          color: '#e9d5ff'
                                        }}
                                      >
                                        <img
                                          src="/icons/resources/lifeform-icon-medium.jpg"
                                          alt="XP"
                                          style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover' }}
                                        />
                                        <span>+{w.lifeformXp.toLocaleString()} XP</span>
                                      </div>
                                    )}

                                    {w.artifacts > 0 && (
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          background: 'rgba(250, 204, 21, 0.1)',
                                          border: '1px solid rgba(250, 204, 21, 0.25)',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          color: '#fef08a'
                                        }}
                                      >
                                        <img
                                          src="/icons/lifeforms/artifact-icon-large.png"
                                          alt="Artifacts"
                                          style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'contain' }}
                                        />
                                        <span>+{w.artifacts.toLocaleString()} Artifacts</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                            No individual wave rewards claimed on this browser yet. Cumulative rewards are tracked on the mission summary.
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Section 3: Wave Battles */}
                {activeSelectedMission.combatReportIds && activeSelectedMission.combatReportIds.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Wave Battles
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                          {activeSelectedMission.combatReportIds.length} {activeSelectedMission.combatReportIds.length === 1 ? 'battle' : 'battles'}
                        </span>
                      </div>

                      {activeSelectedMission.fleetLossesMsu > 0 ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fb7185', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '2px 8px', borderRadius: '4px' }}>
                          Total Losses: -{formatNumber(activeSelectedMission.fleetLossesMsu)} MSU
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '4px' }}>
                          Flawless (No losses)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeSelectedMission.combatReportIds.map((msgId) => {
                        const combat = linkedCombats.find(c => c && String(c.messageId) === String(msgId));
                        const breakdown = combat
                          ? getCombatPlayerAndEnemyLosses(combat, currentAccount?.playerId || activeSelectedMission.playerId, currentAccount?.playerName)
                          : null;

                        const outcome = breakdown ? (
                          breakdown.isWin
                            ? { label: 'VICTORY', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' }
                            : breakdown.isLoss
                            ? { label: 'DEFEAT', color: '#fb7185', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)' }
                            : { label: 'DRAW', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' }
                        ) : null;

                        const lostShipsEntries = breakdown ? Object.entries(breakdown.playerLostShips) : [];
                        const isWin = breakdown?.isWin ?? false;
                        const isLoss = breakdown?.isLoss ?? false;
                        const isDraw = breakdown ? (!isWin && !isLoss) : false;

                        const battleBg = isLoss
                          ? 'linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, rgba(32, 12, 18, 0.75) 100%)'
                          : isDraw
                          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(28, 20, 10, 0.75) 100%)'
                          : isWin
                          ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.07) 0%, rgba(10, 24, 20, 0.75) 100%)'
                          : 'linear-gradient(180deg, rgba(16, 24, 40, 0.6) 0%, rgba(11, 17, 30, 0.75) 100%)';

                        const battleBorder = isLoss
                          ? 'rgba(244, 63, 94, 0.25)'
                          : isDraw
                          ? 'rgba(245, 158, 11, 0.25)'
                          : isWin
                          ? 'rgba(16, 185, 129, 0.22)'
                          : 'rgba(255, 255, 255, 0.07)';

                        const opponentClean = breakdown?.opponentName
                          ? (breakdown.opponentName.toLowerCase() === 'deep space' ? 'Hostile Wave' : breakdown.opponentName)
                          : 'Hostile Wave';

                        return (
                          <div
                            key={msgId}
                            style={{
                              padding: '12px 16px',
                              background: battleBg,
                              border: `1px solid ${battleBorder}`,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {outcome && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      color: outcome.color,
                                      background: outcome.bg,
                                      border: `1px solid ${outcome.border}`,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      letterSpacing: '0.04em'
                                    }}
                                  >
                                    {outcome.label}
                                  </span>
                                )}
                                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>
                                  Encounter vs <strong style={{ color: '#f8fafc' }}>{opponentClean}</strong>
                                </span>
                              </div>
                              {combat && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{formatDate(combat.timestamp)}</span>
                                  {combat.coords && <span>• [{combat.coords}]</span>}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                              {breakdown ? (
                                breakdown.playerLossesMsu > 0 ? (
                                  <>
                                    <span style={{ color: '#fb7185', fontWeight: 800, fontSize: '0.92rem', fontVariantNumeric: 'tabular-nums' }}>
                                      -{formatNumber(breakdown.playerLossesMsu)} MSU
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
                                      {lostShipsEntries.map(([sName, sCount]) => (
                                        <AnomalyShipPill key={sName} name={sName} count={sCount} hideName prefix="-" />
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} color="#34d399" />
                                    0 Casualties (Flawless)
                                  </span>
                                )
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                  Fleet losses deducted
                                </span>
                              )}
                              {breakdown && breakdown.enemyDestroyedMsu > 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                                  +{formatNumber(breakdown.enemyDestroyedMsu)} MSU enemy destroyed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Floating Anomaly Building Tooltip */}
      <AnimatePresence>
        {hoveredBuilding && (() => {
          const b = hoveredBuilding.building;
          const TOOLTIP_WIDTH = 340;
          const TOOLTIP_MARGIN = 20;

          const iconRect = hoveredBuilding.rect || { left: 0, top: 0, width: 0, height: 0, bottom: 0 };
          const centerX = iconRect.left + iconRect.width / 2;

          let leftPos = centerX - TOOLTIP_WIDTH / 2;
          if (leftPos < TOOLTIP_MARGIN) leftPos = TOOLTIP_MARGIN;
          if (leftPos + TOOLTIP_WIDTH > window.innerWidth - TOOLTIP_MARGIN) {
            leftPos = window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
          }

          const spaceAbove = iconRect.top;
          const spaceBelow = window.innerHeight - iconRect.bottom;
          const preferAbove = spaceAbove > 360 || spaceAbove > spaceBelow;

          const verticalPos = preferAbove
            ? { bottom: window.innerHeight - iconRect.top + 10 }
            : { top: iconRect.bottom + 10 };

          const totalEmpireLevel = empireTotals[b.id] || 0;

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: preferAbove ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: preferAbove ? 8 : -8 }}
              style={{
                position: 'fixed',
                left: leftPos,
                ...verticalPos,
                width: TOOLTIP_WIDTH + 'px',
                background: 'rgba(10, 15, 25, 0.98)',
                backdropFilter: 'blur(20px)',
                borderRadius: '18px',
                border: `1.5px solid ${b.color}99`,
                boxShadow: `0 20px 50px rgba(0,0,0,0.85), 0 0 25px ${b.color}33`,
                padding: '18px',
                zIndex: 10000,
                pointerEvents: 'none',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={b.icon}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      border: `2px solid ${b.color}`,
                      objectFit: 'cover',
                      boxShadow: '0 6px 14px rgba(0,0,0,0.5)'
                    }}
                    alt=""
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, color: b.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {b.type === 'facility' ? 'Colony Facility' : 'Bonus Facility'}
                  </div>
                  <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    {b.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {hoveredBuilding.planet.name} [{hoveredBuilding.planet.coords}]
                    </span>
                    <span style={{
                      background: hoveredBuilding.level > 0 ? `${b.color}22` : 'rgba(255,255,255,0.05)',
                      color: hoveredBuilding.level > 0 ? b.color : '#64748b',
                      border: `1px solid ${hoveredBuilding.level > 0 ? b.color + '55' : 'rgba(255,255,255,0.1)'}`,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      Lv {hoveredBuilding.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Local Effect */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Colony Status
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: hoveredBuilding.level > 0 ? '#fff' : '#64748b' }}>
                  {hoveredBuilding.level > 0 ? b.getEffect(hoveredBuilding.level) : 'Not constructed on this colony'}
                </div>
              </div>

              {/* Empire Cumulative Impact */}
              <div style={{ background: `${b.color}10`, borderRadius: '10px', padding: '10px 12px', border: `1px solid ${b.color}33`, marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Empire Cumulative Impact</span>
                  <span>{totalEmpireLevel} Total Lvls</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                  {b.getEffect(totalEmpireLevel)}
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                {b.description}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
