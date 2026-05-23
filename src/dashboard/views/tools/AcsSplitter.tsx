import React, { useState, useEffect } from 'react';
import {
    Target, Download, Trophy, Users, Layers, AlertCircle, TrendingUp,
    Shield, Rocket, Info, X, Settings, PieChart, Gavel, Coins, Lock, Unlock
} from 'lucide-react';
import { SHIP_DATA, DEFENCE_DATA } from '../../../db/staticData';

interface CombatReport {
    key: string;
    RESULT_CODE: number;
    RESULT_DATA: {
        generic: {
            winner: string;
            combat_rounds: number;
            event_time: string;
            combat_coordinates: string;
            debris_metal: number;
            debris_crystal: number;
            debris_deuterium: number;
            debris_reaper_metal_retrieved?: number;
            debris_reaper_crystal_retrieved?: number;
            debris_reaper_deuterium_retrieved?: number;
            units_lost_attackers: number;
            units_lost_defenders: number;
            wreckfield?: Array<{
                ship_type: number;
                count: number;
            }>;
        };
        attackers: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
        defenders: Array<{
            fleet_owner: string;
            fleet_owner_alliance_tag?: string;
            fleet_composition: Array<{
                ship_type: number;
                count: number;
            }>;
        }>;
    };
}

interface RecycleReport {
    key: string;
    RESULT_CODE: number;
    RESULT_MESSAGE?: string;
    RESULT_DATA: {
        generic: {
            owner_id: number;
            owner_name: string;
            recycler_count: number;
            reaper_count: number;
            recycler_metal_retrieved?: number;
            recycler_crystal_retrieved?: number;
            reaper_metal_retrieved?: number;
            reaper_crystal_retrieved?: number;
        };
    };
}

interface SankeyProps {
    participants: Array<{
        name: string;
        harvestedM: number;
        harvestedC: number;
        targetM: number;
        targetC: number;
        isActive: boolean;
    }>;
    totalM: number;
    totalC: number;
    combinedReport?: any;
}

