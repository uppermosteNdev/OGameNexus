import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crosshair,
    RotateCcw,
    Play,
    SlidersHorizontal,
    Globe,
    Plus,
    Trash2,
    Flame,
    Coins
} from 'lucide-react';
import { db } from '../../../../db';
import {
    FleetParty,
    ServerSettings,
    SimulationAggregateResult,
    ParsedScenario,
    IpmStrikeResult
} from './types';
import {
    UNITS,
    CIVIL_SHIP_IDS,
    WAR_SHIP_IDS,
    DEFENSE_IDS,
    DEFAULT_SERVER_SETTINGS,
    DEFAULT_ATTACKER_PARTY,
    DEFAULT_DEFENDER_PARTY
} from './constants';
import { NexuSimEngine } from './engine';
import './NexuSim.css';

// Thumbnail mapping for ships & defense structures
const UNIT_ICONS: Record<number, string> = {
    202: 'icons/ships/small-cargo-large.jpg',
    203: 'icons/ships/large-cargo-large.jpg',
    204: 'icons/ships/light-fighter-large.jpg',
    205: 'icons/ships/heavy-fighter-large.jpg',
    206: 'icons/ships/cruiser-large.jpg',
    207: 'icons/ships/battleship-large.jpg',
    208: 'icons/ships/colony-ship-large.jpg',
    209: 'icons/ships/recycler-large.jpg',
    210: 'icons/ships/espionage-probe-large.jpg',
    211: 'icons/ships/bomber-large.jpg',
    212: 'icons/ships/solar-satellite-large.jpg',
    213: 'icons/ships/destroyer-large.jpg',
    214: 'icons/ships/deathstar-large.jpg',
    215: 'icons/ships/battlecruiser-large.jpg',
    217: 'icons/ships/crawler-large.jpg',
    218: 'icons/ships/reaper-large.jpg',
    219: 'icons/ships/pathfinder-large.jpg',
    401: 'icons/ships/rocket-launcher-large.jpg',
    402: 'icons/ships/light-laser-large.jpg',
    403: 'icons/ships/heavy-laser-large.jpg',
    404: 'icons/ships/gauss-cannon-large.jpg',
    405: 'icons/ships/ion-cannon-large.jpg',
    406: 'icons/ships/plasma-turret-large.jpg',
    407: 'icons/ships/small-shield-dome-large.jpg',
    408: 'icons/ships/large-shield-dome-large.jpg',
    502: 'icons/ships/anti-ballistic-missiles-large.jpg',
    503: 'icons/ships/interplanetary-missiles-large.jpg'
};

