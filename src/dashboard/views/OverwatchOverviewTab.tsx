// ============================================================================
// NEXUS OVERWATCH — ALL LIFEFORM PLAYER BONUSES (HIGH-END AGENCY DESIGN)
// Recreates the comprehensive calculated overview of player lifeform bonuses
// Adheres strictly to /high-end-visual-design directives:
// Double-Bezel Hardware Architecture, OLED Deep Noir, Concentric Radii,
// Custom SVG Progress Rings, Kinetic Micro-Interactions, Fluid Accordions
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Swords,
  Shield,
  ShieldCheck,
  Zap,
  Boxes,
  Flame,
  Droplet,
  Timer,
  Layers,
  Globe,
  Orbit,
  Award,
  CheckCircle2,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ThemeIcon } from '../components/ThemeIcon';
import {
  getLifeformBonusOverview,
  getSpeciesIcon,
  getLifeformTechIcon,
  getShipIcon,
  getDefenseIcon,
  getResearchIcon,
  getResourceIcon,
  getExpeditionIcon,
  PlanetBonusBreakdown,
  LifeformBonusOverviewData
} from '../../db/lfBonusOverviewEngine';
import { MemberEmpireDetail } from './OverwatchEmpire';

interface OverwatchOverviewTabProps {
  memberDetail: MemberEmpireDetail;
  effectiveAccount?: any;
}

