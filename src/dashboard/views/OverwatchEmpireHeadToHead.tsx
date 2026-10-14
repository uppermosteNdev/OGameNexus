// ============================================================================
// NEXUS OVERWATCH — 1v1 HEAD-TO-HEAD EMPIRE DUEL ARENA
// Archetype: Ethereal Glass / Double-Bezel Hardware Avionics
// High-End Agency Standard: Haptic depth, bi-directional tug-of-war gauges,
// metric-by-metric delta breakdowns, and shareable tactical dossiers.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Swords,
  Crown,
  TrendingUp,
  Flame,
  Shield,
  Zap,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Award,
  ChevronDown,
  Rocket,
  FlaskConical
} from 'lucide-react';
import { ThemeIcon } from '../components/ThemeIcon';
import {
  ComparedPlayerSlot,
  resolvePlayerClass,
  resolveAllianceRole,
  formatCompact,
  formatNumber,
  parsePercent
} from './OverwatchEmpireComparisonDeck';
import { calculateAccountResearchScore } from '../../utils/researchTimeCalc';

interface OverwatchEmpireHeadToHeadProps {
  players: ComparedPlayerSlot[];
}

interface DuelMetric {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  iconImg?: string;
  category: 'economy' | 'military' | 'research' | 'lifeforms';
  val1: number;
  val2: number;
  display1: string;
  display2: string;
  unit?: string;
  higherIsBetter?: boolean;
}

