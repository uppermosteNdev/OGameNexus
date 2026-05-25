import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet } from '../../db';
import { 
    Activity, Shield, Zap, Globe, Package, 
    AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
    MapPin, Thermometer, Database, HelpCircle
} from 'lucide-react';
import { calculateEmpireProduction, DEFAULT_RATES, Cost } from '../../utils/amortizationCalc';

const formatLargeNumber = (num: number) => {
    return Math.floor(num).toLocaleString('en-US');
};

const formatPercent = (val: number) => {
    return `${(val * 100).toFixed(2)}%`;
};

const formatBonusDetail = (percent: number, baseVal: number) => {
    if (percent === 0) return '0.00% (+0/hr)';
    const rawVal = baseVal * percent;
    return `${(percent * 100).toFixed(2)}% (+${Math.floor(rawVal).toLocaleString('en-US')}/hr)`;
};

interface BreakdownRowProps {
    label: string;
    metal: string | number;
    crystal: string | number;
    deuterium: string | number;
    highlight?: boolean;
    isHeader?: boolean;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({ label, metal, crystal, deuterium, highlight = false, isHeader = false }) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
            background: highlight ? 'rgba(0, 242, 255, 0.05)' : 'transparent',
            fontSize: isHeader ? '0.72rem' : '0.8rem',
            fontWeight: isHeader || highlight ? 700 : 400,
            color: isHeader ? 'var(--text-muted)' : '#fff',
            letterSpacing: isHeader ? '0.5px' : 'normal',
            textTransform: isHeader ? 'uppercase' : 'none'
        }}>
            <div style={{ color: isHeader ? 'var(--text-muted)' : highlight ? 'var(--primary)' : 'rgba(255, 255, 255, 0.7)' }}>
                {label}
            </div>
            <div style={{ color: isHeader ? 'var(--text-muted)' : 'var(--color-metal)' }}>
                {metal}
            </div>
            <div style={{ color: isHeader ? 'var(--text-muted)' : 'var(--color-crystal)' }}>
                {crystal}
            </div>
            <div style={{ color: isHeader ? 'var(--text-muted)' : 'var(--color-deuterium)' }}>
                {deuterium}
            </div>
        </div>
    );
};

