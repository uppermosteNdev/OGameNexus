// ============================================================================
// NEXUS OVERWATCH — ALLIANCE EMPIRE MULTI-PLAYER COMPARISON DECK
// Archetype: Double-Bezel Hardware Avionics / Ethereal Glass
// Compares 2 to 4 alliance commanders side-by-side on Macro metrics,
// Overview Lifeform Bonuses, Ship Multipliers, and Core Technologies.
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Crown,
  Shield,
  X,
  Swords,
  Globe,
  Orbit,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  FlaskConical,
  Boxes,
  Award,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Crosshair
} from 'lucide-react';
import { ThemeIcon } from '../components/ThemeIcon';
import { AllianceEmpireSummary, MemberEmpireDetail } from './OverwatchEmpire';
import {
  LifeformBonusOverviewData,
  getLifeformBonusOverview,
  getBlankLifeformOverview,
  getResourceIcon,
  getExpeditionIcon,
  getShipIcon,
  getResearchIcon
} from '../../db/lfBonusOverviewEngine';
import { OverwatchEmpireHeadToHead } from './OverwatchEmpireHeadToHead';
import { calculateAccountResearchScore } from '../../utils/researchTimeCalc';
import { fetchUniverseHighscores } from '../../utils/ogameHighscores';
import { cleanUniverseId } from '../../utils/universe';
import { getPlayerClassName, SupportedLanguage, getCurrentLanguage } from '../../i18n/gameData';
import { useTranslation } from '../../i18n';
import './OverwatchEmpireComparisonDeck.css';

export interface ShipClassification {
  id: number;
  slug: string;
  category: 'combat' | 'civil';
  classLabel: string;
  role: string;
}

export const SHIP_REGISTRY: Record<string, ShipClassification> = {
  'Light Fighter': { id: 204, slug: 'light-fighter', category: 'combat', classLabel: 'Combat', role: 'Fast light fighter' },
  'Heavy Fighter': { id: 205, slug: 'heavy-fighter', category: 'combat', classLabel: 'Combat', role: 'Armoured combat fighter' },
  'Cruiser': { id: 206, slug: 'cruiser', category: 'combat', classLabel: 'Combat', role: 'Fast cruiser with rapid fire' },
  'Battleship': { id: 207, slug: 'battleship', category: 'combat', classLabel: 'Combat', role: 'Heavy combat ship' },
  'Battlecruiser': { id: 215, slug: 'battlecruiser', category: 'combat', classLabel: 'Combat', role: 'Specialized fleet hunter' },
  'Bomber': { id: 211, slug: 'bomber', category: 'combat', classLabel: 'Combat', role: 'Defense destruction bomber' },
  'Destroyer': { id: 213, slug: 'destroyer', category: 'combat', classLabel: 'Combat', role: 'Heavy capital ship' },
  'Deathstar': { id: 214, slug: 'deathstar', category: 'combat', classLabel: 'Combat', role: 'Heaviest warship and moon destroyer' },
  'Reaper': { id: 218, slug: 'reaper', category: 'combat', classLabel: 'Combat', role: 'Heavy warship with debris collection' },
  'Pathfinder': { id: 219, slug: 'pathfinder', category: 'combat', classLabel: 'Combat', role: 'Expedition discovery ship' },
  'Small Cargo': { id: 202, slug: 'small-cargo', category: 'civil', classLabel: 'Civil', role: 'Fast cargo transport' },
  'Large Cargo': { id: 203, slug: 'large-cargo', category: 'civil', classLabel: 'Civil', role: 'High-capacity cargo transport' },
  'Colony Ship': { id: 208, slug: 'colony-ship', category: 'civil', classLabel: 'Civil', role: 'Colonizes new planets' },
  'Recycler': { id: 209, slug: 'recycler', category: 'civil', classLabel: 'Civil', role: 'Harvests debris fields' },
  'Espionage Probe': { id: 210, slug: 'espionage-probe', category: 'civil', classLabel: 'Civil', role: 'Gathers espionage reports' },
};

export function getShipMeta(name: string): ShipClassification {
  if (SHIP_REGISTRY[name]) return SHIP_REGISTRY[name];
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const isCombat = !slug.includes('cargo') && !slug.includes('colony') && !slug.includes('recycler') && !slug.includes('probe');
  return {
    id: 0,
    slug,
    category: isCombat ? 'combat' : 'civil',
    classLabel: isCombat ? 'Combat' : 'Civil',
    role: 'Fleet Vessel',
  };
}

