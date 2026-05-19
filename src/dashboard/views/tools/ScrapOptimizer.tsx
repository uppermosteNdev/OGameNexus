import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Globe, X, Maximize2, ChevronDown, Rocket, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';

const SHIP_RESOURCES: Record<string, { m: number, c: number, d: number, id: number, icon: string }> = {
    "Small Cargo": { id: 202, m: 2000, c: 2000, d: 0, icon: "icons/ships/small-cargo-large.jpg" },
    "Large Cargo": { id: 203, m: 6000, c: 6000, d: 0, icon: "icons/ships/large-cargo-large.jpg" },
    "Light Fighter": { id: 204, m: 3000, c: 1000, d: 0, icon: "icons/ships/light-fighter-large.jpg" },
    "Heavy Fighter": { id: 205, m: 6000, c: 4000, d: 0, icon: "icons/ships/heavy-fighter-large.jpg" },
    "Cruiser": { id: 206, m: 20000, c: 7000, d: 2000, icon: "icons/ships/cruiser-large.jpg" },
    "Battleship": { id: 207, m: 45000, c: 15000, d: 0, icon: "icons/ships/battleship-large.jpg" },
    "Colony Ship": { id: 208, m: 10000, c: 20000, d: 10000, icon: "icons/ships/colony-ship-large.jpg" },
    "Recycler": { id: 209, m: 10000, c: 6000, d: 2000, icon: "icons/ships/recycler-large.jpg" },
    "Espionage Probe": { id: 210, m: 0, c: 1000, d: 0, icon: "icons/ships/espionage-probe-large.jpg" },
    "Bomber": { id: 211, m: 50000, c: 25000, d: 15000, icon: "icons/ships/bomber-large.jpg" },
    "Destroyer": { id: 213, m: 60000, c: 50000, d: 15000, icon: "icons/ships/destroyer-large.jpg" },
    "Deathstar": { id: 214, m: 5000000, c: 4000000, d: 1000000, icon: "icons/ships/deathstar-large.jpg" },
    "Battlecruiser": { id: 215, m: 30000, c: 40000, d: 15000, icon: "icons/ships/battlecruiser-large.jpg" },
    "Reaper": { id: 218, m: 85000, c: 55000, d: 20000, icon: "icons/ships/reaper-large.jpg" },
    "Pathfinder": { id: 219, m: 8000, c: 15000, d: 8000, icon: "icons/ships/pathfinder-large.jpg" }
};

const DEFENCE_RESOURCES: Record<string, { m: number, c: number, d: number, id: number, icon: string }> = {
    "Rocket Launcher": { id: 401, m: 2000, c: 0, d: 0, icon: "icons/ships/rocket-launcher-large.jpg" },
    "Light Laser": { id: 402, m: 1500, c: 500, d: 0, icon: "icons/ships/light-laser-large.jpg" },
    "Heavy Laser": { id: 403, m: 6000, c: 2000, d: 0, icon: "icons/ships/heavy-laser-large.jpg" },
    "Gauss Cannon": { id: 404, m: 20000, c: 15000, d: 2000, icon: "icons/ships/gauss-cannon-large.jpg" },
    "Ion Cannon": { id: 405, m: 5000, c: 3000, d: 0, icon: "icons/ships/ion-cannon-large.jpg" },
    "Plasma Turret": { id: 406, m: 30000, c: 50000, d: 30000, icon: "icons/ships/plasma-turret-large.jpg" },
    "Small Shield Dome": { id: 407, m: 10000, c: 10000, d: 0, icon: "icons/ships/small-shield-dome-large.jpg" },
    "Large Shield Dome": { id: 408, m: 50000, c: 50000, d: 0, icon: "icons/ships/large-shield-dome-large.jpg" }
};

