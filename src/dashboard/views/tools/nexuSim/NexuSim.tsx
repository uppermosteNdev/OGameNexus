import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    RotateCcw,
    Play,
    Plus,
    X,
    Share2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Crosshair
} from 'lucide-react';
import { db } from '../../../../db';
import { isSameUniverse } from '../../../../utils/universe';
import {
    FleetParty,
    ServerSettings,
    SimulationAggregateResult,
    ParsedScenario,
    IpmStrikeResult
} from './types';
import {
    UNITS,
    DEFAULT_SERVER_SETTINGS,
    DEFAULT_ATTACKER_PARTY,
    DEFAULT_DEFENDER_PARTY
} from './constants';
import { NexuSimEngine } from './engine';
import './NexuSim.css';

// Ordered ship list for simulator
const SIM_SHIP_IDS = [202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 214, 215, 218, 219];

// Ordered defense list for defender planet
const SIM_DEFENSE_IDS = [401, 402, 403, 404, 405, 406, 407, 408, 502, 212, 217];

const RESOURCE_ICONS: Record<string, string> = {
    metal: 'icons/resources/metal-icon-medium.jpg',
    crystal: 'icons/resources/crystal-icon-medium.jpg',
    deuterium: 'icons/resources/deuterium-icon-medium.jpg',
    food: 'icons/resources/food-icon-medium.jpg'
};

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
    502: 'icons/ships/anti-ballistic-missiles-large.jpg'
};

interface WaveState {
    attackers: FleetParty[];
    defenders: FleetParty[];
    targetResources: { metal: number; crystal: number; deuterium: number; food: number };
    plunderRate: number;
    results: SimulationAggregateResult | null;
    selectedScenario: 'average' | 'bestAtk' | 'worstAtk' | 'bestDef' | 'worstDef' | 'moreDebris';
    preSimSnapshots: {
        attackers: Record<number, Record<number, number>>;
        defenders: Record<number, Record<number, number>>;
    };
}