export const OverwatchEmpireHeadToHead: React.FC<OverwatchEmpireHeadToHeadProps> = ({ players }) => {
  // Contenders are strictly the first two players in the comparison deck (Slots 1 & 2)
  const p1 = players[0];
  const p2 = players[1] || players[0];
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [activeSectorFilter, setActiveSectorFilter] = useState<'all' | 'economy' | 'military' | 'research' | 'lifeforms'>('all');

  // Helper to extract a research level from detail or fallback
  const getTechLevel = (slot: ComparedPlayerSlot, techId: number): number => {
    const r = slot.detail?.empire?.researches?.find(item => item.id === techId);
    return r?.level ?? 0;
  };

  // Helper to extract a lifeform resource bonus percentage
  const getResourceBonus = (slot: ComparedPlayerSlot, key: 'metal' | 'crystal' | 'deuterium'): number => {
    const item = slot.lfOverview?.resources?.find(r => r.key === key);
    return parsePercent(item?.total);
  };

  // Helper to extract tech reduction bonus
  const getTechBonus = (slot: ComparedPlayerSlot, nameMatch: string): number => {
    const item = slot.lfOverview?.costAndTime?.find(c => c.name?.toLowerCase().includes(nameMatch.toLowerCase()));
    return parsePercent(item?.timeReduction || item?.costReduction);
  };

  // Helper to extract ship fuel reduction bonus
  const getShipFuelBonus = (slot: ComparedPlayerSlot, shipName: string): number => {
    const item = slot.lfOverview?.ships?.find(s => s.name?.toLowerCase().includes(shipName.toLowerCase()));
    return parsePercent(item?.fuel);
  };

  // Build the complete list of duel metrics
  const duelMetrics: DuelMetric[] = useMemo(() => {
    if (!p1 || !p2) return [];

    const list: DuelMetric[] = [
      // 1. ECONOMY
      {
        id: 'total_score',
        label: 'Total Score',
        icon: <Crown size={16} style={{ color: '#fbbf24' }} />,
        category: 'economy',
        val1: p1.summary.totalScore || 0,
        val2: p2.summary.totalScore || 0,
        display1: formatNumber(p1.summary.totalScore),
        display2: formatNumber(p2.summary.totalScore),
      },
      {
        id: 'daily_msu',
        label: 'Daily Production (MSU)',
        iconImg: '/icons/misc/resources-icon-medium.png',
        icon: <Flame size={15} style={{ color: '#00f2ff' }} />,
        category: 'economy',
        val1: Math.round(((p1.summary.totalMetalHourly || 0) + (p1.summary.totalCrystalHourly || 0) * 1.5 + (p1.summary.totalDeutHourly || 0) * 3) * 24),
        val2: Math.round(((p2.summary.totalMetalHourly || 0) + (p2.summary.totalCrystalHourly || 0) * 1.5 + (p2.summary.totalDeutHourly || 0) * 3) * 24),
        display1: `+${formatCompact(Math.round(((p1.summary.totalMetalHourly || 0) + (p1.summary.totalCrystalHourly || 0) * 1.5 + (p1.summary.totalDeutHourly || 0) * 3) * 24))} MSU/d`,
        display2: `+${formatCompact(Math.round(((p2.summary.totalMetalHourly || 0) + (p2.summary.totalCrystalHourly || 0) * 1.5 + (p2.summary.totalDeutHourly || 0) * 3) * 24))} MSU/d`,
      },
      {
        id: 'daily_metal',
        label: 'Daily Metal Production',
        iconImg: '/icons/resources/metal-icon-medium.jpg',
        category: 'economy',
        val1: Math.round((p1.summary.totalMetalHourly || 0) * 24),
        val2: Math.round((p2.summary.totalMetalHourly || 0) * 24),
        display1: `+${formatCompact(Math.round((p1.summary.totalMetalHourly || 0) * 24))} M/d`,
        display2: `+${formatCompact(Math.round((p2.summary.totalMetalHourly || 0) * 24))} M/d`,
      },
      {
        id: 'daily_crystal',
        label: 'Daily Crystal Production',
        iconImg: '/icons/resources/crystal-icon-medium.jpg',
        category: 'economy',
        val1: Math.round((p1.summary.totalCrystalHourly || 0) * 24),
        val2: Math.round((p2.summary.totalCrystalHourly || 0) * 24),
        display1: `+${formatCompact(Math.round((p1.summary.totalCrystalHourly || 0) * 24))} C/d`,
        display2: `+${formatCompact(Math.round((p2.summary.totalCrystalHourly || 0) * 24))} C/d`,
      },
      {
        id: 'daily_deut',
        label: 'Daily Deuterium Production',
        iconImg: '/icons/resources/deuterium-icon-medium.jpg',
        category: 'economy',
        val1: Math.round((p1.summary.totalDeutHourly || 0) * 24),
        val2: Math.round((p2.summary.totalDeutHourly || 0) * 24),
        display1: `+${formatCompact(Math.round((p1.summary.totalDeutHourly || 0) * 24))} D/d`,
        display2: `+${formatCompact(Math.round((p2.summary.totalDeutHourly || 0) * 24))} D/d`,
      },
      {
        id: 'avg_metal_mine',
        label: 'Average Metal Mine',
        iconImg: '/icons/resources/metal_mine_large.jpg',
        category: 'economy',
        val1: p1.summary.avgMetalMine || 0,
        val2: p2.summary.avgMetalMine || 0,
        display1: `Lv ${p1.summary.avgMetalMine ? (p1.summary.avgMetalMine).toFixed(1) : '—'}`,
        display2: `Lv ${p2.summary.avgMetalMine ? (p2.summary.avgMetalMine).toFixed(1) : '—'}`,
      },
      {
        id: 'avg_crystal_mine',
        label: 'Average Crystal Mine',
        iconImg: '/icons/resources/crystal_mine_large.jpg',
        category: 'economy',
        val1: p1.summary.avgCrystalMine || 0,
        val2: p2.summary.avgCrystalMine || 0,
        display1: `Lv ${p1.summary.avgCrystalMine ? (p1.summary.avgCrystalMine).toFixed(1) : '—'}`,
        display2: `Lv ${p2.summary.avgCrystalMine ? (p2.summary.avgCrystalMine).toFixed(1) : '—'}`,
      },
      {
        id: 'avg_deut_mine',
        label: 'Average Deuterium Synthesizer',
        iconImg: '/icons/resources/deuterium_mine_large.jpg',
        category: 'economy',
        val1: p1.summary.avgDeutMine || 0,
        val2: p2.summary.avgDeutMine || 0,
        display1: `Lv ${p1.summary.avgDeutMine ? (p1.summary.avgDeutMine).toFixed(1) : '—'}`,
        display2: `Lv ${p2.summary.avgDeutMine ? (p2.summary.avgDeutMine).toFixed(1) : '—'}`,
      },
      {
        id: 'planetary_span',
        label: 'Planets & Moons',
        iconImg: '/icons/misc/discoverer_bigger_planets.png',
        icon: <ThemeIcon name="globe" size={15} />,
        category: 'economy',
        val1: (p1.summary.planetCount || 0) + (p1.summary.moonCount || 0),
        val2: (p2.summary.planetCount || 0) + (p2.summary.moonCount || 0),
        display1: `${p1.summary.planetCount || 0} 🪐 / ${p1.summary.moonCount || 0} 🌙`,
        display2: `${p2.summary.planetCount || 0} 🪐 / ${p2.summary.moonCount || 0} 🌙`,
      },

      // 2. MILITARY & FLEET
      {
        id: 'total_ships',
        label: 'Total Ships',
        iconImg: '/icons/ships/ship-armada-large.jpg',
        category: 'military',
        val1: p1.summary.totalShips || 0,
        val2: p2.summary.totalShips || 0,
        display1: `${formatCompact(p1.summary.totalShips || 0)} ships`,
        display2: `${formatCompact(p2.summary.totalShips || 0)} ships`,
      },
      {
        id: 'fleet_msu',
        label: 'Fleet Value (MSU)',
        iconImg: '/icons/ships/battleship-large.jpg',
        category: 'military',
        val1: p1.summary.totalFleetMsu || 0,
        val2: p2.summary.totalFleetMsu || 0,
        display1: `${formatCompact(p1.summary.totalFleetMsu || 0)} MSU`,
        display2: `${formatCompact(p2.summary.totalFleetMsu || 0)} MSU`,
      },
      {
        id: 'weapons_tech',
        label: 'Weapons Technology',
        iconImg: '/icons/research/weapons-tech-research-large.jpg',
        category: 'military',
        val1: getTechLevel(p1, 109),
        val2: getTechLevel(p2, 109),
        display1: `Level ${getTechLevel(p1, 109)}`,
        display2: `Level ${getTechLevel(p2, 109)}`,
      },
      {
        id: 'shield_tech',
        label: 'Shielding Technology',
        iconImg: '/icons/research/shield-tech-research-large.jpg',
        category: 'military',
        val1: getTechLevel(p1, 110),
        val2: getTechLevel(p2, 110),
        display1: `Level ${getTechLevel(p1, 110)}`,
        display2: `Level ${getTechLevel(p2, 110)}`,
      },
      {
        id: 'armor_tech',
        label: 'Armour Technology',
        iconImg: '/icons/research/armor-tech-research-large.jpg',
        category: 'military',
        val1: getTechLevel(p1, 111),
        val2: getTechLevel(p2, 111),
        display1: `Level ${getTechLevel(p1, 111)}`,
        display2: `Level ${getTechLevel(p2, 111)}`,
      },

      // 3. RESEARCH & SCIENCE
      (() => {
        const c1 = calculateAccountResearchScore(p1.detail?.empire?.researches || []);
        const c2 = calculateAccountResearchScore(p2.detail?.empire?.researches || []);
        const s1 = Math.max(p1.summary.researchScore || 0, c1);
        const s2 = Math.max(p2.summary.researchScore || 0, c2);
        return {
          id: 'research_score',
          label: 'Research Score',
          iconImg: '/icons/facilities/research_lab_large.jpg',
          category: 'research',
          val1: s1,
          val2: s2,
          display1: formatCompact(s1),
          display2: formatCompact(s2),
        };
      })(),
      {
        id: 'astrophysics',
        label: 'Astrophysics',
        iconImg: '/icons/research/expedition-tech-research-large.jpg',
        category: 'research',
        val1: getTechLevel(p1, 124),
        val2: getTechLevel(p2, 124),
        display1: `Level ${getTechLevel(p1, 124)}`,
        display2: `Level ${getTechLevel(p2, 124)}`,
      },
      {
        id: 'plasma_tech',
        label: 'Plasma Technology',
        iconImg: '/icons/research/plasma-tech-research-large.jpg',
        category: 'research',
        val1: getTechLevel(p1, 122),
        val2: getTechLevel(p2, 122),
        display1: `Level ${getTechLevel(p1, 122)}`,
        display2: `Level ${getTechLevel(p2, 122)}`,
      },
      {
        id: 'hyperspace_tech',
        label: 'Hyperspace Technology',
        iconImg: '/icons/research/hyperspace-tech-research-large.jpg',
        category: 'research',
        val1: getTechLevel(p1, 114),
        val2: getTechLevel(p2, 114),
        display1: `Level ${getTechLevel(p1, 114)}`,
        display2: `Level ${getTechLevel(p2, 114)}`,
      },
      {
        id: 'irn',
        label: 'Intergalactic Research Net',
        iconImg: '/icons/research/integalagtic-research-tech-research-large.jpg',
        category: 'research',
        val1: getTechLevel(p1, 123),
        val2: getTechLevel(p2, 123),
        display1: `Level ${getTechLevel(p1, 123)}`,
        display2: `Level ${getTechLevel(p2, 123)}`,
      },

      // 4. PROPULSION & LIFEFORMS
      {
        id: 'hyperspace_drive',
        label: 'Hyperspace Drive',
        iconImg: '/icons/research/hyperspace-drive-research-large.jpg',
        category: 'lifeforms',
        val1: getTechLevel(p1, 118),
        val2: getTechLevel(p2, 118),
        display1: `Level ${getTechLevel(p1, 118)}`,
        display2: `Level ${getTechLevel(p2, 118)}`,
      },
      {
        id: 'impulse_drive',
        label: 'Impulse Drive',
        iconImg: '/icons/research/impulse-drive-research-large.jpg',
        category: 'lifeforms',
        val1: getTechLevel(p1, 117),
        val2: getTechLevel(p2, 117),
        display1: `Level ${getTechLevel(p1, 117)}`,
        display2: `Level ${getTechLevel(p2, 117)}`,
      },
      {
        id: 'lf_mining',
        label: 'Lifeform Metal Production',
        iconImg: '/icons/lifeforms/lifeforms-bonuses.png',
        category: 'lifeforms',
        val1: getResourceBonus(p1, 'metal'),
        val2: getResourceBonus(p2, 'metal'),
        display1: `+${getResourceBonus(p1, 'metal')}%`,
        display2: `+${getResourceBonus(p2, 'metal')}%`,
      },
      {
        id: 'lf_research',
        label: 'Lifeform Research Time Reduction',
        iconImg: '/icons/misc/discoverer_research_time.png',
        category: 'lifeforms',
        val1: getTechBonus(p1, 'research'),
        val2: getTechBonus(p2, 'research'),
        display1: `-${getTechBonus(p1, 'research')}%`,
        display2: `-${getTechBonus(p2, 'research')}%`,
      },
      {
        id: 'lf_fuel',
        label: 'Lifeform Cruiser Fuel Reduction',
        iconImg: '/icons/misc/warrior_fuel_consumption.png',
        category: 'lifeforms',
        val1: getShipFuelBonus(p1, 'cruiser'),
        val2: getShipFuelBonus(p2, 'cruiser'),
        display1: `-${getShipFuelBonus(p1, 'cruiser')}%`,
        display2: `-${getShipFuelBonus(p2, 'cruiser')}%`,
      },
    ];

    return list;
  }, [p1, p2]);

  // Filtered metrics by sector
  const filteredMetrics = useMemo(() => {
    if (activeSectorFilter === 'all') return duelMetrics;
    return duelMetrics.filter(m => m.category === activeSectorFilter);
  }, [duelMetrics, activeSectorFilter]);

  // Calculate overall match score (wins vs losses)
  const duelSummary = useMemo(() => {
    let p1Wins = 0;
    let p2Wins = 0;
    let ties = 0;

    duelMetrics.forEach(m => {
      if (m.val1 > m.val2) p1Wins++;
      else if (m.val2 > m.val1) p2Wins++;
      else ties++;
    });

    const totalRounds = duelMetrics.length;
    const p1DominancePct = totalRounds > 0 ? Math.round((p1Wins / (p1Wins + p2Wins || 1)) * 100) : 50;

    let overallLeader = 'tied';
    let leadCount = 0;
    if (p1Wins > p2Wins) {
      overallLeader = p1.summary.playerName;
      leadCount = p1Wins - p2Wins;
    } else if (p2Wins > p1Wins) {
      overallLeader = p2.summary.playerName;
      leadCount = p2Wins - p1Wins;
    }

    // Top distinctive strengths for player 1
    const p1Strengths = duelMetrics
      .filter(m => m.val1 > m.val2 && m.val1 > 0)
      .map(m => {
        const ratio = m.val2 > 0 ? (m.val1 - m.val2) / m.val2 : 1;
        return { metric: m, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(item => item.metric);

    // Top distinctive strengths for player 2
    const p2Strengths = duelMetrics
      .filter(m => m.val2 > m.val1 && m.val2 > 0)
      .map(m => {
        const ratio = m.val1 > 0 ? (m.val2 - m.val1) / m.val1 : 1;
        return { metric: m, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(item => item.metric);

    return {
      p1Wins,
      p2Wins,
      ties,
      totalRounds,
      p1DominancePct,
      overallLeader,
      leadCount,
      p1Strengths,
      p2Strengths,
    };
  }, [duelMetrics, p1, p2]);

  // Handler to export dossier to clipboard
  const handleCopyDiscordDossier = () => {
    if (!p1 || !p2) return;
    const text = `⚔️ **OGAME NEXUS — PLAYER COMPARISON**
══════════════════════════════════════════
👑 **${p1.summary.playerName}** [${resolvePlayerClass(p1.summary.playerClass).label}] vs **${p2.summary.playerName}** [${resolvePlayerClass(p2.summary.playerClass).label}]
🏆 **Result:** ${duelSummary.overallLeader !== 'tied' ? `**${duelSummary.overallLeader}** leads (${duelSummary.p1Wins} vs ${duelSummary.p2Wins})` : 'Tied'}

📊 **KEY METRICS:**
• **Total Score:** ${formatCompact(p1.summary.totalScore)} vs ${formatCompact(p2.summary.totalScore)}
• **Daily Production:** +${formatCompact(Math.round(((p1.summary.totalMetalHourly || 0) + (p1.summary.totalCrystalHourly || 0) * 1.5 + (p1.summary.totalDeutHourly || 0) * 3) * 24))} MSU/d vs +${formatCompact(Math.round(((p2.summary.totalMetalHourly || 0) + (p2.summary.totalCrystalHourly || 0) * 1.5 + (p2.summary.totalDeutHourly || 0) * 3) * 24))} MSU/d
• **Total Ships:** ${formatCompact(p1.summary.totalShips)} ships vs ${formatCompact(p2.summary.totalShips)} ships
• **Fleet Value:** ${formatCompact(p1.summary.totalFleetMsu)} MSU vs ${formatCompact(p2.summary.totalFleetMsu)} MSU
• **Average Mines:** ${p1.summary.avgMetalMine?.toFixed(1) || '0'} / ${p1.summary.avgCrystalMine?.toFixed(1) || '0'} / ${p1.summary.avgDeutMine?.toFixed(1) || '0'} vs ${p2.summary.avgMetalMine?.toFixed(1) || '0'} / ${p2.summary.avgCrystalMine?.toFixed(1) || '0'} / ${p2.summary.avgDeutMine?.toFixed(1) || '0'}

🛡️ Generated via OGame Nexus Overwatch`;

    navigator.clipboard.writeText(text);
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 3000);
  };

  if (!p1 || !p1.summary) {
    return (
      <div className="ow-duel-root" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="ow-duel-arena-shell" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Swords size={32} style={{ color: '#00f2ff', opacity: 0.8 }} />
          <h3 style={{ color: '#ffffff', margin: 0, fontSize: '16px' }}>Head-to-Head Duel Arena</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            Select at least 2 alliance commanders in the Comparison Deck to initiate an in-depth 1v1 tactical faceoff.
          </p>
        </div>
      </div>
    );
  }

  const p1Class = resolvePlayerClass(p1.summary.playerClass);
  const p2Class = resolvePlayerClass(p2.summary.playerClass);
  const p1Role = resolveAllianceRole(p1.summary.role);
  const p2Role = resolveAllianceRole(p2.summary.role);

  return (
    <div className="ow-duel-root">
      {/* THE FACEOFF ARENA (DOUBLE-BEZEL HARDWARE AVIONICS) */}
      <div className="ow-duel-arena-shell">
        <div className="ow-duel-arena-core">
          {/* Left Contender Card */}
          <div className="ow-duel-contender left">
            <div className="ow-duel-avatar-bezel">
              <svg className="ow-duel-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0, 242, 255, 0.2)" strokeWidth="2" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#00f2ff" strokeWidth="2" strokeDasharray="30 20 60 15" />
              </svg>
              <div className="ow-duel-avatar-inner">
                {p1.summary.avatarUrl ? (
                  <img src={p1.summary.avatarUrl} alt={p1.summary.playerName} className="ow-duel-avatar-img" />
                ) : (
                  <span className="ow-duel-avatar-letter">{p1.summary.playerName[0]?.toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="ow-duel-meta">
              <div className="ow-duel-name-strip">
                <h3 className="ow-duel-name" title={p1.summary.playerName}>{p1.summary.playerName}</h3>
                {duelSummary.p1Wins > duelSummary.p2Wins && (
                  <span className="ow-duel-trophy-badge" title="Leading Matchup">
                    <Crown size={12} />
                    <span>LEADING</span>
                  </span>
                )}
              </div>
              <div className="ow-duel-sub-row">
                <span
                  className="ow-class-badge mini"
                  style={{ color: p1Class.color, backgroundColor: p1Class.bg, borderColor: p1Class.border }}
                >
                  {p1Class.label}
                </span>
                <span
                  className="ow-compare-role-badge"
                  style={{ color: p1Role.color, backgroundColor: p1Role.bg, borderColor: p1Role.border }}
                  title={`Alliance Role: ${p1Role.label}`}
                >
                  {p1Role.icon}
                  <span>{p1Role.label}</span>
                </span>
              </div>
              <div className="ow-duel-pts-val">{formatNumber(p1.summary.totalScore)} <span className="unit">pts</span></div>
            </div>

            <div className="ow-duel-tally-box left">
              <span className="ow-duel-tally-num">{duelSummary.p1Wins}</span>
              <span className="ow-duel-tally-sub">CATEGORIES WON</span>
            </div>
          </div>

          {/* Center Tug-of-War Gauge & Versus Insignia */}
          <div className="ow-duel-center-bridge">
            <div className="ow-duel-vs-bezel">
              <span className="ow-duel-vs-glow" />
              <div className="ow-duel-vs-text">
                <Swords size={20} className="ow-duel-swords-icon" />
                <span>VS</span>
              </div>
            </div>

            {/* Dynamic Tug-of-War Tension Bar */}
            <div className="ow-duel-tug-wrapper">
              <div className="ow-duel-tug-score-row">
                <span className="score-left">{duelSummary.p1Wins}</span>
                <span className="score-label">
                  {duelSummary.overallLeader !== 'tied'
                    ? `${duelSummary.overallLeader} +${duelSummary.leadCount}`
                    : 'TIED'}
                </span>
                <span className="score-right">{duelSummary.p2Wins}</span>
              </div>

              <div className="ow-duel-tug-track">
                <div
                  className="ow-duel-tug-fill-left"
                  style={{ width: `${duelSummary.p1DominancePct}%` }}
                />
                <div
                  className="ow-duel-tug-fill-right"
                  style={{ width: `${100 - duelSummary.p1DominancePct}%` }}
                />
                <div
                  className="ow-duel-tug-center-pin"
                  style={{ left: `${duelSummary.p1DominancePct}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              className="ow-duel-copy-btn"
              onClick={handleCopyDiscordDossier}
              title="Copy comparison summary for Discord"
            >
              {copiedDossier ? (
                <>
                  <Check size={13} style={{ color: '#10b981' }} />
                  <span style={{ color: '#10b981' }}>Copied Summary!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Summary for Discord</span>
                </>
              )}
            </button>
          </div>

          {/* Right Contender Card */}
          <div className="ow-duel-contender right">
            <div className="ow-duel-tally-box right">
              <span className="ow-duel-tally-num">{duelSummary.p2Wins}</span>
              <span className="ow-duel-tally-sub">CATEGORIES WON</span>
            </div>

            <div className="ow-duel-meta right">
              <div className="ow-duel-name-strip right">
                {duelSummary.p2Wins > duelSummary.p1Wins && (
                  <span className="ow-duel-trophy-badge rose" title="Leading Matchup">
                    <Crown size={12} />
                    <span>LEADING</span>
                  </span>
                )}
                <h3 className="ow-duel-name" title={p2.summary.playerName}>{p2.summary.playerName}</h3>
              </div>
              <div className="ow-duel-sub-row right">
                <span
                  className="ow-compare-role-badge"
                  style={{ color: p2Role.color, backgroundColor: p2Role.bg, borderColor: p2Role.border }}
                  title={`Alliance Role: ${p2Role.label}`}
                >
                  {p2Role.icon}
                  <span>{p2Role.label}</span>
                </span>
                <span
                  className="ow-class-badge mini"
                  style={{ color: p2Class.color, backgroundColor: p2Class.bg, borderColor: p2Class.border }}
                >
                  {p2Class.label}
                </span>
              </div>
              <div className="ow-duel-pts-val">{formatNumber(p2.summary.totalScore)} <span className="unit">pts</span></div>
            </div>

            <div className="ow-duel-avatar-bezel right">
              <svg className="ow-duel-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(244, 63, 94, 0.2)" strokeWidth="2" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="30 20 60 15" />
              </svg>
              <div className="ow-duel-avatar-inner">
                {p2.summary.avatarUrl ? (
                  <img src={p2.summary.avatarUrl} alt={p2.summary.playerName} className="ow-duel-avatar-img" />
                ) : (
                  <span className="ow-duel-avatar-letter">{p2.summary.playerName[0]?.toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTOR FILTER SUBTABS */}
      <div className="ow-duel-sectors-bar">
        <div className="ow-duel-sectors-tabs">
          <button
            type="button"
            className={`ow-duel-sec-tab ${activeSectorFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSectorFilter('all')}
          >
            <span>All Metrics</span>
            <span className="pill">{duelMetrics.length}</span>
          </button>

          <button
            type="button"
            className={`ow-duel-sec-tab ${activeSectorFilter === 'economy' ? 'active' : ''}`}
            onClick={() => setActiveSectorFilter('economy')}
          >
            <ThemeIcon name="factory" size={14} />
            <span>Economy</span>
            <span className="pill">{duelMetrics.filter(m => m.category === 'economy').length}</span>
          </button>

          <button
            type="button"
            className={`ow-duel-sec-tab ${activeSectorFilter === 'military' ? 'active' : ''}`}
            onClick={() => setActiveSectorFilter('military')}
          >
            <Swords size={14} />
            <span>Fleet & Defense</span>
            <span className="pill">{duelMetrics.filter(m => m.category === 'military').length}</span>
          </button>

          <button
            type="button"
            className={`ow-duel-sec-tab ${activeSectorFilter === 'research' ? 'active' : ''}`}
            onClick={() => setActiveSectorFilter('research')}
          >
            <FlaskConical size={14} />
            <span>Research</span>
            <span className="pill">{duelMetrics.filter(m => m.category === 'research').length}</span>
          </button>

          <button
            type="button"
            className={`ow-duel-sec-tab ${activeSectorFilter === 'lifeforms' ? 'active' : ''}`}
            onClick={() => setActiveSectorFilter('lifeforms')}
          >
            <Sparkles size={14} />
            <span>Lifeforms & Drives</span>
            <span className="pill">{duelMetrics.filter(m => m.category === 'lifeforms').length}</span>
          </button>
        </div>
      </div>

      {/* 4. BI-DIRECTIONAL CLASH MATRIX (DOUBLE-BEZEL TABLE) */}
      <div className="ow-duel-matrix-shell">
        <div className="ow-duel-matrix-core">
          <div className="ow-duel-rows-stack">
            {filteredMetrics.map(m => {
              const p1Wins = m.val1 > m.val2;
              const p2Wins = m.val2 > m.val1;
              const isTie = m.val1 === m.val2;

              // Compute proportion for visual tug-of-war meter
              const maxVal = Math.max(m.val1, m.val2, 1);
              const p1Pct = Math.round((m.val1 / maxVal) * 100);
              const p2Pct = Math.round((m.val2 / maxVal) * 100);

              // Numerical delta
              const deltaNum = Math.abs(m.val1 - m.val2);
              const deltaPct = m.val1 > 0 && m.val2 > 0
                ? Math.round((deltaNum / Math.min(m.val1, m.val2)) * 100)
                : 0;

              return (
                <div key={m.id} className={`ow-duel-row ${p1Wins ? 'p1-lead' : p2Wins ? 'p2-lead' : 'tie'}`}>
                  {/* Left Contender Value & Bar */}
                  <div className="ow-duel-cell left">
                    <span className={`ow-duel-val ${p1Wins ? 'winner' : 'dim'}`}>
                      {m.display1}
                      {p1Wins && <Crown size={12} className="crown-icon cyan" />}
                    </span>
                    <div className="ow-duel-bar-track left">
                      <div
                        className="ow-duel-bar-fill left"
                        style={{ width: `${p1Pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Center Metric Emblem & Delta */}
                  <div className="ow-duel-cell-center">
                    <div className="ow-duel-metric-id-box">
                      <div className="ow-duel-metric-icon-wrap">
                        {m.iconImg ? (
                          <img src={m.iconImg} alt={m.label} className="ow-duel-metric-img" />
                        ) : (
                          m.icon
                        )}
                      </div>
                      <div className="ow-duel-metric-text-wrap">
                        <span className="ow-duel-metric-title">{m.label}</span>
                      </div>
                    </div>

                    {/* Comparative Lead Delta Pill */}
                    <div className="ow-duel-delta-wrap">
                      {!isTie ? (
                        <span className={`ow-duel-delta-pill ${p1Wins ? 'left' : 'right'}`}>
                          {p1Wins ? '◀' : ''} +{deltaPct > 0 ? `${deltaPct}%` : formatCompact(deltaNum)} {p2Wins ? '▶' : ''}
                        </span>
                      ) : (
                        <span className="ow-duel-delta-pill tie">EQUAL</span>
                      )}
                    </div>
                  </div>

                  {/* Right Contender Value & Bar */}
                  <div className="ow-duel-cell right">
                    <div className="ow-duel-bar-track right">
                      <div
                        className="ow-duel-bar-fill right"
                        style={{ width: `${p2Pct}%` }}
                      />
                    </div>
                    <span className={`ow-duel-val ${p2Wins ? 'winner' : 'dim'}`}>
                      {p2Wins && <Crown size={12} className="crown-icon rose" />}
                      {m.display2}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. TACTICAL SUMMARY & ADVANTAGE BREAKDOWN */}
      <div className="ow-duel-dossier-shell">
        <div className="ow-duel-dossier-core">
          <div className="ow-duel-dossier-header">
            <div className="ow-duel-dossier-badge">
              <Award size={14} />
              <span>Summary</span>
            </div>
            <h4 className="ow-duel-dossier-title">Comparison Summary</h4>
            <p className="ow-duel-dossier-sub">
              Key differences and advantages between both players.
            </p>
          </div>

          <div className="ow-duel-verdict-grid">
            {/* Contender 1 Advantages */}
            <div className="ow-duel-verdict-card left">
              <div className="ow-duel-verdict-card-header">
                <span className="dot cyan" />
                <h5>{p1.summary.playerName} — Key Leads</h5>
              </div>
              <ul className="ow-duel-advantage-list">
                {duelSummary.p1Strengths.length > 0 ? (
                  duelSummary.p1Strengths.map(item => (
                    <li key={item.id}>
                      <span className="check-bullet cyan">✓</span>
                      <div>
                        <strong>{item.label}:</strong> {item.display1} vs {item.display2}
                        <span className="desc"> ({item.subLabel || 'Higher'})</span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="dim">No significant leads found.</li>
                )}
              </ul>
            </div>

            {/* Contender 2 Advantages */}
            <div className="ow-duel-verdict-card right">
              <div className="ow-duel-verdict-card-header">
                <span className="dot rose" />
                <h5>{p2.summary.playerName} — Key Leads</h5>
              </div>
              <ul className="ow-duel-advantage-list">
                {duelSummary.p2Strengths.length > 0 ? (
                  duelSummary.p2Strengths.map(item => (
                    <li key={item.id}>
                      <span className="check-bullet rose">✓</span>
                      <div>
                        <strong>{item.label}:</strong> {item.display2} vs {item.display1}
                        <span className="desc"> ({item.subLabel || 'Higher'})</span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="dim">No significant leads found.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
