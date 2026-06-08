import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet } from '../../db';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Search,
    Globe,
    Compass,
    Trash2,
    Play,
    CheckCircle2,
    Ship,
    AlertTriangle
} from 'lucide-react';

const THEME_CYAN = '#0062ff';
const RESOURCE_COLORS = {
    metal: '#E6953C',
    crystal: '#4CAEE6',
    deuterium: '#43D159',
    total: '#fff'
};

const parseCoords = (coordsStr: string) => {
    try {
        const parts = coordsStr.replace(/[\[\]]/g, '').split(':').map(Number);
        return {
            galaxy: parts[0] || 0,
            system: parts[1] || 0,
            position: parts[2] || 0
        };
    } catch (e) {
        return { galaxy: 0, system: 0, position: 0 };
    }
};

const RaidRadar: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const spiedPlanets = useLiveQuery(() => db.spiedPlanets.toArray()) || [];
    const ownPlanets = useLiveQuery<Planet[]>(() => {
        if (!activeAccount) return [];
        return db.planets.where('playerId').equals(activeAccount.playerId).filter(p => p.type === 'planet').toArray();
    }, [activeAccount]) || [];
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [confidenceFilter, setConfidenceFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'loot' | 'coords' | 'confidence' | 'lastSpied'>('loot');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [activeTab, setActiveTab] = useState<'all' | 'proximity' | 'galaxy' | 'vicinity' | 'productivity'>('all');
    const [selectedGalaxies, setSelectedGalaxies] = useState<number[]>([]);
    const [proximityPlanetId, setProximityPlanetId] = useState<string>('');
    const [selectedSingleGalaxy, setSelectedSingleGalaxy] = useState<number>(1);
    const [vicinityRange, setVicinityRange] = useState<number>(50);
    const [productivityRange, setProductivityRange] = useState<number>(30);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        if (ownPlanets.length > 0 && !proximityPlanetId) {
            setProximityPlanetId(ownPlanets[0].id);
        }
    }, [ownPlanets, proximityPlanetId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, statusFilter, confidenceFilter, selectedGalaxies, proximityPlanetId, selectedSingleGalaxy, vicinityRange, productivityRange]);
    
    // Live ticking ticker state to force real-time resource recalculation
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 1000); // Tick every second
        return () => clearInterval(timer);
    }, []);

    // Calculate dynamic values for each planet (live resource accumulation and required cargo ships)
    const processedPlanets = useMemo(() => {
        const now = Date.now() / 1000;
        const isDiscoverer = activeAccount?.playerClass === 3;
        const lootPercentageValue = isDiscoverer ? 75 : 50;
        const lootFactor = lootPercentageValue / 100;
        
        // Only display players who have a calculated storage capacity cap spied
        // AND whose last spy report is NOT older than 2 days (48 hours)
        const twoDaysInSeconds = 2 * 24 * 60 * 60; // 172,800 seconds
        const spiedPlanetsWithCap = spiedPlanets.filter(planet => 
            planet.metalCapacity !== undefined && 
            planet.crystalCapacity !== undefined && 
            planet.deuteriumCapacity !== undefined &&
            (now - planet.lastSpiedTimestamp) <= twoDaysInSeconds
        );
        
        return spiedPlanetsWithCap.map(planet => {
            const dT = Math.max(0, now - planet.lastSpiedTimestamp) / 3600; // time elapsed in hours

            // Resource accumulation projection with capacity caps (default baseline of 10,000)
            const metalAccumulated = planet.metalPerHour * dT;
            const crystalAccumulated = planet.crystalPerHour * dT;
            const deuteriumAccumulated = planet.deuteriumPerHour * dT;

            const metalCap = planet.metalCapacity || 10000;
            const crystalCap = planet.crystalCapacity || 10000;
            const deuteriumCap = planet.deuteriumCapacity || 10000;

            const metalTotal = Math.max(planet.lastSpiedMetal, Math.min(metalCap, planet.lastSpiedMetal + metalAccumulated));
            const crystalTotal = Math.max(planet.lastSpiedCrystal, Math.min(crystalCap, planet.lastSpiedCrystal + crystalAccumulated));
            const deuteriumTotal = Math.max(planet.lastSpiedDeuterium, Math.min(deuteriumCap, planet.lastSpiedDeuterium + deuteriumAccumulated));
            const resourcesTotal = metalTotal + crystalTotal + deuteriumTotal;
            const resourcesMSU = metalTotal + crystalTotal * 1.5 + deuteriumTotal * 3;

            // Inactive Raid Loot Factor based on activeAccount playerClass (Discoverer = 75%, others = 50%)
            const lootMetal = metalTotal * lootFactor;
            const lootCrystal = crystalTotal * lootFactor;
            const lootDeuterium = deuteriumTotal * lootFactor;
            const lootTotal = lootMetal + lootCrystal + lootDeuterium;

            // MSU = Metal + Crystal * 1.5 + Deuterium * 3
            const lootMSU = lootMetal + lootCrystal * 1.5 + lootDeuterium * 3;

            // Required cargo count based on capacity (Small = 5,000, Large = 25,000)
            const smallCargoNeeded = Math.ceil(lootTotal / 5000);
            const largeCargoNeeded = Math.ceil(lootTotal / 25000);

            // Coordinates parse for numeric sorting: "[5:27:5]" -> [5, 27, 5]
            let coordsVal = 0;
            try {
                const parts = planet.coords.replace(/[\[\]]/g, '').split(':').map(Number);
                if (parts.length === 3) {
                    coordsVal = parts[0] * 1000000 + parts[1] * 1000 + parts[2];
                }
            } catch (e) {}

            return {
                ...planet,
                metalTotal: Math.floor(metalTotal),
                crystalTotal: Math.floor(crystalTotal),
                deuteriumTotal: Math.floor(deuteriumTotal),
                resourcesTotal: Math.floor(resourcesTotal),
                resourcesMSU: Math.floor(resourcesMSU),
                lootMetal: Math.floor(lootMetal),
                lootCrystal: Math.floor(lootCrystal),
                lootDeuterium: Math.floor(lootDeuterium),
                lootTotal: Math.floor(lootTotal),
                lootMSU: Math.floor(lootMSU),
                lootPercentageValue,
                smallCargoNeeded,
                largeCargoNeeded,
                dT,
                coordsVal
            };
        });
    }, [spiedPlanets, tick, activeAccount]);

    // Handle Delete target from DB
    const handleDeletePlanet = async (planetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to remove this spied inactive target?")) {
            try {
                await db.spiedPlanets.delete(planetId);
            } catch (err) {
                console.error("Failed to delete spied target", err);
            }
        }
    };

    // Available galaxies dynamically extracted from active spied planets
    const availableGalaxies = useMemo(() => {
        const galaxies = new Set<number>();
        processedPlanets.forEach(p => {
            const coords = parseCoords(p.coords);
            if (coords.galaxy > 0) {
                galaxies.add(coords.galaxy);
            }
        });
        return Array.from(galaxies).sort((a, b) => a - b);
    }, [processedPlanets]);

    const toggleGalaxy = (g: number) => {
        setSelectedGalaxies(prev => {
            if (prev.includes(g)) {
                return prev.filter(x => x !== g);
            } else {
                return [...prev, g];
            }
        });
    };

    // Filtered and Sorted list
    const filteredPlanets = useMemo(() => {
        return processedPlanets
            .filter(planet => {
                // Search filter (coordinates or player name)
                const searchLower = searchQuery.toLowerCase();
                const matchesSearch = 
                    planet.playerName.toLowerCase().includes(searchLower) ||
                    planet.coords.toLowerCase().includes(searchLower);

                // Status filter
                const isLongInactive = planet.playerStatus.includes('longinactive');
                const matchesStatus = 
                    statusFilter === 'all' ||
                    (statusFilter === 'inactive' && !isLongInactive) ||
                    (statusFilter === 'longinactive' && isLongInactive);

                // Confidence filter (minimum score or 'all')
                const matchesConfidence =
                    confidenceFilter === 'all' ||
                    planet.confidence >= parseInt(confidenceFilter, 10);

                // Tab-specific filters
                let matchesTab = true;
                const targetCoords = parseCoords(planet.coords);

                if (activeTab === 'all') {
                    matchesTab = selectedGalaxies.length === 0 || selectedGalaxies.includes(targetCoords.galaxy);
                } else if (activeTab === 'proximity') {
                    const ownPlanet = ownPlanets.find(p => p.id === proximityPlanetId);
                    if (ownPlanet) {
                        const own = parseCoords(ownPlanet.coords);
                        const maxSystems = activeAccount?.systems || 499;
                        const isDonut = activeAccount?.donutSystem === undefined ? true : activeAccount.donutSystem !== 0;

                        let diff = Math.abs(targetCoords.system - own.system);
                        if (isDonut && diff > maxSystems / 2) {
                            diff = maxSystems - diff;
                        }
                        matchesTab = targetCoords.galaxy === own.galaxy && diff <= 100;
                    } else {
                        matchesTab = false;
                    }
                } else if (activeTab === 'galaxy') {
                    matchesTab = targetCoords.galaxy === selectedSingleGalaxy;
                }

                return matchesSearch && matchesStatus && matchesConfidence && matchesTab;
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === 'loot') {
                    comparison = a.lootMSU - b.lootMSU;
                } else if (sortBy === 'coords') {
                    comparison = a.coordsVal - b.coordsVal;
                } else if (sortBy === 'confidence') {
                    comparison = a.confidence - b.confidence;
                } else if (sortBy === 'lastSpied') {
                    comparison = a.lastSpiedTimestamp - b.lastSpiedTimestamp;
                }

                return sortOrder === 'desc' ? -comparison : comparison;
            });
    }, [processedPlanets, searchQuery, statusFilter, confidenceFilter, sortBy, sortOrder, activeTab, selectedGalaxies, proximityPlanetId, selectedSingleGalaxy, ownPlanets, activeAccount]);

    const vicinityData = useMemo(() => {
        return ownPlanets.map(own => {
            const ownCoords = parseCoords(own.coords);
            const maxSystems = activeAccount?.systems || 499;
            const isDonut = activeAccount?.donutSystem === undefined ? true : activeAccount.donutSystem !== 0;

            let totalMetal = 0;
            let totalCrystal = 0;
            let totalDeuterium = 0;
            let totalMSU = 0;
            let targetCount = 0;
            const vicinityTargets: typeof processedPlanets = [];

            processedPlanets.forEach(target => {
                const targetCoords = parseCoords(target.coords);
                if (targetCoords.galaxy !== ownCoords.galaxy) return;

                let diff = Math.abs(targetCoords.system - ownCoords.system);
                if (isDonut && diff > maxSystems / 2) {
                    diff = maxSystems - diff;
                }

                if (diff <= vicinityRange) {
                    totalMetal += target.lootMetal;
                    totalCrystal += target.lootCrystal;
                    totalDeuterium += target.lootDeuterium;
                    totalMSU += target.lootMSU;
                    targetCount++;
                    vicinityTargets.push(target);
                }
            });

            return {
                own,
                totalMetal,
                totalCrystal,
                totalDeuterium,
                totalMSU,
                targetCount,
                vicinityTargets
            };
        }).sort((a, b) => b.totalMSU - a.totalMSU);
    }, [ownPlanets, processedPlanets, vicinityRange, activeAccount]);

    const productivityData = useMemo(() => {
        return ownPlanets.map(own => {
            const ownCoords = parseCoords(own.coords);
            const maxSystems = activeAccount?.systems || 499;
            const isDonut = activeAccount?.donutSystem === undefined ? true : activeAccount.donutSystem !== 0;

            const vicinityTargets: typeof processedPlanets = [];

            processedPlanets.forEach(target => {
                const targetCoords = parseCoords(target.coords);
                if (targetCoords.galaxy !== ownCoords.galaxy) return;

                let diff = Math.abs(targetCoords.system - ownCoords.system);
                if (isDonut && diff > maxSystems / 2) {
                    diff = maxSystems - diff;
                }

                if (diff <= productivityRange) {
                    vicinityTargets.push(target);
                }
            });

            // Map each target to its Productivity MSU/h value
            const targetsWithProd = vicinityTargets.map(target => {
                const prodMSU = target.metalPerHour + target.crystalPerHour * 1.5 + target.deuteriumPerHour * 3.0;
                return { target, prodMSU };
            });

            // Sort targets by productivity MSU per hour descending
            targetsWithProd.sort((a, b) => b.prodMSU - a.prodMSU);

            // Take the best 20 targets (or all if less than 20)
            const best20Targets = targetsWithProd.slice(0, 20);

            let totalMetalProd = 0;
            let totalCrystalProd = 0;
            let totalDeuteriumProd = 0;
            let totalMSUProd = 0;

            best20Targets.forEach(item => {
                totalMetalProd += item.target.metalPerHour;
                totalCrystalProd += item.target.crystalPerHour;
                totalDeuteriumProd += item.target.deuteriumPerHour;
                totalMSUProd += item.prodMSU;
            });

            return {
                own,
                totalMetalProd,
                totalCrystalProd,
                totalDeuteriumProd,
                totalMSUProd,
                targetCount: vicinityTargets.length,
                topTargetsCount: best20Targets.length
            };
        }).sort((a, b) => b.totalMSUProd - a.totalMSUProd);
    }, [ownPlanets, processedPlanets, productivityRange, activeAccount]);

    const totalPages = Math.ceil(filteredPlanets.length / ITEMS_PER_PAGE);

    const paginatedPlanets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPlanets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredPlanets, currentPage]);

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: currentPage === i ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: currentPage === i ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                    className={currentPage === i ? '' : 'page-btn-hover'}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    // Analytics stats
    const stats = useMemo(() => {
        let totalLootVal = 0;
        let totalLootMSU = 0;
        let bestTarget: any = null;
        let avgConfidence = 0;
        
        filteredPlanets.forEach(p => {
            totalLootVal += p.lootTotal;
            totalLootMSU += p.lootMSU;
            avgConfidence += p.confidence;
            if (!bestTarget || p.lootMSU > bestTarget.lootMSU) {
                bestTarget = p;
            }
        });

        const count = filteredPlanets.length;
        avgConfidence = count > 0 ? Math.round(avgConfidence / count) : 0;

        return {
            totalLootVal,
            totalLootMSU,
            bestTarget,
            avgConfidence,
            count
        };
    }, [filteredPlanets]);

    const toggleSort = (field: 'loot' | 'coords' | 'confidence' | 'lastSpied') => {
        if (sortBy === field) {
            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return (Math.round(num * 10) / 10).toString();
    };

    const formatAbbreviated = (num: number): string => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const getConfidenceBadgeColor = (conf: number): string => {
        if (conf >= 80) return 'rgba(34, 197, 94, 0.15)'; // Emerald
        if (conf >= 40) return 'rgba(56, 189, 248, 0.15)'; // Sky Blue
        return 'rgba(230, 149, 60, 0.15)'; // Amber
    };

    const getConfidenceTextColor = (conf: number): string => {
        if (conf >= 80) return '#22c55e';
        if (conf >= 40) return '#38bdf8';
        return '#e6953c';
    };

    return (
        <div className="view">
            {/* Header with pulsing animated radar overlay */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                        <div className="radar-circle-glow" />
                        <div className="radar-pulse" />
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: 'rgba(0, 98, 255, 0.2)',
                            border: '2px solid #0062ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00f2ff'
                        }}>
                            <Activity size={24} className="radar-spin" />
                        </div>
                    </div>
                    <div>
                        <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Raid Radar</h1>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Empirical target tracking and resource projection for inactive farming.</p>
                    </div>
                </div>
            </div>

            {/* Quick Analytics Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <Globe size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Spied Targets</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                        {stats.count} Planets
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Currently registered in database</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <Ship size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Accumulated Loot</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {formatNumber(stats.totalLootMSU)}
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            MSU
                        </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Based on {activeAccount?.playerClass === 3 ? 75 : 50}% inactive loot factor ({activeAccount?.playerClass === 3 ? 'Discoverer' : 'Other Class'})
                    </span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Avg Data Confidence</span>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: getConfidenceTextColor(stats.avgConfidence) }}>
                        {stats.avgConfidence}%
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Higher spy counts = tighter estimates</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <Compass size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Highest Yield Target</span>
                    </div>
                    {stats.bestTarget ? (
                        <>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                                {stats.bestTarget.playerName} <span style={{ color: 'var(--primary)' }}>[{stats.bestTarget.coords}]</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yielding {formatNumber(stats.bestTarget.lootMSU)} MSU loot</span>
                        </>
                    ) : (
                        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>None</div>
                    )}
                </motion.div>
            </div>

            {/* Visual Merged Sleek Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px', position: 'relative', zIndex: 2 }}>
                <button
                    onClick={() => setActiveTab('all')}
                    style={{
                        padding: '14px 28px',
                        background: activeTab === 'all' ? 'rgba(10, 16, 27, 0.98)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: activeTab === 'all' ? '1px solid rgba(10, 16, 27, 0.98)' : 'none',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        color: activeTab === 'all' ? '#00f2ff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderTop: activeTab === 'all' ? '2px solid #0062ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        outline: 'none',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    All Targets
                </button>
                <button
                    onClick={() => setActiveTab('proximity')}
                    style={{
                        padding: '14px 28px',
                        background: activeTab === 'proximity' ? 'rgba(10, 16, 27, 0.98)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: activeTab === 'proximity' ? '1px solid rgba(10, 16, 27, 0.98)' : 'none',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        color: activeTab === 'proximity' ? '#00f2ff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderTop: activeTab === 'proximity' ? '2px solid #0062ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        outline: 'none',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Targets by Proximity
                </button>
                <button
                    onClick={() => setActiveTab('galaxy')}
                    style={{
                        padding: '14px 28px',
                        background: activeTab === 'galaxy' ? 'rgba(10, 16, 27, 0.98)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: activeTab === 'galaxy' ? '1px solid rgba(10, 16, 27, 0.98)' : 'none',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        color: activeTab === 'galaxy' ? '#00f2ff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderTop: activeTab === 'galaxy' ? '2px solid #0062ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        outline: 'none',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Targets by Galaxy
                </button>
                <button
                    onClick={() => setActiveTab('vicinity')}
                    style={{
                        padding: '14px 28px',
                        background: activeTab === 'vicinity' ? 'rgba(10, 16, 27, 0.98)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: activeTab === 'vicinity' ? '1px solid rgba(10, 16, 27, 0.98)' : 'none',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        color: activeTab === 'vicinity' ? '#00f2ff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderTop: activeTab === 'vicinity' ? '2px solid #0062ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        outline: 'none',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Best Loot Vicinities
                </button>
                <button
                    onClick={() => setActiveTab('productivity')}
                    style={{
                        padding: '14px 28px',
                        background: activeTab === 'productivity' ? 'rgba(10, 16, 27, 0.98)' : 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: activeTab === 'productivity' ? '1px solid rgba(10, 16, 27, 0.98)' : 'none',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        color: activeTab === 'productivity' ? '#00f2ff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderTop: activeTab === 'productivity' ? '2px solid #0062ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        outline: 'none',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Best Productivity Vicinities
                </button>
            </div>

            {/* List and Grid view */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass" style={{
                    padding: '24px',
                    overflowX: 'auto',
                    borderTopLeftRadius: activeTab === 'all' ? '0px' : '20px',
                    background: 'rgba(10, 16, 27, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
                            {activeTab === 'all' && 'All Inactive Targets'}
                            {activeTab === 'proximity' && 'Proximity Inactive Targets'}
                            {activeTab === 'galaxy' && 'Galaxy Inactive Targets'}
                            {activeTab === 'vicinity' && 'Best Loot Vicinities'}
                            {activeTab === 'productivity' && 'Best Productivity Vicinities (Top 20 Inactives)'}
                        </h3>
                        {activeTab !== 'vicinity' && activeTab !== 'productivity' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Showing {filteredPlanets.length} targets
                            </span>
                        )}
                    </div>

                    {activeTab !== 'vicinity' && activeTab !== 'productivity' ? (
                        <>
                            {/* Integrated In-Tab Filters Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        {/* Search Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Name or coords..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        padding: '8px 12px 8px 36px',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    className="search-input"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    background: 'rgba(6, 11, 20, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="inactive">Inactive (i)</option>
                                <option value="longinactive">Long Inactive (I)</option>
                            </select>
                        </div>

                        {/* Confidence Filter */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidence</span>
                            <select
                                value={confidenceFilter}
                                onChange={(e) => setConfidenceFilter(e.target.value)}
                                style={{
                                    background: 'rgba(6, 11, 20, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: '#fff',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <option value="all">All Confidence</option>
                                <option value="30">≥ 30%</option>
                                <option value="60">≥ 60%</option>
                                <option value="85">≥ 85%</option>
                                <option value="100">100%</option>
                            </select>
                        </div>

                        {/* Tab-Specific Filters */}
                        {activeTab === 'proximity' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Relative to Own Planet</span>
                                <select
                                    value={proximityPlanetId}
                                    onChange={(e) => setProximityPlanetId(e.target.value)}
                                    style={{
                                        background: 'rgba(6, 11, 20, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#fff',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {ownPlanets.length === 0 ? (
                                        <option value="">No planets registered</option>
                                    ) : (
                                        ownPlanets.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} [{p.coords}]
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        )}

                        {activeTab === 'galaxy' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choose Galaxy</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => {
                                        const isActive = selectedSingleGalaxy === g;
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => setSelectedSingleGalaxy(g)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    color: isActive ? '#fff' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    transition: 'all 0.2s',
                                                    outline: 'none',
                                                    flex: '1 1 auto',
                                                    textAlign: 'center'
                                                }}
                                                className={isActive ? '' : 'page-btn-hover'}
                                            >
                                                G{g}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Galaxy Multi-Selector (Only on "All Targets" tab) */}
                    {activeTab === 'all' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter by Galaxies</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setSelectedGalaxies([])}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        background: selectedGalaxies.length === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: selectedGalaxies.length === 0 ? '#fff' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    className={selectedGalaxies.length === 0 ? '' : 'page-btn-hover'}
                                >
                                    All
                                </button>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => {
                                    const isActive = selectedGalaxies.includes(g);
                                    return (
                                        <button
                                            key={g}
                                            onClick={() => toggleGalaxy(g)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                color: isActive ? '#fff' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            className={isActive ? '' : 'page-btn-hover'}
                                        >
                                            G{g}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {filteredPlanets.length === 0 ? (
                        <div style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', textAlign: 'center', opacity: 0.6 }}>
                            <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', alignSelf: 'center' }} />
                            <h4 style={{ margin: '0 0 6px 0', color: '#fff' }}>No Spied Targets Found</h4>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Go spy on inactive targets in the galaxy view. Open reports in message log to populate this tracker!
                            </p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ textAlign: 'left', padding: '16px 12px', fontWeight: 600 }}>Target Planet</th>
                                    <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleSort('coords')}>
                                        Coords {sortBy === 'coords' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th style={{ textAlign: 'left', padding: '16px 12px', fontWeight: 600 }}>Empirical Growth Rate</th>
                                    <th style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 600 }}>Last Spy Resources</th>
                                    <th style={{ textAlign: 'left', padding: '16px 12px', fontWeight: 600 }}>
                                        Current Estimated Resources
                                    </th>
                                    <th style={{ textAlign: 'left', padding: '16px 12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleSort('loot')}>
                                        Current Estimated Loot ({activeAccount?.playerClass === 3 ? 75 : 50}%) {sortBy === 'loot' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleSort('confidence')}>
                                        Confidence {sortBy === 'confidence' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleSort('lastSpied')}>
                                        Age {sortBy === 'lastSpied' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: 600 }}>Tactical Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {paginatedPlanets.map((planet) => {
                                        const isLong = planet.playerStatus.includes('longinactive');
                                        const ageSeconds = Math.max(0, (Date.now() / 1000) - planet.lastSpiedTimestamp);
                                        
                                        // Human readable age
                                        let ageText = "Just now";
                                        if (ageSeconds >= 86400) ageText = `${Math.floor(ageSeconds / 86400)}d`;
                                        else if (ageSeconds >= 3600) ageText = `${Math.floor(ageSeconds / 3600)}h`;
                                        else if (ageSeconds >= 60) ageText = `${Math.floor(ageSeconds / 60)}m`;

                                        return (
                                            <motion.tr
                                                key={planet.planetId}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                                                className="target-row"
                                            >
                                                {/* Player / Target */}
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{planet.playerName}</span>
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 800,
                                                                color: isLong ? '#ef4444' : '#f59e0b',
                                                                background: isLong ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                border: isLong ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
                                                            }}>
                                                                {isLong ? 'I' : 'i'}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planet ID: {planet.planetId}</span>
                                                    </div>
                                                </td>

                                                {/* Coordinates */}
                                                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                    <a
                                                        href={`https://s267-en.ogame.gameforge.com/game/index.php?page=ingame&component=galaxy&galaxy=${planet.coords.split(':')[0]}&system=${planet.coords.split(':')[1]}&position=${planet.coords.split(':')[2]}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            color: 'var(--primary)',
                                                            fontWeight: 700,
                                                            textDecoration: 'none',
                                                            background: 'rgba(0, 98, 255, 0.05)',
                                                            border: '1px solid rgba(0, 98, 255, 0.15)',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            display: 'inline-block',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        className="coords-badge"
                                                    >
                                                        [{planet.coords}]
                                                    </a>
                                                </td>

                                                {/* Rates */}
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '120px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.metal, fontWeight: 500 }}>Metal:</span>
                                                            <span style={{ fontWeight: 700 }}>+{formatNumber(planet.metalPerHour)}/h</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '120px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.crystal, fontWeight: 500 }}>Crystal:</span>
                                                            <span style={{ fontWeight: 700 }}>+{formatNumber(planet.crystalPerHour)}/h</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '120px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.deuterium, fontWeight: 500 }}>Deuterium:</span>
                                                            <span style={{ fontWeight: 700 }}>+{formatNumber(planet.deuteriumPerHour)}/h</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Last Spied resources */}
                                                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>M: <b style={{ color: '#fff' }}>{formatAbbreviated(planet.lastSpiedMetal)}</b></span>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>C: <b style={{ color: '#fff' }}>{formatAbbreviated(planet.lastSpiedCrystal)}</b></span>
                                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>D: <b style={{ color: '#fff' }}>{formatAbbreviated(planet.lastSpiedDeuterium)}</b></span>
                                                    </div>
                                                </td>

                                                {/* Current Estimated Resources */}
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.metal, fontWeight: 500 }}>Metal:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.metalTotal)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.crystal, fontWeight: 500 }}>Crystal:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.crystalTotal)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.deuterium, fontWeight: 500 }}>Deuterium:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.deuteriumTotal)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px', alignItems: 'center' }}>
                                                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>MSU:</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                                {formatAbbreviated(planet.resourcesMSU)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Projected Loot */}
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.metal, fontWeight: 500 }}>Metal:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.lootMetal)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.crystal, fontWeight: 500 }}>Crystal:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.lootCrystal)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px' }}>
                                                            <span style={{ color: RESOURCE_COLORS.deuterium, fontWeight: 500 }}>Deuterium:</span>
                                                            <span style={{ fontWeight: 700 }}>{formatAbbreviated(planet.lootDeuterium)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '130px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px', alignItems: 'center' }}>
                                                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>MSU:</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {formatAbbreviated(planet.lootMSU)}
                                                                <span style={{
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 800,
                                                                    color: 'rgba(255,255,255,0.5)',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    padding: '1px 4px',
                                                                    borderRadius: '3px'
                                                                }}>
                                                                    {planet.lootPercentageValue}%
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Confidence */}
                                                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            color: getConfidenceTextColor(planet.confidence),
                                                            background: getConfidenceBadgeColor(planet.confidence),
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            border: `1px solid ${getConfidenceTextColor(planet.confidence)}30`
                                                        }}>
                                                            {planet.confidence}%
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {planet.spyCount} Spies
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Age */}
                                                <td style={{ padding: '16px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    {ageText} ago
                                                </td>

                                                {/* Action Actions */}
                                                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {/* Small / Large Cargo Requirements Tooltip */}
                                                        <div 
                                                            className="nexus-tooltip action-button" 
                                                            data-nexus-tooltip={`Requires: ${planet.smallCargoNeeded.toLocaleString()} Small Cargo OR ${planet.largeCargoNeeded.toLocaleString()} Large Cargo to plunder.`}
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.02)',
                                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                                color: 'var(--primary)',
                                                                cursor: 'default',
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Ship size={16} />
                                                        </div>

                                                        {/* Link to spy dispatch page pre-filled */}
                                                        <a
                                                            href={`https://s267-en.ogame.gameforge.com/game/index.php?page=ingame&component=fleetdispatch&galaxy=${planet.coords.split(':')[0]}&system=${planet.coords.split(':')[1]}&position=${planet.coords.split(':')[2]}&type=1&mission=6`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="action-button"
                                                            style={{
                                                                background: 'rgba(34, 197, 94, 0.05)',
                                                                border: '1px solid rgba(34, 197, 94, 0.15)',
                                                                color: '#22c55e',
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                textDecoration: 'none'
                                                            }}
                                                            title="Dispatch Spy Probe"
                                                        >
                                                            <Play size={16} />
                                                        </a>

                                                        {/* Delete Target button */}
                                                        <button
                                                            onClick={(e) => handleDeletePlanet(planet.planetId, e)}
                                                            className="action-button"
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.05)',
                                                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                                                color: '#ef4444',
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            title="Delete Target"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}

                    {/* Sleek Numbered Pagination UI */}
                    {filteredPlanets.length > 0 && totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlanets.length)} of {filteredPlanets.length} targets
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        background: currentPage === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: currentPage === 1 ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    className={currentPage === 1 ? '' : 'page-btn-hover'}
                                >
                                    Previous
                                </button>
                                {renderPageNumbers()}
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        background: currentPage === totalPages ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: currentPage === totalPages ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    className={currentPage === totalPages ? '' : 'page-btn-hover'}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : activeTab === 'vicinity' ? (
                <>
                    {/* Vicinity Range Slider Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>Vicinity Range Limit</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800 }}>± {vicinityRange} systems</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <input
                                type="range"
                                min="1"
                                max="250"
                                value={vicinityRange}
                                onChange={(e) => setVicinityRange(parseInt(e.target.value))}
                                style={{
                                    flex: 1,
                                    accentColor: '#0062ff',
                                    height: '6px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.1)',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="number"
                                min="1"
                                max="250"
                                value={vicinityRange}
                                onChange={(e) => setVicinityRange(Math.min(250, Math.max(1, parseInt(e.target.value) || 1)))}
                                style={{
                                    width: '70px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Calculates total available loot inside circular systems in the same galaxy.
                        </span>
                    </div>

                    {vicinityData.length === 0 ? (
                        <div style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', textAlign: 'center', opacity: 0.6 }}>
                            <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', alignSelf: 'center' }} />
                            <h4 style={{ margin: '0 0 6px 0', color: '#fff' }}>No Own Planets Registered</h4>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Ensure you have registered planets for the active account to view vicinity yields!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginTop: '12px' }}>
                            {vicinityData.map(({ own, totalMetal, totalCrystal, totalDeuterium, totalMSU, targetCount }) => {
                                const maxMSU = Math.max(...vicinityData.map(v => v.totalMSU)) || 1;
                                const percentageOfMax = (totalMSU / maxMSU) * 100;
                                const metalPct = totalMSU > 0 ? (totalMetal / totalMSU) * 100 : 0;
                                const crystalPct = totalMSU > 0 ? (totalCrystal * 1.5 / totalMSU) * 100 : 0;
                                const deutPct = totalMSU > 0 ? (totalDeuterium * 3 / totalMSU) * 100 : 0;

                                return (
                                    <motion.div
                                        key={own.id}
                                        whileHover={{ scale: 1.02, y: -4, borderColor: 'rgba(0, 98, 255, 0.4)' }}
                                        onClick={() => {
                                            setProximityPlanetId(own.id);
                                            setActiveTab('proximity');
                                        }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            border: '1px solid rgba(255, 255, 255, 0.04)',
                                            borderRadius: '16px',
                                            padding: '24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {/* Planet Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{own.name}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Planet ID: {own.id}</span>
                                            </div>
                                            <span style={{
                                                color: '#00f2ff',
                                                background: 'rgba(0, 242, 255, 0.08)',
                                                border: '1px solid rgba(0, 242, 255, 0.15)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '0.8rem'
                                            }}>
                                                [{own.coords}]
                                            </span>
                                        </div>

                                        {/* Loot Value Display */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vicinity Loot Yield</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                    {formatAbbreviated(totalMSU)}
                                                </span>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>MSU</span>
                                            </div>
                                        </div>

                                        {/* Relative Density Indicator bar */}
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${percentageOfMax}%`, height: '100%', background: 'linear-gradient(90deg, #0062ff, #00f2ff)', borderRadius: '2px' }} />
                                        </div>

                                        {/* Counts & Targets Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>Target Density:</span>
                                            <span style={{ color: '#fff', fontWeight: 700 }}>{targetCount} Targets nearby</span>
                                        </div>

                                        {/* Stacked Proportional Loot Bar */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', marginTop: 'auto' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Loot Mix Ratio</span>
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                                                <div style={{ width: `${metalPct}%`, background: RESOURCE_COLORS.metal, height: '100%' }} title={`Metal: ${formatAbbreviated(totalMetal)}`} />
                                                <div style={{ width: `${crystalPct}%`, background: RESOURCE_COLORS.crystal, height: '100%' }} title={`Crystal: ${formatAbbreviated(totalCrystal)}`} />
                                                <div style={{ width: `${deutPct}%`, background: RESOURCE_COLORS.deuterium, height: '100%' }} title={`Deuterium: ${formatAbbreviated(totalDeuterium)}`} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '2px' }}>
                                                <span style={{ color: RESOURCE_COLORS.metal }}>M: {formatAbbreviated(totalMetal)}</span>
                                                <span style={{ color: RESOURCE_COLORS.crystal }}>C: {formatAbbreviated(totalCrystal)}</span>
                                                <span style={{ color: RESOURCE_COLORS.deuterium }}>D: {formatAbbreviated(totalDeuterium)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Productivity Range Slider Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>Productivity Range Limit</span>
                            <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800 }}>± {productivityRange} systems</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <input
                                type="range"
                                min="1"
                                max="250"
                                value={productivityRange}
                                onChange={(e) => setProductivityRange(parseInt(e.target.value))}
                                style={{
                                    flex: 1,
                                    accentColor: '#10b981',
                                    height: '6px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.1)',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="number"
                                min="1"
                                max="250"
                                value={productivityRange}
                                onChange={(e) => setProductivityRange(Math.min(250, Math.max(1, parseInt(e.target.value) || 1)))}
                                style={{
                                    width: '70px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Calculates total productivity MSU/h of the best 20 targets in the circular systems of every own planet.
                        </span>
                    </div>

                    {productivityData.length === 0 ? (
                        <div style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', textAlign: 'center', opacity: 0.6 }}>
                            <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', alignSelf: 'center' }} />
                            <h4 style={{ margin: '0 0 6px 0', color: '#fff' }}>No Own Planets Registered</h4>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Ensure you have registered planets for the active account to view productivity yields!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginTop: '12px' }}>
                            {productivityData.map(({ own, totalMetalProd, totalCrystalProd, totalDeuteriumProd, totalMSUProd, targetCount, topTargetsCount }) => {
                                const maxMSUProd = Math.max(...productivityData.map(v => v.totalMSUProd)) || 1;
                                const percentageOfMax = (totalMSUProd / maxMSUProd) * 100;
                                const metalPct = totalMSUProd > 0 ? (totalMetalProd / totalMSUProd) * 100 : 0;
                                const crystalPct = totalMSUProd > 0 ? (totalCrystalProd * 1.5 / totalMSUProd) * 100 : 0;
                                const deutPct = totalMSUProd > 0 ? (totalDeuteriumProd * 3 / totalMSUProd) * 100 : 0;

                                return (
                                    <motion.div
                                        key={own.id}
                                        whileHover={{ scale: 1.02, y: -4, borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                        onClick={() => {
                                            setProximityPlanetId(own.id);
                                            setActiveTab('proximity');
                                        }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.01)',
                                            border: '1px solid rgba(255, 255, 255, 0.04)',
                                            borderRadius: '16px',
                                            padding: '24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {/* Planet Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{own.name}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Planet ID: {own.id}</span>
                                            </div>
                                            <span style={{
                                                color: '#10b981',
                                                background: 'rgba(16, 185, 129, 0.08)',
                                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '0.8rem'
                                            }}>
                                                [{own.coords}]
                                            </span>
                                        </div>

                                        {/* Productivity Value Display */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vicinity Productivity Yield</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
                                                    {formatAbbreviated(totalMSUProd)}
                                                </span>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>MSU/h</span>
                                            </div>
                                        </div>

                                        {/* Relative Density Indicator bar */}
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${percentageOfMax}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '2px' }} />
                                        </div>

                                        {/* Counts & Targets Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>Target Density (Summing Best 20):</span>
                                            <span style={{ color: '#fff', fontWeight: 700 }}>
                                                {topTargetsCount === targetCount ? `${targetCount} Targets` : `${topTargetsCount} of ${targetCount} Targets`}
                                            </span>
                                        </div>

                                        {/* Stacked Proportional Production Bar */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', marginTop: 'auto' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Production Growth Mix</span>
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                                                <div style={{ width: `${metalPct}%`, background: RESOURCE_COLORS.metal, height: '100%' }} title={`Metal: ${formatAbbreviated(totalMetalProd)}/h`} />
                                                <div style={{ width: `${crystalPct}%`, background: RESOURCE_COLORS.crystal, height: '100%' }} title={`Crystal: ${formatAbbreviated(totalCrystalProd * 1.5)}/h (MSU-weighted)`} />
                                                <div style={{ width: `${deutPct}%`, background: RESOURCE_COLORS.deuterium, height: '100%' }} title={`Deuterium: ${formatAbbreviated(totalDeuteriumProd * 3)}/h (MSU-weighted)`} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '2px' }}>
                                                <span style={{ color: RESOURCE_COLORS.metal }}>M: {formatAbbreviated(totalMetalProd)}/h</span>
                                                <span style={{ color: RESOURCE_COLORS.crystal }}>C: {formatAbbreviated(totalCrystalProd)}/h</span>
                                                <span style={{ color: RESOURCE_COLORS.deuterium }}>D: {formatAbbreviated(totalDeuteriumProd)}/h</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
                </div>
            </div>

            <style>{`
                .view {
                    padding: 40px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .glass {
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }
                .target-row:hover {
                    background: rgba(255, 255, 255, 0.02);
                }
                .search-input:focus {
                    border-color: var(--primary) !important;
                    background: rgba(0, 98, 255, 0.05) !important;
                    box-shadow: 0 0 15px rgba(0, 98, 255, 0.1);
                }
                .coords-badge:hover {
                    background: rgba(0, 98, 255, 0.1) !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 10px rgba(0, 98, 255, 0.2);
                }
                .action-button {
                    transition: all 0.2s;
                }
                .action-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 0 10px rgba(255,255,255,0.1);
                }
                .page-btn-hover:hover {
                    background: rgba(0, 98, 255, 0.1) !important;
                    border-color: var(--primary) !important;
                    color: #fff !important;
                }
            `}</style>
        </div>
    );
};

export default RaidRadar;