export const NexuSim: React.FC = () => {
    // 1. Dexie DB queries
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const playerPlanets = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];
    const spiedPlanets = useLiveQuery(async () => {
        if (!activeAccount) return [];
        const all = await db.spiedPlanets.toArray();
        return all.filter(s => isSameUniverse(s.universe, activeAccount.universe) && s.userPlayerId === activeAccount.playerId);
    }, [activeAccount]) || [];

    // 2. Server Settings State
    const [serverSettings, setServerSettings] = useState<ServerSettings>(DEFAULT_SERVER_SETTINGS);
    const [simIterations, setSimIterations] = useState<number>(50);
    const [isSimulating, setIsSimulating] = useState<boolean>(false);

    // Collapsible accordion in settings
    const [openGeneralBonus, setOpenGeneralBonus] = useState<boolean>(false);
    const [openCollectorBonus, setOpenCollectorBonus] = useState<boolean>(false);

    // 3. Multi-Wave Simulation State
    const [waves, setWaves] = useState<WaveState[]>([{
        attackers: [JSON.parse(JSON.stringify(DEFAULT_ATTACKER_PARTY))],
        defenders: [JSON.parse(JSON.stringify(DEFAULT_DEFENDER_PARTY))],
        targetResources: { metal: 10000000, crystal: 5000000, deuterium: 2000000, food: 0 },
        plunderRate: 50,
        results: null,
        selectedScenario: 'average',
        preSimSnapshots: {
            attackers: { 0: { ...DEFAULT_ATTACKER_PARTY.units } },
            defenders: { 0: { ...DEFAULT_DEFENDER_PARTY.units } }
        }
    }]);
    const [currentWaveIdx, setCurrentWaveIdx] = useState<number>(0);
    const currentWave = waves[currentWaveIdx] || waves[0];

    // Navigation tabs inside current wave
    const [activeAtkTab, setActiveAtkTab] = useState<number>(0);
    const [activeDefTab, setActiveDefTab] = useState<number>(0);

    // API key inputs
    const [atkApiKey, setAtkApiKey] = useState<string>('');
    const [defApiKey, setDefApiKey] = useState<string>('');

    // Modals
    const [lfModalSide, setLfModalSide] = useState<'atk' | 'def' | null>(null);
    const [recyclersModalSide, setRecyclersModalSide] = useState<'atk' | 'def' | null>(null);
    const [ipmModalOpen, setIpmModalOpen] = useState<boolean>(false);
    const [shipStatsModalSide, setShipStatsModalSide] = useState<'atk' | 'def' | null>(null);
    const [wreckfieldModalOpen, setWreckfieldModalOpen] = useState<boolean>(false);

    // IPM modal state
    const [ipmAttackerIdx, setIpmAttackerIdx] = useState<number>(0);
    const [ipmTargets, setIpmTargets] = useState<Record<number, number>>({});
    const [ipmResult, setIpmResult] = useState<IpmStrikeResult | null>(null);

    // Recycler sender in Results
    const [recyclerSender, setRecyclerSender] = useState<'atk' | 'def'>('atk');
    const [cargoSender, setCargoSender] = useState<number>(0);

    // Sync primary attacker research with player account
    useEffect(() => {
        if (!activeAccount?.researches || !waves[0]) return;
        const resMap: Record<number, number> = {};
        activeAccount.researches.forEach(r => { resMap[r.id] = r.level; });

        setWaves(prev => {
            const next = [...prev];
            const wave0 = { ...next[0] };
            const atk0 = { ...wave0.attackers[0] };
            atk0.playerClass = activeAccount.playerClass ?? atk0.playerClass;
            atk0.allianceClass = activeAccount.allianceClass ?? atk0.allianceClass;
            atk0.engineer = Boolean(activeAccount.hasEngineer);
            atk0.techs = {
                weapons: resMap[109] ?? atk0.techs.weapons,
                shielding: resMap[110] ?? atk0.techs.shielding,
                armour: resMap[111] ?? atk0.techs.armour,
                combustion: resMap[115] ?? atk0.techs.combustion,
                impulse: resMap[117] ?? atk0.techs.impulse,
                hyperspace: resMap[118] ?? atk0.techs.hyperspace,
                hyperspaceTech: resMap[114] ?? atk0.techs.hyperspaceTech
            };
            wave0.attackers = [atk0, ...wave0.attackers.slice(1)];
            next[0] = wave0;
            return next;
        });

        setServerSettings(prev => ({
            ...prev,
            universeSpeedWar: activeAccount.speedFleetWar || activeAccount.universeSpeed || prev.universeSpeedWar,
            speedFleetWar: activeAccount.speedFleetWar || activeAccount.universeSpeed || prev.speedFleetWar,
            galaxies: activeAccount.galaxies || prev.galaxies,
            systems: activeAccount.systems || prev.systems,
            donutGalaxy: activeAccount.donutGalaxy !== undefined ? Boolean(activeAccount.donutGalaxy) : prev.donutGalaxy,
            donutSystem: activeAccount.donutSystem !== undefined ? Boolean(activeAccount.donutSystem) : prev.donutSystem
        }));
    }, [activeAccount]);

    // Active attacker & defender
    const currentAtk = currentWave.attackers[activeAtkTab] || currentWave.attackers[0];
    const currentDef = currentWave.defenders[activeDefTab] || currentWave.defenders[0];
    const primaryDef = currentWave.defenders[0];

    // Active Results scenario
    const activeScenario: ParsedScenario | null = useMemo(() => {
        if (!currentWave.results) return null;
        return currentWave.results.scenarios[currentWave.selectedScenario];
    }, [currentWave.results, currentWave.selectedScenario]);

    // Update current wave helper
    const updateCurrentWave = (fn: (wave: WaveState) => WaveState) => {
        setWaves(prev => {
            const next = [...prev];
            next[currentWaveIdx] = fn(next[currentWaveIdx]);
            return next;
        });
    };

    // Fleet & Unit Updates
    const updateUnit = (side: 'atk' | 'def', partyIdx: number, unitId: number, count: number) => {
        const sanitized = Math.max(0, isNaN(count) ? 0 : Math.floor(count));
        updateCurrentWave(wave => {
            const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
            if (!list[partyIdx]) return wave;
            const units = { ...list[partyIdx].units };
            if (sanitized === 0) delete units[unitId];
            else units[unitId] = sanitized;
            list[partyIdx] = { ...list[partyIdx], units };

            return side === 'atk' ? { ...wave, attackers: list } : { ...wave, defenders: list };
        });
    };

    const restoreUnit = (side: 'atk' | 'def', partyIdx: number, unitId: number) => {
        const prevCount = side === 'atk'
            ? currentWave.preSimSnapshots.attackers[partyIdx]?.[unitId] || 0
            : currentWave.preSimSnapshots.defenders[partyIdx]?.[unitId] || 0;
        updateUnit(side, partyIdx, unitId, prevCount);
    };

    const clearUnits = (side: 'atk' | 'def', partyIdx: number) => {
        updateCurrentWave(wave => {
            const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
            if (!list[partyIdx]) return wave;
            list[partyIdx] = { ...list[partyIdx], units: {} };
            return side === 'atk' ? { ...wave, attackers: list } : { ...wave, defenders: list };
        });
    };

    const clearPlayer = (side: 'atk' | 'def', partyIdx: number) => {
        updateCurrentWave(wave => {
            const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
            if (!list[partyIdx]) return wave;
            const defParty = side === 'atk' ? DEFAULT_ATTACKER_PARTY : DEFAULT_DEFENDER_PARTY;
            list[partyIdx] = {
                ...JSON.parse(JSON.stringify(defParty)),
                id: partyIdx,
                name: `${side === 'atk' ? 'A' : 'D'}${partyIdx + 1}`,
                units: {}
            };
            return side === 'atk' ? { ...wave, attackers: list } : { ...wave, defenders: list };
        });
    };

    // ACS Participant Management
    const addParticipant = (side: 'atk' | 'def') => {
        updateCurrentWave(wave => {
            const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
            if (list.length >= 16) return wave;
            const newId = list.length;
            const clone = JSON.parse(JSON.stringify(list[0]));
            clone.id = newId;
            clone.name = `${side === 'atk' ? 'A' : 'D'}${newId + 1}`;
            clone.units = {};
            list.push(clone);
            if (side === 'atk') {
                setActiveAtkTab(newId);
                return { ...wave, attackers: list };
            } else {
                setActiveDefTab(newId);
                return { ...wave, defenders: list };
            }
        });
    };

    const removeParticipant = (side: 'atk' | 'def', index: number) => {
        updateCurrentWave(wave => {
            const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
            if (list.length <= 1) return wave;
            const filtered = list.filter((_, i) => i !== index).map((p, i) => ({
                ...p,
                id: i,
                name: `${side === 'atk' ? 'A' : 'D'}${i + 1}`
            }));
            if (side === 'atk') {
                setActiveAtkTab(Math.max(0, index - 1));
                return { ...wave, attackers: filtered };
            } else {
                setActiveDefTab(Math.max(0, index - 1));
                return { ...wave, defenders: filtered };
            }
        });
    };

    // Quick Select from Player Planets
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
                if (count > 0) importedUnits[parseInt(idStr)] = count;
            }
        }

        updateCurrentWave(wave => {
            const atks = [...wave.attackers];
            atks[activeAtkTab] = {
                ...atks[activeAtkTab],
                coords: parsedCoords,
                spaceDock: planet.spaceDock || atks[activeAtkTab].spaceDock,
                units: importedUnits
            };
            return { ...wave, attackers: atks };
        });
    };

    // Quick Select from Spy Reports
    const handleSelectSpyReport = (planetKey: string) => {
        const spied = spiedPlanets.find(s => s.planetKey === planetKey);
        if (!spied) return;

        if (spied.lastHashCode) {
            setDefApiKey(spied.lastHashCode);
        }

        const coordsParts = (spied.coords || '').split(':').map(Number);
        const parsedCoords = {
            galaxy: coordsParts[0] || 1,
            system: coordsParts[1] || 1,
            position: coordsParts[2] || 1
        };

        const spiedAny = spied as any;
        const importedUnits: Record<number, number> = {};
        if (spiedAny.ships && typeof spiedAny.ships === 'object') {
            for (const [idStr, count] of Object.entries(spiedAny.ships)) {
                const num = Number(count);
                if (num > 0) importedUnits[parseInt(idStr)] = num;
            }
        }
        if (spiedAny.defense && typeof spiedAny.defense === 'object') {
            for (const [idStr, count] of Object.entries(spiedAny.defense)) {
                const num = Number(count);
                if (num > 0) importedUnits[parseInt(idStr)] = num;
            }
        }

        updateCurrentWave(wave => {
            const defs = [...wave.defenders];
            defs[0] = {
                ...defs[0],
                coords: parsedCoords,
                units: importedUnits,
                techs: {
                    ...defs[0].techs,
                    weapons: spiedAny.weaponsTech ?? defs[0].techs.weapons,
                    shielding: spiedAny.shieldingTech ?? defs[0].techs.shielding,
                    armour: spiedAny.armourTech ?? defs[0].techs.armour
                }
            };
            return {
                ...wave,
                defenders: defs,
                targetResources: {
                    metal: spied.lastSpiedMetal || 0,
                    crystal: spied.lastSpiedCrystal || 0,
                    deuterium: spied.lastSpiedDeuterium || 0,
                    food: 0
                },
                plunderRate: spied.lootPercentage || 50
            };
        });
    };

    // API Key Loader
    const handleLoadApi = (side: 'atk' | 'def') => {
        const key = side === 'atk' ? atkApiKey.trim() : defApiKey.trim();
        if (!key) return;

        // Check if key matches a known spy report
        const found = spiedPlanets.find(s => s.planetKey === key || s.coords === key);
        if (found) {
            handleSelectSpyReport(found.planetKey);
            return;
        }

        try {
            // Check if JSON
            if (key.startsWith('{')) {
                const parsed = JSON.parse(key);
                if (parsed.units) {
                    updateCurrentWave(wave => {
                        const list = side === 'atk' ? [...wave.attackers] : [...wave.defenders];
                        const idx = side === 'atk' ? activeAtkTab : activeDefTab;
                        list[idx] = { ...list[idx], ...parsed };
                        return side === 'atk' ? { ...wave, attackers: list } : { ...wave, defenders: list };
                    });
                }
            }
        } catch {
            // ignore
        }
    };

    // Run Simulation
    const handleRunSimulation = () => {
        setIsSimulating(true);

        setTimeout(() => {
            const startTime = performance.now();
            const rawRuns = NexuSimEngine.runSimulations(
                currentWave.attackers,
                currentWave.defenders,
                serverSettings,
                simIterations
            );
            const execTime = performance.now() - startTime;

            const processed = NexuSimEngine.processSimulationResults(
                rawRuns,
                currentWave.attackers,
                currentWave.defenders,
                serverSettings,
                currentWave.targetResources,
                currentWave.plunderRate,
                execTime
            );

            // Record snapshot before simulation for restore button
            const snapAtk: Record<number, Record<number, number>> = {};
            currentWave.attackers.forEach((a, i) => { snapAtk[i] = { ...a.units }; });
            const snapDef: Record<number, Record<number, number>> = {};
            currentWave.defenders.forEach((d, i) => { snapDef[i] = { ...d.units }; });

            updateCurrentWave(wave => ({
                ...wave,
                results: processed,
                preSimSnapshots: {
                    attackers: snapAtk,
                    defenders: snapDef
                }
            }));
            setIsSimulating(false);
        }, 25);
    };

    // Wave Management
    const handleNextWave = () => {
        if (!activeScenario) return;

        // If next wave already exists, just switch to it
        if (waves[currentWaveIdx + 1]) {
            setCurrentWaveIdx(currentWaveIdx + 1);
            return;
        }

        // Create new wave from surviving attacker and defender units + repaired defenses
        const nextAttackers: FleetParty[] = currentWave.attackers.map((atk, i) => {
            const survivingUnits: Record<number, number> = {};
            const runRem = currentWave.results?.scenarios.average.remainingUnits.attackers || {};
            for (const [idStr, count] of Object.entries(runRem)) {
                const id = parseInt(idStr);
                if (count > 0 && atk.units[id]) {
                    survivingUnits[id] = count;
                }
            }
            return {
                ...JSON.parse(JSON.stringify(atk)),
                units: survivingUnits
            };
        });

        const nextDefenders: FleetParty[] = currentWave.defenders.map((def, i) => {
            const survivingUnits: Record<number, number> = {};
            const runRem = currentWave.results?.scenarios.average.remainingUnits.defenders || {};
            for (const [idStr, count] of Object.entries(runRem)) {
                const id = parseInt(idStr);
                if (count > 0 && def.units[id]) {
                    survivingUnits[id] = count;
                }
            }

            // Restore planetary defenses by repair factor (70%, or 85% with engineer)
            if (i === 0) {
                const repairFrac = def.engineer ? 0.85 : (serverSettings.repairFactor || 0.7);
                const lostDef = currentWave.results?.scenarios.average.lostUnits.defenders || {};
                for (const [idStr, count] of Object.entries(lostDef)) {
                    const id = parseInt(idStr);
                    if (id >= 400 && id < 500) {
                        const repaired = Math.floor(count * repairFrac);
                        survivingUnits[id] = (survivingUnits[id] || 0) + repaired;
                    }
                }
            }

            return {
                ...JSON.parse(JSON.stringify(def)),
                units: survivingUnits
            };
        });

        // Plunder subtracts looted resources
        const remResources = {
            metal: Math.max(0, currentWave.targetResources.metal - activeScenario.plunder.captured.metal),
            crystal: Math.max(0, currentWave.targetResources.crystal - activeScenario.plunder.captured.crystal),
            deuterium: Math.max(0, currentWave.targetResources.deuterium - activeScenario.plunder.captured.deuterium),
            food: 0
        };

        const snapAtk: Record<number, Record<number, number>> = {};
        nextAttackers.forEach((a, i) => { snapAtk[i] = { ...a.units }; });
        const snapDef: Record<number, Record<number, number>> = {};
        nextDefenders.forEach((d, i) => { snapDef[i] = { ...d.units }; });

        const newWave: WaveState = {
            attackers: nextAttackers,
            defenders: nextDefenders,
            targetResources: remResources,
            plunderRate: currentWave.plunderRate,
            results: null,
            selectedScenario: 'average',
            preSimSnapshots: {
                attackers: snapAtk,
                defenders: snapDef
            }
        };

        setWaves(prev => [...prev, newWave]);
        setCurrentWaveIdx(waves.length);
    };

    const handlePrevWave = () => {
        if (currentWaveIdx > 0) {
            setCurrentWaveIdx(currentWaveIdx - 1);
        }
    };

    // Calculate flight stats
    const atkDistance = useMemo(() => {
        return NexuSimEngine.calculateDistance(currentAtk.coords, primaryDef.coords, serverSettings);
    }, [currentAtk.coords, primaryDef.coords, serverSettings]);

    const atkSlowestSpeed = useMemo(() => {
        return NexuSimEngine.calculateSlowestSpeed(currentAtk, serverSettings);
    }, [currentAtk, serverSettings]);

    const atkFlightTime = useMemo(() => {
        return NexuSimEngine.calculateFlightDuration(
            atkDistance,
            atkSlowestSpeed,
            currentAtk.speedPercent || 100,
            serverSettings.universeSpeedWar
        );
    }, [atkDistance, atkSlowestSpeed, currentAtk.speedPercent, serverSettings.universeSpeedWar]);

    const atkFuel = useMemo(() => {
        return NexuSimEngine.calculateFleetConsumption(
            atkDistance,
            currentAtk.speedPercent || 100,
            atkSlowestSpeed,
            serverSettings.universeSpeedWar,
            currentAtk,
            serverSettings
        );
    }, [atkDistance, currentAtk, atkSlowestSpeed, serverSettings]);

    const atkCargo = useMemo(() => {
        return NexuSimEngine.calculateFleetCargo(currentAtk, serverSettings);
    }, [currentAtk, serverSettings]);

    const defDistance = useMemo(() => {
        return NexuSimEngine.calculateDistance(currentDef.coords, primaryDef.coords, serverSettings);
    }, [currentDef.coords, primaryDef.coords, serverSettings]);

    const defSlowestSpeed = useMemo(() => {
        return NexuSimEngine.calculateSlowestSpeed(currentDef, serverSettings);
    }, [currentDef, serverSettings]);

    const defFlightTime = useMemo(() => {
        return NexuSimEngine.calculateFlightDuration(
            defDistance,
            defSlowestSpeed,
            currentDef.speedPercent || 100,
            serverSettings.universeSpeedWar
        );
    }, [defDistance, defSlowestSpeed, currentDef.speedPercent, serverSettings.universeSpeedWar]);

    const defFuel = useMemo(() => {
        return NexuSimEngine.calculateFleetConsumption(
            defDistance,
            currentDef.speedPercent || 100,
            defSlowestSpeed,
            serverSettings.universeSpeedWar,
            currentDef,
            serverSettings
        );
    }, [defDistance, currentDef, defSlowestSpeed, serverSettings]);

    const defCargo = useMemo(() => {
        return NexuSimEngine.calculateFleetCargo(currentDef, serverSettings);
    }, [currentDef, serverSettings]);

    // Format helper
    const fmt = (num: number | undefined) => (num || 0).toLocaleString();

    // Share simulation to clipboard
    const handleShare = () => {
        const text = `Nexus Battlesim - Wave #${currentWaveIdx + 1}\n` +
            `Attackers: ${currentWave.attackers.map(a => `${a.name} [${a.coords.galaxy}:${a.coords.system}:${a.coords.position}]`).join(', ')}\n` +
            `Defenders: ${currentWave.defenders.map(d => `${d.name} [${d.coords.galaxy}:${d.coords.system}:${d.coords.position}]`).join(', ')}\n` +
            (activeScenario
                ? `Win Rate: Atk ${currentWave.results?.winRates.attackers.toFixed(1)}% | Def ${currentWave.results?.winRates.defenders.toFixed(1)}% | Draw ${currentWave.results?.winRates.draw.toFixed(1)}%\n` +
                  `Profit: ${fmt(activeScenario.profit.total)} (MSU: ${fmt(Math.round(activeScenario.profit.msu))})\n` +
                  `Debris: ${fmt(activeScenario.debris.total)} (Moon: ${activeScenario.moonChance}%)`
                : 'Not simulated yet.');
        navigator.clipboard.writeText(text);
        alert('Simulation summary copied to clipboard!');
    };

    return (
        <div className="ogsim-wrapper">
            {/* 1. TOP CONTROL BAR */}
            <header className="ogsim-topbar">
                <div className="ogsim-wave-controls">
                    <button
                        onClick={handlePrevWave}
                        disabled={currentWaveIdx === 0}
                        className="ogsim-btn"
                    >
                        <ChevronLeft size={14} />
                        Prev wave
                    </button>

                    <div className="ogsim-wave-badge">
                        Wave #{currentWaveIdx + 1}
                    </div>

                    <button
                        onClick={handleNextWave}
                        disabled={!currentWave.results}
                        className="ogsim-btn"
                    >
                        Next wave
                        <ChevronRight size={14} />
                    </button>
                </div>

                <div className="ogsim-quick-loaders">
                    {playerPlanets.length > 0 && (
                        <select
                            onChange={(e) => handleSelectOwnPlanet(e.target.value)}
                            defaultValue=""
                            className="ogsim-select-quick"
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
                            className="ogsim-select-quick"
                        >
                            <option value="" disabled>Load Spy Report...</option>
                            {spiedPlanets.map(s => (
                                <option key={s.planetKey} value={s.planetKey}>
                                    {s.playerName} [{s.coords}]
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="ogsim-actions">
                    <button onClick={handleShare} className="ogsim-btn">
                        <Share2 size={13} />
                        Share
                    </button>

                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="ogsim-btn ogsim-btn-simulate"
                    >
                        {isSimulating ? (
                            <>
                                <RotateCcw size={14} className="animate-spin" />
                                Simulating...
                            </>
                        ) : (
                            <>
                                <Play size={14} fill="#fff" />
                                Simulate
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* 2. MAIN 4-COLUMN GRID */}
            <div className="ogsim-grid">
                {/* ========================================================
                   COLUMN 1: ATTACKERS
                   ======================================================== */}
                <div className="ogsim-col">
                    <div className="ogsim-title-bar">
                        <span>Attackers</span>
                        <span className="ogsim-ratio">-</span>
                    </div>

                    <div className="ogsim-tabs">
                        {currentWave.attackers.map((atk, idx) => (
                            <button
                                key={atk.id}
                                onClick={() => setActiveAtkTab(idx)}
                                className={`ogsim-tab ${activeAtkTab === idx ? 'active' : ''}`}
                            >
                                {atk.name}
                            </button>
                        ))}
                        {currentWave.attackers.length < 16 && (
                            <button
                                onClick={() => addParticipant('atk')}
                                className="ogsim-tab-add"
                                title="Add ACS Attacker"
                            >
                                +
                            </button>
                        )}
                        {currentWave.attackers.length > 1 && (
                            <button
                                onClick={() => removeParticipant('atk', activeAtkTab)}
                                className="ogsim-tab-close"
                                title="Remove Active Attacker"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="ogsim-card">
                        {/* API Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-row">
                                <strong style={{ fontSize: '0.78rem' }}>API</strong>
                                <input
                                    type="text"
                                    value={atkApiKey}
                                    onChange={(e) => setAtkApiKey(e.target.value)}
                                    placeholder="Paste API or Spy Key"
                                    className="ogsim-input-xs w-full"
                                    style={{ margin: '0 6px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                    onClick={() => handleLoadApi('atk')}
                                    className="ogsim-btn-xs"
                                    style={{ width: '100%' }}
                                >
                                    Load from API
                                </button>
                            </div>
                        </div>

                        {/* Classes Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Classes</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Player</span>
                                <div className="ogsim-class-group">
                                    {[
                                        { val: 0, label: '—', cls: 'none' },
                                        { val: 1, label: 'C', cls: 'collector' },
                                        { val: 2, label: 'G', cls: 'general' },
                                        { val: 3, label: 'D', cls: 'explorer' }
                                    ].map(c => (
                                        <div
                                            key={c.val}
                                            onClick={() => updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab] = { ...atks[activeAtkTab], playerClass: c.val };
                                                return { ...w, attackers: atks };
                                            })}
                                            className={`ogsim-class-icon ${c.cls} ${currentAtk.playerClass === c.val ? 'active' : ''}`}
                                            title={c.cls}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Alliance</span>
                                <div className="ogsim-class-group">
                                    {[
                                        { val: 0, label: '—', cls: 'none' },
                                        { val: 1, label: 'W', cls: 'warriors' },
                                        { val: 2, label: 'T', cls: 'traders' },
                                        { val: 3, label: 'R', cls: 'researchers' }
                                    ].map(c => (
                                        <div
                                            key={c.val}
                                            onClick={() => updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab] = { ...atks[activeAtkTab], allianceClass: c.val };
                                                return { ...w, attackers: atks };
                                            })}
                                            className={`ogsim-class-icon ${c.cls} ${currentAtk.allianceClass === c.val ? 'active' : ''}`}
                                            title={c.cls}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Wreckfield (General Class) */}
                        {currentAtk.playerClass === 2 && (
                            <div className="ogsim-data-box">
                                <div className="ogsim-box-title">Wreckfield</div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Space Dock</span>
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentAtk.spaceDock}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab] = { ...atks[activeAtkTab], spaceDock: val };
                                                return { ...w, attackers: atks };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                </div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Nano Repair Bots</span>
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentAtk.nanoRepairBots}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab] = { ...atks[activeAtkTab], nanoRepairBots: val };
                                                return { ...w, attackers: atks };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Technologies Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Technologies</div>
                            <div className="ogsim-tech-grid">
                                <div className="ogsim-tech-col">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Weapons</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.weapons}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.weapons = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Shielding</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.shielding}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.shielding = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Armour</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.armour}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.armour = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                                <div className="ogsim-tech-col">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Combustion</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.combustion}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.combustion = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Impulse</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.impulse}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.impulse = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Hyperspace</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentAtk.techs.hyperspace}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const atks = [...w.attackers];
                                                    atks[activeAtkTab].techs.hyperspace = val;
                                                    return { ...w, attackers: atks };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Hyperspace Technology</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={0}
                                    value={currentAtk.techs.hyperspaceTech}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateCurrentWave(w => {
                                            const atks = [...w.attackers];
                                            atks[activeAtkTab].techs.hyperspaceTech = val;
                                            return { ...w, attackers: atks };
                                        });
                                    }}
                                    className="ogsim-input-xs"
                                />
                            </div>
                        </div>

                        {/* Bonuses / Recyclers */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Bonuses / Recyclers</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => setLfModalSide('atk')}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    LF Bonuses
                                </button>
                                <button
                                    onClick={() => setRecyclersModalSide('atk')}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Recyclers
                                </button>
                            </div>
                        </div>

                        {/* Ships Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">
                                <span>Ships</span>
                                <button
                                    onClick={() => setShipStatsModalSide('atk')}
                                    className="ogsim-btn-xs"
                                >
                                    View stats
                                </button>
                            </div>

                            {SIM_SHIP_IDS.map(id => {
                                const unit = UNITS[id];
                                const count = currentAtk.units[id] || 0;
                                const rem = activeScenario?.remainingUnits.attackers[id];
                                const hasRem = rem !== undefined;

                                return (
                                    <div key={id} className="ogsim-box-row">
                                        <span className="ogsim-row-label" title={unit.name}>{unit.name}</span>
                                        <div className="ogsim-row-ctrls">
                                            {hasRem && (
                                                <span className={`ogsim-remaining-badge ${rem === count ? 'green' : rem > 0 ? 'yellow' : 'red'}`}>
                                                    {rem.toLocaleString()}
                                                </span>
                                            )}
                                            <input
                                                type="number"
                                                size={8}
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('atk', activeAtkTab, id, parseInt(e.target.value))}
                                                className="ogsim-input-xs"
                                            />
                                            <button
                                                onClick={() => restoreUnit('atk', activeAtkTab, id)}
                                                className="ogsim-ctrl-btn"
                                                title="Restore"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                            <button
                                                onClick={() => updateUnit('atk', activeAtkTab, id, 0)}
                                                className="ogsim-ctrl-btn clear"
                                                title="Clear"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Infos Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Infos</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Coordinates</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <input
                                        type="number"
                                        size={3}
                                        value={currentAtk.coords.galaxy}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab].coords.galaxy = val;
                                                return { ...w, attackers: atks };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        size={4}
                                        value={currentAtk.coords.system}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab].coords.system = val;
                                                return { ...w, attackers: atks };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        size={3}
                                        value={currentAtk.coords.position}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const atks = [...w.attackers];
                                                atks[activeAtkTab].coords.position = val;
                                                return { ...w, attackers: atks };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Speed</span>
                                <select
                                    value={currentAtk.speedPercent || 100}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateCurrentWave(w => {
                                            const atks = [...w.attackers];
                                            atks[activeAtkTab].speedPercent = val;
                                            return { ...w, attackers: atks };
                                        });
                                    }}
                                    className="ogsim-select-xs"
                                >
                                    {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map(s => (
                                        <option key={s} value={s}>{s}%</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Flight time</span>
                                <span className="mono">{NexuSimEngine.formatDuration(atkFlightTime)}</span>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Consumption</span>
                                <span className="mono">{fmt(atkFuel)}</span>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Cargo capacity</span>
                                <span className="mono">{fmt(atkCargo)}</span>
                            </div>
                        </div>

                        {/* Footer Clear Buttons */}
                        <div className="ogsim-data-box">
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => clearUnits('atk', activeAtkTab)}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Clear ships
                                </button>
                                <button
                                    onClick={() => clearPlayer('atk', activeAtkTab)}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Clear player
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================================
                   COLUMN 2: DEFENDERS
                   ======================================================== */}
                <div className="ogsim-col">
                    <div className="ogsim-title-bar">
                        <span>Defenders</span>
                        <span className="ogsim-ratio">-</span>
                    </div>

                    <div className="ogsim-tabs">
                        {currentWave.defenders.map((def, idx) => (
                            <button
                                key={def.id}
                                onClick={() => setActiveDefTab(idx)}
                                className={`ogsim-tab ${activeDefTab === idx ? 'active' : ''}`}
                            >
                                {def.name}
                            </button>
                        ))}
                        {currentWave.defenders.length < 16 && (
                            <button
                                onClick={() => addParticipant('def')}
                                className="ogsim-tab-add"
                                title="Add ACS Defender"
                            >
                                +
                            </button>
                        )}
                        {currentWave.defenders.length > 1 && (
                            <button
                                onClick={() => removeParticipant('def', activeDefTab)}
                                className="ogsim-tab-close"
                                title="Remove Active Defender"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="ogsim-card">
                        {/* API Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-row">
                                <strong style={{ fontSize: '0.78rem' }}>API</strong>
                                <input
                                    type="text"
                                    value={defApiKey}
                                    onChange={(e) => setDefApiKey(e.target.value)}
                                    placeholder="Paste API or Spy Key"
                                    className="ogsim-input-xs w-full"
                                    style={{ margin: '0 6px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button
                                    onClick={() => handleLoadApi('def')}
                                    className="ogsim-btn-xs"
                                    style={{ width: '100%' }}
                                >
                                    Load from API
                                </button>
                            </div>
                        </div>

                        {/* Classes Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Classes</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Player</span>
                                <div className="ogsim-class-group">
                                    {[
                                        { val: 0, label: '—', cls: 'none' },
                                        { val: 1, label: 'C', cls: 'collector' },
                                        { val: 2, label: 'G', cls: 'general' },
                                        { val: 3, label: 'D', cls: 'explorer' }
                                    ].map(c => (
                                        <div
                                            key={c.val}
                                            onClick={() => updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[activeDefTab] = { ...defs[activeDefTab], playerClass: c.val };
                                                return { ...w, defenders: defs };
                                            })}
                                            className={`ogsim-class-icon ${c.cls} ${currentDef.playerClass === c.val ? 'active' : ''}`}
                                            title={c.cls}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Alliance</span>
                                <div className="ogsim-class-group">
                                    {[
                                        { val: 0, label: '—', cls: 'none' },
                                        { val: 1, label: 'W', cls: 'warriors' },
                                        { val: 2, label: 'T', cls: 'traders' },
                                        { val: 3, label: 'R', cls: 'researchers' }
                                    ].map(c => (
                                        <div
                                            key={c.val}
                                            onClick={() => updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[activeDefTab] = { ...defs[activeDefTab], allianceClass: c.val };
                                                return { ...w, defenders: defs };
                                            })}
                                            className={`ogsim-class-icon ${c.cls} ${currentDef.allianceClass === c.val ? 'active' : ''}`}
                                            title={c.cls}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Technologies Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Technologies</div>
                            <div className="ogsim-tech-grid">
                                <div className="ogsim-tech-col">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Weapons</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.weapons}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.weapons = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Shielding</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.shielding}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.shielding = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Armour</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.armour}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.armour = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                                <div className="ogsim-tech-col">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Combustion</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.combustion}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.combustion = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Impulse</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.impulse}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.impulse = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Hyperspace</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={currentDef.techs.hyperspace}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateCurrentWave(w => {
                                                    const defs = [...w.defenders];
                                                    defs[activeDefTab].techs.hyperspace = val;
                                                    return { ...w, defenders: defs };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Hyperspace Technology</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={0}
                                    value={currentDef.techs.hyperspaceTech}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateCurrentWave(w => {
                                            const defs = [...w.defenders];
                                            defs[activeDefTab].techs.hyperspaceTech = val;
                                            return { ...w, defenders: defs };
                                        });
                                    }}
                                    className="ogsim-input-xs"
                                />
                            </div>
                        </div>

                        {/* Bonuses / Recyclers */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Bonuses / Recyclers</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => setLfModalSide('def')}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    LF Bonuses
                                </button>
                                <button
                                    onClick={() => setRecyclersModalSide('def')}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Recyclers
                                </button>
                            </div>
                        </div>

                        {/* Ships Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">
                                <span>Ships</span>
                                <button
                                    onClick={() => setShipStatsModalSide('def')}
                                    className="ogsim-btn-xs"
                                >
                                    View stats
                                </button>
                            </div>

                            {SIM_SHIP_IDS.map(id => {
                                const unit = UNITS[id];
                                const count = currentDef.units[id] || 0;
                                const rem = activeScenario?.remainingUnits.defenders[id];
                                const hasRem = rem !== undefined;

                                return (
                                    <div key={id} className="ogsim-box-row">
                                        <span className="ogsim-row-label" title={unit.name}>{unit.name}</span>
                                        <div className="ogsim-row-ctrls">
                                            {hasRem && (
                                                <span className={`ogsim-remaining-badge ${rem === count ? 'green' : rem > 0 ? 'yellow' : 'red'}`}>
                                                    {rem.toLocaleString()}
                                                </span>
                                            )}
                                            <input
                                                type="number"
                                                size={8}
                                                min={0}
                                                value={count === 0 ? '' : count}
                                                placeholder="0"
                                                onChange={(e) => updateUnit('def', activeDefTab, id, parseInt(e.target.value))}
                                                className="ogsim-input-xs"
                                            />
                                            <button
                                                onClick={() => restoreUnit('def', activeDefTab, id)}
                                                className="ogsim-ctrl-btn"
                                                title="Restore"
                                            >
                                                <RotateCcw size={12} />
                                            </button>
                                            <button
                                                onClick={() => updateUnit('def', activeDefTab, id, 0)}
                                                className="ogsim-ctrl-btn clear"
                                                title="Clear"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Infos Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Infos</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Coordinates</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <input
                                        type="number"
                                        size={3}
                                        value={currentDef.coords.galaxy}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[activeDefTab].coords.galaxy = val;
                                                return { ...w, defenders: defs };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        size={4}
                                        value={currentDef.coords.system}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[activeDefTab].coords.system = val;
                                                return { ...w, defenders: defs };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        size={3}
                                        value={currentDef.coords.position}
                                        onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[activeDefTab].coords.position = val;
                                                return { ...w, defenders: defs };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                </div>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Speed</span>
                                <select
                                    value={currentDef.speedPercent || 100}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateCurrentWave(w => {
                                            const defs = [...w.defenders];
                                            defs[activeDefTab].speedPercent = val;
                                            return { ...w, defenders: defs };
                                        });
                                    }}
                                    className="ogsim-select-xs"
                                >
                                    {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map(s => (
                                        <option key={s} value={s}>{s}%</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Flight time</span>
                                <span className="mono">{NexuSimEngine.formatDuration(defFlightTime)}</span>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Consumption</span>
                                <span className="mono">{fmt(defFuel)}</span>
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Cargo capacity</span>
                                <span className="mono">{fmt(defCargo)}</span>
                            </div>
                        </div>

                        {/* Footer Clear Buttons */}
                        <div className="ogsim-data-box">
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => clearUnits('def', activeDefTab)}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Clear ships
                                </button>
                                <button
                                    onClick={() => clearPlayer('def', activeDefTab)}
                                    className="ogsim-btn-xs"
                                    style={{ flex: 1 }}
                                >
                                    Clear player
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================================
                   COLUMN 3: DEFENDER PLANET/MOON & SETTINGS
                   ======================================================== */}
                <div className="ogsim-col">
                    {/* Card 1: Defender planet/moon */}
                    <div className="ogsim-title-bar">
                        <span>Defender planet/moon</span>
                    </div>

                    <div className="ogsim-card standalone">
                        {/* Resources Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Resources</div>
                            <div className="ogsim-res-grid">
                                <div className="ogsim-res-item">
                                    <img src={RESOURCE_ICONS.metal} alt="Metal" className="ogsim-res-icon" />
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentWave.targetResources.metal}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => ({
                                                ...w,
                                                targetResources: { ...w.targetResources, metal: val }
                                            }));
                                        }}
                                        className="ogsim-input-xs"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="ogsim-res-item">
                                    <img src={RESOURCE_ICONS.crystal} alt="Crystal" className="ogsim-res-icon" />
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentWave.targetResources.crystal}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => ({
                                                ...w,
                                                targetResources: { ...w.targetResources, crystal: val }
                                            }));
                                        }}
                                        className="ogsim-input-xs"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="ogsim-res-item">
                                    <img src={RESOURCE_ICONS.deuterium} alt="Deuterium" className="ogsim-res-icon" />
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentWave.targetResources.deuterium}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => ({
                                                ...w,
                                                targetResources: { ...w.targetResources, deuterium: val }
                                            }));
                                        }}
                                        className="ogsim-input-xs"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="ogsim-res-item">
                                    <img src={RESOURCE_ICONS.food} alt="Food" className="ogsim-res-icon" />
                                    <input
                                        type="number"
                                        size={4}
                                        min={0}
                                        value={currentWave.targetResources.food}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => ({
                                                ...w,
                                                targetResources: { ...w.targetResources, food: val }
                                            }));
                                        }}
                                        className="ogsim-input-xs"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Defence Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">
                                <span>Defence</span>
                                <button
                                    onClick={() => setIpmModalOpen(true)}
                                    className="ogsim-btn-xs"
                                >
                                    IPM simulator
                                </button>
                            </div>

                            {SIM_DEFENSE_IDS.map(id => {
                                const unit = UNITS[id];
                                const count = primaryDef.units[id] || 0;
                                const rem = activeScenario?.remainingUnits.defenders[id];
                                const hasRem = rem !== undefined;
                                const isDome = id === 407 || id === 408;

                                return (
                                    <div key={id} className="ogsim-box-row">
                                        <span className="ogsim-row-label" title={unit.name}>{unit.name}</span>
                                        <div className="ogsim-row-ctrls">
                                            {hasRem && (
                                                <span className={`ogsim-remaining-badge ${rem === count ? 'green' : rem > 0 ? 'yellow' : 'red'}`}>
                                                    {rem.toLocaleString()}
                                                </span>
                                            )}

                                            {isDome ? (
                                                <input
                                                    type="checkbox"
                                                    checked={count > 0}
                                                    onChange={(e) => updateUnit('def', 0, id, e.target.checked ? 1 : 0)}
                                                    className="ogsim-checkbox"
                                                />
                                            ) : (
                                                <>
                                                    <input
                                                        type="number"
                                                        size={8}
                                                        min={0}
                                                        value={count === 0 ? '' : count}
                                                        placeholder="0"
                                                        onChange={(e) => updateUnit('def', 0, id, parseInt(e.target.value))}
                                                        className="ogsim-input-xs"
                                                    />
                                                    <button
                                                        onClick={() => restoreUnit('def', 0, id)}
                                                        className="ogsim-ctrl-btn"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateUnit('def', 0, id, 0)}
                                                        className="ogsim-ctrl-btn clear"
                                                        title="Clear"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Extra Box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Extra</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Engineer</span>
                                <input
                                    type="checkbox"
                                    checked={primaryDef.engineer}
                                    onChange={(e) => updateCurrentWave(w => {
                                        const defs = [...w.defenders];
                                        defs[0] = { ...defs[0], engineer: e.target.checked };
                                        return { ...w, defenders: defs };
                                    })}
                                    className="ogsim-checkbox"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Space Dock</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={0}
                                    value={primaryDef.spaceDock}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateCurrentWave(w => {
                                            const defs = [...w.defenders];
                                            defs[0] = { ...defs[0], spaceDock: val };
                                            return { ...w, defenders: defs };
                                        });
                                    }}
                                    className="ogsim-input-xs"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Advanced Recycling Plant</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={0}
                                    value={primaryDef.advancedRecyclingPlant || 0}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateCurrentWave(w => {
                                            const defs = [...w.defenders];
                                            defs[0] = { ...defs[0], advancedRecyclingPlant: val };
                                            return { ...w, defenders: defs };
                                        });
                                    }}
                                    className="ogsim-input-xs"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Nano Repair Bots</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={0}
                                    value={primaryDef.nanoRepairBots}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateCurrentWave(w => {
                                            const defs = [...w.defenders];
                                            defs[0] = { ...defs[0], nanoRepairBots: val };
                                            return { ...w, defenders: defs };
                                        });
                                    }}
                                    className="ogsim-input-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Settings */}
                    <div className="ogsim-title-bar">
                        <span>Settings</span>
                    </div>

                    <div className="ogsim-card">
                        {/* Simulation Settings */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Simulation</div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Simulations</span>
                                <input
                                    type="number"
                                    size={4}
                                    min={1}
                                    value={simIterations}
                                    onChange={(e) => setSimIterations(Math.max(1, parseInt(e.target.value) || 50))}
                                    className="ogsim-input-xs"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Plunder</span>
                                <select
                                    value={currentWave.plunderRate}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateCurrentWave(w => ({ ...w, plunderRate: val }));
                                    }}
                                    className="ogsim-select-xs"
                                >
                                    <option value={50}>50%</option>
                                    <option value={75}>75%</option>
                                    <option value={100}>100%</option>
                                </select>
                            </div>
                        </div>

                        {/* Server Settings */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-box-title">Server</div>
                            <div className="ogsim-tech-grid">
                                <div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Galaxies</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={1}
                                            value={serverSettings.galaxies}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, galaxies: parseInt(e.target.value) || 9 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Systems</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={1}
                                            value={serverSettings.systems}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, systems: parseInt(e.target.value) || 499 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Donut Galaxy</span>
                                        <input
                                            type="checkbox"
                                            checked={serverSettings.donutGalaxy}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, donutGalaxy: e.target.checked }))}
                                            className="ogsim-checkbox"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Donut Systems</span>
                                        <input
                                            type="checkbox"
                                            checked={serverSettings.donutSystem}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, donutSystem: e.target.checked }))}
                                            className="ogsim-checkbox"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Ignore empty systems</span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(serverSettings.ignoreEmptySystems)}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, ignoreEmptySystems: e.target.checked }))}
                                    className="ogsim-checkbox"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Ignore inactive systems</span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(serverSettings.ignoreInactiveSystems)}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, ignoreInactiveSystems: e.target.checked }))}
                                    className="ogsim-checkbox"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Deuterium save factor</span>
                                <input
                                    type="number"
                                    size={3}
                                    step="0.05"
                                    min={0}
                                    value={serverSettings.globalDeuteriumSaveFactor ?? 1}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, globalDeuteriumSaveFactor: parseFloat(e.target.value) || 1 }))}
                                    className="ogsim-input-xs"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Reaper debris (%)</span>
                                <input
                                    type="number"
                                    size={3}
                                    min={0}
                                    value={Math.round((serverSettings.combatDebrisFieldLimit || 0.25) * 100)}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, combatDebrisFieldLimit: (parseInt(e.target.value) || 25) / 100 }))}
                                    className="ogsim-input-xs"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Probe cargo enabled</span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(serverSettings.probeCargo)}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, probeCargo: e.target.checked }))}
                                    className="ogsim-checkbox"
                                />
                            </div>
                            <div className="ogsim-box-row">
                                <span className="ogsim-row-label">Rapidfire enabled</span>
                                <input
                                    type="checkbox"
                                    checked={serverSettings.rapidFire}
                                    onChange={(e) => setServerSettings(prev => ({ ...prev, rapidFire: e.target.checked }))}
                                    className="ogsim-checkbox"
                                />
                            </div>
                        </div>

                        {/* Fleet speed & Debris sub-box */}
                        <div className="ogsim-data-box">
                            <div className="ogsim-tech-grid">
                                <div>
                                    <div className="ogsim-box-title">Fleet speed</div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">War</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={1}
                                            value={serverSettings.universeSpeedWar}
                                            onChange={(e) => setServerSettings(prev => ({
                                                ...prev,
                                                universeSpeedWar: parseInt(e.target.value) || 1,
                                                speedFleetWar: parseInt(e.target.value) || 1
                                            }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Holding</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={1}
                                            value={serverSettings.speedFleetHolding || 1}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, speedFleetHolding: parseInt(e.target.value) || 1 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Peaceful</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={1}
                                            value={serverSettings.speedFleetPeaceful || 1}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, speedFleetPeaceful: parseInt(e.target.value) || 1 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="ogsim-box-title">Debris</div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Fleet (%)</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={Math.round(serverSettings.debrisFactor * 100)}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, debrisFactor: (parseInt(e.target.value) || 30) / 100 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Defence (%)</span>
                                        <input
                                            type="number"
                                            size={3}
                                            min={0}
                                            value={Math.round(serverSettings.debrisFactorDef * 100)}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, debrisFactorDef: (parseInt(e.target.value) || 0) / 100 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Deuterium</span>
                                        <input
                                            type="checkbox"
                                            checked={serverSettings.deuteriumInDebris}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, deuteriumInDebris: e.target.checked }))}
                                            className="ogsim-checkbox"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Accordion: General Class */}
                        <div className="ogsim-data-box">
                            <button
                                onClick={() => setOpenGeneralBonus(!openGeneralBonus)}
                                className="ogsim-accordion-header"
                            >
                                <span>General class</span>
                                {openGeneralBonus ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {openGeneralBonus && (
                                <div className="ogsim-accordion-body">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Faster combat ships (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.warriorBonusFasterCombatShips ?? 100}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, warriorBonusFasterCombatShips: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Faster recyclers (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.warriorBonusFasterRecyclers ?? 100}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, warriorBonusFasterRecyclers: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Fuel consumption (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.warriorBonusFuelConsumption ?? 25}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, warriorBonusFuelConsumption: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Recyclers fuel consumption (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.warriorBonusRecyclerFuelConsumption ?? 0}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, warriorBonusRecyclerFuelConsumption: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Recyclers cargo (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.warriorBonusRecyclerCargoCapacity ?? 25}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, warriorBonusRecyclerCargoCapacity: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Accordion: Collector Class */}
                        <div className="ogsim-data-box">
                            <button
                                onClick={() => setOpenCollectorBonus(!openCollectorBonus)}
                                className="ogsim-accordion-header"
                            >
                                <span>Collector class</span>
                                {openCollectorBonus ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {openCollectorBonus && (
                                <div className="ogsim-accordion-body">
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Faster trading ships (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.minerBonusFasterTradingShips ?? 100}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, minerBonusFasterTradingShips: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Cargo bay bonus (%)</span>
                                        <input
                                            type="number"
                                            size={4}
                                            min={0}
                                            value={serverSettings.minerBonusIncreasedCargoCapacityForTradingShips ?? 25}
                                            onChange={(e) => setServerSettings(prev => ({ ...prev, minerBonusIncreasedCargoCapacityForTradingShips: parseInt(e.target.value) || 0 }))}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ========================================================
                   COLUMN 4: RESULTS
                   ======================================================== */}
                <div className="ogsim-col">
                    <div className="ogsim-title-bar">
                        <span>Results</span>
                    </div>

                    <div className="ogsim-scenario-tabs">
                        {[
                            { key: 'average', label: 'Average' },
                            { key: 'bestAtk', label: 'Best Atk' },
                            { key: 'worstAtk', label: 'Worst Atk' },
                            { key: 'bestDef', label: 'Best Def' },
                            { key: 'worstDef', label: 'Worst Def' },
                            { key: 'moreDebris', label: 'More Debris' }
                        ].map(s => (
                            <button
                                key={s.key}
                                onClick={() => updateCurrentWave(w => ({ ...w, selectedScenario: s.key as any }))}
                                className={`ogsim-scenario-tab ${currentWave.selectedScenario === s.key ? 'active' : ''}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="ogsim-card">
                        {/* Outcome & Remaining Debris Sub-grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '6px', marginBottom: '8px' }}>
                            {/* Outcome Table */}
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={2} className="text-center">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Attackers win</td>
                                        <td className="text-center mono">
                                            {currentWave.results ? `${currentWave.results.winRates.attackers.toFixed(1)}%` : '--'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Defenders win</td>
                                        <td className="text-center mono">
                                            {currentWave.results ? `${currentWave.results.winRates.defenders.toFixed(1)}%` : '--'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Draw</td>
                                        <td className="text-center mono">
                                            {currentWave.results ? `${currentWave.results.winRates.draw.toFixed(1)}%` : '--'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">Rounds</td>
                                        <td className="darker text-center mono">
                                            {currentWave.results ? currentWave.results.averageRounds.toFixed(1) : '0'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">Tactical retreat</td>
                                        <td className="darker text-center mono">--</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Remaining Debris Table */}
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={2} className="text-center">Remaining debris</th>
                                        <th className="text-center">Moonchance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}>
                                            <img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.metal)}</td>
                                        <td rowSpan={3} className="text-center align-middle mono" style={{ width: '60px', fontWeight: 700, color: '#f59e0b' }}>
                                            {activeScenario ? `${activeScenario.moonChance}%` : '--'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>
                                            <img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.crystal)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>
                                            <img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.deuterium)}</td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.debris.total)}</td>
                                        <td className="darker">
                                            <select
                                                value={recyclerSender}
                                                onChange={(e) => setRecyclerSender(e.target.value as any)}
                                                className="ogsim-select-xs"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="atk">A1</option>
                                                <option value="def">D1</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} className="text-end mono">{fmt(activeScenario?.recyclersNeeded)}</td>
                                        <td className="darker text-center"><strong>Recyclers</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Attackers Losses & Profit Table */}
                        <div className="ogsim-table-wrap">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={4} className="text-center">Attackers</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} style={{ width: '50%' }}>Losses</th>
                                        <th colSpan={2} style={{ width: '50%' }}>Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.attackers.metal)}</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className={`text-end mono ${(activeScenario?.profit.metal || 0) >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                                            {fmt(activeScenario?.profit.metal)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.attackers.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className={`text-end mono ${(activeScenario?.profit.crystal || 0) >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                                            {fmt(activeScenario?.profit.crystal)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.attackers.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className={`text-end mono ${(activeScenario?.profit.deuterium || 0) >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                                            {fmt(activeScenario?.profit.deuterium)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.losses.attackers.total)}</td>
                                        <td className="darker text-center">=</td>
                                        <td className={`darker text-end mono ${(activeScenario?.profit.total || 0) >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                                            {fmt(activeScenario?.profit.total)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Defenders Losses & Profit Table */}
                        <div className="ogsim-table-wrap">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={4} className="text-center">Defenders</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} style={{ width: '50%' }}>Losses</th>
                                        <th colSpan={2} style={{ width: '50%' }}>Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.defenders.metal)}</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono profit-neg">
                                            {fmt(-(activeScenario?.losses.defenders.metal || 0))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.defenders.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono profit-neg">
                                            {fmt(-(activeScenario?.losses.defenders.crystal || 0))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.losses.defenders.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono profit-neg">
                                            {fmt(-(activeScenario?.losses.defenders.deuterium || 0))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.losses.defenders.total)}</td>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono profit-neg">
                                            {fmt(-(activeScenario?.losses.defenders.total || 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Plunder Table */}
                        <div className="ogsim-table-wrap">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={6} className="text-center">Plunder</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} style={{ width: '33%' }}>Captured</th>
                                        <th colSpan={2} style={{ width: '33%' }}>Possible</th>
                                        <th colSpan={2} style={{ width: '34%' }}>Cargo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.captured.metal)}</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.possible.metal)}</td>
                                        <td style={{ width: '24px', textAlign: 'center' }}>
                                            <img src={UNIT_ICONS[202]} alt="SC" className="ogsim-unit-mini-icon" />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.cargoNeeded.smallCargo)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.captured.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.possible.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <img src={UNIT_ICONS[203]} alt="LC" className="ogsim-unit-mini-icon" />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.cargoNeeded.largeCargo)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.captured.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.plunder.possible.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <img src={UNIT_ICONS[219]} alt="PF" className="ogsim-unit-mini-icon" />
                                        </td>
                                        <td className="text-end mono">{fmt(activeScenario?.cargoNeeded.pathfinder)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.food} alt="F" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.food} alt="F" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                        <td colSpan={2}>
                                            <select
                                                value={cargoSender}
                                                onChange={(e) => setCargoSender(parseInt(e.target.value))}
                                                className="ogsim-select-xs"
                                                style={{ width: '100%' }}
                                            >
                                                {currentWave.attackers.map((a, i) => (
                                                    <option key={i} value={i}>{a.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.plunder.captured.total)}</td>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.plunder.possible.total)}</td>
                                        <td colSpan={2} className="darker text-center mono">
                                            {activeScenario && activeScenario.plunder.possible.total > 0
                                                ? `${Math.round((activeScenario.plunder.captured.total / activeScenario.plunder.possible.total) * 100)}% Captured`
                                                : '-- Captured'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Debris harvested (Reapers + ARP) Table */}
                        <div className="ogsim-table-wrap">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={6} className="text-center">Debris harvested (Reapers + ARP)</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} style={{ width: '33%' }}>Initial</th>
                                        <th colSpan={2} style={{ width: '33%' }}>Attackers</th>
                                        <th colSpan={2} style={{ width: '34%' }}>Defenders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.metal)}</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.reaperHarvest.metal)}</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.reaperHarvest.crystal)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.debris.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.reaperHarvest.deuterium)}</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.debris.total)}</td>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.reaperHarvest.total)}</td>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">0</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} className="darker text-end mono">{fmt(activeScenario?.recyclersNeeded)}</td>
                                        <td colSpan={4} className="darker text-start"><strong>Recyclers</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Wreckfield Table */}
                        <div className="ogsim-table-wrap">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th colSpan={4} className="text-center">Wreckfield</th>
                                    </tr>
                                    <tr>
                                        <th colSpan={2} style={{ width: '50%' }}>Attackers</th>
                                        <th colSpan={2} style={{ width: '50%' }}>Defenders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                        <td style={{ width: '22px', textAlign: 'center' }}><img src={RESOURCE_ICONS.metal} alt="M" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.wreckfield.resources.metal)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.crystal} alt="C" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.wreckfield.resources.crystal)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">0</td>
                                        <td style={{ textAlign: 'center' }}><img src={RESOURCE_ICONS.deuterium} alt="D" style={{ width: '16px' }} /></td>
                                        <td className="text-end mono">{fmt(activeScenario?.wreckfield.resources.deuterium)}</td>
                                    </tr>
                                    <tr>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">0</td>
                                        <td className="darker text-center">=</td>
                                        <td className="darker text-end mono">{fmt(activeScenario?.wreckfield.resources.total)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} className="darker text-center" style={{ padding: '4px' }}>
                                            <button
                                                onClick={() => setWreckfieldModalOpen(true)}
                                                className="ogsim-btn-xs"
                                                style={{ width: '100%' }}
                                            >
                                                Detailed view
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MULTI-WAVE TOTAL SUMMARY */}
            {waves.length > 1 && (
                <div className="ogsim-waves-total">
                    <div className="ogsim-waves-title">Waves Total Summary ({waves.length} Waves)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <div>
                            <table className="ogsim-table">
                                <thead>
                                    <tr><th colSpan={2} className="text-center">Attackers Total Losses</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Losses</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.losses.attackers.total || 0), 0))}</td></tr>
                                    <tr><td>Net Profit</td><td className={`text-end mono ${waves.reduce((acc, w) => acc + (w.results?.scenarios.average.profit.total || 0), 0) >= 0 ? 'profit-pos' : 'profit-neg'}`}>{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.profit.total || 0), 0))}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <table className="ogsim-table">
                                <thead>
                                    <tr><th colSpan={2} className="text-center">Defenders Total Losses</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Losses</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.losses.defenders.total || 0), 0))}</td></tr>
                                    <tr><td>Net Profit</td><td className="text-end mono profit-neg">{fmt(-waves.reduce((acc, w) => acc + (w.results?.scenarios.average.losses.defenders.total || 0), 0))}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <table className="ogsim-table">
                                <thead>
                                    <tr><th colSpan={2} className="text-center">Total Debris</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Debris</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.debris.total || 0), 0))}</td></tr>
                                    <tr><td>Recyclers</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.recyclersNeeded || 0), 0))}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <table className="ogsim-table">
                                <thead>
                                    <tr><th colSpan={2} className="text-center">Total Plunder</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Captured</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.plunder.captured.total || 0), 0))}</td></tr>
                                    <tr><td>Possible</td><td className="text-end mono">{fmt(waves.reduce((acc, w) => acc + (w.results?.scenarios.average.plunder.possible.total || 0), 0))}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
               MODAL 1: LIFEFORM BONUSES MODAL
               ======================================================== */}
            {lfModalSide && (
                <div className="ogsim-modal-backdrop" onClick={() => setLfModalSide(null)}>
                    <div className="ogsim-modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="ogsim-modal-header">
                            <span className="ogsim-modal-title">Lifeform Bonuses ({lfModalSide === 'atk' ? 'Attacker' : 'Defender'})</span>
                            <button onClick={() => setLfModalSide(null)} className="ogsim-ctrl-btn"><X size={18} /></button>
                        </div>
                        <div className="ogsim-modal-body">
                            <div className="ogsim-data-box">
                                <div className="ogsim-box-title">Global Lifeform Tech Bonuses (%)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Weapons %</span>
                                        <input
                                            type="number"
                                            size={4}
                                            value={currentAtk.lifeformBonuses.globalWeapon}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                updateCurrentWave(w => {
                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    list[idx].lifeformBonuses.globalWeapon = val;
                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Shielding %</span>
                                        <input
                                            type="number"
                                            size={4}
                                            value={currentAtk.lifeformBonuses.globalShield}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                updateCurrentWave(w => {
                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    list[idx].lifeformBonuses.globalShield = val;
                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span className="ogsim-row-label">Armour %</span>
                                        <input
                                            type="number"
                                            size={4}
                                            value={currentAtk.lifeformBonuses.globalArmour}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                updateCurrentWave(w => {
                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    list[idx].lifeformBonuses.globalArmour = val;
                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="ogsim-data-box">
                                <div className="ogsim-box-title">Per-Ship Combat Bonuses (%)</div>
                                <table className="ogsim-table">
                                    <thead>
                                        <tr>
                                            <th>Unit</th>
                                            <th className="text-center">Armour %</th>
                                            <th className="text-center">Shield %</th>
                                            <th className="text-center">Weapon %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SIM_SHIP_IDS.map(id => {
                                            const u = UNITS[id];
                                            const party = lfModalSide === 'atk' ? currentAtk : currentDef;
                                            return (
                                                <tr key={id}>
                                                    <td>{u.name}</td>
                                                    <td className="text-center">
                                                        <input
                                                            type="number"
                                                            size={4}
                                                            value={party.lifeformBonuses.perShipArmour[id] || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                updateCurrentWave(w => {
                                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                                    list[idx].lifeformBonuses.perShipArmour[id] = val;
                                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                                });
                                                            }}
                                                            className="ogsim-input-xs"
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <input
                                                            type="number"
                                                            size={4}
                                                            value={party.lifeformBonuses.perShipShield[id] || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                updateCurrentWave(w => {
                                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                                    list[idx].lifeformBonuses.perShipShield[id] = val;
                                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                                });
                                                            }}
                                                            className="ogsim-input-xs"
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <input
                                                            type="number"
                                                            size={4}
                                                            value={party.lifeformBonuses.perShipWeapon[id] || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                updateCurrentWave(w => {
                                                                    const list = lfModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                                    const idx = lfModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                                    list[idx].lifeformBonuses.perShipWeapon[id] = val;
                                                                    return lfModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                                });
                                                            }}
                                                            className="ogsim-input-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="ogsim-modal-footer">
                            <button onClick={() => setLfModalSide(null)} className="ogsim-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
               MODAL 2: RECYCLERS SET-UP MODAL
               ======================================================== */}
            {recyclersModalSide && (
                <div className="ogsim-modal-backdrop" onClick={() => setRecyclersModalSide(null)}>
                    <div className="ogsim-modal modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ogsim-modal-header">
                            <span className="ogsim-modal-title">Recyclers Set-Up</span>
                            <button onClick={() => setRecyclersModalSide(null)} className="ogsim-ctrl-btn"><X size={18} /></button>
                        </div>
                        <div className="ogsim-modal-body">
                            <div className="ogsim-data-box">
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Recyclers</span>
                                    <input
                                        type="number"
                                        size={8}
                                        min={0}
                                        value={currentAtk.recyclersConfig?.count || 0}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateCurrentWave(w => {
                                                const list = recyclersModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                const idx = recyclersModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                const cfg = list[idx].recyclersConfig || { count: 0, coords: { ...list[idx].coords }, speedPercent: 100 };
                                                cfg.count = val;
                                                list[idx].recyclersConfig = cfg;
                                                return recyclersModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                            });
                                        }}
                                        className="ogsim-input-xs"
                                    />
                                </div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Coordinates</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <input
                                            type="number"
                                            size={3}
                                            value={currentAtk.recyclersConfig?.coords.galaxy || currentAtk.coords.galaxy}
                                            onChange={(e) => {
                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                updateCurrentWave(w => {
                                                    const list = recyclersModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = recyclersModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    const cfg = list[idx].recyclersConfig || { count: 0, coords: { ...list[idx].coords }, speedPercent: 100 };
                                                    cfg.coords.galaxy = val;
                                                    list[idx].recyclersConfig = cfg;
                                                    return recyclersModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            size={4}
                                            value={currentAtk.recyclersConfig?.coords.system || currentAtk.coords.system}
                                            onChange={(e) => {
                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                updateCurrentWave(w => {
                                                    const list = recyclersModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = recyclersModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    const cfg = list[idx].recyclersConfig || { count: 0, coords: { ...list[idx].coords }, speedPercent: 100 };
                                                    cfg.coords.system = val;
                                                    list[idx].recyclersConfig = cfg;
                                                    return recyclersModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            size={3}
                                            value={currentAtk.recyclersConfig?.coords.position || currentAtk.coords.position}
                                            onChange={(e) => {
                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                updateCurrentWave(w => {
                                                    const list = recyclersModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                    const idx = recyclersModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                    const cfg = list[idx].recyclersConfig || { count: 0, coords: { ...list[idx].coords }, speedPercent: 100 };
                                                    cfg.coords.position = val;
                                                    list[idx].recyclersConfig = cfg;
                                                    return recyclersModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                                });
                                            }}
                                            className="ogsim-input-xs"
                                        />
                                    </div>
                                </div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Speed</span>
                                    <select
                                        value={currentAtk.recyclersConfig?.speedPercent || 100}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            updateCurrentWave(w => {
                                                const list = recyclersModalSide === 'atk' ? [...w.attackers] : [...w.defenders];
                                                const idx = recyclersModalSide === 'atk' ? activeAtkTab : activeDefTab;
                                                const cfg = list[idx].recyclersConfig || { count: 0, coords: { ...list[idx].coords }, speedPercent: 100 };
                                                cfg.speedPercent = val;
                                                list[idx].recyclersConfig = cfg;
                                                return recyclersModalSide === 'atk' ? { ...w, attackers: list } : { ...w, defenders: list };
                                            });
                                        }}
                                        className="ogsim-select-xs"
                                    >
                                        {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map(s => (
                                            <option key={s} value={s}>{s}%</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="ogsim-modal-footer">
                            <button onClick={() => setRecyclersModalSide(null)} className="ogsim-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
               MODAL 3: IPM SIMULATOR MODAL
               ======================================================== */}
            {ipmModalOpen && (
                <div className="ogsim-modal-backdrop" onClick={() => setIpmModalOpen(false)}>
                    <div className="ogsim-modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="ogsim-modal-header">
                            <span className="ogsim-modal-title">IPM Simulator</span>
                            <button onClick={() => setIpmModalOpen(false)} className="ogsim-ctrl-btn"><X size={18} /></button>
                        </div>
                        <div className="ogsim-modal-body">
                            <div className="ogsim-data-box">
                                <div className="ogsim-box-title">Attacker</div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Select attacker</span>
                                    <select
                                        value={ipmAttackerIdx}
                                        onChange={(e) => setIpmAttackerIdx(parseInt(e.target.value))}
                                        className="ogsim-select-xs"
                                    >
                                        {currentWave.attackers.map((a, i) => (
                                            <option key={i} value={i}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="ogsim-box-row">
                                    <span className="ogsim-row-label">Flight time</span>
                                    <span className="mono">{NexuSimEngine.formatDuration(atkFlightTime)}</span>
                                </div>
                            </div>

                            <div className="ogsim-data-box">
                                <div className="ogsim-box-title">Defence Targets & Interplanetary Missiles</div>
                                <table className="ogsim-table">
                                    <thead>
                                        <tr>
                                            <th>Structure</th>
                                            <th className="text-center">Current</th>
                                            <th className="text-center">Target Missiles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SIM_DEFENSE_IDS.map(id => {
                                            const u = UNITS[id];
                                            const count = primaryDef.units[id] || 0;
                                            return (
                                                <tr key={id}>
                                                    <td>{u.name}</td>
                                                    <td className="text-center mono">{count.toLocaleString()}</td>
                                                    <td className="text-center">
                                                        <input
                                                            type="number"
                                                            size={6}
                                                            min={0}
                                                            value={ipmTargets[id] || 0}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                setIpmTargets(prev => ({ ...prev, [id]: val }));
                                                            }}
                                                            className="ogsim-input-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                        <strong>Total missiles needed:</strong>{' '}
                                        <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>
                                            {Object.values(ipmTargets).reduce((a, b) => a + b, 0).toLocaleString()}
                                        </span>
                                    </span>
                                    <button
                                        onClick={() => {
                                            const totalMissiles = Object.values(ipmTargets).reduce((a, b) => a + b, 0);
                                            const primaryTarget = Object.keys(ipmTargets).map(Number).find(id => ipmTargets[id] > 0) || 401;
                                            const res = NexuSimEngine.calculateIpmStrike(
                                                totalMissiles,
                                                primaryTarget,
                                                primaryDef.units,
                                                { armour: primaryDef.techs.armour },
                                                { weapons: currentWave.attackers[ipmAttackerIdx]?.techs.weapons || 0 }
                                            );
                                            setIpmResult(res);
                                        }}
                                        className="ogsim-btn-xs"
                                    >
                                        Calculate Impact
                                    </button>
                                </div>
                            </div>

                            {ipmResult && (
                                <div className="ogsim-data-box" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                    <div className="ogsim-box-title" style={{ color: '#f87171' }}>Strike Results</div>
                                    <div className="ogsim-box-row">
                                        <span>ABMs Intercepted:</span>
                                        <strong className="mono">{ipmResult.abmIntercepted}</strong>
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span>Effective Hits:</span>
                                        <strong className="mono">{ipmResult.effectiveIpm}</strong>
                                    </div>
                                    <div className="ogsim-box-row">
                                        <span>Defenses Destroyed:</span>
                                        <strong className="mono">
                                            {Object.values(ipmResult.neutralizedDefenses).reduce((a, b) => a + b, 0).toLocaleString()}
                                        </strong>
                                    </div>
                                    <button
                                        onClick={() => {
                                            updateCurrentWave(w => {
                                                const defs = [...w.defenders];
                                                defs[0] = { ...defs[0], units: { ...ipmResult.remainingDefenses } };
                                                return { ...w, defenders: defs };
                                            });
                                            setIpmModalOpen(false);
                                        }}
                                        className="ogsim-btn"
                                        style={{ width: '100%', marginTop: '6px', background: '#dc2626' }}
                                    >
                                        Apply Damage to Defender
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="ogsim-modal-footer">
                            <button onClick={() => setIpmModalOpen(false)} className="ogsim-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
               MODAL 4: SHIP STATS MODAL
               ======================================================== */}
            {shipStatsModalSide && (
                <div className="ogsim-modal-backdrop" onClick={() => setShipStatsModalSide(null)}>
                    <div className="ogsim-modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="ogsim-modal-header">
                            <span className="ogsim-modal-title">Ships Stats ({shipStatsModalSide === 'atk' ? 'Attacker' : 'Defender'})</span>
                            <button onClick={() => setShipStatsModalSide(null)} className="ogsim-ctrl-btn"><X size={18} /></button>
                        </div>
                        <div className="ogsim-modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {SIM_SHIP_IDS.map(id => {
                                    const u = UNITS[id];
                                    const party = shipStatsModalSide === 'atk' ? currentAtk : currentDef;
                                    const stats = NexuSimEngine.calculateUnitStats(id, party, serverSettings);
                                    const speed = NexuSimEngine.calculateShipSpeed(id, party, serverSettings);

                                    return (
                                        <div key={id} className="ogsim-data-box">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <img src={UNIT_ICONS[id]} alt={u.name} className="ogsim-unit-mini-icon" style={{ width: '32px', height: '32px' }} />
                                                <strong style={{ fontSize: '0.82rem' }}>{u.name}</strong>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem' }}>
                                                <div>Weapon: <strong className="mono">{stats.weapon.toLocaleString()}</strong></div>
                                                <div>Cargo: <strong className="mono">{stats.cargo.toLocaleString()}</strong></div>
                                                <div>Shield: <strong className="mono">{stats.shield.toLocaleString()}</strong></div>
                                                <div>Speed: <strong className="mono">{speed.toLocaleString()}</strong></div>
                                                <div>Armour: <strong className="mono">{stats.armour.toLocaleString()}</strong></div>
                                                <div>Fuel: <strong className="mono">{stats.fuel.toLocaleString()}</strong></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="ogsim-modal-footer">
                            <button onClick={() => setShipStatsModalSide(null)} className="ogsim-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
               MODAL 5: WRECKFIELD DETAILED VIEW MODAL
               ======================================================== */}
            {wreckfieldModalOpen && (
                <div className="ogsim-modal-backdrop" onClick={() => setWreckfieldModalOpen(false)}>
                    <div className="ogsim-modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="ogsim-modal-header">
                            <span className="ogsim-modal-title">Wreckfield Details (Space Dock Recovery)</span>
                            <button onClick={() => setWreckfieldModalOpen(false)} className="ogsim-ctrl-btn"><X size={18} /></button>
                        </div>
                        <div className="ogsim-modal-body">
                            <table className="ogsim-table">
                                <thead>
                                    <tr>
                                        <th>Unit</th>
                                        <th className="text-center">Attacker Repaired</th>
                                        <th className="text-center">Defender Repaired</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SIM_SHIP_IDS.map(id => {
                                        const u = UNITS[id];
                                        const atkCount = activeScenario?.wreckfield.attackers[id] || 0;
                                        const defCount = activeScenario?.wreckfield.defenders[id] || 0;
                                        if (atkCount === 0 && defCount === 0) return null;

                                        return (
                                            <tr key={id}>
                                                <td>{u.name}</td>
                                                <td className="text-center mono">{atkCount.toLocaleString()}</td>
                                                <td className="text-center mono" style={{ color: '#4ade80', fontWeight: 700 }}>
                                                    {defCount.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {(!activeScenario || Object.values(activeScenario.wreckfield.defenders).every(v => v === 0)) && (
                                <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '12px' }}>
                                    No ships were recovered in this combat scenario (minimum 150,000 lost resources required).
                                </p>
                            )}
                        </div>
                        <div className="ogsim-modal-footer">
                            <button onClick={() => setWreckfieldModalOpen(false)} className="ogsim-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NexuSim;