const PlanetDebugCard: React.FC<{ planet: Planet, account: any, calcData: any }> = ({ planet, account, calcData }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Scraped values
    const scrapedM = planet.production?.metal ?? 0;
    const scrapedC = planet.production?.crystal ?? 0;
    const scrapedD = planet.production?.deuterium ?? 0;

    // Calculated values
    const pCalc = calcData?.planets?.[planet.id];
    const calcM = pCalc?.total?.metal ?? 0;
    const calcC = pCalc?.total?.crystal ?? 0;
    const calcD = pCalc?.total?.deuterium ?? 0;

    const baseM = pCalc?.base?.metal ?? 0;
    const baseC = pCalc?.base?.crystal ?? 0;
    const baseD = pCalc?.base?.deuterium ?? 0;

    const multM = pCalc?.mult?.metal ?? 1;
    const multC = pCalc?.mult?.crystal ?? 1;
    const multD = pCalc?.mult?.deuterium ?? 1;

    // Delta checks (within 2 units is considered a match due to floating-point rounding of base organic values)
    const diffM = Math.abs(calcM - scrapedM);
    const diffC = Math.abs(calcC - scrapedC);
    const diffD = Math.abs(calcD - scrapedD);
    const matchM = diffM <= 2;
    const matchC = diffC <= 2;
    const matchD = diffD <= 2;
    const allMatch = matchM && matchC && matchD;

    // Individual Multiplier Breakdowns
    const plasmaLevel = account?.researches?.find((r: any) => r.id === 122)?.level || 0;
    const plasmaM = plasmaLevel * 0.01;
    const plasmaC = plasmaLevel * 0.0066;
    const plasmaD = plasmaLevel * 0.0033;

    let lfbM = 0, lfbC = 0, lfbD = 0;
    planet.lifeformBuildings?.forEach((b: any) => {
        if (b.id === 12106) lfbM += b.level * 0.02;
        if (b.id === 12109) lfbC += b.level * 0.02;
        if (b.id === 12110) lfbD += b.level * 0.02;
        if (b.id === 13110) lfbD += b.level * 0.02;
        if (b.id === 11106) lfbM += b.level * 0.015;
        if (b.id === 11108) { lfbC += b.level * 0.015; lfbD += b.level * 0.01; }
    });

    const classM = account?.playerClass === 1 ? 0.25 : 0;
    const classC = account?.playerClass === 1 ? 0.25 : 0;
    const classD = account?.playerClass === 1 ? 0.25 : 0;

    const geologistM = account?.hasGeologist ? 0.1 : 0;
    const geologistC = account?.hasGeologist ? 0.1 : 0;
    const geologistD = account?.hasGeologist ? 0.1 : 0;

    const hasStaff = !!(account?.hasCommander && account?.hasAdmiral && account?.hasEngineer && account?.hasGeologist && account?.hasTechnocrat);
    const staffM = hasStaff ? 0.02 : 0;
    const staffC = hasStaff ? 0.02 : 0;
    const staffD = hasStaff ? 0.02 : 0;

    const allyTraderM = account?.allianceClass === 1 ? 0.05 : 0;
    const allyTraderC = account?.allianceClass === 1 ? 0.05 : 0;
    const allyTraderD = account?.allianceClass === 1 ? 0.05 : 0;

    const boostM = planet.boosters?.metal || 0;
    const boostC = planet.boosters?.crystal || 0;
    const boostD = planet.boosters?.deuterium || 0;

    const globalM = calcData?.globalBonuses?.metal ?? 0;
    const globalC = calcData?.globalBonuses?.crystal ?? 0;
    const globalD = calcData?.globalBonuses?.deuterium ?? 0;

    const universeSpeed = account?.universeSpeed || 1;

    let slot = 0;
    try { slot = parseInt(planet.coords.split(':')[2]); } catch (e) { }
    let metalPosFactor = 1;
    if (slot === 6 || slot === 10) metalPosFactor = 1.17;
    else if (slot === 7 || slot === 9) metalPosFactor = 1.23;
    else if (slot === 8) metalPosFactor = 1.35;

    let crystalPosFactor = 1;
    if (slot === 1) crystalPosFactor = 1.4;
    else if (slot === 2) crystalPosFactor = 1.3;
    else if (slot === 3) crystalPosFactor = 1.2;

    return (
        <motion.div
            layout
            style={{
                background: 'rgba(8, 16, 28, 0.65)',
                backdropFilter: 'blur(12px)',
                border: allMatch 
                    ? '1px solid rgba(34, 197, 94, 0.15)' 
                    : '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: allMatch
                    ? '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(34, 197, 94, 0.02)'
                    : '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.05)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                width: '100%',
                boxSizing: 'border-box'
            }}
        >
            {/* Card Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <img 
                            src={planet.imgUrl || 'https://via.placeholder.com/44'} 
                            alt={planet.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{planet.name}</h3>
                            {allMatch ? (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    <CheckCircle size={10} /> Verified
                                </span>
                            ) : (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#f87171',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    <AlertTriangle size={10} /> Discrepancy
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} color="var(--primary)" /> {planet.coords}
                            </span>
                            {planet.tempMax !== undefined && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Thermometer size={12} color="#f59e0b" /> Max Temp: {planet.tempMax}°C
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    {isExpanded ? (
                        <>Collapse Analysis <ChevronUp size={14} /></>
                    ) : (
                        <>Expand Detailed Breakdown <ChevronDown size={14} /></>
                    )}
                </button>
            </div>

            {/* Quick Summary Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
            }}>
                {/* Metal Box */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid rgba(255,255,255,0.04)'
                }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-metal)', textTransform: 'uppercase', fontWeight: 800 }}>Metal (Mine Level {planet.metalMine || 0})</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatLargeNumber(calcM)} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/hr</span></span>
                        <span style={{ fontSize: '0.75rem', color: matchM ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {matchM ? 'Verified' : `Scraped: ${formatLargeNumber(scrapedM)}`}
                        </span>
                    </div>
                </div>

                {/* Crystal Box */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid rgba(255,255,255,0.04)'
                }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-crystal)', textTransform: 'uppercase', fontWeight: 800 }}>Crystal (Mine Level {planet.crystalMine || 0})</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatLargeNumber(calcC)} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/hr</span></span>
                        <span style={{ fontSize: '0.75rem', color: matchC ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {matchC ? 'Verified' : `Scraped: ${formatLargeNumber(scrapedC)}`}
                        </span>
                    </div>
                </div>

                {/* Deuterium Box */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid rgba(255,255,255,0.04)'
                }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-deuterium)', textTransform: 'uppercase', fontWeight: 800 }}>Deuterium (Mine Level {planet.deuteriumMine || 0})</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatLargeNumber(calcD)} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/hr</span></span>
                        <span style={{ fontSize: '0.75rem', color: matchD ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {matchD ? 'Verified' : `Scraped: ${formatLargeNumber(scrapedD)}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailed Expanded Breakdowns */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {/* Calculation Formula Table */}
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.25)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.03)',
                                overflow: 'hidden'
                            }}>
                                <BreakdownRow label="Calculation Element" metal="Metal" crystal="Crystal" deuterium="Deut" isHeader={true} />
                                
                                <BreakdownRow 
                                    label="Mine Level" 
                                    metal={`Lvl ${planet.metalMine || 0}`} 
                                    crystal={`Lvl ${planet.crystalMine || 0}`} 
                                    deuterium={`Lvl ${planet.deuteriumMine || 0}`} 
                                />

                                <BreakdownRow 
                                    label="Position Multiplier" 
                                    metal={`${metalPosFactor}x`} 
                                    crystal={`${crystalPosFactor}x`} 
                                    deuterium="1.00x" 
                                />
                                
                                <BreakdownRow 
                                    label="Base Mine Production" 
                                    metal={formatLargeNumber(baseM)} 
                                    crystal={formatLargeNumber(baseC)} 
                                    deuterium={formatLargeNumber(baseD)} 
                                />

                                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

                                <BreakdownRow 
                                    label="Plasma Tech Multiplier" 
                                    metal={formatBonusDetail(plasmaM, baseM)} 
                                    crystal={formatBonusDetail(plasmaC, baseC)} 
                                    deuterium={formatBonusDetail(plasmaD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Lifeform Buildings" 
                                    metal={formatBonusDetail(lfbM, baseM)} 
                                    crystal={formatBonusDetail(lfbC, baseC)} 
                                    deuterium={formatBonusDetail(lfbD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Global Lifeform Techs" 
                                    metal={formatBonusDetail(globalM, baseM)} 
                                    crystal={formatBonusDetail(globalC, baseC)} 
                                    deuterium={formatBonusDetail(globalD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Collector Class Bonus" 
                                    metal={formatBonusDetail(classM, baseM)} 
                                    crystal={formatBonusDetail(classC, baseC)} 
                                    deuterium={formatBonusDetail(classD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Geologist Bonus (Premium)" 
                                    metal={formatBonusDetail(geologistM, baseM)} 
                                    crystal={formatBonusDetail(geologistC, baseC)} 
                                    deuterium={formatBonusDetail(geologistD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Commanding Staff Bonus" 
                                    metal={formatBonusDetail(staffM, baseM)} 
                                    crystal={formatBonusDetail(staffC, baseC)} 
                                    deuterium={formatBonusDetail(staffD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Alliance Class (Trader)" 
                                    metal={formatBonusDetail(allyTraderM, baseM)} 
                                    crystal={formatBonusDetail(allyTraderC, baseC)} 
                                    deuterium={formatBonusDetail(allyTraderD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Active Item Boosters" 
                                    metal={formatBonusDetail(boostM, baseM)} 
                                    crystal={formatBonusDetail(boostC, baseC)} 
                                    deuterium={formatBonusDetail(boostD, baseD)} 
                                />

                                <BreakdownRow 
                                    label="Combined Multiplier (Sum + 1)" 
                                    metal={`${multM.toFixed(4)}x`} 
                                    crystal={`${multC.toFixed(4)}x`} 
                                    deuterium={`${multD.toFixed(4)}x`} 
                                />

                                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

                                <BreakdownRow 
                                    label="Organic Base (per hour)" 
                                    metal={30 * universeSpeed} 
                                    crystal={15 * universeSpeed} 
                                    deuterium={0} 
                                />

                                <BreakdownRow 
                                    label="Calculated Value" 
                                    metal={formatLargeNumber(calcM)} 
                                    crystal={formatLargeNumber(calcC)} 
                                    deuterium={formatLargeNumber(calcD)}
                                    highlight={true}
                                />

                                <BreakdownRow 
                                    label="Scraped Value (Settings)" 
                                    metal={formatLargeNumber(scrapedM)} 
                                    crystal={formatLargeNumber(scrapedC)} 
                                    deuterium={formatLargeNumber(scrapedD)} 
                                />

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                    padding: '10px 14px',
                                    borderBottom: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    background: 'rgba(255, 255, 255, 0.01)'
                                }}>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Difference / Status</div>
                                    <div style={{ color: matchM ? '#4ade80' : '#f87171' }}>
                                        {matchM ? '✓ 0' : `⚠ ${formatLargeNumber(calcM - scrapedM)}`}
                                    </div>
                                    <div style={{ color: matchC ? '#4ade80' : '#f87171' }}>
                                        {matchC ? '✓ 0' : `⚠ ${formatLargeNumber(calcC - scrapedC)}`}
                                    </div>
                                    <div style={{ color: matchD ? '#4ade80' : '#f87171' }}>
                                        {matchD ? '✓ 0' : `⚠ ${formatLargeNumber(calcD - scrapedD)}`}
                                    </div>
                                </div>
                            </div>

                            {/* Active Item Boosters Log */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.01)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '12px',
                                padding: '12px 16px'
                            }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Package size={14} /> Active Scraping Boosters Items Log ({planet.activeItems?.length || 0})
                                </span>
                                
                                {planet.activeItems && planet.activeItems.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                                        {planet.activeItems.map((item, idx) => (
                                            <div 
                                                key={idx}
                                                style={{
                                                    background: 'rgba(0, 0, 0, 0.2)',
                                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '2px'
                                                }}
                                            >
                                                <div style={{ fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{item.title || item.name}</span>
                                                    <span style={{ 
                                                        color: item.type === 'metal' ? 'var(--color-metal)' : item.type === 'crystal' ? 'var(--color-crystal)' : item.type === 'deuterium' ? 'var(--color-deuterium)' : 'var(--primary)',
                                                        fontWeight: 800 
                                                    }}>
                                                        +{((item.bonus ?? 0) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                    <span>Type: {item.type}</span>
                                                    <span>Remaining: {item.timeRemaining || (item.isPermanent ? 'Permanent' : 'Unknown')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                                        No active resource booster items found for this planet. Items are scraped automatically when visiting the Empire overview page.
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const TestingProduction: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    
    // Fetch all planets for active player
    const planetsData = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    );

    if (!activeAccount || !planetsData) {
        return (
            <div className="view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
                <Activity size={48} className="spin" color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading production diagnostic data...</span>
            </div>
        );
    }

    const planets = planetsData.filter(p => p.type === 'planet');

    // Run empire production calculations
    const empireState = { account: activeAccount, planets: planetsData };
    const calcResults = calculateEmpireProduction(empireState);

    // Calculate overall statistics
    let totalScrapedM = 0, totalScrapedC = 0, totalScrapedD = 0;
    let totalCalcM = 0, totalCalcC = 0, totalCalcD = 0;
    let discrepancies = 0;

    planets.forEach(p => {
        const scrapedM = p.production?.metal ?? 0;
        const scrapedC = p.production?.crystal ?? 0;
        const scrapedD = p.production?.deuterium ?? 0;

        const pCalc = calcResults?.planets?.[p.id];
        const calcM = pCalc?.total?.metal ?? 0;
        const calcC = pCalc?.total?.crystal ?? 0;
        const calcD = pCalc?.total?.deuterium ?? 0;

        totalScrapedM += scrapedM;
        totalScrapedC += scrapedC;
        totalScrapedD += scrapedD;

        totalCalcM += calcM;
        totalCalcC += calcC;
        totalCalcD += calcD;

        const matchM = Math.abs(calcM - scrapedM) <= 2;
        const matchC = Math.abs(calcC - scrapedC) <= 2;
        const matchD = Math.abs(calcD - scrapedD) <= 2;

        if (!matchM || !matchC || !matchD) {
            discrepancies++;
        }
    });

    const isCollector = activeAccount.playerClass === 1;
    const hasStaff = !!(activeAccount.hasCommander && activeAccount.hasAdmiral && activeAccount.hasEngineer && activeAccount.hasGeologist && activeAccount.hasTechnocrat);

    return (
        <div className="view" style={{ padding: '0 20px 40px' }}>
            {/* Page Title */}
            <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="view-title"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: '#fff',
                    textShadow: '0 0 15px rgba(0, 242, 255, 0.15)',
                    marginBottom: '8px'
                }}
            >
                <Activity size={32} color="var(--primary)" /> Diagnostic Production Lab
            </motion.h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 24px 0', maxWidth: '800px' }}>
                Compare calculated hourly mine production against scraped values in real-time. Use this console to verify Plasma technology, lifeform infrastructure, collector class levels, and empire booster items.
            </p>

            {/* Diagnostic Alert Banner */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: discrepancies === 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: discrepancies === 0 ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '24px',
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {discrepancies === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                            <CheckCircle size={20} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                            <AlertTriangle size={20} />
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                            {discrepancies === 0 
                                ? 'Production Engine: Operational' 
                                : `Production Engine Alert: Mismatch Found`
                            }
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {discrepancies === 0 
                                ? 'Calculated formula matching values scraped from OGame Resource settings perfectly.' 
                                : `Production calculations on ${discrepancies} out of ${planets.length} planets do not match game settings.`
                            }
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px'
                }}>
                    <span style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: '6px 12px',
                        borderRadius: '8px'
                    }}>
                        Class: {isCollector ? 'Collector (+25%)' : 'None'}
                    </span>
                    <span style={{
                        background: activeAccount.hasGeologist ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: activeAccount.hasGeologist ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: activeAccount.hasGeologist ? '#4ade80' : 'rgba(255, 255, 255, 0.5)',
                        padding: '6px 12px',
                        borderRadius: '8px'
                    }}>
                        Geologist: {activeAccount.hasGeologist ? 'Active (+10%)' : 'Inactive'}
                    </span>
                    {hasStaff && (
                        <span style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#a855f7',
                            padding: '6px 12px',
                            borderRadius: '8px'
                        }}>
                            Commanding Staff: Active (+2%)
                        </span>
                    )}
                    {activeAccount.allianceClass !== undefined && activeAccount.allianceClass > 0 && (
                        <span style={{
                            background: activeAccount.allianceClass === 1 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            border: activeAccount.allianceClass === 1 ? '1px solid rgba(234, 179, 8, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: activeAccount.allianceClass === 1 ? '#eab308' : 'rgba(255, 255, 255, 0.5)',
                            padding: '6px 12px',
                            borderRadius: '8px'
                        }}>
                            Ally Class: {activeAccount.allianceClass === 1 ? 'Trader (+5%)' : activeAccount.allianceClass === 2 ? 'Researcher' : 'Warrior'}
                        </span>
                    )}
                    <span style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: '6px 12px',
                        borderRadius: '8px'
                    }}>
                        Plasma Tech: Level {activeAccount.researches?.find((r: any) => r.id === 122)?.level || 0}
                    </span>
                </div>
            </motion.div>

            {/* Empire Total Panel */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.05) 0%, rgba(168, 85, 247, 0.02) 100%)',
                border: '1px solid rgba(0, 242, 255, 0.15)',
                borderRadius: '20px',
                padding: '24px',
                marginBottom: '32px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                boxSizing: 'border-box'
            }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={18} color="var(--primary)" /> Empire Production Summaries (Combined hourly)
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px'
                }}>
                    {/* Metal Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-metal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Metal Production</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                                {formatLargeNumber(totalCalcM)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/hr (Calculated)</span>
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Scraped total: {formatLargeNumber(totalScrapedM)} /hr
                            </span>
                        </div>
                    </div>

                    {/* Crystal Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-crystal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Crystal Production</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                                {formatLargeNumber(totalCalcC)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/hr (Calculated)</span>
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Scraped total: {formatLargeNumber(totalScrapedC)} /hr
                            </span>
                        </div>
                    </div>

                    {/* Deuterium Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-deuterium)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Deuterium Production</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                                {formatLargeNumber(totalCalcD)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/hr (Calculated)</span>
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Scraped total: {formatLargeNumber(totalScrapedD)} /hr
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Planets Title */}
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} color="var(--primary)" /> Planet-by-Planet Calculation Audit ({planets.length})
            </h2>

            {/* Planets Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {planets.map(planet => (
                    <PlanetDebugCard 
                        key={planet.id} 
                        planet={planet} 
                        account={activeAccount} 
                        calcData={calcResults}
                    />
                ))}
            </div>
        </div>
    );
};

export default TestingProduction;