const ScrapOptimizer: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const allLocations = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const planetsOnly = allLocations.filter(p => p.type === 'planet');

    const accountTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        Object.keys(SHIP_RESOURCES).forEach(name => {
            const shipId = SHIP_RESOURCES[name].id;
            let sum = 0;
            allLocations.forEach(loc => {
                if (loc.ships && loc.ships[shipId]) {
                    sum += loc.ships[shipId];
                }
            });
            totals[name] = sum;
        });
        return totals;
    }, [allLocations]);

    const [scrapPercent, setScrapPercent] = useState(35);
    const [limits, setLimits] = useState({ m: 0, c: 0, d: 0 });
    const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
    const [priorities, setPriorities] = useState({ m: true, c: true, d: true });
    const [fleet, setFleet] = useState<Record<string, number>>(
        {
            ...Object.keys(SHIP_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
            ...Object.keys(DEFENCE_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {})
        }
    );
    const [results, setResults] = useState<{ ships: Record<string, number>, totals: { m: number, c: number, d: number } } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handlePlanetSelect = (planetId: string) => {
        setIsDropdownOpen(false);
        setSelectedPlanetId(planetId);
        const planet = planetsOnly.find(p => p.id === planetId);
        if (planet) {
            setLimits({
                m: planet.metalCapacity || 0,
                c: planet.crystalCapacity || 0,
                d: planet.deuteriumCapacity || 0
            });
        }
    };

    const syncCapacities = async () => {
        if (!activePlanet || isSyncing) return;
        setIsSyncing(true);
        try {
            chrome.runtime.sendMessage({
                type: "FETCH_LATEST_CAPACITIES",
                planetId: activePlanet.id
            }, (response) => {
                if (response?.success) {
                    // Success!
                }
                setIsSyncing(false);
            });
        } catch (e) {
            console.error("Failed to sync capacities", e);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let globalScrapPercent = 35;
        try {
            const globalSettings = localStorage.getItem('og-nexus-global-settings');
            if (globalSettings) {
                const parsed = JSON.parse(globalSettings);
                if (parsed.defaultScrapPercent) globalScrapPercent = parsed.defaultScrapPercent;
            }
        } catch (e) {
            console.error(e);
        }

        const saved = localStorage.getItem('og-nexus-scrap-optimizer');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setScrapPercent(data.scrapPercent || globalScrapPercent);
                setLimits(data.limits || { m: 0, c: 0, d: 0 });
                setPriorities(data.priorities || { m: true, c: true, d: true });
                setFleet(data.fleet || {});
                setSelectedPlanetId(data.selectedPlanetId || null);
            } catch (e) {
                console.error("Failed to load scrap optimizer profile", e);
            }
        } else {
            setScrapPercent(globalScrapPercent);
        }
    }, []);

    useEffect(() => {
        if (selectedPlanetId && planetsOnly.length > 0) {
            const planet = planetsOnly.find(p => p.id === selectedPlanetId);
            if (planet) {
                const newLimits = {
                    m: planet.metalCapacity || 0,
                    c: planet.crystalCapacity || 0,
                    d: planet.deuteriumCapacity || 0
                };
                if (newLimits.m !== limits.m || newLimits.c !== limits.c || newLimits.d !== limits.d) {
                    setLimits(newLimits);
                }
            }
        }
    }, [planetsOnly, selectedPlanetId]);

    useEffect(() => {
        if (!selectedPlanetId && planetsOnly.length > 0 && (limits.m > 0 || limits.c > 0 || limits.d > 0)) {
            const matched = planetsOnly.find(p =>
                p.metalCapacity === limits.m &&
                p.crystalCapacity === limits.c &&
                p.deuteriumCapacity === limits.d
            );
            if (matched) {
                setSelectedPlanetId(matched.id);
            }
        }
    }, [planetsOnly, limits, selectedPlanetId]);

    useEffect(() => {
        const data = { scrapPercent, limits, priorities, fleet, selectedPlanetId };
        localStorage.setItem('og-nexus-scrap-optimizer', JSON.stringify(data));
    }, [scrapPercent, limits, priorities, fleet, selectedPlanetId]);

    useEffect(() => {
        if (!allLocations || allLocations.length === 0) return;

        setFleet(prev => {
            let changed = false;
            const updated = { ...prev };
            Object.keys(SHIP_RESOURCES).forEach(name => {
                const max = accountTotals[name] || 0;
                if (updated[name] > max) {
                    updated[name] = max;
                    changed = true;
                }
            });
            return changed ? updated : prev;
        });
    }, [accountTotals, allLocations]);

    useEffect(() => {
        const ratio = scrapPercent / 100;
        const ALL_RESOURCES = { ...SHIP_RESOURCES, ...DEFENCE_RESOURCES };
        const items = Object.keys(ALL_RESOURCES).map(name => {
            const data = ALL_RESOURCES[name];
            const mReturn = data.m * ratio;
            const cReturn = data.c * ratio;
            const dReturn = data.d * ratio;

            let targetValue = 0;
            let nonTargetValue = 1;

            if (priorities.m) targetValue += mReturn; else nonTargetValue += mReturn;
            if (priorities.c) targetValue += cReturn; else nonTargetValue += cReturn;
            if (priorities.d) targetValue += dReturn; else nonTargetValue += dReturn;

            return {
                name,
                m: mReturn,
                c: cReturn,
                d: dReturn,
                inventory: fleet[name] || 0,
                efficiency: targetValue / nonTargetValue
            };
        }).sort((a, b) => b.efficiency - a.efficiency);

        let toScrap: Record<string, number> = {};
        let currentTotals = { m: 0, c: 0, d: 0 };

        items.forEach(item => {
            if (item.inventory <= 0) return;
            const maxM = item.m > 0 ? (limits.m - currentTotals.m) / item.m : Infinity;
            const maxC = item.c > 0 ? (limits.c - currentTotals.c) / item.c : Infinity;
            const maxD = item.d > 0 ? (limits.d - currentTotals.d) / item.d : Infinity;
            const count = Math.floor(Math.max(0, Math.min(maxM, maxC, maxD, item.inventory)));

            if (count > 0) {
                toScrap[item.name] = count;
                currentTotals.m += count * item.m;
                currentTotals.c += count * item.c;
                currentTotals.d += count * item.d;
            }
        });

        setResults({ ships: toScrap, totals: currentTotals });
    }, [fleet, limits, scrapPercent, priorities]);

    const handleFleetChange = (name: string, value: string | number, isDefence: boolean = false) => {
        const val = typeof value === 'string' ? (parseInt(value.replace(/\D/g, '')) || 0) : value;
        const max = isDefence ? (defenseTotals[name] || 0) : (accountTotals[name] || 0);
        const safeVal = Math.min(val, max);
        setFleet(prev => ({ ...prev, [name]: safeVal }));
    };

    const handleLimitChange = (key: keyof typeof limits, value: string) => {
        const num = parseInt(value.replace(/\D/g, '')) || 0;
        setLimits(prev => ({ ...prev, [key]: num }));
        setSelectedPlanetId(null);
    };

    const fillAllShips = () => {
        setFleet({ ...accountTotals, ...Object.keys(DEFENCE_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {}) });
    };

    const clearFleet = () => {
        setFleet({
            ...Object.keys(SHIP_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
            ...Object.keys(DEFENCE_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {})
        });
    };

    const togglePriority = (res: keyof typeof priorities) => {
        setPriorities(prev => ({ ...prev, [res]: !prev[res] }));
    };

    const activePlanet = useMemo(() => {
        if (selectedPlanetId) {
            return planetsOnly.find(p => p.id === selectedPlanetId);
        }
        return planetsOnly.find(p => p.metalCapacity === limits.m && p.crystalCapacity === limits.c && p.deuteriumCapacity === limits.d);
    }, [planetsOnly, selectedPlanetId, limits]);

    const getFillPercent = (recovered: number, cap: number) => {
        if (cap <= 0) return 0;
        return Math.min(100, (recovered / cap) * 100);
    };

    const defenseTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        if (!activePlanet) return totals;

        Object.keys(DEFENCE_RESOURCES).forEach(name => {
            const defId = DEFENCE_RESOURCES[name].id;
            totals[name] = activePlanet.defenses?.[defId] || 0;
        });
        return totals;
    }, [activePlanet]);

    return (
        <div className="scrap-optimizer-container">
            <div className="scrap-optimizer-layout">
                <div className="main-deck">
                    <div className="config-grid">
                        <div className="config-card target-planet" ref={dropdownRef}>
                            <label><Globe size={10} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#ff9800' }} /> Scrap Target Planet</label>
                            <div className="custom-select-container" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                <div className="custom-select-trigger">
                                    {activePlanet ? (
                                        <>
                                            <img src={activePlanet.imgUrl} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                                            <span style={{ color: '#ff9800' }}>{activePlanet.name} [{activePlanet.coords}]</span>
                                        </>
                                    ) : (
                                        <span style={{ opacity: 0.5 }}>Choose target...</span>
                                    )}
                                    <ChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                </div>
                                {isDropdownOpen && (
                                    <div className="custom-select-options">
                                        {planetsOnly.map(p => (
                                            <div key={p.id} className="custom-select-option" onClick={(e) => { e.stopPropagation(); handlePlanetSelect(p.id); }}>
                                                <img src={p.imgUrl} style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="" />
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.coords}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="config-card merchant">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Scrap Merchant %</label>
                                {activePlanet && (
                                    <button
                                        className={`btn-sync-caps ${isSyncing ? 'spinning' : ''}`}
                                        onClick={syncCapacities}
                                        title="Sync storage capacities from game"
                                    >
                                        <RefreshCw size={10} />
                                    </button>
                                )}
                            </div>
                            <input
                                type="number"
                                value={scrapPercent}
                                onChange={e => setScrapPercent(parseInt(e.target.value) || 35)}
                                min="35" max="100"
                            />
                        </div>

                        <div className="config-card metal">
                            <div className="config-card-fill" style={{ width: `${getFillPercent(results?.totals.m || 0, limits.m)}%`, background: 'var(--color-metal)' }}></div>
                            <label>Metal Storage Cap</label>
                            <input
                                type="text"
                                value={limits.m.toLocaleString()}
                                onChange={e => handleLimitChange('m', e.target.value)}
                            />
                        </div>
                        <div className="config-card crystal">
                            <div className="config-card-fill" style={{ width: `${getFillPercent(results?.totals.c || 0, limits.c)}%`, background: 'var(--color-crystal)' }}></div>
                            <label>Crystal Storage Cap</label>
                            <input
                                type="text"
                                value={limits.c.toLocaleString()}
                                onChange={e => handleLimitChange('c', e.target.value)}
                            />
                        </div>
                        <div className="config-card deut">
                            <div className="config-card-fill" style={{ width: `${getFillPercent(results?.totals.d || 0, limits.d)}%`, background: 'var(--color-deuterium)' }}></div>
                            <label>Deuterium Storage Cap</label>
                            <input
                                type="text"
                                value={limits.d.toLocaleString()}
                                onChange={e => handleLimitChange('d', e.target.value)}
                            />
                        </div>

                        <div className="action-priority-row">
                            <div className="priority-toggles">
                                <label style={{ fontSize: '0.55rem', opacity: 0.6, fontWeight: 900, textTransform: 'uppercase', marginRight: '8px' }}>Return Priorities</label>
                                <div className={`res-priority-btn ${priorities.m ? 'active m' : 'inactive'}`} onClick={() => togglePriority('m')}>
                                    <img src="icons/resources/metal-icon-medium.jpg" alt="M" />
                                </div>
                                <div className={`res-priority-btn ${priorities.c ? 'active c' : 'inactive'}`} onClick={() => togglePriority('c')}>
                                    <img src="icons/resources/crystal-icon-medium.jpg" alt="C" />
                                </div>
                                <div className={`res-priority-btn ${priorities.d ? 'active d' : 'inactive'}`} onClick={() => togglePriority('d')}>
                                    <img src="icons/resources/deuterium-icon-medium.jpg" alt="D" />
                                </div>
                            </div>

                            <div className="fleet-action-group">
                                <button className="btn-fleet-tool" onClick={fillAllShips}>
                                    <Rocket size={12} /> All Ships
                                </button>
                                <button className="btn-fleet-tool danger" onClick={clearFleet}>
                                    <Trash2 size={12} /> Clear Fleet
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ margin: '30px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)' }}>Ships on Empire</span>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.1))' }}></div>
                    </div>

                    <div className="ship-grid">
                        {Object.entries(SHIP_RESOURCES).map(([name, data]) => {
                            const maxCount = accountTotals[name] || 0;
                            const curValue = fleet[name] || 0;

                            return (
                                <div key={name} className="ship-pill">
                                    <div className="ship-pill-top">
                                        <div className="ship-pill-info">
                                            <img src={data.icon} className="ship-pill-icon" alt="" />
                                            <div className="ship-pill-name-wrap">
                                                <span className="ship-pill-name">{name}</span>
                                                <span className="ship-pill-owned">Owned: {maxCount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="ship-pill-input-wrap">
                                            <input
                                                type="text"
                                                value={curValue.toLocaleString()}
                                                onChange={e => handleFleetChange(name, e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="ship-pill-controls">
                                        <input
                                            type="range"
                                            className="ship-pill-slider"
                                            min="0" max={maxCount} value={curValue}
                                            onChange={e => handleFleetChange(name, parseInt(e.target.value))}
                                        />
                                        <div className="ship-pill-btns">
                                            <button className="btn-pill-action clear" onClick={() => handleFleetChange(name, 0)}>0</button>
                                            <button className="btn-pill-action" onClick={() => handleFleetChange(name, maxCount)}>MAX</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ margin: '30px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)' }}>Defence on Target {activeAccount && activePlanet ? `[${activePlanet.coords}]` : ''}</span>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.1))' }}></div>
                    </div>

                    <div className="ship-grid" style={{ opacity: activePlanet ? 1 : 0.4 }}>
                        {Object.entries(DEFENCE_RESOURCES).map(([name, data]) => {
                            const maxCount = defenseTotals[name] || 0;
                            const curValue = fleet[name] || 0;

                            return (
                                <div key={name} className="ship-pill" style={{ borderColor: 'rgba(255, 152, 0, 0.1)' }}>
                                    <div className="ship-pill-top">
                                        <div className="ship-pill-info">
                                            <img src={data.icon} className="ship-pill-icon" alt="" />
                                            <div className="ship-pill-name-wrap">
                                                <span className="ship-pill-name">{name}</span>
                                                <span className="ship-pill-owned">Available: {maxCount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="ship-pill-input-wrap">
                                            <input
                                                type="text"
                                                value={curValue.toLocaleString()}
                                                onChange={e => handleFleetChange(name, e.target.value, true)}
                                                disabled={!activePlanet}
                                            />
                                        </div>
                                    </div>

                                    <div className="ship-pill-controls">
                                        <input
                                            type="range"
                                            className="ship-pill-slider"
                                            min="0" max={maxCount} value={curValue}
                                            onChange={e => handleFleetChange(name, parseInt(e.target.value), true)}
                                            disabled={!activePlanet}
                                        />
                                        <div className="ship-pill-btns">
                                            <button className="btn-pill-action clear" onClick={() => handleFleetChange(name, 0, true)} disabled={!activePlanet}>0</button>
                                            <button className="btn-pill-action" onClick={() => handleFleetChange(name, maxCount, true)} disabled={!activePlanet}>MAX</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <aside className="results-sidebar">
                    <div className="sidebar-title">
                        <Maximize2 size={16} /> Ships to be scrapped
                    </div>

                    <div className="scrapped-ships-list">
                        {results && Object.keys(results.ships).length > 0 ? (
                            Object.entries(results.ships).map(([name, count]) => (
                                <div key={name} className="scrapped-ship-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <img src={SHIP_RESOURCES[name]?.icon || DEFENCE_RESOURCES[name]?.icon} alt="" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{name}</span>
                                    </div>
                                    <b style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{count.toLocaleString()}</b>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3, border: '1px dashed' }}>
                                <X size={24} style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '0.7rem' }}>No logistics data.</div>
                            </div>
                        )}
                    </div>

                    <div className="res-summary-box">
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-metal)' }}>
                            <span>Metal Recovery</span>
                            <b style={{ color: 'var(--color-metal)' }}>{results ? Math.floor(results.totals.m).toLocaleString() : '0'}</b>
                        </div>
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-crystal)' }}>
                            <span>Crystal Recovery</span>
                            <b style={{ color: 'var(--color-crystal)' }}>{results ? Math.floor(results.totals.c).toLocaleString() : '0'}</b>
                        </div>
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-deuterium)' }}>
                            <span>Deuterium Recovery</span>
                            <b style={{ color: 'var(--color-deuterium)' }}>{results ? Math.floor(results.totals.d).toLocaleString() : '0'}</b>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ScrapOptimizer;