const ResourceFlowSankey: React.FC<SankeyProps> = ({ participants, totalM, totalC, combinedReport }) => {
    // Stage 3 nodes: Harvesters (only those who harvested > 0)
    const harvesters = participants.filter(p => (p.harvestedM + p.harvestedC) > 0);
    // Stage 5 nodes: Receivers (active participants who receive > 0)
    const receivers = participants.filter(p => p.isActive && (p.targetM + p.targetC) > 0);

    const totalPool = totalM + totalC;

    const names = participants.map(p => p.name);
    const getPlayerColor = (name: string) => {
        const colors = [
            '#00f2ff', // Neon Cyan
            '#d946ef', // Neon Purple/Magenta
            '#fbbf24', // Neon Gold/Amber
            '#10b981', // Neon Green
            '#f97316', // Neon Orange
            '#a855f7', // Neon Violet
            '#ec4899', // Neon Pink
            '#3b82f6', // Neon Cobalt Blue
            '#14b8a6', // Neon Teal
            '#f43f5e'  // Neon Crimson Red
        ];
        const idx = names.indexOf(name);
        return colors[idx === -1 ? 0 : idx % colors.length];
    };

    const formatCompact = (num: number) => {
        if (num >= 1_000_000) {
            const val = num / 1_000_000;
            return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'M';
        }
        if (num >= 1_000) {
            const val = num / 1_000;
            return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'K';
        }
        return num.toString();
    };

    // Battle values
    const attackerLosses = combinedReport?.RESULT_DATA?.generic?.units_lost_attackers || 0;
    const defenderLosses = combinedReport?.RESULT_DATA?.generic?.units_lost_defenders || 0;
    const totalLosses = attackerLosses + defenderLosses || 1;

    const debrisMetal = combinedReport?.RESULT_DATA?.generic?.debris_metal || 0;
    const debrisCrystal = combinedReport?.RESULT_DATA?.generic?.debris_crystal || 0;
    const totalDebrisGenerated = debrisMetal + debrisCrystal || totalPool;

    // Faction contributions to the Debris Field
    const attackerDebrisContrib = Math.round(totalDebrisGenerated * (attackerLosses / totalLosses));
    const defenderDebrisContrib = Math.round(totalDebrisGenerated * (defenderLosses / totalLosses));

    // List of nodes in Stage 3: Harvesters
    const stage3Nodes: Array<{
        name: string;
        amount: number;
        isUncollected?: boolean;
    }> = harvesters.map(h => ({
        name: h.name,
        amount: h.harvestedM + h.harvestedC
    }));

    if (totalDebrisGenerated === 0 && totalPool === 0) {
        return (
            <div className="card-glass text-center" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Sankey visualization pending. Please paste debris harvest logs (rr-) in Step 2 to generate resource flows.
                </div>
            </div>
        );
    }

    // Coordinates definition
    const width = 940;
    // Spacious dynamic height
    const height = Math.max(340, Math.max(stage3Nodes.length, receivers.length) * 60 + 60);
    const centerY = height / 2;

    // Horizontal Stage Alignments
    const stage1X = 110; // Factions anchor points (cards drawn to the left)
    const stage2X = 260; // Debris Generated capsule center
    const stage3X = 460; // Harvester cards middle-point (anchor left: 410, anchor right: 510)
    const stage4X = 660; // Loot Core capsule center
    const stage5X = 810; // Receivers anchor point (cards drawn to the right)

    // Stage 1 (Factions) Coordinates
    const yAtk = centerY - 55;
    const yDef = centerY + 55;

    // Stage 3 (Harvesters & Remnants) Coordinates
    const stage3YCoords = stage3Nodes.map((_, idx) => {
        if (stage3Nodes.length === 1) return centerY;
        const padding = 40;
        const step = (height - padding * 2) / (stage3Nodes.length - 1);
        return padding + idx * step;
    });

    // Stage 5 (Receivers) Coordinates
    const stage5YCoords = receivers.map((_, idx) => {
        if (receivers.length === 1) return centerY;
        const padding = 40;
        const step = (height - padding * 2) / (receivers.length - 1);
        return padding + idx * step;
    });

    // Landing ports layout along capsule edges
    // Stage 2 (Debris Capsule) left edge inflow ports (from Factions)
    const debrisInPortsY = [centerY - 16, centerY + 16];

    // Stage 2 (Debris Capsule) right edge outflow ports (to Stage 3 Harvesters)
    const debrisOutPortsY = stage3Nodes.map((_, idx) => {
        if (stage3Nodes.length === 1) return centerY;
        const portHeight = 52;
        const startY = centerY - portHeight / 2;
        return startY + (idx * portHeight) / (stage3Nodes.length - 1);
    });

    // Stage 4 (Loot Core Capsule) left edge inflow ports (from Stage 3 Harvesters, excluding uncollected)
    const lootInPortsY = harvesters.map((_, idx) => {
        if (harvesters.length === 1) return centerY;
        const portHeight = 52;
        const startY = centerY - portHeight / 2;
        return startY + (idx * portHeight) / (harvesters.length - 1);
    });

    // Stage 4 (Loot Core Capsule) right edge outflow ports (to Stage 5 Receivers)
    const lootOutPortsY = receivers.map((_, idx) => {
        if (receivers.length === 1) return centerY;
        const portHeight = 52;
        const startY = centerY - portHeight / 2;
        return startY + (idx * portHeight) / (receivers.length - 1);
    });

    // Math function for smooth S-curves
    const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = Math.abs(x2 - x1) / 2;
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    };

    const formatNumberLocal = (num: number) => num.toLocaleString();

    return (
        <div className="card-glass margin-b-24 shadow-large glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
            <div className="split-settings-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--primary)" /> Operation Debris Flow Dynamics (Sankey Flow)
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0 0 20px 0', lineHeight: 1.4 }}>
                A visual trace mapping collected raw debris from harvesters on the left, aggregating them in the tactical operational pool, and distributing them to receivers on the right based on selected split parameters.
            </p>
            <div style={{ width: '100%' }}>
                <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    style={{ 
                        width: '100%', 
                        height: 'auto', 
                        background: 'rgba(5, 8, 16, 0.65)', 
                        borderRadius: '14px', 
                        border: '1px solid rgba(0, 242, 255, 0.08)',
                        display: 'block'
                    }}
                >
                    <defs>
                        {/* High-tech microdot pattern */}
                        <pattern id="cyberGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="0.75" fill="rgba(255, 255, 255, 0.03)" />
                        </pattern>

                        {/* Radial glows */}
                        <radialGradient id="debrisCapsuleGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="poolCapsuleGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                        </radialGradient>

                        {/* Stage 1 -> 2 Gradients (Factions to Debris Generated) */}
                        <linearGradient id="grad-atk-debris" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="grad-def-debris" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ff5f5f" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
                        </linearGradient>

                        {/* Stage 2 -> 3 Gradients (Debris Generated to Harvesters / Remnants) */}
                        {stage3Nodes.map((node, idx) => {
                            const nodeColor = node.isUncollected ? '#f43f5e' : getPlayerColor(node.name);
                            return (
                                <linearGradient id={`grad-debris-node-${idx}`} key={`grad-debris-node-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor={nodeColor} stopOpacity="0.3" />
                                </linearGradient>
                            );
                        })}

                        {/* Stage 3 -> 4 Gradients (Harvesters to Loot Core) */}
                        {harvesters.map((h, idx) => (
                            <linearGradient id={`grad-node-pool-${idx}`} key={`grad-node-pool-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={getPlayerColor(h.name)} stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.3" />
                            </linearGradient>
                        ))}

                        {/* Stage 4 -> 5 Gradients (Loot Core to Receivers) */}
                        {receivers.map((r, idx) => (
                            <linearGradient id={`grad-pool-recv-${idx}`} key={`grad-pool-recv-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor={getPlayerColor(r.name)} stopOpacity="0.45" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Dotted Grid Background */}
                    <rect width={width} height={height} fill="url(#cyberGrid)" />

                    {/* Flow Paths - Stage 1 to 2 (Factions -> Debris Field) */}
                    {(() => {
                        const totalDebrisBase = totalDebrisGenerated || 1;
                        const atkStroke = Math.max(2.5, (attackerDebrisContrib / totalDebrisBase) * 28);
                        const defStroke = Math.max(2.5, (defenderDebrisContrib / totalDebrisBase) * 28);

                        return (
                            <>
                                {/* Attackers Inflow */}
                                <path
                                    d={getBezierPath(stage1X, yAtk, stage2X - 40, debrisInPortsY[0])}
                                    stroke="url(#grad-atk-debris)"
                                    strokeWidth={atkStroke}
                                    fill="none"
                                    opacity="0.5"
                                />
                                <path
                                    d={getBezierPath(stage1X, yAtk, stage2X - 40, debrisInPortsY[0])}
                                    stroke="#00f2ff"
                                    strokeWidth="1.2"
                                    fill="none"
                                    opacity="0.8"
                                />

                                {/* Defenders Inflow */}
                                <path
                                    d={getBezierPath(stage1X, yDef, stage2X - 40, debrisInPortsY[1])}
                                    stroke="url(#grad-def-debris)"
                                    strokeWidth={defStroke}
                                    fill="none"
                                    opacity="0.5"
                                />
                                <path
                                    d={getBezierPath(stage1X, yDef, stage2X - 40, debrisInPortsY[1])}
                                    stroke="#ff5f5f"
                                    strokeWidth="1.2"
                                    fill="none"
                                    opacity="0.8"
                                />
                            </>
                        );
                    })()}

                    {/* Flow Paths - Stage 2 to 3 (Debris Field -> Harvesters / Remnants) */}
                    {stage3Nodes.map((node, idx) => {
                        const totalDebrisBase = totalDebrisGenerated || 1;
                        const strokeW = Math.max(2.5, (node.amount / totalDebrisBase) * 28);
                        const y1 = debrisOutPortsY[idx];
                        const y2 = stage3YCoords[idx];
                        const nodeColor = node.isUncollected ? '#f43f5e' : getPlayerColor(node.name);

                        return (
                            <g key={`debris-flow-${idx}`}>
                                <path
                                    d={getBezierPath(stage2X + 40, y1, stage3X - 55, y2)}
                                    stroke={`url(#grad-debris-node-${idx})`}
                                    strokeWidth={strokeW}
                                    fill="none"
                                    opacity="0.45"
                                    style={{ transition: 'opacity 0.2s ease' }}
                                />
                                <path
                                    d={getBezierPath(stage2X + 40, y1, stage3X - 55, y2)}
                                    stroke={nodeColor}
                                    strokeWidth="1.2"
                                    fill="none"
                                    opacity="0.85"
                                    style={{ pointerEvents: 'none' }}
                                />
                                <path
                                    d={getBezierPath(stage2X + 40, y1, stage3X - 55, y2)}
                                    stroke="transparent"
                                    strokeWidth={strokeW + 10}
                                    fill="none"
                                    style={{ cursor: 'pointer' }}
                                    onMouseOver={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.9';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW + 2}px`;
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.45';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW}px`;
                                        }
                                    }}
                                >
                                    <title>{node.name}: {formatNumberLocal(node.amount)} units</title>
                                </path>
                            </g>
                        );
                    })}

                    {/* Flow Paths - Stage 3 to 4 (Harvesters -> Loot Core) */}
                    {harvesters.map((h, idx) => {
                        const hTotal = h.harvestedM + h.harvestedC;
                        const strokeW = Math.max(2.5, (hTotal / (totalPool || 1)) * 28);
                        const y1 = stage3YCoords[idx];
                        const y2 = lootInPortsY[idx];
                        const playerCol = getPlayerColor(h.name);

                        return (
                            <g key={`harvester-flow-${idx}`}>
                                <path
                                    d={getBezierPath(stage3X + 55, y1, stage4X - 40, y2)}
                                    stroke={`url(#grad-node-pool-${idx})`}
                                    strokeWidth={strokeW}
                                    fill="none"
                                    opacity="0.45"
                                    style={{ transition: 'opacity 0.2s ease' }}
                                />
                                <path
                                    d={getBezierPath(stage3X + 55, y1, stage4X - 40, y2)}
                                    stroke={playerCol}
                                    strokeWidth="1.2"
                                    fill="none"
                                    opacity="0.85"
                                    style={{ pointerEvents: 'none' }}
                                />
                                <path
                                    d={getBezierPath(stage3X + 55, y1, stage4X - 40, y2)}
                                    stroke="transparent"
                                    strokeWidth={strokeW + 10}
                                    fill="none"
                                    style={{ cursor: 'pointer' }}
                                    onMouseOver={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.9';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW + 2}px`;
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.45';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW}px`;
                                        }
                                    }}
                                >
                                    <title>{h.name} Contributes: {formatNumberLocal(hTotal)} units</title>
                                </path>
                            </g>
                        );
                    })}

                    {/* Flow Paths - Stage 4 to 5 (Loot Core -> Receivers) */}
                    {receivers.map((r, idx) => {
                        const rTotal = r.targetM + r.targetC;
                        const strokeW = Math.max(2.5, (rTotal / (totalPool || 1)) * 28);
                        const y1 = lootOutPortsY[idx];
                        const y2 = stage5YCoords[idx];
                        const playerCol = getPlayerColor(r.name);

                        return (
                            <g key={`receiver-flow-${idx}`}>
                                <path
                                    d={getBezierPath(stage4X + 40, y1, stage5X - 5, y2)}
                                    stroke={`url(#grad-pool-recv-${idx})`}
                                    strokeWidth={strokeW}
                                    fill="none"
                                    opacity="0.5"
                                    style={{ transition: 'opacity 0.2s ease' }}
                                />
                                <path
                                    d={getBezierPath(stage4X + 40, y1, stage5X - 5, y2)}
                                    stroke={playerCol}
                                    strokeWidth="1.2"
                                    fill="none"
                                    opacity="0.85"
                                    style={{ pointerEvents: 'none' }}
                                />
                                <path
                                    d={getBezierPath(stage4X + 40, y1, stage5X - 5, y2)}
                                    stroke="transparent"
                                    strokeWidth={strokeW + 10}
                                    fill="none"
                                    style={{ cursor: 'pointer' }}
                                    onMouseOver={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.9';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW + 2}px`;
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        const paths = e.currentTarget.parentNode?.querySelectorAll('path');
                                        if (paths) {
                                            (paths[0] as SVGPathElement).style.opacity = '0.5';
                                            (paths[0] as SVGPathElement).style.strokeWidth = `${strokeW}px`;
                                        }
                                    }}
                                >
                                    <title>{r.name} Receives: {formatNumberLocal(rTotal)} units</title>
                                </path>
                            </g>
                        );
                    })}

                    {/* Stage 1: Factions (Attackers & Defenders Cards) */}
                    <g transform={`translate(${stage1X - 110}, ${yAtk - 18})`}>
                        <rect width="100" height="36" rx="6" fill="rgba(6, 10, 20, 0.85)" stroke="rgba(0, 242, 255, 0.2)" strokeWidth="1" />
                        <rect width="3" height="36" fill="#00f2ff" rx="1" />
                        <text x="12" y="14" fill="#00f2ff" style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>ATTACKERS</text>
                        <text x="12" y="26" fill="rgba(255, 255, 255, 0.4)" style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{formatCompact(attackerLosses)} losses</text>
                    </g>
                    <circle cx={stage1X} cy={yAtk} r="5" fill="#00f2ff" filter="drop-shadow(0 0 2px #00f2ff)" />
                    <circle cx={stage1X} cy={yAtk} r="2.5" fill="#050810" />

                    <g transform={`translate(${stage1X - 110}, ${yDef - 18})`}>
                        <rect width="100" height="36" rx="6" fill="rgba(6, 10, 20, 0.85)" stroke="rgba(255, 95, 95, 0.2)" strokeWidth="1" />
                        <rect width="3" height="36" fill="#ff5f5f" rx="1" />
                        <text x="12" y="14" fill="#ff5f5f" style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>DEFENDERS</text>
                        <text x="12" y="26" fill="rgba(255, 255, 255, 0.4)" style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{formatCompact(defenderLosses)} losses</text>
                    </g>
                    <circle cx={stage1X} cy={yDef} r="5" fill="#ff5f5f" filter="drop-shadow(0 0 2px #ff5f5f)" />
                    <circle cx={stage1X} cy={yDef} r="2.5" fill="#050810" />

                    {/* Stage 2: Debris Field Capsule */}
                    <g transform={`translate(${stage2X - 40}, ${centerY - 40})`}>
                        <rect width="80" height="80" rx="14" fill="rgba(6, 12, 24, 0.95)" stroke="#f97316" strokeWidth="1.5" filter="drop-shadow(0 0 12px rgba(249, 115, 22, 0.25))" />
                        <rect x="3" y="3" width="74" height="74" rx="11" fill="url(#debrisCapsuleGlow)" />
                        <text x="40" y="26" textAnchor="middle" fill="#f97316" style={{ fontSize: '8.5px', fontWeight: 900, letterSpacing: '1px', opacity: 0.8 }}>DEBRIS</text>
                        <text x="40" y="42" textAnchor="middle" fill="#fff" style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>{formatCompact(totalDebrisGenerated)}</text>
                        <text x="40" y="56" textAnchor="middle" fill="rgba(255,255,255,0.35)" style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>generated</text>
                    </g>
                    {/* Stage 2 Ports */}
                    {debrisInPortsY.map((py, idx) => (
                        <circle key={`deb-in-p-${idx}`} cx={stage2X - 40} cy={py} r="2" fill="#f97316" />
                    ))}
                    {debrisOutPortsY.map((py, idx) => (
                        <circle key={`deb-out-p-${idx}`} cx={stage2X + 40} cy={py} r="2" fill="#f97316" />
                    ))}

                    {/* Stage 3: Harvester Nodes & Space Remnants */}
                    {stage3Nodes.map((node, idx) => {
                        const y = stage3YCoords[idx];
                        const isUnc = node.isUncollected;
                        const nodeColor = isUnc ? '#f43f5e' : getPlayerColor(node.name);

                        return (
                            <g key={`node-card-${idx}`}>
                                <circle cx={stage3X - 55} cy={y} r="5" fill={nodeColor} filter={`drop-shadow(0 0 2px ${nodeColor})`} />
                                <circle cx={stage3X - 55} cy={y} r="2.5" fill="#050810" />

                                <g transform={`translate(${stage3X - 50}, ${y - 18})`}>
                                    <rect width="100" height="36" rx="6" fill="rgba(6, 10, 20, 0.85)" stroke={`${nodeColor}33`} strokeWidth="1" />
                                    <rect width="3" height="36" fill={nodeColor} rx={1} />
                                    <text x="10" y="14" fill={nodeColor} style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2px' }}>
                                        {node.name}
                                    </text>
                                    <text x="10" y="26" fill="rgba(255,255,255,0.4)" style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 600 }}>
                                        {formatCompact(node.amount)} units
                                    </text>
                                </g>

                                {/* Only show outflow port if it is NOT uncollected */}
                                {!isUnc && (
                                    <>
                                        <circle cx={stage3X + 55} cy={y} r="5" fill={nodeColor} filter={`drop-shadow(0 0 2px ${nodeColor})`} />
                                        <circle cx={stage3X + 55} cy={y} r="2.5" fill="#050810" />
                                    </>
                                )}
                            </g>
                        );
                    })}

                    {/* Stage 4: Consolidated Loot Core */}
                    <g transform={`translate(${stage4X - 40}, ${centerY - 40})`}>
                        <rect width="80" height="80" rx="14" fill="rgba(6, 12, 24, 0.95)" stroke="var(--primary)" strokeWidth="1.5" filter="drop-shadow(0 0 12px var(--primary-glow))" />
                        <rect x="3" y="3" width="74" height="74" rx="11" fill="url(#poolCapsuleGlow)" />
                        <text x="40" y="26" textAnchor="middle" fill="var(--primary)" style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1.5px', opacity: 0.8 }}>LOOT CORE</text>
                        <text x="40" y="42" textAnchor="middle" fill="#fff" style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>{formatCompact(totalPool)}</text>
                        <text x="40" y="56" textAnchor="middle" fill="rgba(255,255,255,0.35)" style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>harvested</text>
                    </g>
                    {/* Stage 4 Ports */}
                    {lootInPortsY.map((py, idx) => (
                        <circle key={`loot-in-p-${idx}`} cx={stage4X - 40} cy={py} r="2" fill="var(--primary)" />
                    ))}
                    {lootOutPortsY.map((py, idx) => (
                        <circle key={`loot-out-p-${idx}`} cx={stage4X + 40} cy={py} r="2" fill="var(--primary)" />
                    ))}

                    {/* Stage 5: Receivers (Split Payouts) */}
                    {receivers.map((r, idx) => {
                        const y = stage5YCoords[idx];
                        const playerColor = getPlayerColor(r.name);
                        const rTotal = r.targetM + r.targetC;

                        return (
                            <g key={`recv-card-${idx}`}>
                                <circle cx={stage5X - 5} cy={y} r="5" fill={playerColor} filter={`drop-shadow(0 0 2px ${playerColor})`} />
                                <circle cx={stage5X - 5} cy={y} r="2.5" fill="#050810" />

                                <g transform={`translate(${stage5X}, ${y - 18})`}>
                                    <rect width="100" height="36" rx="6" fill="rgba(6, 10, 20, 0.85)" stroke={`${playerColor}33`} strokeWidth="1" />
                                    <rect width="3" height="36" fill={playerColor} rx={1} />
                                    <text x="10" y="14" fill={playerColor} style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2px' }}>
                                        {r.name}
                                    </text>
                                    <text x="10" y="26" fill="rgba(255,255,255,0.4)" style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 600 }}>
                                        {formatCompact(rTotal)} split
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const AcsSplitter: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [reports, setReports] = useState<CombatReport[]>([]);
    const [rrReports, setRrReports] = useState<RecycleReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stepper Navigation
    const [currentStep, setCurrentStep] = useState(1);

    // Bulk RR Inputs and Status
    const [bulkRrInput, setBulkRrInput] = useState('');
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
    const [skippedRrKeys, setSkippedRrKeys] = useState<Array<{ key: string; error: string }>>([]);

    // Split Configurations
    const [activeFaction, setActiveFaction] = useState<'attackers' | 'defenders'>('attackers');
    const [splitMethod, setSplitMethod] = useState<'equal' | 'contribution' | 'capacity' | 'weighted' | 'percentage'>('equal');
    const [reimburseExpenses, setReimburseExpenses] = useState(false);
    const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
    const [percentageLocks, setPercentageLocks] = useState<Record<string, boolean>>({});

    // Commander Expenses Mapping (keyed by commander fleet_owner)
    const [participantSettings, setParticipantSettings] = useState<Record<string, {
        active: boolean;
        lossesMetal: number;
        lossesCrystal: number;
        fuelDeut: number;
    }>>({});

    // Auto-populate activeFaction and participantSettings based on combat report winner
    const combinedReport = React.useMemo(() => {
        if (reports.length === 0) return null;

        const first = reports[0];
        const result = {
            ...first,
            RESULT_DATA: {
                ...first.RESULT_DATA,
                generic: { ...first.RESULT_DATA.generic },
                attackers: [] as any[],
                defenders: [] as any[]
            }
        };

        const gen = result.RESULT_DATA.generic;
        gen.debris_metal = 0;
        gen.debris_crystal = 0;
        gen.debris_deuterium = 0;
        gen.debris_reaper_metal_retrieved = 0;
        gen.debris_reaper_crystal_retrieved = 0;
        gen.debris_reaper_deuterium_retrieved = 0;
        gen.units_lost_attackers = 0;
        gen.units_lost_defenders = 0;
        gen.wreckfield = [];

        reports.forEach(r => {
            const rg = r.RESULT_DATA.generic;
            gen.debris_metal += (rg.debris_metal || 0);
            gen.debris_crystal += (rg.debris_crystal || 0);
            gen.debris_deuterium += (rg.debris_deuterium || 0);
            gen.debris_reaper_metal_retrieved! += (rg.debris_reaper_metal_retrieved || 0);
            gen.debris_reaper_crystal_retrieved! += (rg.debris_reaper_crystal_retrieved || 0);
            gen.debris_reaper_deuterium_retrieved! += (rg.debris_reaper_deuterium_retrieved || 0);
            gen.units_lost_attackers += (rg.units_lost_attackers || 0);
            gen.units_lost_defenders += (rg.units_lost_defenders || 0);

            if (rg.wreckfield) {
                rg.wreckfield.forEach(w => {
                    const existing = gen.wreckfield!.find(ex => ex.ship_type === w.ship_type);
                    if (existing) existing.count += w.count;
                    else gen.wreckfield!.push({ ...w });
                });
            }
        });

        const last = reports[reports.length - 1];
        gen.winner = last.RESULT_DATA.generic.winner;
        gen.combat_coordinates = last.RESULT_DATA.generic.combat_coordinates;
        gen.event_time = last.RESULT_DATA.generic.event_time;

        const mergeFleets = (allFleets: any[][]) => {
            const mergedMap = new Map<string, any>();
            allFleets.flat().forEach(participant => {
                const key = participant.fleet_owner;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, {
                        ...participant,
                        fleet_composition: participant.fleet_composition.map((s: any) => ({ ...s }))
                    });
                } else {
                    const existing = mergedMap.get(key);
                    participant.fleet_composition.forEach((ship: any) => {
                        const existingShip = existing.fleet_composition.find((s: any) => s.ship_type === ship.ship_type);
                        if (existingShip) {
                            existingShip.count += (ship.count || 0);
                        } else {
                            existing.fleet_composition.push({ ...ship });
                        }
                    });
                }
            });
            return Array.from(mergedMap.values());
        };

        result.RESULT_DATA.attackers = mergeFleets(reports.map(r => r.RESULT_DATA.attackers));
        result.RESULT_DATA.defenders = mergeFleets(reports.map(r => r.RESULT_DATA.defenders));

        return result;
    }, [reports]);

    const getPlayerColor = (name: string) => {
        if (!combinedReport) return 'var(--primary)';
        const commanders = activeFaction === 'attackers' 
            ? combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner)
            : combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner);
        const colors = [
            '#00f2ff', // Neon Cyan
            '#d946ef', // Neon Purple/Magenta
            '#fbbf24', // Neon Gold/Amber
            '#10b981', // Neon Green
            '#f97316', // Neon Orange
            '#a855f7', // Neon Violet
            '#ec4899', // Neon Pink
            '#3b82f6', // Neon Cobalt Blue
            '#14b8a6', // Neon Teal
            '#f43f5e'  // Neon Crimson Red
        ];
        const idx = commanders.indexOf(name);
        return colors[idx === -1 ? 0 : idx % colors.length];
    };

    // Slider percentage change balancing logic (keeps total = 100% and respects locks)
    const handlePercentageChange = (changedName: string, targetVal: number) => {
        if (percentageLocks[changedName]) return;
        if (!combinedReport) return;
        const commanders = activeFaction === 'attackers' 
            ? combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner)
            : combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner);
        const activeCommanders = commanders.filter(name => participantSettings[name]?.active !== false);

        if (activeCommanders.length <= 1) return;

        const oldPercentages = { ...customPercentages };

        // Calculate the sum of locked percentages of OTHER commanders
        let sumLocked = 0;
        activeCommanders.forEach(name => {
            if (name !== changedName && percentageLocks[name]) {
                sumLocked += oldPercentages[name] || 0;
            }
        });
        const maxAllowed = Math.max(0, 100 - sumLocked);

        // Pin value between 0 and maxAllowed
        let newValue = Math.min(maxAllowed, Math.max(0, targetVal));

        const oldValue = oldPercentages[changedName] || 0;
        const diff = newValue - oldValue;

        // Find other active commanders who are unlocked
        const otherUnlocked = activeCommanders.filter(name => name !== changedName && !percentageLocks[name]);

        if (otherUnlocked.length === 0) {
            // If all others are locked, we cannot change this value because sum must be 100%
            return;
        }

        const newPercentages = { ...oldPercentages };
        newPercentages[changedName] = newValue;

        let sumOther = 0;
        otherUnlocked.forEach(name => {
            sumOther += oldPercentages[name] || 0;
        });

        if (diff > 0) {
            // Proportional decrease: decrease others based on their current ratio
            otherUnlocked.forEach(name => {
                const currentVal = oldPercentages[name] || 0;
                const decrease = sumOther > 0 ? (currentVal / sumOther) * diff : diff / otherUnlocked.length;
                newPercentages[name] = Math.max(0, currentVal - decrease);
            });
        } else {
            // Proportional increase or equal increase if sumOther is 0
            otherUnlocked.forEach(name => {
                const currentVal = oldPercentages[name] || 0;
                const increase = sumOther > 0 ? (currentVal / sumOther) * (-diff) : (-diff) / otherUnlocked.length;
                newPercentages[name] = Math.min(100, currentVal + increase);
            });
        }

        // Rounding/Float correction to guarantee sum is exactly 100.0%
        newPercentages[changedName] = newValue;
        let totalSum = activeCommanders.reduce((acc, name) => acc + (newPercentages[name] || 0), 0);
        let error = 100 - totalSum;

        if (Math.abs(error) > 0.0001) {
            // Distribute rounding error to the first unlocked other commander
            newPercentages[otherUnlocked[0]] = Math.min(100, Math.max(0, (newPercentages[otherUnlocked[0]] || 0) + error));
        }

        setCustomPercentages(newPercentages);
    };

    // Auto-initialize percentages equally when active commanders list changes
    useEffect(() => {
        if (!combinedReport) return;
        const commanders = activeFaction === 'attackers' 
            ? combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner)
            : combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner);
        const activeCommanders = commanders.filter(name => participantSettings[name]?.active !== false);

        if (activeCommanders.length === 0) return;

        const newPercentages = { ...customPercentages };
        
        // Clean up inactive/removed commanders from percentage map
        Object.keys(newPercentages).forEach(name => {
            if (!activeCommanders.includes(name)) {
                delete newPercentages[name];
            }
        });

        const existingNames = Object.keys(newPercentages);
        const missingNames = activeCommanders.filter(name => !existingNames.includes(name));

        if (missingNames.length > 0 || existingNames.length !== activeCommanders.length) {
            // Equal distribution
            const equalShare = 100 / activeCommanders.length;
            activeCommanders.forEach(name => {
                newPercentages[name] = equalShare;
            });
        }

        // Verify total sum
        const sum = activeCommanders.reduce((acc, name) => acc + (newPercentages[name] || 0), 0);
        if (Math.abs(sum - 100) > 0.01) {
            const equalShare = 100 / activeCommanders.length;
            activeCommanders.forEach(name => {
                newPercentages[name] = equalShare;
            });
        }

        setCustomPercentages(newPercentages);
    }, [combinedReport, participantSettings, activeFaction]);

    const [copiedTransfers, setCopiedTransfers] = useState(false);

    // Auto-populate activeFaction and participantSettings based on combat report winner
    useEffect(() => {
        if (!combinedReport) return;
        
        // Auto-assign split faction based on winner
        const winner = combinedReport.RESULT_DATA.generic.winner;
        if (winner === 'attacker') {
            setActiveFaction('attackers');
        } else if (winner === 'defender') {
            setActiveFaction('defenders');
        }

        // Initialize active settings for all commanders
        const newSettings = { ...participantSettings };
        let updated = false;

        const allCommanders = [
            ...combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner),
            ...combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner)
        ];

        allCommanders.forEach(name => {
            if (!newSettings[name]) {
                newSettings[name] = {
                    active: true,
                    lossesMetal: 0,
                    lossesCrystal: 0,
                    fuelDeut: 0
                };
                updated = true;
            }
        });

        if (updated) {
            setParticipantSettings(newSettings);
        }
    }, [combinedReport]);

    const fetchReport = async () => {
        const trimmedKey = apiKey.trim();
        if (!trimmedKey.toLowerCase().startsWith('cr-')) {
            setError('Please enter a valid Combat Report (cr-) API key');
            return;
        }

        if (reports.some(r => r.key === trimmedKey)) {
            setError('This combat report has already been added.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            chrome.runtime.sendMessage(
                { type: "FETCH_COMBAT_REPORT", apiKey: trimmedKey },
                (response) => {
                    setLoading(false);
                    if (chrome.runtime.lastError) {
                        setError(`Runtime error: ${chrome.runtime.lastError.message}`);
                        return;
                    }

                    if (response && response.success) {
                        const data = response.data;
                        if (data.RESULT_CODE !== 1000) {
                            setError(data.RESULT_MESSAGE || 'API returned an error');
                        } else {
                            setReports(prev => [...prev, { ...data, key: trimmedKey }]);
                            setApiKey('');
                        }
                    } else {
                        setError(response?.error || 'Failed to fetch report from background service');
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    const removeReport = (key: string) => {
        setReports(prev => prev.filter(r => r.key !== key));
    };

    // Bulk RR processing with error tolerance
    const handleBulkRrImport = async () => {
        const rawKeys = bulkRrInput.match(/rr-[a-zA-Z0-9-]+/g) || [];
        const uniqueKeys = Array.from(new Set(rawKeys)).filter(key => !rrReports.some(r => r.key === key));
        
        if (uniqueKeys.length === 0) {
            setBulkRrInput('');
            return;
        }
        
        setBulkImporting(true);
        setSkippedRrKeys([]);
        setBulkProgress({ total: uniqueKeys.length, current: 0, success: 0, failed: 0 });
        
        const fetchedReports: RecycleReport[] = [];
        const failedList: Array<{ key: string; error: string }> = [];

        await Promise.all(uniqueKeys.map(async (key) => {
            return new Promise<void>((resolve) => {
                chrome.runtime.sendMessage(
                    { type: "FETCH_COMBAT_REPORT", apiKey: key },
                    (response) => {
                        setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
                        
                        if (chrome.runtime.lastError) {
                            failedList.push({ key, error: chrome.runtime.lastError.message || 'Unknown runtime error' });
                            setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                        } else if (response && response.success) {
                            const data = response.data;
                            if (data.RESULT_CODE === 1000) {
                                fetchedReports.push({ ...data, key });
                                setBulkProgress(prev => ({ ...prev, success: prev.success + 1 }));
                            } else {
                                const errMsg = data.RESULT_MESSAGE || 'API returned error code ' + data.RESULT_CODE;
                                failedList.push({ key, error: errMsg });
                                setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                            }
                        } else {
                            failedList.push({ key, error: response?.error || 'Failed retrieval from background' });
                            setBulkProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                        }
                        resolve();
                    }
                );
            });
        }));

        if (fetchedReports.length > 0) {
            setRrReports(prev => [...prev, ...fetchedReports]);
        }
        if (failedList.length > 0) {
            setSkippedRrKeys(failedList);
        }
        
        setBulkRrInput('');
        setBulkImporting(false);
    };

    const removeRrReport = (key: string) => {
        setRrReports(prev => prev.filter(r => r.key !== key));
    };

    const groupedDebris = React.useMemo(() => {
        const groups = new Map<string, { owner: string; metal: number; crystal: number; times: number }>();
        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            const owner = rr.RESULT_DATA.generic.owner_name;
            const met = (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            const cry = (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);

            if (!groups.has(owner)) {
                groups.set(owner, { owner, metal: met, crystal: cry, times: 1 });
            } else {
                const existing = groups.get(owner)!;
                existing.metal += met;
                existing.crystal += cry;
                existing.times += 1;
            }
        });
        return Array.from(groups.values());
    }, [rrReports]);

    const formatNumber = (num: number | undefined | null) => (num || 0).toLocaleString();

    // Equalization Transfers calculation logic
    const generateTransfers = (
        participants: Array<{ name: string; targetM: number; harvestedM: number; targetC: number; harvestedC: number }>
    ) => {
        const transfers: Array<{ from: string; to: string; metal: number; crystal: number }> = [];

        // Metal Transfers
        const metalDiffs = participants.map(p => ({ name: p.name, diff: p.targetM - p.harvestedM }));
        const mReceivers = metalDiffs.filter(p => p.diff > 1).sort((a, b) => b.diff - a.diff);
        const mSenders = metalDiffs.filter(p => p.diff < -1).sort((a, b) => a.diff - b.diff);

        let rIdx = 0;
        let sIdx = 0;

        const mTransfers: Array<{ from: string; to: string; amount: number }> = [];

        while (rIdx < mReceivers.length && sIdx < mSenders.length) {
            const receiver = mReceivers[rIdx];
            const sender = mSenders[sIdx];

            const toSend = -sender.diff;
            const toReceive = receiver.diff;

            const amount = Math.min(toSend, toReceive);

            mTransfers.push({ from: sender.name, to: receiver.name, amount });

            sender.diff += amount;
            receiver.diff -= amount;

            if (Math.abs(sender.diff) < 1) sIdx++;
            if (Math.abs(receiver.diff) < 1) rIdx++;
        }

        // Crystal Transfers
        const crystalDiffs = participants.map(p => ({ name: p.name, diff: p.targetC - p.harvestedC }));
        const cReceivers = crystalDiffs.filter(p => p.diff > 1).sort((a, b) => b.diff - a.diff);
        const cSenders = crystalDiffs.filter(p => p.diff < -1).sort((a, b) => a.diff - b.diff);

        rIdx = 0;
        sIdx = 0;

        const cTransfers: Array<{ from: string; to: string; amount: number }> = [];

        while (rIdx < cReceivers.length && sIdx < cSenders.length) {
            const receiver = cReceivers[rIdx];
            const sender = cSenders[sIdx];

            const toSend = -sender.diff;
            const toReceive = receiver.diff;

            const amount = Math.min(toSend, toReceive);

            cTransfers.push({ from: sender.name, to: receiver.name, amount });

            sender.diff += amount;
            receiver.diff -= amount;

            if (Math.abs(sender.diff) < 1) sIdx++;
            if (Math.abs(receiver.diff) < 1) rIdx++;
        }

        // Combine Metal and Crystal transfers
        const combinedMap = new Map<string, { from: string; to: string; metal: number; crystal: number }>();

        mTransfers.forEach(t => {
            const key = `${t.from}->${t.to}`;
            combinedMap.set(key, { from: t.from, to: t.to, metal: t.amount, crystal: 0 });
        });

        cTransfers.forEach(t => {
            const key = `${t.from}->${t.to}`;
            combinedMap.set(key, { from: t.from, to: t.to, metal: combinedMap.get(key)?.metal || 0, crystal: t.amount });
        });

        return Array.from(combinedMap.values());
    };

    // Full split logic calculations
    const splitCalculations = React.useMemo(() => {
        if (!combinedReport) return null;

        const commanders = activeFaction === 'attackers' 
            ? combinedReport.RESULT_DATA.attackers.map(a => a.fleet_owner)
            : combinedReport.RESULT_DATA.defenders.map(d => d.fleet_owner);

        const activeCommanders = commanders.filter(name => {
            return participantSettings[name]?.active !== false;
        });

        // Helper to calculate total Structural Integrity for a given composition (Metal + Crystal cost)
        const getStructuralIntegrity = (composition: Array<{ ship_type: number; count: number }>) => {
            let totalSi = 0;
            composition.forEach(ship => {
                const sInfo = SHIP_DATA.find(s => s.id === ship.ship_type);
                if (sInfo && sInfo.metadata?.cost) {
                    const cost = sInfo.metadata.cost;
                    const siPerShip = (cost.metal || 0) + (cost.crystal || 0);
                    totalSi += siPerShip * (ship.count || 0);
                }
            });
            return totalSi;
        };

        // 1. Gather actual harvested resources from RRs
        const harvestedMap: Record<string, { metal: number; crystal: number }> = {};
        commanders.forEach(name => {
            harvestedMap[name] = { metal: 0, crystal: 0 };
        });

        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            const owner = rr.RESULT_DATA.generic.owner_name;
            const matchedName = commanders.find(c => c.toLowerCase() === owner.toLowerCase()) || owner;
            
            const met = (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            const cry = (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);

            if (!harvestedMap[matchedName]) {
                harvestedMap[matchedName] = { metal: 0, crystal: 0 };
            }
            harvestedMap[matchedName].metal += met;
            harvestedMap[matchedName].crystal += cry;
        });

        // 2. Sum up totals
        let totalHarvestedM = 0;
        let totalHarvestedC = 0;
        rrReports.forEach(rr => {
            if (!rr.RESULT_DATA || !rr.RESULT_DATA.generic) return;
            totalHarvestedM += (rr.RESULT_DATA.generic.recycler_metal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_metal_retrieved || 0);
            totalHarvestedC += (rr.RESULT_DATA.generic.recycler_crystal_retrieved || 0) + (rr.RESULT_DATA.generic.reaper_crystal_retrieved || 0);
        });

        let totalLossesM = 0;
        let totalLossesC = 0;
        let totalFuelD = 0;

        activeCommanders.forEach(name => {
            const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
            totalLossesM += settings.lossesMetal;
            totalLossesC += settings.lossesCrystal;
            totalFuelD += settings.fuelDeut;
        });

        // 3. Reimbursements mapping
        const reimbursementMap: Record<string, { metal: number; crystal: number }> = {};
        activeCommanders.forEach(name => {
            reimbursementMap[name] = { metal: 0, crystal: 0 };
        });

        let remainingM = totalHarvestedM;
        let remainingC = totalHarvestedC;

        if (reimburseExpenses) {
            if (totalLossesM > 0) {
                const metalRatio = Math.min(1, totalHarvestedM / totalLossesM);
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    const alloc = Math.floor(settings.lossesMetal * metalRatio);
                    reimbursementMap[name].metal += alloc;
                    remainingM -= alloc;
                });
            }
            if (totalLossesC > 0) {
                const crystalRatio = Math.min(1, totalHarvestedC / totalLossesC);
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    const alloc = Math.floor(settings.lossesCrystal * crystalRatio);
                    reimbursementMap[name].crystal += alloc;
                    remainingC -= alloc;
                });
            }
        }

        remainingM = Math.max(0, remainingM);
        remainingC = Math.max(0, remainingC);

        // 4. Split algorithms
        const profitShareMap: Record<string, { metal: number; crystal: number }> = {};
        activeCommanders.forEach(name => {
            profitShareMap[name] = { metal: 0, crystal: 0 };
        });

        if (activeCommanders.length > 0) {
            if (splitMethod === 'equal') {
                const shareM = Math.floor(remainingM / activeCommanders.length);
                const shareC = Math.floor(remainingC / activeCommanders.length);
                activeCommanders.forEach(name => {
                    profitShareMap[name].metal = shareM;
                    profitShareMap[name].crystal = shareC;
                });
            } else if (splitMethod === 'percentage') {
                activeCommanders.forEach(name => {
                    const pct = customPercentages[name] !== undefined ? customPercentages[name] : (100 / activeCommanders.length);
                    profitShareMap[name].metal = Math.floor(remainingM * (pct / 100));
                    profitShareMap[name].crystal = Math.floor(remainingC * (pct / 100));
                });
            } else if (splitMethod === 'contribution') {
                const sumLossesM = totalLossesM || 1;
                const sumLossesC = totalLossesC || 1;
                activeCommanders.forEach(name => {
                    const settings = participantSettings[name] || { lossesMetal: 0, lossesCrystal: 0, fuelDeut: 0 };
                    profitShareMap[name].metal = totalLossesM > 0 ? Math.floor(remainingM * (settings.lossesMetal / sumLossesM)) : Math.floor(remainingM / activeCommanders.length);
                    profitShareMap[name].crystal = totalLossesC > 0 ? Math.floor(remainingC * (settings.lossesCrystal / sumLossesC)) : Math.floor(remainingC / activeCommanders.length);
                });
            } else if (splitMethod === 'capacity') {
                const sumHarvestedM = totalHarvestedM || 1;
                const sumHarvestedC = totalHarvestedC || 1;
                activeCommanders.forEach(name => {
                    const harvested = harvestedMap[name] || { metal: 0, crystal: 0 };
                    profitShareMap[name].metal = totalHarvestedM > 0 ? Math.floor(remainingM * (harvested.metal / sumHarvestedM)) : Math.floor(remainingM / activeCommanders.length);
                    profitShareMap[name].crystal = totalHarvestedC > 0 ? Math.floor(remainingC * (harvested.crystal / sumHarvestedC)) : Math.floor(remainingC / activeCommanders.length);
                });
            } else if (splitMethod === 'weighted') {
                const siMap: Record<string, number> = {};
                let totalTeamSi = 0;
                activeCommanders.forEach(name => {
                    const participantData = activeFaction === 'attackers'
                        ? combinedReport.RESULT_DATA.attackers.find(a => a.fleet_owner === name)
                        : combinedReport.RESULT_DATA.defenders.find(d => d.fleet_owner === name);
                    const comp = participantData?.fleet_composition || [];
                    const si = getStructuralIntegrity(comp);
                    siMap[name] = si;
                    totalTeamSi += si;
                });
                const sumSi = totalTeamSi || 1;
                activeCommanders.forEach(name => {
                    const si = siMap[name] || 0;
                    profitShareMap[name].metal = totalTeamSi > 0 ? Math.floor(remainingM * (si / sumSi)) : Math.floor(remainingM / activeCommanders.length);
                    profitShareMap[name].crystal = totalTeamSi > 0 ? Math.floor(remainingC * (si / sumSi)) : Math.floor(remainingC / activeCommanders.length);
                });
            }
        }

        // 5. Build full participant ledger
        const participantPayouts = commanders.map(name => {
            const isActive = activeCommanders.includes(name);
            const reimb = reimbursementMap[name] || { metal: 0, crystal: 0 };
            const profit = profitShareMap[name] || { metal: 0, crystal: 0 };
            const harvested = harvestedMap[name] || { metal: 0, crystal: 0 };

            const targetM = isActive ? (reimb.metal + profit.metal) : 0;
            const targetC = isActive ? (reimb.crystal + profit.crystal) : 0;

            const diffM = targetM - harvested.metal;
            const diffC = targetC - harvested.crystal;

            const participantData = activeFaction === 'attackers'
                ? combinedReport.RESULT_DATA.attackers.find(a => a.fleet_owner === name)
                : combinedReport.RESULT_DATA.defenders.find(d => d.fleet_owner === name);
            const si = participantData ? getStructuralIntegrity(participantData.fleet_composition) : 0;

            let sharePercentage = 0;
            if (isActive) {
                if (splitMethod === 'equal') {
                    sharePercentage = 100 / activeCommanders.length;
                } else if (splitMethod === 'percentage') {
                    sharePercentage = customPercentages[name] !== undefined ? customPercentages[name] : (100 / activeCommanders.length);
                } else if (splitMethod === 'weighted') {
                    let totalTeamSi = 0;
                    activeCommanders.forEach(cName => {
                        const pData = activeFaction === 'attackers'
                            ? combinedReport.RESULT_DATA.attackers.find(a => a.fleet_owner === cName)
                            : combinedReport.RESULT_DATA.defenders.find(d => d.fleet_owner === cName);
                        const comp = pData?.fleet_composition || [];
                        totalTeamSi += getStructuralIntegrity(comp);
                    });
                    sharePercentage = totalTeamSi > 0 ? (si / totalTeamSi) * 100 : (100 / activeCommanders.length);
                } else if (splitMethod === 'contribution') {
                    const sumLosses = (totalLossesM + totalLossesC);
                    const myLosses = (participantSettings[name]?.lossesMetal || 0) + (participantSettings[name]?.lossesCrystal || 0);
                    sharePercentage = sumLosses > 0 ? (myLosses / sumLosses) * 100 : (100 / activeCommanders.length);
                } else if (splitMethod === 'capacity') {
                    const sumHarvested = (totalHarvestedM + totalHarvestedC);
                    const myHarvested = (harvestedMap[name]?.metal || 0) + (harvestedMap[name]?.crystal || 0);
                    sharePercentage = sumHarvested > 0 ? (myHarvested / sumHarvested) * 100 : (100 / activeCommanders.length);
                }
            }

            return {
                name,
                isActive,
                lossesMetal: participantSettings[name]?.lossesMetal || 0,
                lossesCrystal: participantSettings[name]?.lossesCrystal || 0,
                fuelDeut: participantSettings[name]?.fuelDeut || 0,
                harvestedM: harvested.metal,
                harvestedC: harvested.crystal,
                targetM,
                targetC,
                diffM,
                diffC,
                structuralIntegrity: si,
                sharePercentage
            };
        });

        const activePayouts = participantPayouts.filter(p => p.isActive);
        const transfers = generateTransfers(
            activePayouts.map(p => ({
                name: p.name,
                targetM: p.targetM,
                harvestedM: p.harvestedM,
                targetC: p.targetC,
                harvestedC: p.harvestedC
            }))
        );

        return {
            totalHarvestedM,
            totalHarvestedC,
            totalLossesM,
            totalLossesC,
            totalFuelD,
            netProfitM: remainingM,
            netProfitC: remainingC,
            participantPayouts,
            transfers
        };
    }, [combinedReport, activeFaction, splitMethod, reimburseExpenses, participantSettings, rrReports, customPercentages]);

    const winnerColor = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? 'var(--primary)' :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? '#ff5f5f' :
            'var(--text-muted)';

    const winnerIcon = combinedReport?.RESULT_DATA.generic.winner === 'attacker' ? <Rocket size={20} /> :
        combinedReport?.RESULT_DATA.generic.winner === 'defender' ? <Shield size={20} /> :
            <Gavel size={20} />;

    const handleCopyTransfers = () => {
        if (!splitCalculations || !combinedReport) return;
        const textLines = [
            `--- OGame ACS Split Balance Sheet ---`,
            `Location: [${combinedReport.RESULT_DATA.generic.combat_coordinates}]`,
            `Time: ${combinedReport.RESULT_DATA.generic.event_time}`,
            `Total Harvested: ${formatNumber(splitCalculations.totalHarvestedM)} Metal | ${formatNumber(splitCalculations.totalHarvestedC)} Crystal`,
            ``,
            `Required Transfers:`
        ];

        if (splitCalculations.transfers.length === 0) {
            textLines.push(`All accounts are balanced! No transfers required.`);
        } else {
            splitCalculations.transfers.forEach(t => {
                const resources = [];
                if (t.metal > 0) resources.push(`${formatNumber(t.metal)} Metal`);
                if (t.crystal > 0) resources.push(`${formatNumber(t.crystal)} Crystal`);
                textLines.push(`- ${t.from} sends ${resources.join(' & ')} to ${t.to}`);
            });
        }
        textLines.push(`-------------------------------------`);

        navigator.clipboard.writeText(textLines.join('\n'));
        setCopiedTransfers(true);
        setTimeout(() => setCopiedTransfers(false), 2000);
    };

    return (
        <div className="acs-splitter-container" style={{ padding: '0 8px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Step Stepper Header */}
            <div className="acs-steps-header glass">
                {[
                    { step: 1, label: 'Battle Intel', icon: <Target size={16} />, status: reports.length > 0 ? 'completed' : 'active' },
                    { step: 2, label: 'Debris Harvests', icon: <Download size={16} />, status: reports.length === 0 ? 'locked' : (rrReports.length > 0 ? 'completed' : 'active') },
                    { step: 3, label: 'Profit Division', icon: <Coins size={16} />, status: reports.length === 0 ? 'locked' : 'active' }
                ].map((s) => {
                    const isActive = currentStep === s.step;
                    const isLocked = reports.length === 0 && s.step > 1;
                    const isCompleted = s.step === 1 ? reports.length > 0 : (s.step === 2 ? rrReports.length > 0 : false);
                    
                    return (
                        <button 
                            key={s.step} 
                            disabled={isLocked}
                            className={`step-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                            onClick={() => setCurrentStep(s.step)}
                        >
                            <div className="step-badge">
                                {isCompleted ? '✓' : s.step}
                            </div>
                            <div className="step-icon">{s.icon}</div>
                            <div className="step-label">{s.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* STEP 1: COMBAT REPORTS */}
            {currentStep === 1 && (
                <div className="step-content animate-fade">
                    <div className="grid-2-1">
                        <div className="card-primary glass">
                            <label className="card-lbl-primary">
                                <Target size={16} /> strategic combat integration
                            </label>
                            <p className="card-desc">
                                Paste in the shareable API key (`cr-` report) from your wave logs. You can bundle multiple waves together to split resource costs and debris sums as a single aggregate ACS operation.
                            </p>
                            
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="cr-en-XXX-XXXXXX..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="input-custom font-mono"
                                />
                                <button
                                    onClick={fetchReport}
                                    disabled={loading}
                                    className="btn-primary"
                                >
                                    {loading ? 'Decrypting...' : <><Download size={16} /> Import Wave</>}
                                </button>
                            </div>
                            {error && <div className="error-box"><AlertCircle size={14} /> {error}</div>}

                            {reports.length > 0 && (
                                <div className="cr-tags-container">
                                    <div className="sub-tag-lbl">Added combat report keys:</div>
                                    <div className="flex-wrap-gap">
                                        {reports.map((r, idx) => (
                                            <div key={idx} className="cr-tag glass">
                                                <span className="font-mono">{r.key.split('-').pop()?.slice(-8)}...</span>
                                                <button onClick={() => removeReport(r.key)} className="btn-x-red"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {combinedReport ? (
                            <div className="side-cards">
                                {/* Verdict banner */}
                                <div className="verdict-banner" style={{ borderLeftColor: winnerColor, background: `${winnerColor}0a` }}>
                                    <div className="verdict-icon" style={{ backgroundColor: winnerColor }}>
                                        {winnerIcon}
                                    </div>
                                    <div>
                                        <div className="verdict-title" style={{ color: winnerColor }}>
                                            {combinedReport.RESULT_DATA.generic.winner === 'draw' ? 'Draw' : `${combinedReport.RESULT_DATA.generic.winner}s Win`}
                                        </div>
                                        <div className="verdict-sub">Coordinates: {combinedReport.RESULT_DATA.generic.combat_coordinates} | Time: {combinedReport.RESULT_DATA.generic.event_time}</div>
                                    </div>
                                </div>

                                {/* Fleet commanders */}
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><Users size={16} /> Factions Involved</div>
                                    <div className="commanders-faction-split">
                                        <div>
                                            <div className="faction-header attacker-col">ATTACKERS ({combinedReport.RESULT_DATA.attackers.length})</div>
                                            <div className="commanders-list">
                                                {combinedReport.RESULT_DATA.attackers.map((a, i) => (
                                                    <span key={i} className="commander-pill-atk">{a.fleet_owner}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '12px' }}>
                                            <div className="faction-header defender-col">DEFENDERS ({combinedReport.RESULT_DATA.defenders.length})</div>
                                            <div className="commanders-list">
                                                {combinedReport.RESULT_DATA.defenders.map((d, i) => (
                                                    <span key={i} className="commander-pill-def">{d.fleet_owner}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Debris generated */}
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><TrendingUp size={16} /> Total Potential Debris</div>
                                    <div className="debris-stack">
                                        <div className="debris-item-bar border-metal">
                                            <span className="debris-name">METAL DEBRIS</span>
                                            <span className="debris-val metal-color">{formatNumber(combinedReport.RESULT_DATA.generic.debris_metal)}</span>
                                        </div>
                                        <div className="debris-item-bar border-crystal">
                                            <span className="debris-name">CRYSTAL DEBRIS</span>
                                            <span className="debris-val crystal-color">{formatNumber(combinedReport.RESULT_DATA.generic.debris_crystal)}</span>
                                        </div>
                                        {(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved || 0) > 0 && (
                                            <div className="reaper-extraction-box">
                                                <div className="reaper-lbl">Reaper Tactical Retrieval (Auto-harvested)</div>
                                                <div className="reaper-values">
                                                    <span>M: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_metal_retrieved)}</span>
                                                    <span>C: {formatNumber(combinedReport.RESULT_DATA.generic.debris_reaper_crystal_retrieved)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state glass">
                                <Info size={40} className="empty-state-icon" />
                                <h3>Decrypt Battle Records</h3>
                                <p>Provide at least one Combat Report (cr-) API key on the left to initialize the split wizard and map out debris calculations.</p>
                            </div>
                        )}
                    </div>

                    {combinedReport && (
                        <div className="nav-bottom-actions">
                            <button onClick={() => setCurrentStep(2)} className="btn-next">
                                Proceed to Debris Harvests →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: RECYCLE REPORTS */}
            {currentStep === 2 && combinedReport && (
                <div className="step-content animate-fade">
                    <div className="grid-2-1">
                        <div className="card-primary glass">
                            <label className="card-lbl-primary" style={{ color: 'var(--color-crystal)' }}>
                                <Download size={16} /> Bulk Recycle Log Collection
                            </label>
                            <p className="card-desc">
                                Paste **one or multiple** recycle logs (`rr-`) simultaneously. You can copy a block of text containing multiple keys (separated by spaces, commas, or newlines) — we will automatically isolate, process, and combine the active harvests.
                            </p>

                            <textarea
                                placeholder="Paste multiple rr-en-XXX keys here..."
                                value={bulkRrInput}
                                onChange={(e) => setBulkRrInput(e.target.value)}
                                className="textarea-custom font-mono"
                                rows={6}
                            />

                            <button
                                onClick={handleBulkRrImport}
                                disabled={bulkImporting || !bulkRrInput.trim()}
                                className="btn-primary"
                                style={{ background: 'var(--color-crystal)', color: '#0b0f19', marginTop: '12px' }}
                            >
                                {bulkImporting ? 'Retrieving batch...' : <><Download size={16} /> Batch Import Recycle Reports</>}
                            </button>

                            {bulkImporting && (
                                <div className="bulk-loader-box">
                                    <div className="loader-progress-text">
                                        Importing reports: {bulkProgress.current} / {bulkProgress.total} 
                                        <span className="success-badge">({bulkProgress.success} OK)</span>
                                        {bulkProgress.failed > 0 && <span className="failed-badge">({bulkProgress.failed} Skipped)</span>}
                                    </div>
                                    <div className="progress-bg">
                                        <div 
                                            className="progress-fill fill-crystal" 
                                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Skipped keys due to errors */}
                            {skippedRrKeys.length > 0 && (
                                <div className="skipped-diagnostic-card">
                                    <div className="skipped-diagnostic-title"><AlertCircle size={14} /> Skipped Invalid Keys ({skippedRrKeys.length})</div>
                                    <div className="skipped-diagnostic-desc">The following keys returned API or network failures and were skipped:</div>
                                    <div className="skipped-keys-list font-mono">
                                        {skippedRrKeys.map((item, idx) => (
                                            <div key={idx} className="skipped-key-row">
                                                <span className="skipped-key-name">{item.key.slice(0, 16)}...</span>
                                                <span className="skipped-key-reason">{item.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {rrReports.length > 0 && (
                                <div className="rr-added-container">
                                    <div className="sub-tag-lbl">Recycle reports successfully imported ({rrReports.length}):</div>
                                    <div className="flex-wrap-gap">
                                        {rrReports.map((rr, idx) => (
                                            <div key={idx} className="rr-tag glass">
                                                <span className="font-mono">{rr.key.split('-').pop()?.slice(-8)}...</span>
                                                <button onClick={() => removeRrReport(rr.key)} className="btn-x-red"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="side-cards">
                            {/* Debris field progress gauge */}
                            {splitCalculations && (
                                <div className="card-glass shadow-large">
                                    <div className="side-card-title"><TrendingUp size={16} /> Harvest Collection Rate</div>
                                    
                                    {/* Metal bar */}
                                    <div className="gauge-row">
                                        <div className="gauge-labels">
                                            <span className="metal-color font-bold">METAL COLLECTION</span>
                                            <span className="font-mono">
                                                {Math.round(Math.min(100, (splitCalculations.totalHarvestedM / (combinedReport.RESULT_DATA.generic.debris_metal || 1)) * 100))}%
                                            </span>
                                        </div>
                                        <div className="progress-bg h-8">
                                            <div 
                                                className="progress-fill fill-metal" 
                                                style={{ width: `${Math.min(100, (splitCalculations.totalHarvestedM / (combinedReport.RESULT_DATA.generic.debris_metal || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="gauge-nums font-mono">
                                            {formatNumber(splitCalculations.totalHarvestedM)} / {formatNumber(combinedReport.RESULT_DATA.generic.debris_metal)}
                                        </div>
                                    </div>

                                    {/* Crystal bar */}
                                    <div className="gauge-row" style={{ marginTop: '16px' }}>
                                        <div className="gauge-labels">
                                            <span className="crystal-color font-bold">CRYSTAL COLLECTION</span>
                                            <span className="font-mono">
                                                {Math.round(Math.min(100, (splitCalculations.totalHarvestedC / (combinedReport.RESULT_DATA.generic.debris_crystal || 1)) * 100))}%
                                            </span>
                                        </div>
                                        <div className="progress-bg h-8">
                                            <div 
                                                className="progress-fill fill-crystal" 
                                                style={{ width: `${Math.min(100, (splitCalculations.totalHarvestedC / (combinedReport.RESULT_DATA.generic.debris_crystal || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="gauge-nums font-mono">
                                            {formatNumber(splitCalculations.totalHarvestedC)} / {formatNumber(combinedReport.RESULT_DATA.generic.debris_crystal)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Yield summary per player */}
                            <div className="card-glass shadow-large">
                                <div className="side-card-title"><Users size={16} /> Yield Summary</div>
                                {groupedDebris.length > 0 ? (
                                    <div className="yield-groups-stack">
                                        {groupedDebris.map((group, idx) => (
                                            <div key={idx} className="yield-group-card">
                                                <div className="yield-header">
                                                    <span className="yield-commander-name">{group.owner}</span>
                                                    <span className="yield-runs-tag">{group.times} collections</span>
                                                </div>
                                                <div className="yield-nums-grid">
                                                    <div>
                                                        <div className="yield-lbl-small font-bold text-center text-metal">METAL</div>
                                                        <div className="yield-val font-mono">{formatNumber(group.metal)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="yield-lbl-small font-bold text-center text-crystal">CRYSTAL</div>
                                                        <div className="yield-val font-mono">{formatNumber(group.crystal)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center font-sm opacity-6 padding-16">No recycle harvests registered yet. Bulk paste recycle reports to map yields.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="nav-bottom-actions">
                        <button onClick={() => setCurrentStep(1)} className="btn-back">
                            ← Back to Battle Intel
                        </button>
                        <button onClick={() => setCurrentStep(3)} className="btn-next">
                            Proceed to Profit Division →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: PROFIT DIVISION */}
            {currentStep === 3 && combinedReport && splitCalculations && (
                <div className="step-content animate-fade">
                    
                    {/* Upper Split Settings Card */}
                    <div className="card-glass margin-b-24 shadow-large">
                        <div className="split-settings-header"><Settings size={18} color="var(--primary)" /> Reward Distribution Parameters</div>
                        
                        <div className="grid-3-col">
                            {/* Faction selector */}
                            <div>
                                <label className="input-label-caps">active faction split team</label>
                                <div className="btn-group-toggle">
                                    <button 
                                        className={activeFaction === 'attackers' ? 'active-atk' : ''}
                                        onClick={() => setActiveFaction('attackers')}
                                    >
                                        Attackers Split
                                    </button>
                                    <button 
                                        className={activeFaction === 'defenders' ? 'active-def' : ''}
                                        onClick={() => setActiveFaction('defenders')}
                                    >
                                        Defenders Split
                                    </button>
                                </div>
                            </div>

                            {/* Split Method */}
                            <div>
                                <label className="input-label-caps">split algorithm</label>
                                <select 
                                    value={splitMethod} 
                                    onChange={(e) => setSplitMethod(e.target.value as any)}
                                    className="select-custom"
                                >
                                    <option value="equal">Standard Equal Split</option>
                                    <option value="percentage">Percentage Split (Custom)</option>
                                    <option value="weighted">Weighted Split (by Fleet SI)</option>
                                </select>
                            </div>

                            {/* Options checkboxes */}
                            <div>
                                <label className="input-label-caps" style={{ opacity: 0.5 }}>reimbursement policy</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}>
                                    <label className="checkbox-holder" style={{ margin: 0 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={reimburseExpenses}
                                            onChange={(e) => setReimburseExpenses(e.target.checked)}
                                            className="checkbox-custom"
                                        />
                                        <span>Reimburse Fleet Losses First</span>
                                    </label>
                                    <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'help' }}>
                                        <Info size={14} color="var(--primary)" style={{ opacity: 0.6 }} />
                                        <div className="tooltip-text">
                                            If active, player ship losses (Lost Metal/Crystal) are paid back first from the debris harvested before splitting the remaining profits.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Faction Expenses Input Table */}
                    <div className="card-glass margin-b-24 shadow-large overflow-x">
                        <div className="split-settings-header"><Coins size={18} color="var(--primary)" /> Expense & Combat Losses Matrix</div>
                        <table className="expenses-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>Active</th>
                                    <th style={{ width: '170px' }}>Share %</th>
                                    <th>Commander</th>
                                    <th>Lost Metal</th>
                                    <th>Lost Crystal</th>
                                    <th>Flight Fuel Spent (Deut)</th>
                                    <th>Fleet SI</th>
                                    <th>Debris Harvested (Metal)</th>
                                    <th>Debris Harvested (Crystal)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {splitCalculations.participantPayouts.map((p, idx) => (
                                    <tr key={idx} className={p.isActive ? 'active-row' : 'inactive-row'}>
                                        <td className="text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={p.isActive}
                                                onChange={(e) => {
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            active: e.target.checked
                                                        }
                                                    }));
                                                }}
                                                className="checkbox-custom"
                                                style={{ accentColor: getPlayerColor(p.name) }}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {splitMethod === 'percentage' && p.isActive ? (
                                                    <>
                                                        <input 
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={Math.round(p.sharePercentage)}
                                                            onChange={(e) => handlePercentageChange(p.name, parseInt(e.target.value) || 0)}
                                                            className="range-custom"
                                                            style={{ 
                                                                '--thumb-color': getPlayerColor(p.name),
                                                                cursor: percentageLocks[p.name] ? 'not-allowed' : 'pointer',
                                                                opacity: percentageLocks[p.name] ? 0.65 : 1
                                                            } as React.CSSProperties}
                                                        />
                                                        <span 
                                                            className="font-mono" 
                                                            style={{ 
                                                                fontSize: '0.8rem', 
                                                                minWidth: '46px', 
                                                                textAlign: 'right', 
                                                                fontWeight: 800, 
                                                                color: getPlayerColor(p.name),
                                                                textShadow: `0 0 6px ${getPlayerColor(p.name)}40`,
                                                                transition: 'all 0.2s ease',
                                                                padding: '2px 4.5px',
                                                                borderRadius: '4px',
                                                                background: percentageLocks[p.name] ? `${getPlayerColor(p.name)}1a` : 'transparent',
                                                                border: percentageLocks[p.name] ? `1px dashed ${getPlayerColor(p.name)}44` : '1px solid transparent'
                                                            }}
                                                        >
                                                            {p.sharePercentage.toFixed(1)}%
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setPercentageLocks(prev => ({
                                                                    ...prev,
                                                                    [p.name]: !prev[p.name]
                                                                }));
                                                            }}
                                                            style={{
                                                                background: percentageLocks[p.name] ? `${getPlayerColor(p.name)}1e` : 'rgba(255,255,255,0.03)',
                                                                border: percentageLocks[p.name] ? `1px solid ${getPlayerColor(p.name)}66` : '1px solid rgba(255,255,255,0.08)',
                                                                borderRadius: '6px',
                                                                color: getPlayerColor(p.name),
                                                                cursor: 'pointer',
                                                                padding: '5px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: percentageLocks[p.name] ? `0 0 8px ${getPlayerColor(p.name)}33` : 'none',
                                                            }}
                                                            title={percentageLocks[p.name] ? "Unlock Share Percentage (Active)" : "Lock Share Percentage"}
                                                        >
                                                            {percentageLocks[p.name] ? <Lock size={13} style={{ filter: `drop-shadow(0 0 2px ${getPlayerColor(p.name)})` }} /> : <Unlock size={13} style={{ opacity: 0.5 }} />}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="font-mono" style={{ fontSize: '0.8rem', color: p.isActive ? getPlayerColor(p.name) : 'rgba(255,255,255,0.2)', textShadow: p.isActive ? `0 0 6px ${getPlayerColor(p.name)}40` : 'none', fontWeight: 800 }}>
                                                        {p.isActive ? `${p.sharePercentage.toFixed(1)}%` : '-'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-bold">
                                            <span style={{ 
                                                color: getPlayerColor(p.name), 
                                                textShadow: `0 0 8px ${getPlayerColor(p.name)}33`
                                            }}>
                                                {p.name}
                                            </span>
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.lossesMetal || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            lossesMetal: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.lossesCrystal || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            lossesCrystal: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                disabled={!p.isActive}
                                                value={participantSettings[p.name]?.fuelDeut || 0}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setParticipantSettings(prev => ({
                                                        ...prev,
                                                        [p.name]: {
                                                            ...prev[p.name],
                                                            fuelDeut: val
                                                        }
                                                    }));
                                                }}
                                                className="table-input"
                                            />
                                        </td>
                                        <td className="font-mono font-bold" style={{ color: p.isActive ? getPlayerColor(p.name) : 'rgba(255,255,255,0.2)', textShadow: p.isActive ? `0 0 6px ${getPlayerColor(p.name)}40` : 'none' }}>
                                            {formatNumber(p.structuralIntegrity)}
                                        </td>
                                        <td className="font-mono text-metal font-bold">
                                            {formatNumber(p.harvestedM)}
                                        </td>
                                        <td className="font-mono text-crystal font-bold">
                                            {formatNumber(p.harvestedC)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Sankey Flow Diagram */}
                    <ResourceFlowSankey 
                        participants={splitCalculations.participantPayouts}
                        totalM={splitCalculations.totalHarvestedM}
                        totalC={splitCalculations.totalHarvestedC}
                        combinedReport={combinedReport}
                    />

                    {/* Summary & Transfers Grid */}
                    <div className="grid-2-1">
                        
                        {/* Final Balance sheet ledger */}
                        <div className="card-glass shadow-large">
                            <div className="split-settings-header"><PieChart size={18} color="var(--primary)" /> Participant Payout Ledger</div>
                            <div className="ledger-stack">
                                {splitCalculations.participantPayouts.filter(p => p.isActive).map((p, idx) => {
                                    const pColor = getPlayerColor(p.name);
                                    return (
                                        <div key={idx} className="ledger-row glass" style={{ borderLeft: `4px solid ${pColor}`, background: `linear-gradient(90deg, ${pColor}06 0%, transparent 100%)` }}>
                                            <div className="ledger-row-header">
                                                <span className="ledger-name font-bold" style={{ color: pColor, textShadow: `0 0 8px ${pColor}33` }}>{p.name}</span>
                                                <span className="ledger-tag-status" style={{ background: `${pColor}1a`, color: pColor, border: `1px solid ${pColor}33` }}>Active Partner</span>
                                            </div>
                                            <div className="ledger-row-grid">
                                                <div>
                                                    <div className="ledger-small-title font-bold text-metal">Metal Target Share</div>
                                                    <div className="ledger-small-val font-mono">{formatNumber(p.targetM)}</div>
                                                </div>
                                                <div>
                                                    <div className="ledger-small-title font-bold text-crystal">Crystal Target Share</div>
                                                    <div className="ledger-small-val font-mono">{formatNumber(p.targetC)}</div>
                                                </div>
                                            </div>
                                            <div className="balance-grid border-top-line">
                                                <div className="balance-col">
                                                    <span className="balance-lbl">Metal Balance:</span>
                                                    {p.diffM >= 0 ? (
                                                        <span className="balance-val font-mono green-color font-bold">Gets +{formatNumber(p.diffM)}</span>
                                                    ) : (
                                                        <span className="balance-val font-mono coral-color font-bold">Owes {formatNumber(Math.abs(p.diffM))}</span>
                                                    )}
                                                </div>
                                                <div className="balance-col">
                                                    <span className="balance-lbl">Crystal Balance:</span>
                                                    {p.diffC >= 0 ? (
                                                        <span className="balance-val font-mono green-color font-bold">Gets +{formatNumber(p.diffC)}</span>
                                                    ) : (
                                                        <span className="balance-val font-mono coral-color font-bold">Owes {formatNumber(Math.abs(p.diffC))}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Equalization balancing transfers */}
                        <div className="card-equalization">
                            <label className="card-lbl-primary" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Coins size={16} /> Equalization Transfers
                            </label>
                            <p className="card-desc">
                                Execute the balancing transfers below to perfectly balance the rewards and expenses.
                            </p>

                            {splitCalculations.transfers.length > 0 ? (
                                <div className="transfers-box-container font-mono">
                                    {splitCalculations.transfers.map((t, idx) => {
                                        const parts = [];
                                        if (t.metal > 0) parts.push(<span key="met" className="text-metal font-bold">{formatNumber(t.metal)} Metal</span>);
                                        if (t.crystal > 0) parts.push(<span key="cry" className="text-crystal font-bold">{formatNumber(t.crystal)} Crystal</span>);
                                        
                                        return (
                                            <div key={idx} className="equalization-statement" style={{ borderLeft: `4px solid ${getPlayerColor(t.from)}` }}>
                                                <div className="transfer-flow" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                                                    <span className="transfer-from font-bold" style={{ color: getPlayerColor(t.from), textShadow: `0 0 8px ${getPlayerColor(t.from)}33` }}>{t.from}</span>
                                                    <span className="transfer-arrow-glow">➔</span>
                                                    <span className="transfer-to font-bold" style={{ color: getPlayerColor(t.to), textShadow: `0 0 8px ${getPlayerColor(t.to)}33` }}>{t.to}</span>
                                                </div>
                                                <div className="transfer-details" style={{ fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px', marginTop: '2px' }}>
                                                    {parts.reduce((prev: any, curr) => prev === null ? [curr] : [prev, " & ", curr], null)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="balanced-banner glass text-center">
                                    <Trophy size={36} color="var(--primary)" style={{ marginBottom: '12px' }} />
                                    <div className="font-bold">Perfectly Balanced Operations</div>
                                    <div className="font-sm opacity-6">All commander accounts are balanced. No equalization transfers are required!</div>
                                </div>
                            )}

                            {splitCalculations.transfers.length > 0 && (
                                <button 
                                    onClick={handleCopyTransfers} 
                                    className="btn-copy-glow" 
                                    style={{ width: '100%', marginTop: '16px' }}
                                >
                                    {copiedTransfers ? 'Copied to Clipboard! ✓' : 'Copy Transfer List'}
                                </button>
                            )}
                        </div>

                    </div>

                    <div className="nav-bottom-actions">
                        <button onClick={() => setCurrentStep(2)} className="btn-back">
                            ← Back to Debris Harvests
                        </button>
                    </div>
                </div>
            )}
            {/* Custom Premium Styles Block */}
            <style>{`
                /* Styling custom range slider */
                .range-custom {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                    width: 80px;
                    height: 16px;
                    display: inline-block;
                    margin: 0;
                    padding: 0;
                    vertical-align: middle;
                }

                .range-custom:focus {
                    outline: none;
                }

                .range-custom::-webkit-slider-runnable-track {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    height: 6px;
                    border-radius: 3px;
                    transition: background 0.2s;
                }

                .range-custom::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    margin-top: -5px;
                    background-color: var(--thumb-color, var(--primary)) !important;
                    height: 16px;
                    width: 16px;
                    border-radius: 50% !important;
                    box-shadow: 0 0 8px var(--thumb-color, var(--primary-glow));
                    border: 1.5px solid rgba(255, 255, 255, 0.1);
                    transition: transform 0.15s ease, filter 0.15s ease, background-color 0.15s;
                }

                .range-custom::-webkit-slider-thumb:hover {
                    transform: scale(1.15);
                    filter: brightness(1.1);
                }

                .range-custom::-moz-range-track {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    height: 6px;
                    border-radius: 3px;
                }

                .range-custom::-moz-range-thumb {
                    background-color: var(--thumb-color, var(--primary)) !important;
                    height: 16px;
                    width: 16px;
                    border-radius: 50% !important;
                    box-shadow: 0 0 8px var(--thumb-color, var(--primary-glow));
                    border: 1.5px solid rgba(255, 255, 255, 0.1);
                }

                /* Equalization Transfers Area Overhauls */
                .card-equalization {
                    border-radius: 24px;
                    padding: 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: linear-gradient(135deg, rgba(0, 242, 255, 0.04) 0%, rgba(18, 24, 38, 0.65) 100%) !important;
                    border: 1px solid rgba(0, 242, 255, 0.22) !important;
                    box-shadow: 0 0 30px rgba(0, 242, 255, 0.08), inset 0 0 15px rgba(0, 242, 255, 0.02);
                    position: relative;
                    overflow: hidden;
                }

                .card-equalization::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(90deg, #00f2ff, #d946ef);
                }

                .equalization-statement {
                    background: rgba(6, 10, 20, 0.7) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
                    border-radius: 12px;
                    padding: 14px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .equalization-statement:hover {
                    border-color: rgba(0, 242, 255, 0.2) !important;
                    transform: translateX(4px);
                    box-shadow: 0 6px 20px rgba(0, 242, 255, 0.05) !important;
                }

                .transfer-arrow-glow {
                    color: var(--primary);
                    text-shadow: 0 0 8px var(--primary-glow);
                    margin: 0 8px;
                }

                .btn-copy-glow {
                    background: var(--primary) !important;
                    color: #0b0f19 !important;
                    border: none;
                    border-radius: 14px;
                    padding: 14px 24px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                }

                .btn-copy-glow:hover {
                    box-shadow: 0 0 25px rgba(0, 242, 255, 0.4);
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }

                .btn-copy-glow:active {
                    transform: translateY(0);
                }

                .acs-splitter-container {
                    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade {
                    animation: fadeIn 0.3s ease-out;
                }

                .font-mono {
                    font-family: 'Outfit', 'Courier New', monospace;
                }

                .font-bold {
                    font-weight: 700;
                }

                .glass {
                    background: rgba(18, 24, 38, 0.5);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .card-glass {
                    background: rgba(18, 24, 38, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 20px;
                    padding: 20px;
                }

                /* Steps indicator styling */
                .acs-steps-header {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 12px;
                    background: rgba(11, 15, 25, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 8px;
                    border-radius: 24px;
                    margin-bottom: 28px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .step-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: none;
                    border: none;
                    padding: 12px 16px;
                    border-radius: 18px;
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 800;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .step-item:hover:not(.locked) {
                    background: rgba(255, 255, 255, 0.03);
                    color: rgba(255, 255, 255, 0.8);
                }

                .step-item.active {
                    background: rgba(0, 242, 255, 0.1);
                    color: var(--primary);
                    border: 1px solid rgba(0, 242, 255, 0.15);
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.05);
                }

                .step-item.completed {
                    color: #47d6a5;
                }

                .step-item.locked {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .step-badge {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 900;
                    transition: all 0.3s;
                }

                .step-item.active .step-badge {
                    background: var(--primary);
                    color: #0b0f19;
                }

                .step-item.completed .step-badge {
                    background: rgba(71, 214, 165, 0.2);
                    color: #47d6a5;
                    border: 1px solid rgba(71, 214, 165, 0.3);
                }

                .step-label {
                    font-size: 0.8rem;
                }

                @media (max-width: 768px) {
                    .step-label {
                        display: none;
                    }
                    .acs-steps-header {
                        gap: 4px;
                    }
                }

                /* Primary Card Styling */
                .card-primary {
                    border-radius: 24px;
                    padding: 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .card-lbl-primary {
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .card-desc {
                    font-size: 0.9rem;
                    line-height: 1.6;
                    opacity: 0.7;
                    margin: 0;
                }

                /* Input Styles */
                .input-group {
                    display: flex;
                    gap: 12px;
                }

                .input-custom {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 14px 18px;
                    color: #fff;
                    outline: none;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                }

                .input-custom:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.15);
                }

                .textarea-custom {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 16px;
                    color: #fff;
                    outline: none;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    resize: vertical;
                    transition: all 0.3s;
                }

                .textarea-custom:focus {
                    border-color: var(--color-crystal);
                    box-shadow: 0 0 15px rgba(77, 166, 255, 0.15);
                }

                /* Buttons */
                .btn-primary {
                    background: var(--primary);
                    color: #0b0f19;
                    border: none;
                    border-radius: 14px;
                    padding: 12px 24px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 0.9rem;
                }

                .btn-primary:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: scale(1.02);
                }

                .btn-primary:active:not(:disabled) {
                    transform: scale(0.98);
                }

                .btn-primary:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                /* Layout Grids */
                .grid-2-1 {
                    display: grid;
                    grid-template-columns: 1.7fr 1fr;
                    gap: 24px;
                    align-items: start;
                }

                @media (max-width: 900px) {
                    .grid-2-1 {
                        grid-template-columns: 1fr;
                    }
                }

                .grid-3-col {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 24px;
                    align-items: center;
                }

                @media (max-width: 768px) {
                    .grid-3-col {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }

                /* Side cards stack */
                .side-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .side-card-title {
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                /* Verdict banner */
                .verdict-banner {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 18px 24px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-left-width: 5px;
                }

                .verdict-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #0b0f19;
                }

                .verdict-title {
                    font-size: 1.25rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .verdict-sub {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    margin-top: 2px;
                }

                /* Tags styling */
                .cr-tags-container, .rr-added-container {
                    margin-top: 18px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 16px;
                }

                .sub-tag-lbl {
                    font-size: 0.75rem;
                    opacity: 0.5;
                    margin-bottom: 8px;
                }

                .flex-wrap-gap {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .cr-tag, .rr-tag {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    background: rgba(0, 0, 0, 0.3);
                }

                .btn-x-red {
                    background: none;
                    border: none;
                    color: rgba(255, 95, 95, 0.6);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                    padding: 0;
                }

                .btn-x-red:hover {
                    color: rgba(255, 95, 95, 1);
                }

                /* Commanders display */
                .commanders-faction-split {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .faction-header {
                    font-size: 0.6rem;
                    font-weight: 900;
                    letter-spacing: 1px;
                    margin-bottom: 6px;
                }

                .attacker-col { color: var(--primary); }
                .defender-col { color: #ff5f5f; }

                .commanders-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .commander-pill-atk {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    background: rgba(0, 242, 255, 0.08);
                    color: var(--primary);
                    border: 1px solid rgba(0, 242, 255, 0.1);
                    border-radius: 8px;
                }

                .commander-pill-def {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    background: rgba(255, 95, 95, 0.08);
                    color: #ff5f5f;
                    border: 1px solid rgba(255, 95, 95, 0.1);
                    border-radius: 8px;
                }

                /* Debris list */
                .debris-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .debris-item-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 14px;
                    border-left-width: 4px;
                    border-left-style: solid;
                }

                .border-metal { border-left-color: var(--color-metal); }
                .border-crystal { border-left-color: var(--color-crystal); }

                .debris-name {
                    font-size: 0.7rem;
                    font-weight: 900;
                    opacity: 0.6;
                }

                .debris-val {
                    font-weight: 800;
                    font-size: 0.95rem;
                    font-family: 'Outfit', monospace;
                }

                .metal-color { color: #cfd4dc; }
                .crystal-color { color: #6db6ff; }
                .deuterium-color { color: #47d6a5; }

                .reaper-extraction-box {
                    padding: 12px;
                    background: rgba(0, 242, 255, 0.04);
                    border: 1px solid rgba(0, 242, 255, 0.08);
                    border-radius: 12px;
                    font-size: 0.75rem;
                    margin-top: 4px;
                }

                .reaper-lbl {
                    color: var(--primary);
                    font-weight: 800;
                    margin-bottom: 6px;
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .reaper-values {
                    display: flex;
                    justify-content: space-between;
                    opacity: 0.8;
                    font-family: monospace;
                }

                /* Empty state */
                .empty-state {
                    border-radius: 24px;
                    padding: 60px 20px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                }

                .empty-state-icon {
                    color: var(--primary);
                    opacity: 0.35;
                }

                .empty-state h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: rgba(255, 255, 255, 0.8);
                }

                .empty-state p {
                    margin: 0;
                    max-width: 320px;
                    font-size: 0.85rem;
                    opacity: 0.5;
                    line-height: 1.5;
                }

                /* Nav action bars */
                .nav-bottom-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 20px;
                }

                .btn-next {
                    background: var(--primary);
                    color: #0b0f19;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 28px;
                    font-weight: 800;
                    cursor: pointer;
                    margin-left: auto;
                    transition: all 0.2s;
                }

                .btn-back {
                    background: rgba(255, 255, 255, 0.06);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 12px 28px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-next:hover, .btn-back:hover {
                    filter: brightness(1.2);
                    transform: translateY(-1px);
                }

                /* Gauge progress rows */
                .gauge-row {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gauge-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                    font-weight: 800;
                }

                .progress-bg {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .h-8 { height: 8px; }

                .progress-fill {
                    height: 100%;
                    border-radius: 8px;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .fill-metal { background: linear-gradient(90deg, #6c788c, #cfd4dc); }
                .fill-crystal { background: linear-gradient(90deg, #2b77c2, #6db6ff); }

                .gauge-nums {
                    font-size: 0.7rem;
                    opacity: 0.5;
                    text-align: right;
                    margin-top: 2px;
                }

                /* Yield Commander Card Stack */
                .yield-groups-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .yield-group-card {
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 14px;
                    padding: 14px;
                }

                .yield-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .yield-commander-name {
                    font-weight: 800;
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.9);
                }

                .yield-runs-tag {
                    font-size: 0.65rem;
                    opacity: 0.5;
                    background: rgba(255, 255, 255, 0.06);
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .yield-nums-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .yield-nums-grid > div {
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 8px;
                    padding: 8px;
                }

                .yield-lbl-small {
                    font-size: 0.55rem;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }

                .text-metal { color: #8ba2b5; }
                .text-crystal { color: #5a9fff; }

                .yield-val {
                    font-size: 0.8rem;
                    font-weight: 800;
                    text-align: center;
                }

                /* Bulk Import loading indicator */
                .bulk-loader-box {
                    margin-top: 14px;
                    background: rgba(0, 242, 255, 0.04);
                    border: 1px solid rgba(0, 242, 255, 0.06);
                    border-radius: 12px;
                    padding: 12px 16px;
                }

                .loader-progress-text {
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .success-badge { color: #47d6a5; }
                .failed-badge { color: #ff5f5f; }

                /* Diagnostic details */
                .skipped-diagnostic-card {
                    margin-top: 14px;
                    background: rgba(255, 95, 95, 0.04);
                    border: 1px solid rgba(255, 95, 95, 0.12);
                    border-radius: 14px;
                    padding: 14px;
                }

                .skipped-diagnostic-title {
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: #ff5f5f;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 4px;
                }

                .skipped-diagnostic-desc {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    margin-bottom: 8px;
                }

                .skipped-keys-list {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 8px 12px;
                    max-height: 120px;
                    overflow-y: auto;
                    font-size: 0.7rem;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .skipped-key-row {
                    display: flex;
                    justify-content: space-between;
                }

                .skipped-key-name {
                    color: #ff5f5f;
                }

                .skipped-key-reason {
                    opacity: 0.5;
                }

                /* Step 3: Split Settings */
                .split-settings-header {
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 12px;
                }

                .input-label-caps {
                    font-size: 0.6rem;
                    font-weight: 900;
                    opacity: 0.5;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: block;
                    margin-bottom: 8px;
                }

                .btn-group-toggle {
                    display: flex;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 3px;
                    gap: 2px;
                }

                .btn-group-toggle button {
                    flex: 1;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    padding: 8px 12px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-group-toggle button.active-atk {
                    background: rgba(0, 242, 255, 0.12);
                    color: var(--primary);
                }

                .btn-group-toggle button.active-def {
                    background: rgba(255, 95, 95, 0.12);
                    color: #ff5f5f;
                }

                .select-custom {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    padding: 8px 12px;
                    color: #fff;
                    outline: none;
                    font-size: 0.8rem;
                    font-weight: 800;
                }

                .select-custom option {
                    background: #121826;
                }

                .checkbox-holder {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .checkbox-custom {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--primary);
                    cursor: pointer;
                }

                .margin-b-24 { margin-bottom: 24px; }

                /* Expenses Table Styling */
                .overflow-x {
                    overflow-x: auto;
                }

                .expenses-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.85rem;
                }

                .expenses-table th {
                    text-align: left;
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    opacity: 0.5;
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .expenses-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    vertical-align: middle;
                }

                .expenses-table tr.active-row td {
                    color: rgba(255, 255, 255, 0.95);
                }

                .expenses-table tr.inactive-row td {
                    color: rgba(255, 255, 255, 0.25);
                }

                .table-input {
                    background: rgba(0, 0, 0, 0.35);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    color: #fff;
                    border-radius: 8px;
                    padding: 6px 10px;
                    font-size: 0.8rem;
                    font-family: monospace;
                    outline: none;
                    width: 100px;
                    transition: border-color 0.2s;
                }

                .table-input:focus {
                    border-color: var(--primary);
                }

                .table-input:disabled {
                    opacity: 0.2;
                    cursor: not-allowed;
                }

                /* Payout Ledger styling */
                .ledger-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .ledger-row {
                    padding: 16px;
                    border-radius: 16px;
                }

                .ledger-row-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .ledger-name {
                    font-size: 0.95rem;
                }

                .ledger-tag-status {
                    font-size: 0.6rem;
                    background: rgba(0, 242, 255, 0.1);
                    color: var(--primary);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: 800;
                }

                .ledger-row-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .ledger-small-title {
                    font-size: 0.55rem;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }

                .ledger-small-val {
                    font-size: 0.85rem;
                    font-weight: 800;
                }

                .border-top-line {
                    border-top: 1px solid rgba(255, 255, 255, 0.04);
                    padding-top: 10px;
                }

                .balance-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .balance-col {
                    display: flex;
                    flex-direction: column;
                }

                .balance-lbl {
                    font-size: 0.6rem;
                    opacity: 0.5;
                    margin-bottom: 2px;
                }

                .balance-val {
                    font-size: 0.8rem;
                }

                .green-color { color: #47d6a5; }
                .coral-color { color: #ff557f; }

                /* Equalization transfers UI */
                .transfers-box-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 16px;
                }

                .transfer-statement {
                    padding: 12px 16px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .transfer-flow {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                .transfer-arrow {
                    color: var(--primary);
                }

                .transfer-details {
                    font-size: 0.8rem;
                    opacity: 0.85;
                }

                .balanced-banner {
                    padding: 32px 16px;
                    border-radius: 16px;
                }

                .text-center { text-align: center; }
                .font-sm { font-size: 0.8rem; }
                .opacity-6 { opacity: 0.6; }
                .padding-16 { padding: 16px; }

                /* Tooltip styles */
                .tooltip-container {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    cursor: help;
                }
                .tooltip-container .tooltip-text {
                    visibility: hidden;
                    width: 240px;
                    background-color: rgba(10, 20, 30, 0.95);
                    color: #fff;
                    text-align: left;
                    border-radius: 8px;
                    border: 1px solid rgba(0, 242, 255, 0.25);
                    padding: 10px 14px;
                    position: absolute;
                    z-index: 100;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    font-size: 0.75rem;
                    line-height: 1.4;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    transition: opacity 0.3s;
                    pointer-events: none;
                    white-space: normal;
                    font-weight: normal;
                }
                .tooltip-container:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .glass-card {
                    backdrop-filter: blur(20px);
                    transition: all 0.3s ease;
                }
                .glass-card:hover {
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                }
                .acs-splitter-container input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                }
                .acs-splitter-container button:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: scale(1.02);
                }
                .acs-splitter-container button:active:not(:disabled) {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
};

export default AcsSplitter;