export const OverwatchOverviewTab: React.FC<OverwatchOverviewTabProps> = ({
  memberDetail,
}) => {
  // Active expanded sections state (keys: 'res-metal', 'exp-DMBooster', 'ship-Battlecruiser', 'class-discoverer', etc.)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'cat-resources': true,
    'cat-expedition': true,
    'cat-ships': true,
    'cat-classes': true,
    'res-metal': false,
    'res-crystal': false,
    'res-deuterium': false,
    'class-Discoverer': false,
  });

  // Expanded individual colony sub-drawers
  const [expandedPlanets, setExpandedPlanets] = useState<Record<string, boolean>>({});

  const overviewData: LifeformBonusOverviewData = useMemo(() => {
    return getLifeformBonusOverview(memberDetail);
  }, [memberDetail]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const togglePlanet = useCallback((key: string) => {
    setExpandedPlanets(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Expand / Collapse all master accordions
  const [allExpanded, setAllExpanded] = useState(false);
  const handleToggleExpandAll = useCallback(() => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {
      'cat-experience': nextState,
      'cat-resources': nextState,
      'cat-expedition': nextState,
      'cat-ships': nextState,
      'cat-defenses': nextState,
      'cat-costAndTime': nextState,
      'cat-classes': nextState,
      'cat-misc': nextState,
    };
    // Also expand resource and class rows if expanding all
    if (nextState) {
      overviewData.resources.forEach(r => { updated[`res-${r.key}`] = true; });
      overviewData.expedition.forEach(e => { updated[`exp-${e.key}`] = true; });
      overviewData.ships.forEach(s => { updated[`ship-${s.name}`] = true; });
      overviewData.characterClasses.forEach(c => { updated[`class-${c.name}`] = true; });
    }
    setExpandedSections(updated);
  }, [allExpanded, overviewData]);

  // Render helper for colony breakdown drawer
  const renderBreakdownList = (breakdown: PlanetBonusBreakdown[], sectionKey: string) => {
    if (!breakdown || breakdown.length === 0) {
      return (
        <div className="ow-overview-empty-breakdown">
          <span>No colony tech contributions recorded for this bonus.</span>
        </div>
      );
    }

    return (
      <div className="ow-overview-breakdown-container">
        <div className="ow-overview-breakdown-header">
          <span className="ow-breakdown-count-label">
            <Orbit size={13} className="text-cyan-400" />
            <span>Colony Breakdown ({breakdown.length} Colonies)</span>
          </span>
          <span className="ow-breakdown-note">Click colony to view tech slots</span>
        </div>

        <div className="ow-overview-breakdown-grid">
          {breakdown.map((planet, pIdx) => {
            const planetKey = `${sectionKey}-${planet.coords}-${pIdx}`;
            const isPlanetOpen = !!expandedPlanets[planetKey];

            return (
              <div key={planetKey} className="ow-breakdown-colony-card">
                <div
                  className="ow-breakdown-colony-top"
                  onClick={() => togglePlanet(planetKey)}
                >
                  <div className="ow-colony-meta">
                    <span className="ow-colony-chevron">
                      {isPlanetOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="ow-colony-name">{planet.planetName}</span>
                    <span className="ow-colony-coords">[{planet.coords}]</span>
                  </div>
                  <div className="ow-colony-bonus-badge">
                    +{planet.totalBonus}
                  </div>
                </div>

                <AnimatePresence>
                  {isPlanetOpen && planet.techs && planet.techs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="ow-breakdown-tech-drawer"
                    >
                      <table className="ow-breakdown-tech-table">
                        <thead>
                          <tr>
                            <th>Slot</th>
                            <th>Lvl</th>
                            <th>Tech</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planet.techs.map((t, tIdx) => (
                            <tr key={tIdx}>
                              <td className="tech-slot">Slot {t.slot}</td>
                              <td className="tech-lvl">Lvl {t.level}</td>
                              <td className="tech-info">
                                <img
                                  src={getLifeformTechIcon(t.techId)}
                                  alt={t.name}
                                  className="ow-tech-thumb"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/icons/lifeforms/lifeform-icon-medium.jpg';
                                  }}
                                />
                                <span className="tech-name">{t.name}</span>
                              </td>
                              <td className="tech-val">+{t.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="ow-matrix-section ow-overview-matrix-section">
      {/* ==================================================================== */}
      {/* 1. HERO BANNER: ALL LIFEFORM PLAYER BONUSES (DOUBLE-BEZEL)           */}
      {/* ==================================================================== */}
      <div className="ow-overview-hero-shell">
        <div className="ow-overview-hero-core">
          <div className="ow-overview-hero-left">
            <div className="ow-hero-eyebrow-tag">
              <Sparkles size={11} className="text-cyan-400" />
              <span>LIFEFORM COGNITION ENGINE // OVERVIEW MATRIX</span>
            </div>
            <h1 className="ow-overview-hero-title">All Lifeform Player Bonuses</h1>
            <p className="ow-overview-hero-subtitle">
              Calculated empire-wide telemetry for{' '}
              <strong className="text-cyan-300">{memberDetail.playerName}</strong> based on live
              researches, colony lifeform setups & species experience tiers.
            </p>
          </div>

          <div className="ow-overview-hero-actions">
            <button
              type="button"
              className="ow-overview-expand-all-btn"
              onClick={handleToggleExpandAll}
              title={allExpanded ? 'Collapse All Sections' : 'Expand All Sections'}
            >
              {allExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. LIFEFORM EXPERIENCE LEVEL BONUS (4 SPECIES PROGRESS RINGS)         */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div className="ow-overview-section-header">
            <div className="ow-section-title-wrap">
              <ThemeIcon name="leaf" size={16} />
              <h2 className="ow-overview-section-title">Lifeform experience level bonus</h2>
            </div>
            <div
              className="ow-overview-info-pill"
              title="Each lifeform experience level provides a +0.1% cumulative multiplier to all bonuses granted by that species."
            >
              <Info size={13} />
              <span>+0.10% per level</span>
            </div>
          </div>

          <div className="ow-overview-xp-grid">
            {overviewData.experienceLevels.map((spec) => {
              const ringRadius = 40;
              const circumference = 2 * Math.PI * ringRadius;
              const progressPct = Math.min(100, Math.max(0, spec.level));
              const strokeOffset = circumference * (1 - progressPct / 100);

              return (
                <div key={spec.lifeformId} className="ow-species-xp-bezel-card">
                  <div className="ow-species-xp-inner">
                    <span className="ow-species-xp-level-badge">Level {spec.level}</span>

                    <div className="ow-species-portrait-wrapper">
                      {/* Luminous Circular SVG Progress Ring */}
                      <svg className="ow-species-ring-svg" viewBox="0 0 100 100">
                        <circle
                          className="ow-species-ring-track"
                          cx="50"
                          cy="50"
                          r={ringRadius}
                          fill="transparent"
                          strokeWidth="4"
                        />
                        <circle
                          className="ow-species-ring-fill"
                          cx="50"
                          cy="50"
                          r={ringRadius}
                          fill="transparent"
                          strokeWidth="4"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeOffset}
                        />
                      </svg>

                      <div className="ow-species-portrait-frame">
                        <img
                          src={getSpeciesIcon(spec.lifeformId)}
                          alt={spec.name}
                          className="ow-species-portrait-img"
                        />
                      </div>
                    </div>

                    <span className="ow-species-name">{spec.name}</span>
                    <span className="ow-species-bonus-pill">Bonus: {spec.bonus}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. GLOBAL LIFEFORM TECH BONUS: MASTER CATEGORIES BAR                 */}
      {/* ==================================================================== */}
      <div className="ow-overview-divider-bar">
        <div className="ow-divider-line" />
        <div className="ow-divider-pill">
          <Layers size={13} className="text-cyan-400" />
          <span>Global Lifeform Tech Bonus</span>
        </div>
        <div className="ow-divider-line" />
      </div>

      {/* ==================================================================== */}
      {/* 4. RESOURCE BONUSES ACCORDION                                        */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-resources')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-resources'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <ThemeIcon name="city-buildings" size={16} />
              <h2 className="ow-overview-section-title">Resource bonuses</h2>
            </div>
            <span className="ow-overview-header-tag">Colony Amplification</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-resources'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-item-list">
                  {overviewData.resources.map((res) => {
                    const isOpen = !!expandedSections[`res-${res.key}`];
                    return (
                      <div key={res.key} className="ow-overview-bonus-row-wrap">
                        <div
                          className={`ow-overview-bonus-row ${isOpen ? 'expanded' : ''}`}
                          onClick={() => toggleSection(`res-${res.key}`)}
                        >
                          <div className="ow-bonus-row-left">
                            <span className="ow-row-chevron">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <img
                              src={getResourceIcon(res.key)}
                              alt={res.name}
                              className="ow-bonus-row-icon"
                            />
                            <span className="ow-bonus-row-title">{res.name}</span>
                          </div>
                          <div className="ow-bonus-row-right">
                            <span className="ow-bonus-total-label">Total</span>
                            <span className={`ow-bonus-total-value ${res.total !== '0%' ? 'positive' : 'zero'}`}>
                              {res.total}
                            </span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            >
                              {renderBreakdownList(res.breakdown, `res-${res.key}`)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. EXPEDITION TECHNOLOGY ACCORDION                                   */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-expedition')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-expedition'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <ThemeIcon name="radar" size={16} />
              <h2 className="ow-overview-section-title">Expedition Technology</h2>
            </div>
            <span className="ow-overview-header-tag">Deep Space Yields</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-expedition'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-item-list">
                  {overviewData.expedition.map((exp) => {
                    const isOpen = !!expandedSections[`exp-${exp.key}`];
                    return (
                      <div key={exp.key} className="ow-overview-bonus-row-wrap">
                        <div
                          className={`ow-overview-bonus-row ${isOpen ? 'expanded' : ''}`}
                          onClick={() => toggleSection(`exp-${exp.key}`)}
                        >
                          <div className="ow-bonus-row-left">
                            <span className="ow-row-chevron">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <img
                              src={getExpeditionIcon(exp.name)}
                              alt={exp.name}
                              className="ow-bonus-row-icon"
                            />
                            <span className="ow-bonus-row-title">{exp.name}</span>
                          </div>
                          <div className="ow-bonus-row-right">
                            <span className="ow-bonus-total-label">Total</span>
                            <span className={`ow-bonus-total-value ${exp.total !== '0%' ? 'positive' : 'zero'}`}>
                              {exp.total}
                            </span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            >
                              {renderBreakdownList(exp.breakdown, `exp-${exp.key}`)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. SHIP BONUSES MATRIX TABLE                                         */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-ships')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-ships'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <ThemeIcon name="defense" size={16} />
              <h2 className="ow-overview-section-title">Ship bonuses</h2>
            </div>
            <span className="ow-overview-header-tag">Fleet Combat & Avionics</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-ships'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-table-wrapper">
                  <table className="ow-overview-matrix-table">
                    <thead>
                      <tr>
                        <th className="th-entity">Ship</th>
                        <th className="th-stat" title="Weapons">
                          <div className="th-stat-inner">
                            <Swords size={13} />
                            <span>Weapons</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Shield">
                          <div className="th-stat-inner">
                            <Shield size={13} />
                            <span>Shield</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Armour">
                          <div className="th-stat-inner">
                            <ShieldCheck size={13} />
                            <span>Armour</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Speed">
                          <div className="th-stat-inner">
                            <Zap size={13} />
                            <span>Speed</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Cargo">
                          <div className="th-stat-inner">
                            <Boxes size={13} />
                            <span>Cargo</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Fuel Reduction">
                          <div className="th-stat-inner">
                            <Flame size={13} />
                            <span>Fuel</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewData.ships.map((ship) => {
                        const isOpen = !!expandedSections[`ship-${ship.name}`];
                        const hasBonus =
                          ship.weapons !== '-' ||
                          ship.shield !== '-' ||
                          ship.armour !== '-' ||
                          ship.speed !== '-' ||
                          ship.cargo !== '-';

                        return (
                          <React.Fragment key={ship.name}>
                            <tr
                              className={`ow-matrix-row ${isOpen ? 'expanded' : ''} ${hasBonus ? 'has-bonus' : ''}`}
                              onClick={() => toggleSection(`ship-${ship.name}`)}
                            >
                              <td className="td-entity">
                                <div className="td-entity-inner">
                                  <span className="ow-row-chevron">
                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </span>
                                  <img
                                    src={getShipIcon(ship.name)}
                                    alt={ship.name}
                                    className="ow-matrix-thumb"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/icons/ships/small-cargo-large.jpg';
                                    }}
                                  />
                                  <span className="ow-entity-name">{ship.name}</span>
                                </div>
                              </td>
                              <td className={`td-stat ${ship.weapons !== '-' ? 'positive' : 'empty'}`}>
                                {ship.weapons}
                              </td>
                              <td className={`td-stat ${ship.shield !== '-' ? 'positive' : 'empty'}`}>
                                {ship.shield}
                              </td>
                              <td className={`td-stat ${ship.armour !== '-' ? 'positive' : 'empty'}`}>
                                {ship.armour}
                              </td>
                              <td className={`td-stat ${ship.speed !== '-' ? 'positive' : 'empty'}`}>
                                {ship.speed}
                              </td>
                              <td className={`td-stat ${ship.cargo !== '-' ? 'positive' : 'empty'}`}>
                                {ship.cargo}
                              </td>
                              <td className="td-stat empty">{ship.fuel}</td>
                            </tr>
                            {isOpen && (
                              <tr className="ow-breakdown-table-row">
                                <td colSpan={7}>
                                  {renderBreakdownList(ship.breakdown, `ship-${ship.name}`)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7. DEFENSIVE BONUSES MATRIX TABLE                                    */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-defenses')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-defenses'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <ThemeIcon name="protect" size={16} />
              <h2 className="ow-overview-section-title">Defensive bonuses</h2>
            </div>
            <span className="ow-overview-header-tag">Planetary Fortifications</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-defenses'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-table-wrapper">
                  <table className="ow-overview-matrix-table">
                    <thead>
                      <tr>
                        <th className="th-entity">Defense</th>
                        <th className="th-stat" title="Weapons">
                          <div className="th-stat-inner">
                            <Swords size={13} />
                            <span>Weapons</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Shield">
                          <div className="th-stat-inner">
                            <Shield size={13} />
                            <span>Shield</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Armour">
                          <div className="th-stat-inner">
                            <ShieldCheck size={13} />
                            <span>Armour</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewData.defenses.map((def) => {
                        const isOpen = !!expandedSections[`def-${def.name}`];
                        return (
                          <React.Fragment key={def.name}>
                            <tr
                              className={`ow-matrix-row ${isOpen ? 'expanded' : ''}`}
                              onClick={() => toggleSection(`def-${def.name}`)}
                            >
                              <td className="td-entity">
                                <div className="td-entity-inner">
                                  <span className="ow-row-chevron">
                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </span>
                                  <img
                                    src={getDefenseIcon(def.name)}
                                    alt={def.name}
                                    className="ow-matrix-thumb"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/icons/ships/rocket-launcher-large.jpg';
                                    }}
                                  />
                                  <span className="ow-entity-name">{def.name}</span>
                                </div>
                              </td>
                              <td className="td-stat empty">{def.weapons}</td>
                              <td className="td-stat empty">{def.shield}</td>
                              <td className="td-stat empty">{def.armour}</td>
                            </tr>
                            {isOpen && (
                              <tr className="ow-breakdown-table-row">
                                <td colSpan={4}>
                                  {renderBreakdownList(def.breakdown, `def-${def.name}`)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 8. COST AND TIME REDUCTION MATRIX TABLE                              */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-costAndTime')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-costAndTime'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <ThemeIcon name="flask" size={16} />
              <h2 className="ow-overview-section-title">Cost and time reduction</h2>
            </div>
            <span className="ow-overview-header-tag">Research Acceleration</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-costAndTime'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-table-wrapper">
                  <table className="ow-overview-matrix-table">
                    <thead>
                      <tr>
                        <th className="th-entity">Technology</th>
                        <th className="th-stat" title="Cost Reduction (Max. 50%)">
                          <div className="th-stat-inner">
                            <TrendingUp size={13} />
                            <span>Cost reduction</span>
                          </div>
                        </th>
                        <th className="th-stat" title="Time Reduction (Max. 99%)">
                          <div className="th-stat-inner">
                            <Timer size={13} />
                            <span>Time reduction</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewData.costAndTime.map((tech) => {
                        const isOpen = !!expandedSections[`tech-${tech.name}`];
                        const isPlasma = tech.name === 'Plasma Technology';

                        return (
                          <React.Fragment key={tech.name}>
                            <tr
                              className={`ow-matrix-row ${isOpen ? 'expanded' : ''} ${isPlasma ? 'has-bonus' : ''}`}
                              onClick={() => toggleSection(`tech-${tech.name}`)}
                            >
                              <td className="td-entity">
                                <div className="td-entity-inner">
                                  <span className="ow-row-chevron">
                                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </span>
                                  <img
                                    src={getResearchIcon(tech.name)}
                                    alt={tech.name}
                                    className="ow-matrix-thumb"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/icons/research/energy-research-large.jpg';
                                    }}
                                  />
                                  <span className="ow-entity-name">{tech.name}</span>
                                </div>
                              </td>
                              <td className={`td-stat ${tech.costReduction !== '-' ? 'positive' : 'empty'}`}>
                                {tech.costReduction}
                              </td>
                              <td className={`td-stat ${tech.timeReduction !== '-' ? 'positive' : 'empty'}`}>
                                {tech.timeReduction}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr className="ow-breakdown-table-row">
                                <td colSpan={3}>
                                  {renderBreakdownList(tech.breakdown, `tech-${tech.name}`)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 9. CHARACTER CLASS BONUSES (COLLECTOR, GENERAL, DISCOVERER)          */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-classes')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-classes'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <Award size={16} className="text-cyan-400" />
              <h2 className="ow-overview-section-title">Character class bonuses</h2>
            </div>
            <span className="ow-overview-header-tag">Class Specializations</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-classes'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-item-list">
                  {overviewData.characterClasses.map((cls) => {
                    const isOpen = !!expandedSections[`class-${cls.name}`];
                    const isActiveClass = cls.name.toLowerCase() === 'discoverer'; // Active class highlight

                    return (
                      <div key={cls.name} className="ow-overview-bonus-row-wrap">
                        <div
                          className={`ow-overview-bonus-row ${isOpen ? 'expanded' : ''} ${isActiveClass ? 'active-class-row' : ''}`}
                          onClick={() => toggleSection(`class-${cls.name}`)}
                        >
                          <div className="ow-bonus-row-left">
                            <span className="ow-row-chevron">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span className="ow-bonus-row-title">{cls.name}</span>
                            {isActiveClass && (
                              <span className="ow-active-class-pill">
                                <CheckCircle2 size={11} />
                                <span>ACTIVE CLASS</span>
                              </span>
                            )}
                          </div>
                          <div className="ow-bonus-row-right">
                            <span className="ow-bonus-total-label">Total</span>
                            <span className={`ow-bonus-total-value ${cls.total !== '0%' ? 'positive' : 'zero'}`}>
                              {cls.total}
                            </span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                              className="ow-class-expanded-drawer"
                            >
                              {/* Class perks breakdown */}
                              {cls.perks && cls.perks.length > 0 && (
                                <div className="ow-class-perks-section">
                                  <div className="ow-class-perks-header">
                                    <Sparkles size={13} className="text-cyan-400" />
                                    <span>Class Perks & Amplifications</span>
                                  </div>
                                  <div className="ow-class-perks-grid">
                                    {cls.perks.map((p, pIdx) => (
                                      <div key={pIdx} className="ow-perk-card">
                                        <span className="ow-perk-name">{p.name}</span>
                                        <div className="ow-perk-values">
                                          <span className="ow-perk-base">Base: {p.baseBonus}</span>
                                          <span className="ow-perk-inc">Inc: {p.incBonus}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Colony breakdown */}
                              {renderBreakdownList(cls.breakdown, `class-${cls.name}`)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 10. MISC. BONUSES                                                    */}
      {/* ==================================================================== */}
      <div className="ow-overview-card-shell">
        <div className="ow-overview-card-core">
          <div
            className="ow-overview-section-header clickable"
            onClick={() => toggleSection('cat-misc')}
          >
            <div className="ow-section-title-wrap">
              <span className="ow-toggle-chevron">
                {expandedSections['cat-misc'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <Zap size={16} className="text-cyan-400" />
              <h2 className="ow-overview-section-title">Misc.</h2>
            </div>
            <span className="ow-overview-header-tag">Exploration Speed</span>
          </div>

          <AnimatePresence initial={false}>
            {expandedSections['cat-misc'] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="ow-overview-section-body"
              >
                <div className="ow-overview-item-list">
                  {overviewData.misc.map((mItem, idx) => {
                    const isOpen = !!expandedSections[`misc-${idx}`];
                    return (
                      <div key={idx} className="ow-overview-bonus-row-wrap">
                        <div
                          className={`ow-overview-bonus-row ${isOpen ? 'expanded' : ''}`}
                          onClick={() => toggleSection(`misc-${idx}`)}
                        >
                          <div className="ow-bonus-row-left">
                            <span className="ow-row-chevron">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <Zap size={15} className="text-cyan-400" />
                            <span className="ow-bonus-row-title">{mItem.name}</span>
                          </div>
                          <div className="ow-bonus-row-right">
                            <span className="ow-bonus-total-label">Speed</span>
                            <span className="ow-bonus-total-value positive">{mItem.total}</span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                            >
                              {renderBreakdownList(mItem.breakdown, `misc-${idx}`)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
