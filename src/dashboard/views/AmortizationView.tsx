
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator, CheckCircle2, Circle,
    Filter, LayoutList, Rocket,
    TrendingUp, ArrowDownToLine,
    Globe, Zap, Box, Dna, Activity,
    Clock, DollarSign, ListOrdered, ArrowRight
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TodoProject } from '../../db';
import { AmortizationItem, AmortizationType, rankAmortizationItems, DEFAULT_RATES, formatROI, Cost, calculateMSU, AMORTIZATION_TABLE as STATIC_TABLE } from '../../utils/amortizationCalc';
import { SHIP_DATA } from '../../db/staticData';

interface AmortizationViewProps {
    planets: any[];
    account: any;
}

const THEME_CYAN = '#00f2ff';
const THEME_PURPLE = '#a855f7';

const AmortizationView: React.FC<AmortizationViewProps> = ({ planets, account }) => {
    const [selectedPlanets, setSelectedPlanets] = useState<string[]>(planets.map(p => p.id));
    const [filters, setFilters] = useState<{ [key in AmortizationType]: boolean }>({
        [AmortizationType.Mines]: true,
        [AmortizationType.LifeformProductionBuildings]: true,
        [AmortizationType.LifeformResearchBuildings]: true,
        [AmortizationType.LifeformProductionResearches]: true,
        [AmortizationType.LifeformExpeditionResearches]: true,
        [AmortizationType.PlasmaTechnology]: true,
    });
    const [limit, setLimit] = useState<number>(25);
    const [results, setResults] = useState<AmortizationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [animatedRow, setAnimatedRow] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ key: string, text: string, type: 'add' | 'remove' } | null>(null);
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const todoList = useLiveQuery(() => db.todoProjects.toArray());

    const expoAverages = useLiveQuery(async () => {
        const now = Date.now();
        const startTS = Math.floor((now - (60 * 24 * 60 * 60 * 1000)) / 1000);
        const endTS = Math.floor(now / 1000);

        const items = await db.expeditions
            .where('timestamp')
            .between(startTS, endTS)
            .toArray();

        const shipCosts: Record<number, any> = {};
        SHIP_DATA.forEach(s => shipCosts[s.id] = s.metadata?.cost);

        // Group by day (local time approx by floor(ts / 86400))
        const dailyYields: Record<number, { res: Cost, ships: Cost }> = {};
        const rates = settings || DEFAULT_RATES;

        items.forEach(item => {
            const dayKey = Math.floor(item.timestamp / (24 * 3600));
            if (!dailyYields[dayKey]) {
                dailyYields[dayKey] = {
                    res: { metal: 0, crystal: 0, deuterium: 0 },
                    ships: { metal: 0, crystal: 0, deuterium: 0 }
                };
            }

            const resType = (item.result || '').toLowerCase().trim();
            const details = item.resultDetails || {};

            if (resType === 'resources' || resType === 'ressources') {
                dailyYields[dayKey].res.metal += Number(details.metal) || 0;
                dailyYields[dayKey].res.crystal += Number(details.crystal) || 0;
                dailyYields[dayKey].res.deuterium += Number(details.deuterium) || 0;
            } else if (resType === 'shipwrecks' || resType === 'technologiesgained' || resType === 'ships') {
                Object.entries(details).forEach(([id, data]: [string, any]) => {
                    const sid = parseInt(id);
                    const cost = shipCosts[sid];
                    if (cost) {
                        const amount = typeof data === 'object' ? (data.amount || 0) : (Number(data) || 0);
                        if (amount > 0) {
                            dailyYields[dayKey].ships.metal += (Number(cost.metal) || 0) * amount;
                            dailyYields[dayKey].ships.crystal += (Number(cost.crystal) || 0) * amount;
                            dailyYields[dayKey].ships.deuterium += (Number(cost.deuterium) || 0) * amount;
                        }
                    }
                });
            }
        });

        const allDays = Object.values(dailyYields);

        // Find best 7 days for Resources
        const sortedResDays = [...allDays].sort((a, b) =>
            calculateMSU(b.res, rates) - calculateMSU(a.res, rates)
        ).slice(0, 7);

        // Find best 7 days for Ships
        const sortedShipDays = [...allDays].sort((a, b) =>
            calculateMSU(b.ships, rates) - calculateMSU(a.ships, rates)
        ).slice(0, 7);

        let resM = 0, resC = 0, resD = 0;
        sortedResDays.forEach(day => {
            resM += day.res.metal;
            resC += day.res.crystal;
            resD += day.res.deuterium;
        });

        let shipM = 0, shipC = 0, shipD = 0;
        sortedShipDays.forEach(day => {
            shipM += day.ships.metal;
            shipC += day.ships.crystal;
            shipD += day.ships.deuterium;
        });

        const resHours = (sortedResDays.length || 1) * 24;
        const shipHours = (sortedShipDays.length || 1) * 24;

        return {
            resources: { metal: resM / resHours, crystal: resC / resHours, deuterium: resD / resHours },
            ships: { metal: shipM / shipHours, crystal: shipC / shipHours, deuterium: shipD / shipHours },
            totals: {
                resources: { metal: resM, crystal: resC, deuterium: resD },
                ships: { metal: shipM, crystal: shipC, deuterium: shipD }
            }
        };
    }, [planets, account, settings]);

    useEffect(() => {
        const calculate = async () => {
            setLoading(true);
            const items = await rankAmortizationItems(planets, account, filters, settings || DEFAULT_RATES, limit, expoAverages, selectedPlanets);
            setResults(items);
            setLoading(false);
        };
        calculate();
    }, [selectedPlanets, filters, limit, planets, account, settings, expoAverages]);

    // Update existing todos with new calculated values
    useEffect(() => {
        if (!todoList || results.length === 0) return;

        const updateTodos = async () => {
            for (const item of results) {
                const key = `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}`;
                const existing = todoList.find(t => t.projectKey === key);
                if (existing) {
                    const needsUpdate =
                        Math.abs(existing.roiHours - item.roiHours) > 0.1 ||
                        Math.abs(existing.productionIncrease - item.productionIncrease) > 0.1;

                    if (needsUpdate) {
                        await db.todoProjects.update(existing.id!, {
                            cost: item.cost,
                            msuCost: item.msuCost,
                            prodDelta: item.prodDelta,
                            productionIncrease: item.productionIncrease,
                            roiHours: item.roiHours,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        };
        updateTodos();
    }, [results, todoList]); // Using todoList here is fine if we check needsUpdate to avoid infinite loops

    const togglePlanet = (id: string) => {
        setSelectedPlanets(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleFilter = (type: AmortizationType) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleToggleTodo = async (item: AmortizationItem) => {
        const key = `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}`;
        const existing = await db.todoProjects.where('projectKey').equals(key).first();

        if (existing) {
            await db.todoProjects.delete(existing.id!);
            setNotification({ key, text: 'REMOVED', type: 'remove' });
            setTimeout(() => setNotification(null), 1200);
            return;
        }

        const planet = planets.find(p => p.id === item.planetId);

        const newTodo: TodoProject = {
            projectKey: key,
            name: item.name,
            type: AmortizationType[item.type],
            icon: getItemIcon(item),
            targetLevel: item.currentLevel + 1,
            planetId: item.planetId,
            planetName: planet?.name,
            coords: planet?.coords,
            cost: item.cost,
            msuCost: item.msuCost,
            prodDelta: item.prodDelta,
            productionIncrease: item.productionIncrease,
            roiHours: item.roiHours,
            timestamp: Date.now()
        };

        await db.todoProjects.add(newTodo);
        setNotification({ key, text: 'PROJECT ADDED', type: 'add' });
        setTimeout(() => setNotification(null), 1200);
        setAnimatedRow(key);
        setTimeout(() => setAnimatedRow(null), 800);
    };

    const getItemIcon = (item: AmortizationItem) => {
        if (item.type === AmortizationType.Mines) {
            const lowName = item.name.toLowerCase();
            if (lowName.includes('metal')) return 'icons/resources/metal_mine_large.jpg';
            if (lowName.includes('crystal')) return 'icons/resources/crystal_mine_large.jpg';
            if (lowName.includes('deuterium')) return 'icons/resources/deuterium_mine_large.jpg';
        }
        if (item.type === AmortizationType.PlasmaTechnology) {
            return 'icons/research/plasma-tech-research-large.jpg';
        }

        const staticEntry = STATIC_TABLE.find(e => e.name === item.name);
        if (staticEntry && staticEntry.lifeformId) {
            const lfNames = ['humans', 'rocktal', 'mechas', 'kaelesh'];
            const lfName = lfNames[staticEntry.lifeformId - 1];

            if (item.type === AmortizationType.LifeformProductionResearches || item.type === AmortizationType.LifeformExpeditionResearches) {
                const slotNum = Math.floor((staticEntry.id! - 1) / 4) + 1;
                return `icons/lifeforms/${lfName}-tech-t${slotNum}-large.jpg`;
            } else {
                const slotNum = staticEntry.id! % 100;
                return `icons/lifeforms/${lfName}-building-${slotNum}-large.jpg`;
            }
        }
        return '';
    };

    const formatAbbreviated = (num: number) => {
        const abs = Math.abs(num);
        if (abs >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (abs >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (abs >= 1000) return (num / 1000).toFixed(2) + 'K';
        return Math.floor(num).toLocaleString();
    };

    const formatPrecise = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatCost = (cost: any, isProd: boolean = false, align: 'left' | 'right' = 'left') => {
        const iconStyle = { width: '16px', height: '16px', borderRadius: '4px', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' };

        const metalVal = cost.metal;
        const crystalVal = cost.crystal;
        const deutVal = cost.deuterium;

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 800,
                alignItems: align === 'right' ? 'flex-end' : 'flex-start'
            }}>
                {metalVal > 0.01 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                        <img src="icons/resources/metal-icon-medium.jpg" style={iconStyle} alt="M" />
                        <span style={{ color: '#ff8d33' }}>{isProd ? '+' : ''}{formatAbbreviated(metalVal)}</span>
                    </div>
                )}
                {crystalVal > 0.01 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                        <img src="icons/resources/crystal-icon-medium.jpg" style={iconStyle} alt="C" />
                        <span style={{ color: '#33b2ff' }}>{isProd ? '+' : ''}{formatAbbreviated(crystalVal)}</span>
                    </div>
                )}
                {deutVal > 0.01 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                        <img src="icons/resources/deuterium-icon-medium.jpg" style={iconStyle} alt="D" />
                        <span style={{ color: '#33ff8d' }}>{isProd ? '+' : ''}{formatAbbreviated(deutVal)}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '0 0 60px 0' }}>
            {/* Control Header Panes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>

                {/* ADVANCED PLANET SELECTOR */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass"
                    style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '24px',
                        borderRadius: '28px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(0, 242, 255, 0.1)' }}>
                                <Globe size={18} color={THEME_CYAN} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 1000, letterSpacing: '0.15em', color: '#fff' }}>PLANET FILTER</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <motion.button
                                    whileHover={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedPlanets(planets.map(p => p.id))}
                                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 1000, cursor: 'pointer', transition: 'all 0.2s' }}
                                >ALL</motion.button>
                                <motion.button
                                    whileHover={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedPlanets([])}
                                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 1000, cursor: 'pointer', transition: 'all 0.2s' }}
                                >NONE</motion.button>
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 900, color: THEME_CYAN, background: 'rgba(0,242,255,0.05)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(0,242,255,0.1)' }}>
                                {selectedPlanets.length} / {planets.length} ACTIVE
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '12px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        paddingRight: '10px',
                        paddingBottom: '8px'
                    }} className="intelligence-track">
                        {planets.map(p => {
                            const isSelected = selectedPlanets.includes(p.id);
                            return (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    key={p.id}
                                    onClick={() => togglePlanet(p.id)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '18px',
                                        border: `1px solid ${isSelected ? THEME_CYAN : 'rgba(255,255,255,0.05)'}`,
                                        background: isSelected ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', border: isSelected ? `2px solid ${THEME_CYAN}` : '1px solid rgba(255,255,255,0.1)', opacity: isSelected ? 1 : 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                        {p.imgUrl ? (
                                            <img src={p.imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                            <Globe size={20} color={isSelected ? THEME_CYAN : 'rgba(255,255,255,0.2)'} />
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 1000 }}>{p.coords === '0:0:0' ? 'Unknown' : p.coords}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* FILTERING MATRIX */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass"
                    style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '24px',
                        borderRadius: '28px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)' }}>
                                <Filter size={18} color={THEME_PURPLE} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 1000, letterSpacing: '0.15em', color: '#fff' }}>INTELLIGENCE FILTERS</span>
                        </div>
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {[25, 50, 100].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setLimit(val)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: limit === val ? THEME_CYAN : 'transparent',
                                        color: limit === val ? '#000' : 'rgba(255,255,255,0.4)',
                                        fontSize: '11px',
                                        fontWeight: 1000,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {[
                            { id: AmortizationType.Mines, label: 'Standard Infrastructure', sub: 'Mines & Production', icon: <Box size={16} /> },
                            { id: AmortizationType.LifeformProductionBuildings, label: 'LF Buildings (Production)', sub: 'Residential & Industry', icon: <LayoutList size={16} /> },
                            { id: AmortizationType.LifeformResearchBuildings, label: 'LF Buildings (Research)', sub: 'Tech & Academy', icon: <Activity size={16} /> },
                            { id: AmortizationType.LifeformProductionResearches, label: 'LF Techs (Production)', sub: 'Economic Bonus Labs', icon: <Dna size={16} /> },
                            { id: AmortizationType.LifeformExpeditionResearches, label: 'LF Techs (Research)', sub: 'Exploration & Discovery', icon: <Rocket size={16} /> },
                            { id: AmortizationType.PlasmaTechnology, label: 'Plasma Technology', sub: 'Global Empire Bonus', icon: <Zap size={16} /> },
                        ].map(f => (
                            <motion.button
                                whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.05)' }}
                                whileTap={{ scale: 0.99 }}
                                key={f.id}
                                onClick={() => toggleFilter(f.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px',
                                    borderRadius: '20px',
                                    background: filters[f.id] ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${filters[f.id] ? THEME_CYAN + '44' : 'rgba(255,255,255,0.05)'}`,
                                    color: filters[f.id] ? '#fff' : 'rgba(255,255,255,0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    padding: '10px',
                                    borderRadius: '14px',
                                    background: filters[f.id] ? THEME_CYAN : 'rgba(255,255,255,0.05)',
                                    color: filters[f.id] ? '#000' : 'inherit'
                                }}>
                                    {f.icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 900 }}>{f.label}</span>
                                </div>
                                {filters[f.id] && <CheckCircle2 size={16} color={THEME_CYAN} style={{ marginLeft: 'auto' }} />}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* HIGH-PRECISION AMORTIZATION ENGINE RESULTS */}
            <div className="glass" style={{ background: 'rgba(6, 11, 20, 0.6)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
                <div style={{
                    padding: '28px 40px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'grid',
                    gridTemplateColumns: '120px 80px 3.5fr 2fr 1.5fr 1.5fr 1.2fr',
                    alignItems: 'center',
                    background: 'rgba(10, 15, 25, 0.9)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 10
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>TO-DO</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>ORDER</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>PROJECT NAME</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>INVESTMENT REQ.</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textAlign: 'right' }}>NET GAIN (H)</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textAlign: 'right' }}>ROI (MSU/H)</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textAlign: 'right' }}>PAYBACK PERIOD</span>
                </div>

                <div style={{ maxHeight: '800px', overflowY: 'auto' }} className="intelligence-track">
                    <AnimatePresence mode="popLayout">
                        {results.map((item, idx) => {
                            const planet = planets.find(p => p.id === item.planetId);
                            const icon = getItemIcon(item);
                            const isFirst = idx === 0;

                            return (
                                <motion.div
                                    key={`${item.name}-${item.planetId}-${item.currentLevel}`}
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{
                                        opacity: 1,
                                        scale: animatedRow === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}` ? [1, 1.01, 1] : 1,
                                        y: 0,
                                        background: animatedRow === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}`
                                            ? 'rgba(0, 242, 255, 0.08)'
                                            : (isFirst ? 'rgba(0, 242, 255, 0.03)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'))
                                    }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: animatedRow === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}` ? 0.4 : 0.3,
                                        delay: animatedRow ? 0 : idx * 0.02
                                    }}
                                    style={{
                                        padding: '24px 40px',
                                        display: 'grid',
                                        gridTemplateColumns: '120px 80px 3.5fr 2fr 1.5fr 1.5fr 1.2fr',
                                        alignItems: 'center',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    className={`amortization-row ${animatedRow === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}` ? 'diagonal-flash' : ''}`}
                                >
                                    {animatedRow === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}` && (
                                        <div className="flash-overlay" />
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                        <AnimatePresence>
                                            {notification && notification.key === `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}` && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, y: -30, scale: 1 }}
                                                    exit={{ opacity: 0, y: -50 }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: '-10px',
                                                        whiteSpace: 'nowrap',
                                                        background: notification.type === 'add' ? THEME_CYAN : '#ff4444',
                                                        color: '#000',
                                                        fontSize: '9px',
                                                        fontWeight: 1000,
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        pointerEvents: 'none',
                                                        boxShadow: `0 4px 12px ${notification.type === 'add' ? THEME_CYAN : '#ff4444'}44`,
                                                        zIndex: 20
                                                    }}
                                                >
                                                    {notification.text}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {(() => {
                                            const key = `${item.planetId || 'empire'}_${item.type}_${item.name}_${item.currentLevel + 1}`;
                                            const isInTodo = todoList?.some(t => t.projectKey === key);

                                            return (
                                                <motion.button
                                                    whileHover={{
                                                        scale: 1.1,
                                                        boxShadow: `0 0 15px ${isInTodo ? '#ff4444' : THEME_CYAN}44`,
                                                        background: isInTodo ? 'rgba(255, 68, 68, 0.2)' : THEME_CYAN,
                                                        borderColor: isInTodo ? '#ff4444' : THEME_CYAN
                                                    }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleToggleTodo(item)}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isInTodo ? THEME_CYAN : 'rgba(255,255,255,0.2)'}`,
                                                        background: isInTodo ? THEME_CYAN : 'transparent',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: isInTodo ? `0 0 10px ${THEME_CYAN}66` : 'none',
                                                        color: isInTodo ? '#000' : 'rgba(255,255,255,0.3)'
                                                    }}
                                                >
                                                    {isInTodo ? (
                                                        <CheckCircle2 size={16} />
                                                    ) : (
                                                        <ListOrdered size={16} />
                                                    )}
                                                </motion.button>
                                            );
                                        })()}
                                    </div>

                                    {isFirst && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: THEME_CYAN, boxShadow: `0 0 15px ${THEME_CYAN}` }} />}

                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: isFirst ? THEME_CYAN : 'rgba(255,255,255,0.3)', fontSize: '18px', fontWeight: 1000, fontStyle: 'italic' }}>
                                            #{idx + 1}
                                        </span>
                                        {isFirst && <span style={{ fontSize: '8px', fontWeight: 900, color: THEME_CYAN, letterSpacing: '0.1em', marginTop: '4px' }}>PEAK OPTION</span>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                        <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', border: isFirst ? `2px solid ${THEME_CYAN}` : '1px solid rgba(255,255,255,0.1)', boxShadow: isFirst ? `0 0 20px ${THEME_CYAN}33` : '0 8px 16px rgba(0,0,0,0.5)' }}>
                                            <img src={icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: '#fff', fontSize: '17px', fontWeight: 1000, letterSpacing: '-0.02em' }}>{item.name}</span>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: isFirst ? THEME_CYAN : 'rgba(255,255,255,0.08)',
                                                    padding: '3px 8px',
                                                    borderRadius: '8px',
                                                    color: isFirst ? '#000' : '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 1000,
                                                    border: isFirst ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    <span style={{ opacity: 0.6 }}>{item.currentLevel}</span>
                                                    <ArrowRight size={10} color={isFirst ? '#000' : THEME_CYAN} strokeWidth={3} />
                                                    <span style={{ color: isFirst ? '#000' : THEME_CYAN }}>{item.currentLevel + 1}</span>
                                                </div>
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 800, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(255,255,255,0.05)'
                                                }}>
                                                    {planet ? (
                                                        <img src={planet.imgUrl || 'icons/resources/metal_mine_large.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                    ) : (
                                                        <Globe size={10} color={THEME_CYAN} />
                                                    )}
                                                </div>
                                                <span style={{ color: isFirst ? '#fff' : 'inherit' }}>{planet ? `${planet.coords === '0:0:0' ? 'Unknown' : planet.coords} • ${planet.name}` : 'EMPIRE-WIDE RESEARCH'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        {formatCost(item.cost)}
                                        <div style={{ marginTop: '8px', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'inline-block' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 1000 }}>{formatPrecise(item.msuCost)} </span>
                                            <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>MSU</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {formatCost(item.prodDelta, true, 'right')}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: THEME_CYAN, fontSize: '18px', fontWeight: 1000, letterSpacing: '-0.5px' }}>
                                            +{formatPrecise(item.productionIncrease)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 1000, marginTop: '4px' }}>MSU / HOUR</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            color: item.roiHours < 24 * 7 ? '#22c55e' : (item.roiHours < 24 * 30 ? THEME_CYAN : '#fff'),
                                            fontSize: '18px',
                                            fontWeight: 1000,
                                            textShadow: item.roiHours < 24 * 7 ? '0 0 20px rgba(34, 197, 94, 0.4)' : (item.roiHours < 24 * 30 ? `0 0 20px ${THEME_CYAN}44` : 'none')
                                        }}>
                                            {formatROI(item.roiHours)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 900, marginTop: '4px' }}>PAYBACK TIME</div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {results.length === 0 && !loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '100px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ padding: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', marginBottom: '24px' }}>
                                <Filter size={48} color="rgba(255,255,255,0.05)" />
                            </div>
                            <div style={{ fontWeight: 1000, fontSize: '22px', color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.02em' }}>NO UPGRADES DETECTED</div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)', maxWidth: '300px', marginTop: '8px', lineHeight: 1.6 }}>
                                Your current filters combined with selected planets yielded zero amortization results. Adjust filters to continue.
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <style>{`
                .intelligence-track::-webkit-scrollbar { width: 6px; }
                .intelligence-track::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .intelligence-track::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
                .intelligence-track::-webkit-scrollbar-thumb:hover { background: ${THEME_CYAN}44; }
                .amortization-row { transition: background 0.3s ease; }
                .amortization-row:hover { background: rgba(255,255,255,0.04) !important; }
                
                @keyframes diagonal-flash {
                    0% { transform: translateX(-100%) skewX(-25deg); opacity: 0; }
                    50% { opacity: 0.6; }
                    100% { transform: translateX(200%) skewX(-25deg); opacity: 0; }
                }

                .flash-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(0, 242, 255, 0.4),
                        rgba(255, 255, 255, 0.8),
                        rgba(0, 242, 255, 0.4),
                        transparent
                    );
                    animation: diagonal-flash 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    pointer-events: none;
                    z-index: 2;
                }

                .diagonal-flash {
                    box-shadow: inset 0 0 30px rgba(0, 242, 255, 0.1);
                }
            `}</style>
        </div>
    );
};


export default AmortizationView;
