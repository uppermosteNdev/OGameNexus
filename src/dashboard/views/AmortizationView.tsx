
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator, CheckCircle2, Circle,
    Filter, LayoutList, Rocket, Compass,
    TrendingUp, ArrowDownToLine,
    Globe, Zap, Box, Dna, Activity,
    Clock, DollarSign, ListOrdered, ArrowRight
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TodoProject, ProductionQueueItem, EmpireProductionQueueData } from '../../db';
import { AmortizationItem, AmortizationType, AmortizationResourceTarget, rankAmortizationItems, DEFAULT_RATES, formatROI, Cost, calculateMSU, getItemIcon, getAmortizationTechId, findMatchingQueueItem, AMORTIZATION_TABLE as STATIC_TABLE } from '../../utils/amortizationCalc';
import { getLfTech } from '../../db/lifeformTechData';
import { SHIP_DATA } from '../../db/staticData';

interface AmortizationViewProps {
    planets: any[];
    account: any;
}

const THEME_CYAN = '#00f2ff';
const THEME_PURPLE = '#a855f7';

export const TARGET_THEMES: Record<AmortizationResourceTarget, { color: string; label: string; unit: string; badge: string; icon: string }> = {
    all: { color: '#00f2ff', label: 'All Resources', unit: 'MSU', badge: 'All Resources', icon: 'icons/resources/metal-icon-medium.jpg' },
    metal: { color: '#ff8d33', label: 'Metal', unit: 'Metal', badge: 'Metal', icon: 'icons/resources/metal-icon-medium.jpg' },
    crystal: { color: '#33b2ff', label: 'Crystal', unit: 'Crystal', badge: 'Crystal', icon: 'icons/resources/crystal-icon-medium.jpg' },
    deuterium: { color: '#33ff8d', label: 'Deuterium', unit: 'Deuterium', badge: 'Deuterium', icon: 'icons/resources/deuterium-icon-medium.jpg' },
};