export const NexuSim: React.FC = () => {
    // 1. Dexie DB queries
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const playerPlanets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const spiedPlanets = useLiveQuery(() => db.spiedPlanets.toArray()) || [];

    // 2. Server Settings State
    const [serverSettings, setServerSettings] = useState<ServerSettings>(DEFAULT_SERVER_SETTINGS);

    useEffect(() => {
        if (!activeAccount) return;
        setServerSettings(prev => ({
            ...prev,
            universeSpeedWar: activeAccount.speedFleetWar || activeAccount.universeSpeed || prev.universeSpeedWar,
            galaxies: activeAccount.galaxies || prev.galaxies,
            systems: activeAccount.systems || prev.systems,
            donutGalaxy: activeAccount.donutGalaxy !== undefined ? Boolean(activeAccount.donutGalaxy) : prev.donutGalaxy,
            donutSystem: activeAccount.donutSystem !== undefined ? Boolean(activeAccount.donutSystem) : prev.donutSystem
        }));
    }, [activeAccount]);

    // 3. Attackers & Defenders Parties (ACS Support)
    const [attackers, setAttackers] = useState<FleetParty[]>([JSON.parse(JSON.stringify(DEFAULT_ATTACKER_PARTY))]);
    const [defenders, setDefenders] = useState<FleetParty[]>([JSON.parse(JSON.stringify(DEFAULT_DEFENDER_PARTY))]);
    const [activeAtkTab, setActiveAtkTab] = useState<number>(0);
    const [activeDefTab, setActiveDefTab] = useState<number>(0);

    // Auto-sync primary attacker research with player account
    useEffect(() => {
        if (!activeAccount?.researches || attackers.length === 0) return;
        const resMap: Record<number, number> = {};
        activeAccount.researches.forEach(r => { resMap[r.id] = r.level; });

        setAttackers(prev => {
            const next = [...prev];
            next[0] = {
                ...next[0],
                playerClass: activeAccount.playerClass || next[0].playerClass,
                allianceClass: activeAccount.allianceClass || next[0].allianceClass,
                engineer: Boolean(activeAccount.hasEngineer),
                techs: {
                    weapons: resMap[109] ?? next[0].techs.weapons,
                    shielding: resMap[110] ?? next[0].techs.shielding,
                    armour: resMap[111] ?? next[0].techs.armour,
                    combustion: resMap[115] ?? next[0].techs.combustion,
                    impulse: resMap[117] ?? next[0].techs.impulse,
                    hyperspace: resMap[118] ?? next[0].techs.hyperspace,
                    hyperspaceTech: resMap[114] ?? next[0].techs.hyperspaceTech
                }
            };
            return next;
        });
    }, [activeAccount]);

    // 4. Target Planetary Resources & Plunder
    const [targetResources, setTargetResources] = useState<{ metal: number; crystal: number; deuterium: number }>({
        metal: 10000000,
        crystal: 5000000,
        deuterium: 2000000
    });
    const [plunderRate, setPlunderRate] = useState<number>(50);

    // 5. IPM Pre-Strike Subsystem State
    const [ipmLaunched, setIpmLaunched] = useState<number>(0);
    const [ipmPrimaryTarget, setIpmPrimaryTarget] = useState<number>(406); // Plasma Turret default
    const [ipmResult, setIpmResult] = useState<IpmStrikeResult | null>(null);

    // 6. Simulation Execution State
    const [simIterations, setSimIterations] = useState<number>(100);
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    const [results, setResults] = useState<SimulationAggregateResult | null>(null);
    const [selectedScenarioKey, setSelectedScenarioKey] = useState<'average' | 'bestCase' | 'worstCase' | 'maxDebris'>('average');

    // 7. Lifeforms Overrides Modal State
    const [editingLfParty, setEditingLfParty] = useState<{ side: 'atk' | 'def'; index: number } | null>(null);

    const activeScenario: ParsedScenario | null = useMemo(() => {
        if (!results) return null;
        return results.scenarios[selectedScenarioKey];
    }, [results, selectedScenarioKey]);

    // Auto-fill from player planets
    const handleSelectOwnPlanet = (planetId: string) => {
        const planet = playerPlanets.find(p => p.id === planetId);
        if (!planet) return;

        const coordsParts = (planet.coords || '').split(':').map(Number);
        const parsedCoords = {
            galaxy: coordsParts[0] || 1,
            system: coordsParts[1] || 1,
            position: coordsParts[2] || 1
        };

        const importedUnits: Record<number, number> = {};
        if (planet.ships) {
            for (const [idStr, count] of Object.entries(planet.ships)) {
                importedUnits[parseInt(idStr)] = count;
            }
        }

        setAttackers(prev => {
            const next = [...prev];
            next[activeAtkTab] = {
                ...next[activeAtkTab],
                name: `${planet.name || 'Planet'} (${planet.coords})`,
                coords: parsedCoords,
                spaceDock: planet.spaceDock || next[activeAtkTab].spaceDock,
                units: importedUnits
            };
            return next;
        });
    };

    // Auto-fill from spy reports
    const handleSelectSpyReport = (planetKey: string) => {
        const spied = spiedPlanets.find(s => s.planetKey === planetKey);
        if (!spied) return;

        const coordsParts = (spied.coords || '').split(':').map(Number);
        const parsedCoords = {
            galaxy: coordsParts[0] || 1,
            system: coordsParts[1] || 1,
            position: coordsParts[2] || 1
        };

        setDefenders(prev => {
            const next = [...prev];
            next[activeDefTab] = {
                ...next[activeDefTab],
                name: `${spied.playerName || 'Defender'} (${spied.coords})`,
                coords: parsedCoords
            };
            return next;
        });

        setTargetResources({
            metal: spied.lastSpiedMetal || 0,
            crystal: spied.lastSpiedCrystal || 0,
            deuterium: spied.lastSpiedDeuterium || 0
        });

        if (spied.lootPercentage) {
            setPlunderRate(spied.lootPercentage);
        }
    };

    // Run Combat Simulation
    const handleRunSimulation = () => {
        setIsSimulating(true);

        setTimeout(() => {
            const startTime = performance.now();
            const rawRuns = NexuSimEngine.runSimulations(
                attackers,
                defenders,
                serverSettings,
                simIterations
            );
            const execTime = performance.now() - startTime;

            const processed = NexuSimEngine.processSimulationResults(
                rawRuns,
                attackers,
                defenders,
                serverSettings,
                targetResources,
                plunderRate,
                execTime
            );

            setResults(processed);
            setIsSimulating(false);
        }, 30);
    };

    // IPM Strike Calculations
    const handleCalculateIpm = () => {
        const primaryDef = defenders[0];
        const primaryAtk = attackers[0];
        const res = NexuSimEngine.calculateIpmStrike(
            ipmLaunched,
            ipmPrimaryTarget,
            primaryDef.units,
            { armour: primaryDef.techs.armour },
            { weapons: primaryAtk.techs.weapons }
        );
        setIpmResult(res);
    };

    const handleApplyIpmToDefender = () => {
        if (!ipmResult) return;
        setDefenders(prev => {
            const next = [...prev];
            next[0] = {
                ...next[0],
                units: { ...ipmResult.remainingDefenses }
            };
            return next;
        });
        setIpmResult(null);
        setIpmLaunched(0);
    };

    const updateUnit = (side: 'atk' | 'def', partyIdx: number, unitId: number, count: number) => {
        const sanitized = Math.max(0, isNaN(count) ? 0 : Math.floor(count));
        if (side === 'atk') {
            setAttackers(prev => {
                const next = [...prev];
                const u = { ...next[partyIdx].units };
                if (sanitized === 0) delete u[unitId];
                else u[unitId] = sanitized;
                next[partyIdx] = { ...next[partyIdx], units: u };
                return next;
            });
        } else {
            setDefenders(prev => {
                const next = [...prev];
                const u = { ...next[partyIdx].units };
                if (sanitized === 0) delete u[unitId];
                else u[unitId] = sanitized;
                next[partyIdx] = { ...next[partyIdx], units: u };
                return next;
            });
        }
    };

    const clearPartyUnits = (side: 'atk' | 'def', partyIdx: number) => {
        if (side === 'atk') {
            setAttackers(prev => {
                const next = [...prev];
                next[partyIdx] = { ...next[partyIdx], units: {} };
                return next;
            });
        } else {
            setDefenders(prev => {
                const next = [...prev];
                next[partyIdx] = { ...next[partyIdx], units: {} };
                return next;
            });
        }
    };

    const addParticipant = (side: 'atk' | 'def') => {
        if (side === 'atk') {
            if (attackers.length >= 16) return;
            const newId = attackers.length;
            const clone = JSON.parse(JSON.stringify(attackers[0]));
            clone.id = newId;
            clone.name = `Attacker ${newId + 1}`;
            clone.units = {};
            setAttackers(prev => [...prev, clone]);
            setActiveAtkTab(newId);
        } else {
            const newId = defenders.length;
            const clone = JSON.parse(JSON.stringify(defenders[0]));
            clone.id = newId;
            clone.name = `Defender ${newId + 1}`;
            clone.units = {};
            setDefenders(prev => [...prev, clone]);
            setActiveDefTab(newId);
        }
    };

    const removeParticipant = (side: 'atk' | 'def', index: number) => {
        if (side === 'atk') {
            if (attackers.length <= 1) return;
            setAttackers(prev => prev.filter((_, i) => i !== index));
            setActiveAtkTab(Math.max(0, index - 1));
        } else {
            if (defenders.length <= 1) return;
            setDefenders(prev => prev.filter((_, i) => i !== index));
            setActiveDefTab(Math.max(0, index - 1));
        }
    };

    const currentAtk = attackers[activeAtkTab] || attackers[0];
    const currentDef = defenders[activeDefTab] || defenders[0];

    return (
        <div className="nexusim-container">
            {/* 1. HERO BANNER */}
            <header className="nexusim-hero">
                <div className="nexusim-hero-badge">
                    <Crosshair size={14} />
                    Combat Simulator
                </div>
                <h1 className="nexusim-hero-title">
                    Nexus Battlesim
                </h1>
                <p className="nexusim-hero-subtitle">
                    Simulate battles with Lifeforms, ACS fleets, debris fields, and Space Dock repair.
                </p>

                {/* Quick Action Bar */}
                <div className="nexusim-quick-toolbar">
                    {playerPlanets.length > 0 && (
                        <select
                            onChange={(e) => handleSelectOwnPlanet(e.target.value)}
                            defaultValue=""
                            className="nexusim-select"
                        >
                            <option value="" disabled>Load My Fleet...</option>
                            {playerPlanets.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} [{p.coords}] ({p.type})
                                </option>
                            ))}
                        </select>
                    )}

                    {spiedPlanets.length > 0 && (
                        <select
                            onChange={(e) => handleSelectSpyReport(e.target.value)}
                            defaultValue=""
                            className="nexusim-select"
                        >
                            <option value="" disabled>Load Spy Report...</option>
                            {spiedPlanets.map(s => (
                                <option key={s.planetKey} value={s.planetKey}>
                                    {s.playerName} [{s.coords}]
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={() => {
                            clearPartyUnits('atk', activeAtkTab);
                            clearPartyUnits('def', activeDefTab);
                        }}
                        className="nexusim-btn-secondary"
                    >
                        <RotateCcw size={14} />
                        Clear Ships
                    </button>
                </div>
            </header>

            {/* 2. EXECUTION / RUNNER BAR */}
            <div className="nexusim-runner-bar">
                <div className="nexusim-iterations-wrap">
                    <span className="nexusim-iter-label">Simulations</span>
                    <div className="nexusim-iter-group">
                        {[10, 50, 100, 500, 1000].map(count => (
                            <button
                                key={count}
                                onClick={() => setSimIterations(count)}
                                className={`nexusim-iter-btn ${simIterations === count ? 'active' : ''}`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="nexusim-runner-actions">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="nexusim-btn-simulate"
                    >
                        {isSimulating ? (
                            <>
                                <RotateCcw size={16} className="animate-spin" />
                                Simulating...
                            </>
                        ) : (
                            <>
                                <Play size={16} />
                                Simulate Battle
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 3. DUEL MATRIX (ATTACKERS VS DEFENDERS) */}
            <div className="nexusim-duel-layout">
                {/* ATTACKERS COLUMN */}
                <div className="nexusim-faction-card attacker">
                    <div>
                        {/* Tabs */}
                        <div className="nexusim-tabs-header">
                            <div className="nexusim-tabs-list">
                                <span className="nexusim-faction-title attacker">Attackers</span>
                                {attackers.map((atk, idx) => (
                                    <button
                                        key={atk.id}
                                        onClick={() => setActiveAtkTab(idx)}
                                        className={`nexusim-tab-pill ${activeAtkTab === idx ? 'active attacker' : ''}`}
                                    >
                                        {atk.name}
                                    </button>
                                ))}
                                {attackers.length < 16 && (
                                    <button
                                        onClick={() => addParticipant('atk')}
                                        title="Add Attacker"
                                        className="nexusim-add-btn"
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>

                            {attackers.length > 1 && (
                                <button
                                    onClick={() => removeParticipant('atk', activeAtkTab)}
                                    title="Remove Attacker"
                                    className="nexusim-remove-btn"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Research Bar */}
                        <div className="nexusim-meta-grid">
                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Class</label>
                                <select
                                    value={currentAtk.playerClass}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setAttackers(prev => {
                                            const next = [...prev];
                                            next[activeAtkTab] = { ...next[activeAtkTab], playerClass: val };
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                >
                                    <option value={0}>None</option>
                                    <option value={1}>Collector</option>
                                    <option value={2}>General</option>
                                    <option value={3}>Discoverer</option>
                                </select>
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Weapons</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentAtk.techs.weapons}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setAttackers(prev => {
                                            const next = [...prev];
                                            next[activeAtkTab].techs.weapons = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Shielding</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentAtk.techs.shielding}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setAttackers(prev => {
                                            const next = [...prev];
                                            next[activeAtkTab].techs.shielding = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Armour</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentAtk.techs.armour}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setAttackers(prev => {
                                            const next = [...prev];
                                            next[activeAtkTab].techs.armour = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>
                        </div>

                        {/* War Ships */}
                        <div className="nexusim-roster-group">
                            <div className="nexusim-roster-title">Warships</div>
                            <div className="nexusim-unit-grid">
                                {WAR_SHIP_IDS.map(id => {
                                    const unit = UNITS[id];
                                    const count = currentAtk.units[id] || 0;
                                    return (
                                        <div key={id} className="nexusim-unit-pill">
                                            <div className="nexusim-unit-info">
                                                <img src={UNIT_ICONS[id]} alt={unit.name} className="nexusim-unit-thumb" />
                                                <span className="nexusim-unit-name">{unit.name}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('atk', activeAtkTab, id, parseInt(e.target.value))}
                                                className="nexusim-unit-input attacker"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Civil Ships */}
                        <div className="nexusim-roster-group">
                            <div className="nexusim-roster-title">Civil Ships</div>
                            <div className="nexusim-unit-grid">
                                {CIVIL_SHIP_IDS.map(id => {
                                    const unit = UNITS[id];
                                    const count = currentAtk.units[id] || 0;
                                    return (
                                        <div key={id} className="nexusim-unit-pill">
                                            <div className="nexusim-unit-info">
                                                <img src={UNIT_ICONS[id]} alt={unit.name} className="nexusim-unit-thumb" />
                                                <span className="nexusim-unit-name">{unit.name}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('atk', activeAtkTab, id, parseInt(e.target.value))}
                                                className="nexusim-unit-input attacker"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="nexusim-faction-footer">
                        <button
                            onClick={() => setEditingLfParty({ side: 'atk', index: activeAtkTab })}
                            className="nexusim-lf-link"
                        >
                            <SlidersHorizontal size={13} />
                            Lifeform Bonuses
                        </button>
                        <span>
                            Total Ships:{' '}
                            <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
                                {Object.values(currentAtk.units).reduce((a, b) => a + b, 0).toLocaleString()}
                            </strong>
                        </span>
                    </div>
                </div>

                {/* DEFENDERS COLUMN */}
                <div className="nexusim-faction-card defender">
                    <div>
                        {/* Tabs */}
                        <div className="nexusim-tabs-header">
                            <div className="nexusim-tabs-list">
                                <span className="nexusim-faction-title defender">Defenders</span>
                                {defenders.map((def, idx) => (
                                    <button
                                        key={def.id}
                                        onClick={() => setActiveDefTab(idx)}
                                        className={`nexusim-tab-pill ${activeDefTab === idx ? 'active defender' : ''}`}
                                    >
                                        {def.name}
                                    </button>
                                ))}
                                {defenders.length < 16 && (
                                    <button
                                        onClick={() => addParticipant('def')}
                                        title="Add Defender"
                                        className="nexusim-add-btn"
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>

                            {defenders.length > 1 && (
                                <button
                                    onClick={() => removeParticipant('def', activeDefTab)}
                                    title="Remove Defender"
                                    className="nexusim-remove-btn"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {/* Research Bar */}
                        <div className="nexusim-meta-grid">
                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Space Dock</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentDef.spaceDock}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setDefenders(prev => {
                                            const next = [...prev];
                                            next[activeDefTab].spaceDock = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Weapons</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentDef.techs.weapons}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setDefenders(prev => {
                                            const next = [...prev];
                                            next[activeDefTab].techs.weapons = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Shielding</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentDef.techs.shielding}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setDefenders(prev => {
                                            const next = [...prev];
                                            next[activeDefTab].techs.shielding = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>

                            <div className="nexusim-meta-cell">
                                <label className="nexusim-meta-label">Armour</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={currentDef.techs.armour}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setDefenders(prev => {
                                            const next = [...prev];
                                            next[activeDefTab].techs.armour = val;
                                            return next;
                                        });
                                    }}
                                    className="nexusim-input-meta"
                                />
                            </div>
                        </div>

                        {/* Defenses */}
                        <div className="nexusim-roster-group">
                            <div className="nexusim-roster-title">Defenses</div>
                            <div className="nexusim-unit-grid">
                                {DEFENSE_IDS.map(id => {
                                    const unit = UNITS[id];
                                    const count = currentDef.units[id] || 0;
                                    return (
                                        <div key={id} className="nexusim-unit-pill">
                                            <div className="nexusim-unit-info">
                                                <img src={UNIT_ICONS[id]} alt={unit.name} className="nexusim-unit-thumb" />
                                                <span className="nexusim-unit-name">{unit.name}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('def', activeDefTab, id, parseInt(e.target.value))}
                                                className="nexusim-unit-input defender"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grounded Fleet */}
                        <div className="nexusim-roster-group">
                            <div className="nexusim-roster-title">Ships</div>
                            <div className="nexusim-unit-grid">
                                {[...WAR_SHIP_IDS, ...CIVIL_SHIP_IDS].slice(0, 8).map(id => {
                                    const unit = UNITS[id];
                                    const count = currentDef.units[id] || 0;
                                    return (
                                        <div key={id} className="nexusim-unit-pill">
                                            <div className="nexusim-unit-info">
                                                <img src={UNIT_ICONS[id]} alt={unit.name} className="nexusim-unit-thumb" />
                                                <span className="nexusim-unit-name">{unit.name}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('def', activeDefTab, id, parseInt(e.target.value))}
                                                className="nexusim-unit-input defender"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="nexusim-faction-footer">
                        <button
                            onClick={() => setEditingLfParty({ side: 'def', index: activeDefTab })}
                            className="nexusim-lf-link"
                            style={{ color: '#f59e0b' }}
                        >
                            <SlidersHorizontal size={13} />
                            Lifeform Bonuses
                        </button>
                        <span>
                            Total Units:{' '}
                            <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
                                {Object.values(currentDef.units).reduce((a, b) => a + b, 0).toLocaleString()}
                            </strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. TRI-GRID: ENVIRONMENT, PLUNDER, IPM */}
            <div className="nexusim-tri-grid">
                {/* Panel 1: Environment */}
                <div className="nexusim-panel">
                    <div>
                        <div className="nexusim-panel-header">
                            <Globe size={16} color="var(--primary)" />
                            <span className="nexusim-panel-title">Server Settings</span>
                        </div>

                        <div className="nexusim-setting-row">
                            <span>Fleet Speed (War)</span>
                            <div className="nexusim-pill-group">
                                {[1, 2, 4, 6, 8].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setServerSettings(prev => ({ ...prev, universeSpeedWar: s }))}
                                        className={`nexusim-pill-btn ${serverSettings.universeSpeedWar === s ? 'active' : ''}`}
                                    >
                                        {s}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="nexusim-setting-row">
                            <span>Fleet into Debris</span>
                            <div className="nexusim-pill-group">
                                {[0.3, 0.5, 0.7, 0.8].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setServerSettings(prev => ({ ...prev, debrisFactor: d }))}
                                        className={`nexusim-pill-btn ${serverSettings.debrisFactor === d ? 'active' : ''}`}
                                    >
                                        {Math.round(d * 100)}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="nexusim-setting-row">
                            <span>Defense into Debris</span>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                value={Math.round(serverSettings.debrisFactorDef * 100)}
                                onChange={(e) => {
                                    const val = (parseInt(e.target.value) || 0) / 100;
                                    setServerSettings(prev => ({ ...prev, debrisFactorDef: Math.min(0.5, Math.max(0, val)) }));
                                }}
                                style={{ width: '60px', textAlign: 'right', background: '#03060d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '3px 6px' }}
                            />
                        </div>

                        <div className="nexusim-setting-row" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span>Deuterium in Debris</span>
                            <input
                                type="checkbox"
                                checked={serverSettings.deuteriumInDebris}
                                onChange={(e) => setServerSettings(prev => ({ ...prev, deuteriumInDebris: e.target.checked }))}
                            />
                        </div>

                        <div className="nexusim-setting-row">
                            <span>Lifeforms Enabled</span>
                            <input
                                type="checkbox"
                                checked={serverSettings.lifeforms}
                                onChange={(e) => setServerSettings(prev => ({ ...prev, lifeforms: e.target.checked }))}
                            />
                        </div>

                        <div className="nexusim-setting-row">
                            <span>Rapid Fire Enabled</span>
                            <input
                                type="checkbox"
                                checked={serverSettings.rapidFire}
                                onChange={(e) => setServerSettings(prev => ({ ...prev, rapidFire: e.target.checked }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Panel 2: Target Plunder */}
                <div className="nexusim-panel">
                    <div>
                        <div className="nexusim-panel-header">
                            <Coins size={16} color="#f59e0b" />
                            <span className="nexusim-panel-title">Target Resources & Loot</span>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                                Metal
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={targetResources.metal}
                                onChange={(e) => setTargetResources(prev => ({ ...prev, metal: Math.max(0, parseInt(e.target.value) || 0) }))}
                                className="nexusim-input-text"
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                                Crystal
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={targetResources.crystal}
                                onChange={(e) => setTargetResources(prev => ({ ...prev, crystal: Math.max(0, parseInt(e.target.value) || 0) }))}
                                className="nexusim-input-text"
                            />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                                Deuterium
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={targetResources.deuterium}
                                onChange={(e) => setTargetResources(prev => ({ ...prev, deuterium: Math.max(0, parseInt(e.target.value) || 0) }))}
                                className="nexusim-input-text"
                            />
                        </div>

                        <div className="nexusim-setting-row" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontWeight: 700 }}>Loot Percentage</span>
                            <div className="nexusim-pill-group">
                                {[50, 75, 100].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setPlunderRate(r)}
                                        className={`nexusim-pill-btn ${plunderRate === r ? 'active amber' : ''}`}
                                    >
                                        {r}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel 3: IPM Pre-Strike */}
                <div className="nexusim-panel">
                    <div>
                        <div className="nexusim-panel-header">
                            <Flame size={16} color="#ff5f5f" />
                            <span className="nexusim-panel-title">Missile Attack (IPM)</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                            <div>
                                <label style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                                    Number of IPMs
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={ipmLaunched}
                                    onChange={(e) => setIpmLaunched(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="nexusim-input-text"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                                    Primary Target
                                </label>
                                <select
                                    value={ipmPrimaryTarget}
                                    onChange={(e) => setIpmPrimaryTarget(parseInt(e.target.value))}
                                    className="nexusim-input-text"
                                >
                                    {DEFENSE_IDS.map(id => (
                                        <option key={id} value={id}>{UNITS[id]?.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleCalculateIpm}
                            disabled={ipmLaunched <= 0}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                marginBottom: '10px'
                            }}
                        >
                            Calculate Missile Damage
                        </button>

                        {ipmResult && (
                            <div style={{ background: 'rgba(255, 95, 95, 0.08)', border: '1px solid rgba(255, 95, 95, 0.25)', borderRadius: '10px', padding: '10px', fontSize: '0.75rem', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>ABMs Intercepted:</span>
                                    <strong style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{ipmResult.abmIntercepted}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Hits:</span>
                                    <strong style={{ color: '#ff5f5f', fontFamily: 'monospace' }}>{ipmResult.effectiveIpm}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Defenses Destroyed:</span>
                                    <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
                                        {Object.values(ipmResult.neutralizedDefenses).reduce((a, b) => a + b, 0).toLocaleString()}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {ipmResult && ipmResult.effectiveIpm > 0 && (
                        <button
                            onClick={handleApplyIpmToDefender}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#dc2626',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            Apply Damage to Defender
                        </button>
                    )}
                </div>
            </div>

            {/* 5. RESULTS */}
            {results && activeScenario && (
                <div className="nexusim-results-card">
                    <div className="nexusim-results-top">
                        <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>
                                Battle Results ({results.totalRuns} simulations, average {results.averageRounds.toFixed(1)} rounds)
                            </span>
                            <div className="nexusim-win-rates">
                                <div className="nexusim-rate-item">
                                    <span className="nexusim-rate-dot cyan"></span>
                                    <span>Attacker Win {results.winRates.attackers.toFixed(1)}%</span>
                                </div>
                                <div className="nexusim-rate-item">
                                    <span className="nexusim-rate-dot amber"></span>
                                    <span>Draw {results.winRates.draw.toFixed(1)}%</span>
                                </div>
                                <div className="nexusim-rate-item">
                                    <span className="nexusim-rate-dot red"></span>
                                    <span>Defender Win {results.winRates.defenders.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Scenario Pills */}
                        <div className="nexusim-pill-group">
                            {(
                                [
                                    ['average', 'Average'],
                                    ['bestCase', 'Best Case'],
                                    ['worstCase', 'Worst Case'],
                                    ['maxDebris', 'Max Debris']
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedScenarioKey(key)}
                                    className={`nexusim-pill-btn ${selectedScenarioKey === key ? 'active' : ''}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="nexusim-kpi-grid">
                        <div className="nexusim-kpi-cell">
                            <div className="nexusim-kpi-label">Attacker Losses</div>
                            <div className="nexusim-kpi-val red">
                                {activeScenario.losses.attackers.total.toLocaleString()}
                            </div>
                            <div className="nexusim-kpi-sub">
                                MSU: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{Math.round(activeScenario.losses.attackers.msu).toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="nexusim-kpi-cell">
                            <div className="nexusim-kpi-label">Defender Losses</div>
                            <div className="nexusim-kpi-val green">
                                {activeScenario.losses.defenders.total.toLocaleString()}
                            </div>
                            <div className="nexusim-kpi-sub">
                                MSU: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{Math.round(activeScenario.losses.defenders.msu).toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="nexusim-kpi-cell">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div className="nexusim-kpi-label">Debris Field</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b' }}>Moon {activeScenario.moonChance}%</div>
                            </div>
                            <div className="nexusim-kpi-val amber">
                                {activeScenario.debris.total.toLocaleString()}
                            </div>
                            <div className="nexusim-kpi-sub">
                                Recyclers: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{activeScenario.recyclersNeeded.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="nexusim-kpi-cell profit">
                            <div className="nexusim-kpi-label" style={{ color: 'var(--primary)' }}>Net Profit</div>
                            <div className="nexusim-kpi-val cyan">
                                {activeScenario.profit.msu >= 0 ? '+' : ''}
                                {Math.round(activeScenario.profit.msu).toLocaleString()} MSU
                            </div>
                            <div className="nexusim-kpi-sub">
                                Cargos: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{activeScenario.cargoNeeded.largeCargo.toLocaleString()} Large Cargo</strong>
                            </div>
                        </div>
                    </div>

                    {/* 3 Detailed Breakdown Columns */}
                    <div className="nexusim-breakdown-row">
                        <div className="nexusim-mini-ledger">
                            <div className="nexusim-ledger-title">Loot ({plunderRate}%)</div>
                            <div className="nexusim-ledger-line">
                                <span>Metal:</span>
                                <strong>{activeScenario.plunder.captured.metal.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line">
                                <span>Crystal:</span>
                                <strong style={{ color: 'var(--primary)' }}>{activeScenario.plunder.captured.crystal.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line">
                                <span>Deuterium:</span>
                                <strong style={{ color: '#10b981' }}>{activeScenario.plunder.captured.deuterium.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line highlight">
                                <span>Total Loot:</span>
                                <strong style={{ color: '#f59e0b' }}>{activeScenario.plunder.captured.total.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="nexusim-mini-ledger">
                            <div className="nexusim-ledger-title">Debris Field</div>
                            <div className="nexusim-ledger-line">
                                <span>Metal in DF:</span>
                                <strong>{activeScenario.debris.metal.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line">
                                <span>Crystal in DF:</span>
                                <strong style={{ color: 'var(--primary)' }}>{activeScenario.debris.crystal.toLocaleString()}</strong>
                            </div>
                            {serverSettings.deuteriumInDebris && (
                                <div className="nexusim-ledger-line">
                                    <span>Deuterium in DF:</span>
                                    <strong style={{ color: '#10b981' }}>{activeScenario.debris.deuterium.toLocaleString()}</strong>
                                </div>
                            )}
                            {activeScenario.reaperHarvest.total > 0 && (
                                <div className="nexusim-ledger-line highlight">
                                    <span style={{ color: 'var(--primary)' }}>Reaper Harvest:</span>
                                    <strong style={{ color: 'var(--primary)' }}>{activeScenario.reaperHarvest.total.toLocaleString()}</strong>
                                </div>
                            )}
                        </div>

                        <div className="nexusim-mini-ledger">
                            <div className="nexusim-ledger-title">Space Dock (Wreckfield)</div>
                            <div className="nexusim-ledger-line">
                                <span>Repaired Ships:</span>
                                <strong>{Object.values(activeScenario.wreckfield.defenders).reduce((a, b) => a + b, 0).toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line">
                                <span>Metal Recovered:</span>
                                <strong>{activeScenario.wreckfield.resources.metal.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line">
                                <span>Crystal Recovered:</span>
                                <strong style={{ color: 'var(--primary)' }}>{activeScenario.wreckfield.resources.crystal.toLocaleString()}</strong>
                            </div>
                            <div className="nexusim-ledger-line highlight">
                                <span>Deuterium Recovered:</span>
                                <strong style={{ color: '#10b981' }}>{activeScenario.wreckfield.resources.deuterium.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. LIFEFORMS OVERRIDE MODAL */}
            <AnimatePresence>
                {editingLfParty && (
                    <div className="nexusim-modal-backdrop">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="nexusim-modal-window"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '14px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
                                    Lifeform Tech Bonuses (%)
                                </span>
                                <button
                                    onClick={() => setEditingLfParty(null)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                                Enter your Lifeform combat bonuses in percent. These increase weapons, shielding, and armour.
                            </p>

                            {(() => {
                                const party = editingLfParty.side === 'atk'
                                    ? attackers[editingLfParty.index]
                                    : defenders[editingLfParty.index];
                                const lf = party?.lifeformBonuses || {
                                    globalWeapon: 0,
                                    globalShield: 0,
                                    globalArmour: 0,
                                    perShipWeapon: {},
                                    perShipShield: {},
                                    perShipArmour: {}
                                };

                                return (
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                            <div>
                                                <label className="nexusim-meta-label">Weapons %</label>
                                                <input
                                                    type="number"
                                                    value={lf.globalWeapon}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = { ...lf, globalWeapon: val };
                                                        if (editingLfParty.side === 'atk') {
                                                            setAttackers(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        } else {
                                                            setDefenders(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    className="nexusim-input-text"
                                                />
                                            </div>

                                            <div>
                                                <label className="nexusim-meta-label">Shielding %</label>
                                                <input
                                                    type="number"
                                                    value={lf.globalShield}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = { ...lf, globalShield: val };
                                                        if (editingLfParty.side === 'atk') {
                                                            setAttackers(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        } else {
                                                            setDefenders(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    className="nexusim-input-text"
                                                />
                                            </div>

                                            <div>
                                                <label className="nexusim-meta-label">Armour %</label>
                                                <input
                                                    type="number"
                                                    value={lf.globalArmour}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = { ...lf, globalArmour: val };
                                                        if (editingLfParty.side === 'atk') {
                                                            setAttackers(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        } else {
                                                            setDefenders(prev => {
                                                                const next = [...prev];
                                                                next[editingLfParty.index].lifeformBonuses = updated;
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    className="nexusim-input-text"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                                            <button
                                                onClick={() => setEditingLfParty(null)}
                                                className="nexusim-btn-simulate"
                                                style={{ padding: '8px 18px', fontSize: '0.78rem' }}
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NexuSim;