export function resolveShipIconSrc(name: string): string {
  const iconPath = getShipIcon(name);
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(iconPath.replace(/^\//, ''));
  }
  return iconPath;
}

export interface ComparedPlayerSlot {
  summary: AllianceEmpireSummary;
  detail: MemberEmpireDetail | null;
  lfOverview: LifeformBonusOverviewData;
}

interface OverwatchEmpireComparisonDeckProps {
  players: ComparedPlayerSlot[];
  onBack: () => void;
  onRemovePlayer: (playerId: string) => void;
  onReorderPlayers?: (newOrderIds: string[]) => void;
  universeId?: string;
}

export const SLOT_COLORS = [
  { color: '#00f2ff', bg: 'rgba(0, 242, 255, 0.15)', border: 'rgba(0, 242, 255, 0.45)', glow: 'rgba(0, 242, 255, 0.25)', label: 'Slot 1' },
  { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.45)', glow: 'rgba(251, 191, 36, 0.25)', label: 'Slot 2' },
  { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.45)', glow: 'rgba(74, 222, 128, 0.25)', label: 'Slot 3' },
  { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.45)', glow: 'rgba(192, 132, 252, 0.25)', label: 'Slot 4' },
];

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.floor(num).toLocaleString();
}

export function formatCompact(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  const val = Number(num);
  if (Math.abs(val) >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + 'k';
  return val.toString();
}

export function parsePercent(valStr?: string | null): number {
  if (!valStr) return 0;
  const cleaned = valStr.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function resolvePlayerClass(raw: any, lang?: SupportedLanguage): { label: string; color: string; bg: string; border: string } {
  const norm = String(raw || '').toLowerCase();
  const activeLang = lang || getCurrentLanguage();
  if (norm.includes('1') || norm.includes('collector') || norm.includes('colector') || norm.includes('colectionar') || norm.includes('colecționar') || norm.includes('kollektor') || norm.includes('collecteur') || norm.includes('zbieracz') || norm.includes('verzamelaar') || norm.includes('recolector') || norm.includes('collezionista') || norm.includes('коллекционер') || norm.includes('toplayıcı') || norm.includes('coletor') || norm.includes('colecionador')) {
    return { label: getPlayerClassName('collector', activeLang), color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.35)' };
  }
  if (norm.includes('2') || norm.includes('general') || norm.includes('warrior') || norm.includes('général') || norm.includes('generał') || norm.includes('generaal') || norm.includes('generale') || norm.includes('генерал')) {
    return { label: getPlayerClassName('general', activeLang), color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.35)' };
  }
  if (norm.includes('3') || norm.includes('discoverer') || norm.includes('explorator') || norm.includes('entdecker') || norm.includes('explorateur') || norm.includes('odkrywca') || norm.includes('ontdekker') || norm.includes('descubridor') || norm.includes('esploratore') || norm.includes('первооткрыватель') || norm.includes('kaşif') || norm.includes('kasif') || norm.includes('explorador')) {
    return { label: getPlayerClassName('discoverer', activeLang), color: '#00f2ff', bg: 'rgba(0, 242, 255, 0.12)', border: 'rgba(0, 242, 255, 0.35)' };
  }
  return { label: 'Unassigned', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)' };
}

export function resolveAllianceRole(role?: string | null): { label: string; color: string; bg: string; border: string; icon: React.ReactNode } {
  const norm = String(role || '').toLowerCase();
  if (norm === 'admin' || norm === 'leader' || norm === 'founder') {
    return {
      label: 'Leader',
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.14)',
      border: 'rgba(251, 191, 36, 0.4)',
      icon: <Crown size={10} />
    };
  }
  if (norm === 'visitor') {
    return {
      label: 'Visitor',
      color: '#a78bfa',
      bg: 'rgba(167, 139, 250, 0.14)',
      border: 'rgba(167, 139, 250, 0.4)',
      icon: <Shield size={10} />
    };
  }
  return {
    label: 'Member',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    icon: <Shield size={10} />
  };
}

// Key Technologies Catalog for Comparison
const CORE_TECH_LIST = [
  { id: 124, name: 'Astrophysics', icon: '/icons/research/expedition-tech-research-large.jpg' },
  { id: 122, name: 'Plasma Technology', icon: '/icons/research/plasma-tech-research-large.jpg' },
  { id: 114, name: 'Hyperspace Technology', icon: '/icons/research/hyperspace-tech-research-large.jpg' },
  { id: 118, name: 'Hyperspace Drive', icon: '/icons/research/hyperspace-drive-research-large.jpg' },
  { id: 117, name: 'Impulse Drive', icon: '/icons/research/impulse-drive-research-large.jpg' },
  { id: 115, name: 'Combustion Drive', icon: '/icons/research/combustion-drive-research-large.jpg' },
  { id: 113, name: 'Energy Technology', icon: '/icons/research/energy-research-large.jpg' },
  { id: 109, name: 'Weapons Technology', icon: '/icons/research/weapons-tech-research-large.jpg' },
  { id: 110, name: 'Shielding Technology', icon: '/icons/research/shield-tech-research-large.jpg' },
  { id: 111, name: 'Armour Technology', icon: '/icons/research/armor-tech-research-large.jpg' },
  { id: 106, name: 'Espionage Technology', icon: '/icons/research/espionage-tech-research-large.jpg' },
  { id: 108, name: 'Computer Technology', icon: '/icons/research/computer-tech-research-large.jpg' },
  { id: 123, name: 'Intergalactic Research Net', icon: '/icons/research/integalagtic-research-tech-research-large.jpg' },
  { id: 199, name: 'Graviton Technology', icon: '/icons/research/graviton-tech-research-large.jpg' },
];

export const OverwatchEmpireComparisonDeck: React.FC<OverwatchEmpireComparisonDeckProps> = ({
  players,
  onBack,
  onRemovePlayer,
  onReorderPlayers,
  universeId,
}) => {
  const { language } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<'macro' | 'lifeforms' | 'ships' | 'tech' | 'duel'>('macro');
  const [selectedShipIndex, setSelectedShipIndex] = useState(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Local optimistic player slots for fluid drag transitions
  const [localPlayers, setLocalPlayers] = useState<ComparedPlayerSlot[]>(players);
  const [liveScores, setLiveScores] = useState<Record<string, { economyScore?: number; militaryScore?: number }>>({});

  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  const localPlayerIdsKey = useMemo(() => localPlayers.map(p => p.summary.playerId).join(','), [localPlayers]);

  useEffect(() => {
    const uni = cleanUniverseId(universeId || 's267-en');
    if (!uni || localPlayers.length === 0) return;

    Promise.all([
      fetchUniverseHighscores(uni, 1),
      fetchUniverseHighscores(uni, 3),
    ]).then(([ecoMap, milMap]) => {
      const next: Record<string, { economyScore?: number; militaryScore?: number }> = {};
      localPlayers.forEach(p => {
        const pid = String(p.summary.playerId);
        const eco = ecoMap.get(pid)?.score;
        const mil = milMap.get(pid)?.score;
        if (eco !== undefined || mil !== undefined) {
          next[pid] = { economyScore: eco, militaryScore: mil };
        }
      });
      setLiveScores(prev => ({ ...prev, ...next }));
    }).catch(err => console.warn('[ComparisonDeck] Failed to fetch live highscores:', err));
  }, [localPlayerIdsKey, universeId]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...localPlayers];
    const [draggedItem] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    setLocalPlayers(reordered);
    setDraggedIdx(null);
    setDragOverIdx(null);

    const newOrderIds = reordered.map(p => p.summary.playerId);
    onReorderPlayers?.(newOrderIds);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const colCountClass = `cols-${Math.min(Math.max(localPlayers.length, 2), 4)}`;

  // Highest score leader
  const highestScorePlayerId = useMemo(() => {
    let topId = '';
    let topScore = -1;
    localPlayers.forEach(p => {
      const s = p.summary.totalScore || 0;
      if (s > topScore) {
        topScore = s;
        topId = p.summary.playerId;
      }
    });
    return topId;
  }, [localPlayers]);

  // Helper to render a proportional comparative row
  const renderComparativeRow = (
    label: string,
    subLabel: string | null,
    icon: React.ReactNode,
    extractValue: (p: ComparedPlayerSlot) => { rawNum: number; displayStr: string }
  ) => {
    const values = localPlayers.map(p => extractValue(p));
    const maxVal = Math.max(...values.map(v => v.rawNum), 0);

    return (
      <tr className="ow-compare-row" key={label}>
        <td className="ow-compare-metric-col">
          <div className="ow-compare-metric-cell">
            {icon}
            <div>
              <div className="ow-compare-metric-name">{label}</div>
              {subLabel && <div className="ow-compare-metric-sub">{subLabel}</div>}
            </div>
          </div>
        </td>
        {localPlayers.map((p, idx) => {
          const slotTheme = SLOT_COLORS[idx % SLOT_COLORS.length];
          const valObj = values[idx];
          const isLeader = maxVal > 0 && valObj.rawNum === maxVal;
          const barPct = maxVal > 0 ? Math.max(8, Math.min(100, Math.round((valObj.rawNum / maxVal) * 100))) : 0;

          return (
            <td
              key={p.summary.playerId}
              className="ow-compare-player-cell"
              style={{ '--slot-color': slotTheme.color } as React.CSSProperties}
            >
              <div className="ow-compare-val-wrap">
                <div className="ow-compare-val-line">
                  <span className={`ow-compare-number ${isLeader ? 'is-leader' : ''}`}>
                    {valObj.displayStr}
                  </span>
                  {isLeader && <span className="ow-compare-lead-tag">👑 MAX</span>}
                </div>
                <div className="ow-compare-bar-track">
                  <div
                    className="ow-compare-bar-fill"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  // List of ships available in the lifeform overview
  const availableShips = useMemo(() => {
    const firstWithShips = localPlayers.find(p => p.lfOverview?.ships && p.lfOverview.ships.length > 0);
    return firstWithShips?.lfOverview.ships.map(s => s.name) || [
      'Light Fighter',
      'Heavy Fighter',
      'Cruiser',
      'Battleship',
      'Battlecruiser',
      'Bomber',
      'Destroyer',
      'Deathstar',
      'Reaper',
      'Pathfinder',
      'Small Cargo',
      'Large Cargo',
      'Colony Ship',
      'Recycler',
      'Espionage Probe',
    ];
  }, [localPlayers]);

  const [shipFleetFilter, setShipFleetFilter] = useState<'all' | 'combat' | 'civil'>('all');
  const shipCarouselRef = useRef<HTMLDivElement>(null);

  const scrollShipCarousel = (direction: 'left' | 'right') => {
    if (shipCarouselRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      shipCarouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const filteredShips = useMemo(() => {
    if (shipFleetFilter === 'all') return availableShips;
    return availableShips.filter(name => {
      const meta = getShipMeta(name);
      return meta.category === shipFleetFilter;
    });
  }, [availableShips, shipFleetFilter]);

  const activeShipName = availableShips[selectedShipIndex] || availableShips[0] || 'Light Fighter';
  const activeShipMeta = useMemo(() => getShipMeta(activeShipName), [activeShipName]);

  return (
    <div className="ow-compare-deck-root">
      {/* Top Header & Breadcrumb Bar */}
      <div className="ow-compare-top-bar">
        <button
          type="button"
          className="ow-compare-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          <span>Exit Comparison</span>
        </button>

        <div className="ow-compare-title-block">
          <span className="ow-compare-badge">Player Comparison</span>
          <h2 className="ow-compare-title">Empire Comparison</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <span>Viewing <strong>{localPlayers.length}</strong> of 4 Players</span>
          <span className="ow-compare-drag-pill" title="Drag cards left or right to reorder players (Slots 1 & 2 compare in 1v1)">
            <GripVertical size={11} /> Drag to reorder
          </span>
        </div>
      </div>

      {/* Sticky Heads-Up Deck: Player Identity Cards */}
      <div className={`ow-compare-hud-deck ${colCountClass}`}>
        {localPlayers.map((p, idx) => {
          const slotTheme = SLOT_COLORS[idx % SLOT_COLORS.length];
          const pClass = resolvePlayerClass(p.summary.playerClass, language);
          const pRole = resolveAllianceRole(p.summary.role);
          const avatarSrc = p.summary.avatarUrl;
          const isBenched = activeCategory === 'duel' && localPlayers.length > 2 && idx >= 2;

          return (
            <div
              key={p.summary.playerId}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnter={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`ow-compare-player-shell ${draggedIdx === idx ? 'is-dragging' : ''} ${dragOverIdx === idx && draggedIdx !== idx ? 'is-drag-over' : ''} ${isBenched ? 'is-benched' : ''}`}
              style={{ '--slot-color': slotTheme.color } as React.CSSProperties}
              title={isBenched ? "Drag into Slot 1 or 2 to compare in 1v1" : "Drag left or right to reorder players (Slots 1 & 2 compare in 1v1)"}
            >
              <div className="ow-compare-player-inner">
                <div className="ow-compare-player-left">
                  <div
                    className="ow-compare-drag-handle"
                    title="Drag left or right to reorder"
                  >
                    <GripVertical size={13} />
                  </div>
                  <div className="ow-compare-player-avatar-wrap">
                    <svg className="ow-compare-player-ring" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke={slotTheme.color}
                        strokeWidth="3"
                        strokeDasharray="8 6"
                        opacity="0.85"
                      />
                    </svg>
                    <div className="ow-compare-player-avatar-core">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={p.summary.playerName}
                          className="ow-compare-player-avatar-img"
                        />
                      ) : (
                        <span className="ow-compare-player-avatar-char">
                          {p.summary.playerName[0]?.toUpperCase() || 'C'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ow-compare-player-info">
                    <div className="ow-compare-player-name-row">
                      <h3 className="ow-compare-player-name" title={p.summary.playerName}>
                        {p.summary.playerName}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        className="ow-class-badge mini"
                        style={{ color: pClass.color, backgroundColor: pClass.bg, borderColor: pClass.border }}
                      >
                        {pClass.label}
                      </span>
                    </div>

                    <div className="ow-compare-score-strip">
                      <span>Points:</span>
                      <strong>{formatCompact(p.summary.totalScore)}</strong>
                    </div>
                  </div>
                </div>

                <div className="ow-compare-player-right" onMouseDown={e => e.stopPropagation()}>
                  {localPlayers.length > 2 && (
                    <button
                      type="button"
                      className="ow-compare-remove-btn"
                      onClick={() => onRemovePlayer(p.summary.playerId)}
                      title={`Remove ${p.summary.playerName} from comparison`}
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {isBenched && (
                      <span className="ow-compare-standby-pill" title="Drag into Slot 1 or 2 to compare in 1v1">
                        STANDBY
                      </span>
                    )}
                    <span
                      className="ow-compare-role-badge"
                      style={{
                        color: pRole.color,
                        backgroundColor: pRole.bg,
                        borderColor: pRole.border
                      }}
                      title={`Alliance Role: ${pRole.label}`}
                    >
                      {pRole.icon}
                      <span>{pRole.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Subtab Navigation */}
      <div className="ow-compare-cat-tabs">
        <button
          type="button"
          className={`ow-compare-cat-btn ${activeCategory === 'macro' ? 'active' : ''}`}
          onClick={() => setActiveCategory('macro')}
        >
          <ThemeIcon name="city-buildings" size={15} />
          <span>Overview & Economy</span>
        </button>

        <button
          type="button"
          className={`ow-compare-cat-btn ${activeCategory === 'lifeforms' ? 'active' : ''}`}
          onClick={() => setActiveCategory('lifeforms')}
        >
          <ThemeIcon name="leaf" size={15} />
          <span>Lifeform Bonuses</span>
        </button>

        <button
          type="button"
          className={`ow-compare-cat-btn ${activeCategory === 'ships' ? 'active' : ''}`}
          onClick={() => setActiveCategory('ships')}
        >
          <Swords size={15} />
          <span>Ship Multipliers</span>
        </button>

        <button
          type="button"
          className={`ow-compare-cat-btn ${activeCategory === 'tech' ? 'active' : ''}`}
          onClick={() => setActiveCategory('tech')}
        >
          <FlaskConical size={15} />
          <span>Research</span>
        </button>

        <button
          type="button"
          className={`ow-compare-cat-btn duel-tab ${activeCategory === 'duel' ? 'active' : ''}`}
          onClick={() => setActiveCategory('duel')}
        >
          <Swords size={15} className="duel-tab-icon" />
          <span>1v1 Comparison</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------------
          CATEGORY 1: OVERVIEW & ECONOMY
          ---------------------------------------------------------------------- */}
      {activeCategory === 'macro' && (
        <div className="ow-compare-matrix-card">
          <div className="ow-compare-matrix-header">
            <span className="ow-compare-matrix-title">
              <ThemeIcon name="combo-chart" size={15} />
              <span>Scores & Production</span>
            </span>
          </div>

          <table className="ow-compare-matrix-table">
            <tbody>
              {/* Total Score */}
              {renderComparativeRow(
                'Total Score',
                'Highscore points',
                <Crown size={15} style={{ color: '#fbbf24' }} />,
                p => {
                  const score = p.detail?.totalScore || p.summary.totalScore || 0;
                  return {
                    rawNum: score,
                    displayStr: formatNumber(score),
                  };
                }
              )}

              {/* Economy Score */}
              {renderComparativeRow(
                'Economy Score',
                'Structures and defenses',
                <ThemeIcon name="factory" size={15} />,
                p => {
                  const pid = String(p.summary.playerId);
                  const eco = liveScores[pid]?.economyScore ?? (p.detail?.economyScore || p.summary.economyScore || 0);
                  return {
                    rawNum: eco,
                    displayStr: formatNumber(eco),
                  };
                }
              )}

              {/* Military Score */}
              {renderComparativeRow(
                'Military Score',
                'Fleet and defense points',
                <Swords size={15} style={{ color: '#f87171' }} />,
                p => {
                  const pid = String(p.summary.playerId);
                  const mil = liveScores[pid]?.militaryScore ?? (p.detail?.militaryScore || p.summary.militaryScore || 0);
                  return {
                    rawNum: mil,
                    displayStr: formatNumber(mil),
                  };
                }
              )}

              {/* Research Score */}
              {renderComparativeRow(
                'Research Score',
                'Research points',
                <FlaskConical size={15} style={{ color: '#c084fc' }} />,
                p => {
                  const computedScore = calculateAccountResearchScore(p.detail?.empire?.researches || []);
                  const finalScore = Math.max(p.summary.researchScore || 0, computedScore);
                  return {
                    rawNum: finalScore,
                    displayStr: formatNumber(finalScore),
                  };
                }
              )}

              {/* Colonies Count */}
              {renderComparativeRow(
                'Planets & Moons',
                'Total planets and moons',
                <Globe size={15} style={{ color: '#00f2ff' }} />,
                p => ({
                  rawNum: p.summary.planetCount || 0,
                  displayStr: `${p.summary.planetCount || 0} 🪐 / ${p.summary.moonCount || 0} 🌙`,
                })
              )}

              {/* Total Daily MSU Production */}
              {renderComparativeRow(
                'Daily Production (MSU)',
                'M + 1.5×C + 3×D',
                <Zap size={15} style={{ color: '#fbbf24' }} />,
                p => {
                  const msuDaily = Math.round(
                    ((p.summary.totalMetalHourly || 0) +
                      (p.summary.totalCrystalHourly || 0) * 1.5 +
                      (p.summary.totalDeutHourly || 0) * 3) *
                      24
                  );
                  return {
                    rawNum: msuDaily,
                    displayStr: `+${formatCompact(msuDaily)} MSU/d`,
                  };
                }
              )}

              {/* Metal Daily */}
              {renderComparativeRow(
                'Daily Metal Production',
                'Daily metal output',
                <span style={{ fontSize: '13px' }}>⛏️</span>,
                p => {
                  const metalDaily = Math.round((p.summary.totalMetalHourly || 0) * 24);
                  return {
                    rawNum: metalDaily,
                    displayStr: `+${formatCompact(metalDaily)} M/d`,
                  };
                }
              )}

              {/* Crystal Daily */}
              {renderComparativeRow(
                'Daily Crystal Production',
                'Daily crystal output',
                <span style={{ fontSize: '13px' }}>💎</span>,
                p => {
                  const crystalDaily = Math.round((p.summary.totalCrystalHourly || 0) * 24);
                  return {
                    rawNum: crystalDaily,
                    displayStr: `+${formatCompact(crystalDaily)} C/d`,
                  };
                }
              )}

              {/* Deut Daily */}
              {renderComparativeRow(
                'Daily Deuterium Production',
                'Daily deuterium output',
                <span style={{ fontSize: '13px' }}>💧</span>,
                p => {
                  const deutDaily = Math.round((p.summary.totalDeutHourly || 0) * 24);
                  return {
                    rawNum: deutDaily,
                    displayStr: `+${formatCompact(deutDaily)} D/d`,
                  };
                }
              )}

              {/* Average Metal Mine */}
              {renderComparativeRow(
                'Average Metal Mine',
                'Average level',
                <span style={{ fontSize: '13px' }}>⛏️</span>,
                p => ({
                  rawNum: p.summary.avgMetalMine || 0,
                  displayStr: `Lv ${p.summary.avgMetalMine || 0}`,
                })
              )}

              {/* Average Crystal Mine */}
              {renderComparativeRow(
                'Average Crystal Mine',
                'Average level',
                <span style={{ fontSize: '13px' }}>💎</span>,
                p => ({
                  rawNum: p.summary.avgCrystalMine || 0,
                  displayStr: `Lv ${p.summary.avgCrystalMine || 0}`,
                })
              )}

              {/* Average Deut Mine */}
              {renderComparativeRow(
                'Average Deuterium Synthesizer',
                'Average level',
                <span style={{ fontSize: '13px' }}>💧</span>,
                p => ({
                  rawNum: p.summary.avgDeutMine || 0,
                  displayStr: `Lv ${p.summary.avgDeutMine || 0}`,
                })
              )}

              {/* Total Fleet MSU */}
              {renderComparativeRow(
                'Fleet Value (MSU)',
                'Fleet cost in MSU',
                <Swords size={15} style={{ color: '#00f2ff' }} />,
                p => ({
                  rawNum: p.summary.totalFleetMsu || 0,
                  displayStr: `${formatCompact(p.summary.totalFleetMsu || 0)} MSU`,
                })
              )}

              {/* Total Ships Count */}
              {renderComparativeRow(
                'Total Ships',
                'All civilian and combat ships',
                <span style={{ fontSize: '13px' }}>🚀</span>,
                p => ({
                  rawNum: p.summary.totalShips || 0,
                  displayStr: `${formatNumber(p.summary.totalShips)} ships`,
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          CATEGORY 2: LIFEFORM BONUSES (OVERVIEW TAB STATS)
          ---------------------------------------------------------------------- */}
      {activeCategory === 'lifeforms' && (
        <div className="ow-compare-matrix-card">
          <div className="ow-compare-matrix-header">
            <span className="ow-compare-matrix-title">
              <ThemeIcon name="leaf" size={15} />
              <span>Lifeform Bonuses</span>
            </span>
          </div>

          <table className="ow-compare-matrix-table">
            <tbody>
              {/* Species Tiers */}
              {['Humans', "Rock'tal", 'Mechas', 'Kaelesh'].map((speciesName, sIdx) => {
                const lfId = sIdx + 1;
                return renderComparativeRow(
                  `${speciesName} Level`,
                  'Experience level',
                  <Sparkles size={15} style={{ color: '#fbbf24' }} />,
                  p => {
                    const expItem = p.lfOverview?.experienceLevels?.find(e => e.lifeformId === lfId);
                    const lvl = expItem?.level || 0;
                    const bonusPct = expItem?.bonus || lvl * 0.1;
                    return {
                      rawNum: lvl,
                      displayStr: `Lvl ${lvl} (+${bonusPct.toFixed(1)}%)`,
                    };
                  }
                );
              })}

              {/* Resource Production Bonuses */}
              {renderComparativeRow(
                'Metal Production Bonus',
                'Lifeform tech',
                <span style={{ fontSize: '13px' }}>⛏️</span>,
                p => {
                  const item = p.lfOverview?.resources?.find(r => r.key === 'metal');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'Crystal Production Bonus',
                'Lifeform tech',
                <span style={{ fontSize: '13px' }}>💎</span>,
                p => {
                  const item = p.lfOverview?.resources?.find(r => r.key === 'crystal');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'Deuterium Production Bonus',
                'Lifeform tech',
                <span style={{ fontSize: '13px' }}>💧</span>,
                p => {
                  const item = p.lfOverview?.resources?.find(r => r.key === 'deuterium');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {/* Expedition Bonuses */}
              {renderComparativeRow(
                'Dark Matter Bonus',
                'Expedition bonus',
                <Award size={15} style={{ color: '#00f2ff' }} />,
                p => {
                  const item = p.lfOverview?.expedition?.find(e => e.key === 'DMBooster');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'Resource Discovery Bonus',
                'Expedition bonus',
                <Boxes size={15} style={{ color: '#4ade80' }} />,
                p => {
                  const item = p.lfOverview?.expedition?.find(e => e.key === 'ResultBooster');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'Expedition Ship Recovery',
                'Expedition bonus',
                <Swords size={15} style={{ color: '#f87171' }} />,
                p => {
                  const item = p.lfOverview?.expedition?.find(e => e.key === 'ShipResultBooster');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {/* Character Class Boosts */}
              {renderComparativeRow(
                'Discoverer Class Bonus',
                'Class bonus',
                <Globe size={15} style={{ color: '#00f2ff' }} />,
                p => {
                  const item = p.lfOverview?.characterClasses?.find(c => c.name === 'Discoverer');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'Collector Class Bonus',
                'Class bonus',
                <ThemeIcon name="factory" size={15} />,
                p => {
                  const item = p.lfOverview?.characterClasses?.find(c => c.name === 'Collector');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}

              {renderComparativeRow(
                'General Class Bonus',
                'Class bonus',
                <Swords size={15} style={{ color: '#f87171' }} />,
                p => {
                  const item = p.lfOverview?.characterClasses?.find(c => c.name === 'General');
                  const pct = parsePercent(item?.total);
                  return { rawNum: pct, displayStr: `+${item?.total || '0.00%'}` };
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          CATEGORY 3: SHIP MULTIPLIERS (COMBAT & CIVIL)
          ---------------------------------------------------------------------- */}
      {activeCategory === 'ships' && (
        <div className="ow-compare-matrix-card">
          {/* Ship Selector Shelf */}
          <div className="ow-ship-selector-deck">
            <div className="ow-ship-deck-top">
              <div className="ow-ship-deck-title-group">
                <div className="ow-ship-deck-icon-badge">
                  <Swords size={17} />
                </div>
                <div>
                  <h4 className="ow-ship-deck-heading">
                    Ship Lifeform Bonuses
                  </h4>
                  <span className="ow-ship-deck-subheading">
                    Lifeform bonuses for weapons, shields, armour, speed, cargo and fuel
                  </span>
                </div>
              </div>

              {/* Fleet Filter Segments */}
              <div className="ow-ship-filter-segments">
                <button
                  type="button"
                  onClick={() => setShipFleetFilter('all')}
                  className={`ow-ship-filter-btn ${shipFleetFilter === 'all' ? 'active' : ''}`}
                >
                  <span>All Ships</span>
                  <span className="count-badge">{availableShips.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShipFleetFilter('combat')}
                  className={`ow-ship-filter-btn ${shipFleetFilter === 'combat' ? 'active' : ''}`}
                >
                  <Swords size={11} />
                  <span>Combat Ships</span>
                  <span className="count-badge">
                    {availableShips.filter(s => getShipMeta(s).category === 'combat').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShipFleetFilter('civil')}
                  className={`ow-ship-filter-btn ${shipFleetFilter === 'civil' ? 'active' : ''}`}
                >
                  <Boxes size={11} />
                  <span>Civil Ships</span>
                  <span className="count-badge">
                    {availableShips.filter(s => getShipMeta(s).category === 'civil').length}
                  </span>
                </button>
              </div>
            </div>

            {/* Interactive Ship Carousel */}
            <div className="ow-ship-carousel-container">
              <button
                type="button"
                className="ow-ship-carousel-nav-btn"
                onClick={() => scrollShipCarousel('left')}
                title="Scroll Left"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="ow-ship-carousel-track" ref={shipCarouselRef}>
                {filteredShips.map((sName) => {
                  const globalIdx = availableShips.indexOf(sName);
                  const isSelected = globalIdx === selectedShipIndex;
                  const meta = getShipMeta(sName);
                  const iconSrc = resolveShipIconSrc(sName);

                  return (
                    <button
                      key={sName}
                      type="button"
                      onClick={() => setSelectedShipIndex(globalIdx)}
                      className={`ow-ship-chip ${isSelected ? 'active' : ''}`}
                    >
                      <div className="ow-ship-chip-inner">
                        <div className="ow-ship-chip-thumb">
                          <img
                            src={iconSrc}
                            alt={sName}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = resolveShipIconSrc('Light Fighter');
                            }}
                          />
                        </div>
                        <div className="ow-ship-chip-meta">
                          <span className="ow-ship-chip-role">{meta.classLabel}</span>
                          <span className="ow-ship-chip-name">{sName}</span>
                        </div>
                        <div className="ow-ship-chip-beacon" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="ow-ship-carousel-nav-btn"
                onClick={() => scrollShipCarousel('right')}
                title="Scroll Right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Active Vessel Spotlight Banner */}
          <div className="ow-ship-active-banner">
            <div className="ow-ship-active-banner-left">
              <div className="ow-ship-active-avatar">
                <img
                  src={resolveShipIconSrc(activeShipName)}
                  alt={activeShipName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = resolveShipIconSrc('Light Fighter');
                  }}
                />
              </div>
              <div className="ow-ship-active-details">
                <span className="ow-ship-active-eyebrow">
                  <Sparkles size={11} />
                  Selected Ship • {activeShipMeta.classLabel}
                </span>
                <h3 className="ow-ship-active-title">
                  {activeShipName}
                </h3>
                <p className="ow-ship-active-desc">
                  {activeShipMeta.role} — Comparing lifeform weapon, shield, armour, speed, cargo and fuel bonuses across players.
                </p>
              </div>
            </div>

            <div className="ow-ship-active-pill">
              <Crosshair size={12} />
              <span>6 Ship Bonuses</span>
            </div>
          </div>

          <table className="ow-compare-matrix-table">
            <tbody>
              {/* Weapons Boost */}
              {renderComparativeRow(
                `${activeShipName} Weapons`,
                'Weapon bonus',
                <Swords size={15} style={{ color: '#f87171' }} />,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.weapons);
                  return { rawNum: pct, displayStr: `+${s?.weapons || '0.00%'}` };
                }
              )}

              {/* Shield Boost */}
              {renderComparativeRow(
                `${activeShipName} Shield`,
                'Shield bonus',
                <ThemeIcon name="defense" size={15} />,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.shield);
                  return { rawNum: pct, displayStr: `+${s?.shield || '0.00%'}` };
                }
              )}

              {/* Armour Boost */}
              {renderComparativeRow(
                `${activeShipName} Armour`,
                'Armour bonus',
                <ThemeIcon name="defense" size={15} />,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.armour);
                  return { rawNum: pct, displayStr: `+${s?.armour || '0.00%'}` };
                }
              )}

              {/* Speed Boost */}
              {renderComparativeRow(
                `${activeShipName} Speed`,
                'Speed bonus',
                <Zap size={15} style={{ color: '#00f2ff' }} />,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.speed);
                  return { rawNum: pct, displayStr: `+${s?.speed || '0.00%'}` };
                }
              )}

              {/* Cargo Capacity */}
              {renderComparativeRow(
                `${activeShipName} Cargo Capacity`,
                'Cargo capacity bonus',
                <Boxes size={15} style={{ color: '#fbbf24' }} />,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.cargo);
                  return { rawNum: pct, displayStr: `+${s?.cargo || '0.00%'}` };
                }
              )}

              {/* Fuel Reduction */}
              {renderComparativeRow(
                `${activeShipName} Fuel Consumption`,
                'Deuterium consumption reduction',
                <span style={{ fontSize: '13px' }}>💧</span>,
                p => {
                  const s = p.lfOverview?.ships?.find(ship => ship.name.toLowerCase() === activeShipName.toLowerCase());
                  const pct = parsePercent(s?.fuel);
                  return { rawNum: pct, displayStr: `${s?.fuel || '0.00%'}` };
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          CATEGORY 4: CORE RESEARCH MATRIX
          ---------------------------------------------------------------------- */}
      {activeCategory === 'tech' && (
        <div className="ow-compare-matrix-card">
          <div className="ow-compare-matrix-header">
            <span className="ow-compare-matrix-title">
              <FlaskConical size={15} />
              <span>Research Levels</span>
            </span>
          </div>

          <table className="ow-compare-matrix-table">
            <tbody>
              {CORE_TECH_LIST.map(tech =>
                renderComparativeRow(
                  tech.name,
                  'Research',
                  tech.icon ? (
                    <img
                      src={tech.icon}
                      alt={tech.name}
                      style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }}
                      onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <FlaskConical size={15} style={{ color: '#c084fc' }} />
                  ),
                  p => {
                    const researches = p.detail?.empire?.researches || [];
                    const found = researches.find(r => r.id === tech.id);
                    const lvl = found?.level || 0;
                    return {
                      rawNum: lvl,
                      displayStr: `Level ${lvl}`,
                    };
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          CATEGORY 5: 1v1 HEAD-TO-HEAD DUEL ARENA
          ---------------------------------------------------------------------- */}
      {activeCategory === 'duel' && (
        <OverwatchEmpireHeadToHead players={localPlayers} />
      )}
    </div>
  );
};

export default OverwatchEmpireComparisonDeck;