const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const AmortizationView: React.FC<AmortizationViewProps> = ({ planets, account }) => {
    const onlyPlanets = useMemo(() => (planets || []).filter(p => p && p.type !== 'moon'), [planets]);
    const [selectedPlanets, setSelectedPlanets] = useState<string[]>([]);
    const [lastInitializedPlayerId, setLastInitializedPlayerId] = useState<string | null>(null);

    useEffect(() => {
        if (onlyPlanets.length > 0 && account?.playerId !== lastInitializedPlayerId) {
            setSelectedPlanets(onlyPlanets.map(p => p.id));
            setLastInitializedPlayerId(account?.playerId || null);
        }
    }, [onlyPlanets, account?.playerId, lastInitializedPlayerId]);

    const [filters, setFilters] = useState<{ [key in AmortizationType]: boolean }>({
        [AmortizationType.Mines]: true,
        [AmortizationType.LifeformProductionBuildings]: true,
        [AmortizationType.LifeformResearchBuildings]: true,
        [AmortizationType.LifeformProductionResearches]: true,
        [AmortizationType.LifeformExpeditionResearches]: true,
        [AmortizationType.PlasmaTechnology]: true,
        [AmortizationType.Astrophysics]: true,
    });
    const [limit, setLimit] = useState<number>(25);
    const [resourceTarget, setResourceTarget] = useState<AmortizationResourceTarget>('all');
    const activeTheme = TARGET_THEMES[resourceTarget];
    const [results, setResults] = useState<AmortizationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [animatedRow, setAnimatedRow] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ key: string, text: string, type: 'add' | 'remove' } | null>(null);
    const settings = useLiveQuery(() => db.settings.get('conversion_rates'));
    const liveAccount = useLiveQuery(
        () => account?.playerId ? db.accounts.get(account.playerId) : undefined,
        [account?.playerId]
    );

    const [cachedQueue, setCachedQueue] = useState<EmpireProductionQueueData | null>(null);
    const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // 1-second interval to keep live queue countdowns updating
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync queue and server time offset from chrome.storage.local
    useEffect(() => {
        const loadQueueFromStorage = async () => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const key = account?.playerId ? `nexus_production_queue_${account.playerId}` : 'nexus_production_queue';
                const res = await chrome.storage.local.get([key, 'nexus_production_queue', 'nexus_server_time_offset']);
                if (res?.nexus_server_time_offset !== undefined) {
                    setServerTimeOffset(res.nexus_server_time_offset);
                }
                if (res?.[key]) {
                    setCachedQueue(res[key]);
                    if (res[key].serverTimeOffset !== undefined) {
                        setServerTimeOffset(res[key].serverTimeOffset);
                    }
                } else if (res?.nexus_production_queue) {
                    setCachedQueue(res.nexus_production_queue);
                    if (res.nexus_production_queue.serverTimeOffset !== undefined) {
                        setServerTimeOffset(res.nexus_production_queue.serverTimeOffset);
                    }
                }
            }
        };
        loadQueueFromStorage();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local') {
                const key = account?.playerId ? `nexus_production_queue_${account.playerId}` : 'nexus_production_queue';
                if (changes['nexus_server_time_offset']?.newValue !== undefined) {
                    setServerTimeOffset(changes['nexus_server_time_offset'].newValue);
                }
                if (changes[key]?.newValue) {
                    setCachedQueue(changes[key].newValue);
                    if (changes[key].newValue.serverTimeOffset !== undefined) {
                        setServerTimeOffset(changes[key].newValue.serverTimeOffset);
                    }
                } else if (changes.nexus_production_queue?.newValue) {
                    setCachedQueue(changes.nexus_production_queue.newValue);
                    if (changes.nexus_production_queue.newValue.serverTimeOffset !== undefined) {
                        setServerTimeOffset(changes.nexus_production_queue.newValue.serverTimeOffset);
                    }
                }
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, [account?.playerId]);

    const queueItems: ProductionQueueItem[] = useMemo(() => {
        return liveAccount?.productionQueue?.items || cachedQueue?.items || account?.productionQueue?.items || [];
    }, [liveAccount?.productionQueue, cachedQueue, account?.productionQueue]);

    const findOngoingQueueItem = (item: AmortizationItem, planetCoords?: string): ProductionQueueItem | undefined => {
        return findMatchingQueueItem(item, queueItems, planetCoords);
    };

    const todoList = useLiveQuery(
        () => account ? db.todoProjects.where('playerId').equals(account.playerId).toArray() : [],
        [account]
    );

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
            const items = await rankAmortizationItems(onlyPlanets, account, filters, settings || DEFAULT_RATES, limit, expoAverages, selectedPlanets, resourceTarget);
            setResults(items);
            setLoading(false);
        };
        calculate();
    }, [selectedPlanets, filters, limit, onlyPlanets, account, settings, expoAverages, resourceTarget]);

    // Update existing todos with new calculated values
    useEffect(() => {
        if (!todoList || results.length === 0) return;

        const updateTodos = async () => {
            for (const item of results) {
                const targetLvl = item.targetLevel || (item.currentLevel + 1);
                const key = `${item.planetId || 'empire'}_${item.type}_${item.name}_${targetLvl}`;
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
        const targetLvl = item.targetLevel || (item.currentLevel + 1);
        const key = `${item.planetId || 'empire'}_${item.type}_${item.name}_${targetLvl}`;
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
            playerId: account?.playerId || "",
            name: item.name,
            type: AmortizationType[item.type] || 'Astrophysics',
            icon: getItemIcon(item),
            targetLevel: targetLvl,
            planetId: item.planetId,
            planetName: planet?.name || (item.type === AmortizationType.Astrophysics ? 'New Colony' : undefined),
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

        const metalVal = cost?.metal || 0;
        const crystalVal = cost?.crystal || 0;
        const deutVal = cost?.deuterium || 0;

        const getOpacity = (res: 'metal' | 'crystal' | 'deuterium') => {
            if (!isProd || resourceTarget === 'all') return 1;
            return resourceTarget === res ? 1 : 0.3;
        };

        const getHighlight = (res: 'metal' | 'crystal' | 'deuterium') => {
            if (!isProd || resourceTarget === 'all') return 'transparent';
            return resourceTarget === res ? `${TARGET_THEMES[res].color}18` : 'transparent';
        };

        const getBorder = (res: 'metal' | 'crystal' | 'deuterium') => {
            if (!isProd || resourceTarget === 'all') return '1px solid transparent';
            return resourceTarget === res ? `1px solid ${TARGET_THEMES[res].color}44` : '1px solid transparent';
        };

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
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexDirection: align === 'right' ? 'row-reverse' : 'row',
                        opacity: getOpacity('metal'),
                        padding: isProd ? '2px 6px' : '0',
                        borderRadius: '6px',
                        background: getHighlight('metal'),
                        border: getBorder('metal'),
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <img src="icons/resources/metal-icon-medium.jpg" style={iconStyle} alt="M" />
                        <span style={{ color: '#ff8d33' }}>{isProd ? '+' : ''}{formatAbbreviated(metalVal)}</span>
                    </div>
                )}
                {crystalVal > 0.01 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexDirection: align === 'right' ? 'row-reverse' : 'row',
                        opacity: getOpacity('crystal'),
                        padding: isProd ? '2px 6px' : '0',
                        borderRadius: '6px',
                        background: getHighlight('crystal'),
                        border: getBorder('crystal'),
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <img src="icons/resources/crystal-icon-medium.jpg" style={iconStyle} alt="C" />
                        <span style={{ color: '#33b2ff' }}>{isProd ? '+' : ''}{formatAbbreviated(crystalVal)}</span>
                    </div>
                )}
                {deutVal > 0.01 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexDirection: align === 'right' ? 'row-reverse' : 'row',
                        opacity: getOpacity('deuterium'),
                        padding: isProd ? '2px 6px' : '0',
                        borderRadius: '6px',
                        background: getHighlight('deuterium'),
                        border: getBorder('deuterium'),
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <img src="icons/resources/deuterium-icon-medium.jpg" style={iconStyle} alt="D" />
                        <span style={{ color: '#33ff8d' }}>{isProd ? '+' : ''}{formatAbbreviated(deutVal)}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '0 0 60px 0' }}>
            {/* HIGH-END AMORTIZATION VECTOR DECK (Machined Double-Bezel Hardware Architecture) */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '6px',
                borderRadius: '26px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        background: 'rgba(8, 14, 26, 0.85)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '20px',
                        padding: '12px 18px',
                        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}
                >
                {/* Left: Tactical Vector Identification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${activeTheme.color}25 0%, rgba(255,255,255,0.02) 100%)`,
                        border: `1px solid ${activeTheme.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 18px ${activeTheme.color}22`
                    }}>
                        <Calculator size={20} color={activeTheme.color} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 900,
                                letterSpacing: '0.16em',
                                color: activeTheme.color,
                                background: `${activeTheme.color}15`,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: `1px solid ${activeTheme.color}30`
                            }}>
                                RESOURCE FOCUS
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>•</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                                {resourceTarget === 'all' ? 'All Resources Combined' : `${activeTheme.label} Payback`}
                            </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginTop: '3px' }}>
                            {resourceTarget === 'all'
                                ? 'Empire-Wide Amortization (Metal, Crystal, and Deuterium combined)'
                                : `Targeted ${activeTheme.label} Amortization (Payback calculated purely from ${activeTheme.label} production)`}
                        </div>
                    </div>
                </div>

                {/* Right: Tactile 4-Pill Segmented Switcher */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    padding: '5px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    {[
                        { id: 'all' as AmortizationResourceTarget, label: 'All Resources', sub: 'Total Output', icon: <Globe size={15} />, color: '#00f2ff' },
                        { id: 'metal' as AmortizationResourceTarget, label: 'Metal', sub: 'Metal Output', img: 'icons/resources/metal-icon-medium.jpg', color: '#ff8d33' },
                        { id: 'crystal' as AmortizationResourceTarget, label: 'Crystal', sub: 'Crystal Output', img: 'icons/resources/crystal-icon-medium.jpg', color: '#33b2ff' },
                        { id: 'deuterium' as AmortizationResourceTarget, label: 'Deuterium', sub: 'Deuterium Output', img: 'icons/resources/deuterium-icon-medium.jpg', color: '#33ff8d' },
                    ].map(tab => {
                        const isSelected = resourceTarget === tab.id;
                        return (
                            <motion.button
                                key={tab.id}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setResourceTarget(tab.id)}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    border: isSelected ? `1px solid ${tab.color}88` : '1px solid transparent',
                                    background: isSelected 
                                        ? `linear-gradient(135deg, ${tab.color}25 0%, ${tab.color}08 100%)`
                                        : 'transparent',
                                    color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: isSelected ? `0 0 18px ${tab.color}25, inset 0 1px 1px rgba(255, 255, 255, 0.15)` : 'none'
                                }}
                            >
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected ? `${tab.color}30` : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${isSelected ? tab.color + '60' : 'rgba(255, 255, 255, 0.08)'}`,
                                    overflow: 'hidden'
                                }}>
                                    {tab.img ? (
                                        <img src={tab.img} alt={tab.label} style={{ width: '15px', height: '15px', objectFit: 'contain' }} />
                                    ) : (
                                        tab.icon
                                    )}
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: isSelected ? '#fff' : 'inherit', letterSpacing: '0.02em' }}>
                                        {tab.label}
                                    </div>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: isSelected ? tab.color : 'rgba(255, 255, 255, 0.3)' }}>
                                        {tab.sub}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
            </div>

            {/* Control Header Panes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>

                {/* ADVANCED PLANET SELECTOR */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    padding: '6px',
                    borderRadius: '28px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)'
                }}>
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            background: 'rgba(6, 11, 20, 0.75)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            padding: '22px',
                            borderRadius: '22px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)'
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
                                    onClick={() => setSelectedPlanets(onlyPlanets.map(p => p.id))}
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
                                {selectedPlanets.length} / {onlyPlanets.length} ACTIVE
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
                        {onlyPlanets.map(p => {
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
                </div>

                {/* FILTERING MATRIX */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    padding: '6px',
                    borderRadius: '28px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)'
                }}>
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            background: 'rgba(6, 11, 20, 0.75)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            padding: '22px',
                            borderRadius: '22px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)'
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
                            { id: AmortizationType.LifeformExpeditionResearches, label: 'LF Techs (Research)', sub: 'Exploration & Discovery', icon: <Compass size={16} /> },
                            { id: AmortizationType.PlasmaTechnology, label: 'Plasma Technology', sub: 'Global Empire Bonus', icon: <Zap size={16} /> },
                            { id: AmortizationType.Astrophysics, label: 'Astrophysics (New Colony)', sub: 'Colony Expansion & Expeditions', icon: <Rocket size={16} /> },
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
            </div>

            {/* HIGH-PRECISION AMORTIZATION ENGINE RESULTS (Double-Bezel Enclosure) */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '6px',
                borderRadius: '32px',
                boxShadow: '0 32px 64px rgba(0, 0, 0, 0.6)'
            }}>
                <div style={{
                    background: 'rgba(6, 11, 20, 0.85)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: '26px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.12)',
                    overflow: 'hidden'
                }}>
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
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>
                        {resourceTarget === 'all' ? 'INVESTMENT (MSU)' : `INVESTMENT (${activeTheme.unit.toUpperCase()})`}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textAlign: 'right' }}>HOURLY GAIN</span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: activeTheme.color, letterSpacing: '0.2em', textAlign: 'right' }}>
                        {resourceTarget === 'all' ? 'GAIN (MSU/H)' : `GAIN (${activeTheme.unit.toUpperCase()}/H)`}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 1000, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textAlign: 'right' }}>PAYBACK TIME</span>
                </div>

                <div style={{ maxHeight: '800px', overflowY: 'auto' }} className="intelligence-track">
                    <AnimatePresence mode="popLayout">
                        {results.map((item, idx) => {
                            const planet = planets.find(p => p.id === item.planetId);
                            const icon = getItemIcon(item);
                            const isFirst = idx === 0;

                            const targetLvl = item.targetLevel || (item.currentLevel + 1);
                            const rowKey = `${item.planetId || 'empire'}_${item.type}_${item.name}_${targetLvl}`;

                            return (
                                <motion.div
                                    key={`${item.name}-${item.planetId}-${item.currentLevel}-${targetLvl}`}
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{
                                        opacity: 1,
                                        scale: animatedRow === rowKey ? [1, 1.01, 1] : 1,
                                        y: 0,
                                        background: animatedRow === rowKey
                                            ? 'rgba(0, 242, 255, 0.08)'
                                            : (isFirst ? 'rgba(0, 242, 255, 0.03)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'))
                                    }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: animatedRow === rowKey ? 0.4 : 0.3,
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
                                    className={`amortization-row ${animatedRow === rowKey ? 'diagonal-flash' : ''}`}
                                >
                                    {animatedRow === rowKey && (
                                        <div className="flash-overlay" />
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                        <AnimatePresence>
                                            {notification && notification.key === rowKey && (
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
                                            const isInTodo = todoList?.some(t => t.projectKey === rowKey);

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
                                            {(() => {
                                                const ongoingQueue = findOngoingQueueItem(item, planet?.coords);
                                                const offset = liveAccount?.productionQueue?.serverTimeOffset ?? cachedQueue?.serverTimeOffset ?? serverTimeOffset ?? 0;
                                                const currentServerTime = currentTime + offset;
                                                const remainingMs = ongoingQueue && ongoingQueue.endTimestamp > 0 ? Math.max(0, ongoingQueue.endTimestamp - currentServerTime) : 0;

                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                                                                <span style={{ color: isFirst ? '#000' : THEME_CYAN }}>{targetLvl}</span>
                                                            </div>

                                                            {item.type === AmortizationType.Astrophysics && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 1000,
                                                                        letterSpacing: '0.04em',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(16, 185, 129, 0.18)',
                                                                        color: '#10b981',
                                                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                                                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                                                                    }}>
                                                                        +1 NEW COLONY
                                                                    </span>
                                                                    {Boolean(item.details?.unlockedExpoSlots && item.details.unlockedExpoSlots > 0) && (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            fontWeight: 1000,
                                                                            letterSpacing: '0.04em',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            background: 'rgba(168, 85, 247, 0.2)',
                                                                            color: '#c084fc',
                                                                            border: '1px solid rgba(168, 85, 247, 0.45)',
                                                                            boxShadow: '0 0 10px rgba(168, 85, 247, 0.25)'
                                                                        }}>
                                                                            +{item.details?.unlockedExpoSlots} EXPO SLOT
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 800, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                                                            <span style={{ color: isFirst ? '#fff' : 'inherit' }}>
                                                                {item.type === AmortizationType.Astrophysics
                                                                    ? 'EMPIRE EXPANSION • NEW COLONY PACKAGE'
                                                                    : (planet ? `${planet.coords === '0:0:0' ? 'Unknown' : planet.coords} • ${planet.name}` : 'EMPIRE-WIDE RESEARCH')}
                                                            </span>
                                                        </div>

                                                        {ongoingQueue && (
                                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center' }}>
                                                                <div style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.12) 100%)',
                                                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                                                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.15)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 900,
                                                                    color: '#fbbf24',
                                                                    letterSpacing: '0.02em'
                                                                }}>
                                                                    <span style={{
                                                                        width: '6px',
                                                                        height: '6px',
                                                                        borderRadius: '50%',
                                                                        background: '#f59e0b',
                                                                        boxShadow: '0 0 6px #f59e0b',
                                                                        display: 'inline-block',
                                                                        animation: 'pulse 1.5s infinite'
                                                                    }} />
                                                                    <Clock size={11} color="#fbbf24" />
                                                                    <span>IN QUEUE</span>
                                                                    {ongoingQueue.endTimestamp > 0 && remainingMs > 0 && (
                                                                        <span style={{ opacity: 0.85, fontSize: '10px', marginLeft: '2px', fontFamily: 'monospace' }}>
                                                                            ({formatRemainingTime(remainingMs)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div>
                                        {formatCost(item.cost)}
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '4px 8px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${resourceTarget === 'all' ? 'rgba(255,255,255,0.08)' : activeTheme.color + '44'}`,
                                            borderRadius: '6px',
                                            display: 'inline-block'
                                        }}>
                                            <span style={{ color: resourceTarget === 'all' ? 'rgba(255,255,255,0.7)' : activeTheme.color, fontSize: '11px', fontWeight: 1000 }}>
                                                {formatPrecise(item.targetCost ?? item.msuCost)}{' '}
                                            </span>
                                            <span style={{ fontSize: '9px', fontWeight: 900, color: resourceTarget === 'all' ? 'rgba(255,255,255,0.3)' : activeTheme.color }}>
                                                {activeTheme.unit}
                                            </span>
                                        </div>
                                        {item.type === AmortizationType.Astrophysics && item.details?.avgMineLevels && (
                                            <div style={{
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                marginTop: '6px',
                                                letterSpacing: '0.02em',
                                                lineHeight: 1.3
                                            }}>
                                                Package: Astro + Mines (M{item.details.avgMineLevels.metal}/C{item.details.avgMineLevels.crystal}/D{item.details.avgMineLevels.deuterium}) + LF + Colony Ship
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {formatCost(item.prodDelta, true, 'right')}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: activeTheme.color, fontSize: '18px', fontWeight: 1000, letterSpacing: '-0.5px', textShadow: `0 0 16px ${activeTheme.color}33` }}>
                                            +{formatPrecise(item.productionIncrease)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: activeTheme.color, fontWeight: 1000, marginTop: '4px', letterSpacing: '0.05em' }}>
                                            {resourceTarget === 'all' ? 'MSU / HOUR' : `${activeTheme.label.toUpperCase()} / HOUR`}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            color: item.roiHours < 24 * 7 ? '#22c55e' : (item.roiHours < 24 * 30 ? activeTheme.color : '#fff'),
                                            fontSize: '18px',
                                            fontWeight: 1000,
                                            textShadow: item.roiHours < 24 * 7 ? '0 0 20px rgba(34, 197, 94, 0.4)' : (item.roiHours < 24 * 30 ? `0 0 20px ${activeTheme.color}44` : 'none')
                                        }}>
                                            {formatROI(item.roiHours)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 900, marginTop: '4px' }}>
                                            {resourceTarget === 'all' ? 'PAYBACK TIME' : `${activeTheme.label.toUpperCase()} PAYBACK`}
                                        </div>
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
                            <div style={{ fontWeight: 1000, fontSize: '22px', color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.02em' }}>
                                NO {activeTheme.label.toUpperCase()} UPGRADES DETECTED
                            </div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)', maxWidth: '360px', marginTop: '8px', lineHeight: 1.6 }}>
                                {resourceTarget === 'all'
                                    ? 'Your current filters combined with selected planets yielded zero amortization results. Adjust filters to continue.'
                                    : `No active buildings or research in your selected filters produce ${activeTheme.label.toLowerCase()}. Adjust your planet or infrastructure filters to view available options.`
                                }
                            </div>
                        </motion.div>
                    )}
                </div>
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

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.35; transform: scale(0.85); }
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
