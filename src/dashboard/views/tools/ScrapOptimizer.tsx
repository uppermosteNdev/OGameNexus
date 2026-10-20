import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Globe, X, Maximize2, ChevronDown, Rocket, Layers, MapPin, SlidersHorizontal, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';

import { calculateMSU, DEFAULT_RATES } from '../../../utils/amortizationCalc';
import { cleanUniverseId, isSameUniverse } from '../../../utils/universe';
import { useTranslation } from '../../../i18n';

export type FleetMode = 'all' | 'stationary' | 'manual';

export interface StorageOverflowInfo {
    res: 'm' | 'c' | 'd';
    name: string;
    buildingName: string;
    icon: string;
    color: string;
    currentCap: number;
    neededCap: number;
    overflowAmount: number;
    currentLevel: number;
    requiredLevel: number;
    levelsNeeded: number;
    newCap: number;
    cost: { metal: number; crystal: number; deuterium: number };
    msuCost: number;
}

// OGame base storage capacity: 5000 * floor(2.5 * e^(20/33 * level))
export function getBaseStorageCap(level: number): number {
    const lvl = Math.max(0, level || 0);
    return 5000 * Math.floor(2.5 * Math.exp((20 / 33) * lvl));
}

export function calculateStorageCapWithMultiplier(level: number, multiplier: number = 1.0): number {
    const base = getBaseStorageCap(level);
    return Math.floor(base * Math.max(1.0, multiplier));
}

export function inferStorageLevel(capacity: number, multiplier: number = 1.0): number {
    if (capacity <= 10000) return 0;
    for (let lvl = 0; lvl <= 50; lvl++) {
        const nextCap = calculateStorageCapWithMultiplier(lvl + 1, multiplier);
        if (capacity < nextCap) {
            return lvl;
        }
    }
    return 0;
}

export function getRequiredStorageLevel(neededCap: number, currentLevel: number, multiplier: number = 1.0): { reqLevel: number, newCap: number } {
    let lvl = Math.max(0, currentLevel);
    while (lvl <= 60) {
        const cap = calculateStorageCapWithMultiplier(lvl, multiplier);
        if (cap >= neededCap) {
            return { reqLevel: lvl, newCap: cap };
        }
        lvl++;
    }
    return { reqLevel: lvl, newCap: calculateStorageCapWithMultiplier(lvl, multiplier) };
}

export function calculateStorageUpgradeCost(
    res: 'm' | 'c' | 'd',
    fromLevel: number,
    toLevel: number
): { metal: number; crystal: number; deuterium: number } {
    const fromLvl = Math.max(0, fromLevel);
    const toLvl = Math.max(fromLvl, toLevel);

    let totalM = 0;
    let totalC = 0;
    let totalD = 0;

    for (let lvl = fromLvl + 1; lvl <= toLvl; lvl++) {
        const factor = Math.pow(2, lvl - 1);
        if (res === 'm') {
            totalM += 1000 * factor;
        } else if (res === 'c') {
            totalM += 1000 * factor;
            totalC += 500 * factor;
        } else if (res === 'd') {
            totalM += 1000 * factor;
            totalC += 1000 * factor;
        }
    }

    return { metal: totalM, crystal: totalC, deuterium: totalD };
}

export function formatCompact(num: number): string {
    if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.floor(num).toLocaleString();
}

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

const SHIP_ALIASES: Record<string, string[]> = {
    "Small Cargo": [
        "small cargo", "kleiner transporter", "petit transporteur",
        "carguero pequeño", "carguero pequeno", "nave pequeña de carga",
        "mały transporter", "maly transporter", "малый транспорт",
        "sc", "202"
    ],
    "Large Cargo": [
        "large cargo", "großer transporter", "grosser transporter", "grand transporteur",
        "carguero grande", "nave grande de carga",
        "duży transporter", "duzy transporter", "большой транспорт",
        "lc", "203"
    ],
    "Light Fighter": [
        "light fighter", "leichter jäger", "leichter jaeger", "chasseur léger", "chasseur leger",
        "cazador ligero", "lekki myśliwiec", "lekki mysliwiec", "легкий истребитель",
        "lf", "204"
    ],
    "Heavy Fighter": [
        "heavy fighter", "schwerer jäger", "schwerer jaeger", "chasseur lourd",
        "cazador pesado", "ciężki myśliwiec", "ciezki mysliwiec", "тяжелый истребитель",
        "hf", "205"
    ],
    "Cruiser": [
        "cruiser", "kreuzer", "croiseur", "crucero", "krążownik", "krazownik", "крейсер",
        "cr", "206"
    ],
    "Battleship": [
        "battleship", "schlachtschiff", "vaisseau de bataille", "nave de batalla",
        "okręt wojenny", "okret wojenny", "линкор",
        "bs", "207"
    ],
    "Colony Ship": [
        "colony ship", "kolonieschiff", "vaisseau de colonisation", "colonizador",
        "statek kolonizacyjny", "колонизатор",
        "cs", "208"
    ],
    "Recycler": [
        "recycler", "recicladora", "reciclador", "recycleur", "recykler", "переработчик",
        "rec", "209"
    ],
    "Espionage Probe": [
        "espionage probe", "spionagesonde", "sonde d'espionnage", "sonde despionnage",
        "sonda de espionaje", "sonda szpiegowska", "шпионский зонд",
        "probe", "ep", "210"
    ],
    "Bomber": [
        "bomber", "bombardier", "bombardero", "bombowiec", "бомбардировщик",
        "211"
    ],
    "Destroyer": [
        "destroyer", "zerstörer", "zerstoerer", "destructeur", "destructor",
        "niszczyciel", "уничтожитель",
        "dd", "213"
    ],
    "Deathstar": [
        "deathstar", "todesstern", "étoile de la mort", "etoile de la mort",
        "estrella de la muerte", "gwiazda śmierci", "gwiazda smierci", "звезда смерти",
        "rip", "214"
    ],
    "Battlecruiser": [
        "battlecruiser", "schlachtkreuzer", "traqueur", "acorazado",
        "pancernik", "линейный крейсер",
        "bc", "215"
    ],
    "Reaper": [
        "reaper", "faucheur", "segador", "żniwiarz", "zniwiarz", "жнец",
        "218"
    ],
    "Pathfinder": [
        "pathfinder", "eclaireur", "éclaireur", "explorador", "pionier", "первопроходец",
        "pf", "219"
    ]
};

function matchShipKey(rawName: string): string | null {
    if (!rawName) return null;
    const trimmed = rawName.trim();
    if (SHIP_RESOURCES[trimmed]) return trimmed;

    const lower = trimmed.toLowerCase().replace(/[:.]/g, '');
    for (const [key, aliases] of Object.entries(SHIP_ALIASES)) {
        if (lower === key.toLowerCase() || aliases.some(a => lower === a || lower.includes(a))) {
            return key;
        }
    }
    return null;
}

const computeFlyingTotals = (
    rawFleets: any[],
    targetPlayerId?: string,
    targetUniverse?: string,
    validCoords?: Set<string>
): Record<string, number> => {
    const totals: Record<string, number> = {};
    Object.keys(SHIP_RESOURCES).forEach(k => { totals[k] = 0; });
    if (!Array.isArray(rawFleets)) return totals;

    const cleanTargetUni = targetUniverse ? cleanUniverseId(targetUniverse) : null;

    rawFleets.forEach(fleet => {
        // 1. Account / Player ID verification:
        if (targetPlayerId && fleet.playerId && String(fleet.playerId) !== String(targetPlayerId)) {
            return;
        }

        // 2. Universe verification:
        if (cleanTargetUni && fleet.universe && !isSameUniverse(fleet.universe, cleanTargetUni)) {
            return;
        }

        // 3. Planet / Moon Coordinates verification:
        // A player's own flying fleets originate from or return to one of their planets or moons.
        if (validCoords && validCoords.size > 0) {
            const originStr = fleet.originCoords
                || (fleet.origin && typeof fleet.origin === 'object' ? fleet.origin.coords : null)
                || (typeof fleet.origin === 'string' ? fleet.origin.match(/\d+:\d+:\d+/)?.[0] : null);
            const destStr = fleet.destCoords
                || (fleet.destination && typeof fleet.destination === 'object' ? fleet.destination.coords : null)
                || (typeof fleet.destination === 'string' ? fleet.destination.match(/\d+:\d+:\d+/)?.[0] : null);

            const hasMatchingCoord = (originStr && validCoords.has(originStr)) || (destStr && validCoords.has(destStr));
            if (!hasMatchingCoord) {
                return;
            }
        }

        const isOwn = fleet.isOwn !== undefined
            ? Boolean(fleet.isOwn)
            : Boolean(fleet.origin?.isOwn && !fleet.isHostile);
        if (!isOwn) return;

        const ships = fleet.ships;
        if (ships && typeof ships === 'object') {
            Object.entries(ships).forEach(([rawName, count]) => {
                const num = typeof count === 'number' ? count : (parseInt(String(count).replace(/\D/g, ''), 10) || 0);
                if (num <= 0) return;
                const matchedKey = matchShipKey(rawName);
                if (matchedKey) {
                    totals[matchedKey] = (totals[matchedKey] || 0) + num;
                }
            });
        }
    });

    return totals;
};

const ScrapOptimizer: React.FC = () => {
    const { getEntityName, getResource, t } = useTranslation();
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const rates: any = useLiveQuery(() => db.settings.get('conversion_rates')) || DEFAULT_RATES;
    const allLocations = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    ) || [];

    const planetsOnly = allLocations.filter(p => p.type === 'planet');

    const stationaryTotals = useMemo(() => {
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

    const planetCoordsSet = useMemo(() => {
        const set = new Set<string>();
        allLocations.forEach(p => {
            if (p.coords) set.add(p.coords);
        });
        return set;
    }, [allLocations]);

    const [fleetMode, setFleetMode] = useState<FleetMode>('all');
    const [flyingTotals, setFlyingTotals] = useState<Record<string, number>>({});

    const effectiveMaxTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        Object.keys(SHIP_RESOURCES).forEach(name => {
            const stat = stationaryTotals[name] || 0;
            const fly = flyingTotals[name] || 0;
            if (fleetMode === 'all') {
                totals[name] = stat + fly;
            } else if (fleetMode === 'stationary') {
                totals[name] = stat;
            } else {
                // In manual mode, effectiveMaxTotals represents baseline owned for display and MAX fill
                totals[name] = stat + fly;
            }
        });
        return totals;
    }, [stationaryTotals, flyingTotals, fleetMode]);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load flying fleet counts from storage and subscribe to real-time sync updates
    useEffect(() => {
        let isMounted = true;
        if (!activeAccount) {
            setFlyingTotals({});
            return;
        }

        const pId = activeAccount.playerId;
        const uni = cleanUniverseId(activeAccount.universe);
        const scopedFlyingKey1 = `nexus_flying_fleets_${uni}_${pId}`;
        const scopedFlyingKey2 = `nexus_flying_fleets_${pId}`;
        const scopedMovementKey1 = `nexus_fleet_movements_${uni}_${pId}`;
        const scopedMovementKey2 = `nexus_fleet_movements_${pId}`;

        const loadFlyingFleets = async () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    const keys = [
                        scopedFlyingKey1,
                        scopedFlyingKey2,
                        scopedMovementKey1,
                        scopedMovementKey2,
                        'nexus_flying_fleets',
                        'nexus_fleet_movements'
                    ];
                    const res = await chrome.storage.local.get(keys);
                    const fleets = res[scopedFlyingKey1]
                        || res[scopedFlyingKey2]
                        || res[scopedMovementKey1]?.fleets
                        || res[scopedMovementKey2]?.fleets
                        || res?.nexus_flying_fleets
                        || res?.nexus_fleet_movements?.fleets
                        || [];

                    if (isMounted) {
                        setFlyingTotals(computeFlyingTotals(fleets, pId, uni, planetCoordsSet));
                    }
                }
            } catch (e) {
                console.error("Failed to load flying fleets in ScrapOptimizer", e);
            }
        };

        loadFlyingFleets();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && isMounted) {
                if (changes[scopedFlyingKey1]) {
                    setFlyingTotals(computeFlyingTotals(changes[scopedFlyingKey1].newValue || [], pId, uni, planetCoordsSet));
                } else if (changes[scopedFlyingKey2]) {
                    setFlyingTotals(computeFlyingTotals(changes[scopedFlyingKey2].newValue || [], pId, uni, planetCoordsSet));
                } else if (changes[scopedMovementKey1]) {
                    const fleets = changes[scopedMovementKey1].newValue?.fleets || [];
                    setFlyingTotals(computeFlyingTotals(fleets, pId, uni, planetCoordsSet));
                } else if (changes[scopedMovementKey2]) {
                    const fleets = changes[scopedMovementKey2].newValue?.fleets || [];
                    setFlyingTotals(computeFlyingTotals(fleets, pId, uni, planetCoordsSet));
                } else if (changes['nexus_flying_fleets']) {
                    setFlyingTotals(computeFlyingTotals(changes['nexus_flying_fleets'].newValue || [], pId, uni, planetCoordsSet));
                } else if (changes['nexus_fleet_movements']) {
                    const fleets = changes['nexus_fleet_movements'].newValue?.fleets || [];
                    setFlyingTotals(computeFlyingTotals(fleets, pId, uni, planetCoordsSet));
                }
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                isMounted = false;
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }

        return () => {
            isMounted = false;
        };
    }, [activeAccount?.playerId, activeAccount?.universe, planetCoordsSet]);

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
                if (data.fleetMode && ['all', 'stationary', 'manual'].includes(data.fleetMode)) {
                    setFleetMode(data.fleetMode);
                }
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
        const data = { scrapPercent, limits, priorities, fleet, selectedPlanetId, fleetMode };
        localStorage.setItem('og-nexus-scrap-optimizer', JSON.stringify(data));
    }, [scrapPercent, limits, priorities, fleet, selectedPlanetId, fleetMode]);

    // Clamping effect: ONLY clamps when NOT in manual mode
    useEffect(() => {
        if (fleetMode === 'manual') return;
        if (!allLocations || allLocations.length === 0) return;

        setFleet(prev => {
            let changed = false;
            const updated = { ...prev };
            Object.keys(SHIP_RESOURCES).forEach(name => {
                const max = effectiveMaxTotals[name] || 0;
                if (updated[name] > max) {
                    updated[name] = max;
                    changed = true;
                }
            });
            return changed ? updated : prev;
        });
    }, [effectiveMaxTotals, allLocations, fleetMode]);

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
        if (isDefence) {
            const max = defenseTotals[name] || 0;
            const safeVal = Math.max(0, Math.min(val, max));
            setFleet(prev => ({ ...prev, [name]: safeVal }));
            return;
        }

        if (fleetMode === 'manual') {
            // Manual mode allows player to exceed owned limits without capping
            const safeVal = Math.max(0, val);
            setFleet(prev => ({ ...prev, [name]: safeVal }));
        } else {
            const max = effectiveMaxTotals[name] || 0;
            const safeVal = Math.max(0, Math.min(val, max));
            setFleet(prev => ({ ...prev, [name]: safeVal }));
        }
    };

    const handleLimitChange = (key: keyof typeof limits, value: string) => {
        const num = parseInt(value.replace(/\D/g, '')) || 0;
        setLimits(prev => ({ ...prev, [key]: num }));
        setSelectedPlanetId(null);
    };

    const fillAllShips = () => {
        setFleet({
            ...effectiveMaxTotals,
            ...Object.keys(DEFENCE_RESOURCES).reduce((acc, name) => ({ ...acc, [name]: 0 }), {})
        });
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

    const totalSelectedReturn = useMemo(() => {
        const ratio = scrapPercent / 100;
        const ALL_RESOURCES = { ...SHIP_RESOURCES, ...DEFENCE_RESOURCES };
        let m = 0;
        let c = 0;
        let d = 0;

        Object.entries(fleet).forEach(([name, count]) => {
            const data = ALL_RESOURCES[name];
            if (data && count > 0) {
                m += count * data.m * ratio;
                c += count * data.c * ratio;
                d += count * data.d * ratio;
            }
        });

        return { m, c, d };
    }, [fleet, scrapPercent]);

    const storageOverflows = useMemo((): StorageOverflowInfo[] => {
        const overflows: StorageOverflowInfo[] = [];

        const checkResource = (
            res: 'm' | 'c' | 'd',
            name: string,
            buildingName: string,
            icon: string,
            color: string,
            currentCap: number,
            neededCap: number,
            planetStorageLevel?: number
        ) => {
            if (currentCap <= 0 || neededCap <= currentCap) return;

            let currentLevel = planetStorageLevel || 0;
            let base = getBaseStorageCap(currentLevel);
            let multiplier = 1.0;

            if (currentLevel > 0 && base > 0) {
                multiplier = currentCap / base;
            } else {
                currentLevel = inferStorageLevel(currentCap, 1.0);
                base = getBaseStorageCap(currentLevel);
                multiplier = base > 0 ? currentCap / base : 1.0;
            }

            const { reqLevel, newCap } = getRequiredStorageLevel(neededCap, currentLevel, multiplier);
            const levelsNeeded = Math.max(1, reqLevel - currentLevel);
            const cost = calculateStorageUpgradeCost(res, currentLevel, reqLevel);
            const msuCost = calculateMSU(cost, rates);

            overflows.push({
                res,
                name,
                buildingName,
                icon,
                color,
                currentCap,
                neededCap,
                overflowAmount: neededCap - currentCap,
                currentLevel,
                requiredLevel: reqLevel,
                levelsNeeded,
                newCap,
                cost,
                msuCost
            });
        };

        checkResource(
            'm',
            getResource('metal'),
            getEntityName(22),
            'icons/resources/metal_storage_large.jpg',
            'var(--color-metal)',
            limits.m,
            totalSelectedReturn.m,
            activePlanet?.metalStorage ?? (activePlanet as any)?.metalStorageLevel
        );

        checkResource(
            'c',
            getResource('crystal'),
            getEntityName(23),
            'icons/resources/crystal_storage_large.jpg',
            'var(--color-crystal)',
            limits.c,
            totalSelectedReturn.c,
            activePlanet?.crystalStorage ?? (activePlanet as any)?.crystalStorageLevel
        );

        checkResource(
            'd',
            getResource('deuterium'),
            getEntityName(24),
            'icons/resources/deuterium_storage_large.jpg',
            'var(--color-deuterium)',
            limits.d,
            totalSelectedReturn.d,
            activePlanet?.deuteriumStorage ?? (activePlanet as any)?.deuteriumStorageLevel
        );

        return overflows;
    }, [totalSelectedReturn, limits, activePlanet, rates]);

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
                            <label>Scrap Merchant %</label>
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
                                <label style={{ fontSize: '0.55rem', opacity: 0.6, fontWeight: 900, textTransform: 'uppercase', marginRight: '6px', whiteSpace: 'nowrap' }}>
                                    {t('scrap.returnPriorities', 'Return Priorities')}
                                </label>
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

                            <div className="fleet-mode-selector">
                                <label style={{ fontSize: '0.55rem', opacity: 0.6, fontWeight: 900, textTransform: 'uppercase', marginRight: '6px', whiteSpace: 'nowrap' }}>
                                    {t('scrap.shipSource', 'Ship Source')}
                                </label>
                                <div className="fleet-mode-toggle-group">
                                    <button
                                        type="button"
                                        className={`mode-toggle-btn ${fleetMode === 'all' ? 'active all' : ''}`}
                                        onClick={() => setFleetMode('all')}
                                        title={t('scrap.modeAllDesc', 'Considers stationary ships + all flying fleet missions')}
                                    >
                                        <Layers size={13} />
                                        <span>{t('scrap.modeAll', 'All Empire')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-toggle-btn ${fleetMode === 'stationary' ? 'active stationary' : ''}`}
                                        onClick={() => setFleetMode('stationary')}
                                        title={t('scrap.modeStationaryDesc', 'Only considers stationary ships on planets and moons')}
                                    >
                                        <MapPin size={13} />
                                        <span>{t('scrap.modeStationary', 'Stationary')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-toggle-btn ${fleetMode === 'manual' ? 'active manual' : ''}`}
                                        onClick={() => setFleetMode('manual')}
                                        title={t('scrap.modeManualDesc', 'Manual mode: player can type numbers exceeding owned limits')}
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>{t('scrap.modeManual', 'Manual')}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="fleet-action-group">
                                <button className="btn-fleet-tool" onClick={fillAllShips} title={fleetMode === 'stationary' ? 'Fill all stationary ships' : 'Fill all owned ships'}>
                                    <Rocket size={12} /> {t('scrap.fillAll', 'All Available')}
                                </button>
                                <button className="btn-fleet-tool danger" onClick={clearFleet}>
                                    <Trash2 size={12} /> {t('scrap.clearAll', 'Reset')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ margin: '30px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)' }}>
                            {fleetMode === 'all'
                                ? `${t('scrap.shipsToScrap', 'Ships on Empire')} (${t('common.stationary', 'Stationary')} + ${t('common.flying', 'Flying')})`
                                : fleetMode === 'stationary'
                                    ? `${t('scrap.shipsToScrap', 'Ships on Empire')} (${t('common.stationary', 'Stationary')})`
                                    : `${t('scrap.shipsToScrap', 'Ships on Empire')} (${t('common.manual', 'Manual')})`}
                        </span>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.1))' }}></div>
                    </div>

                    <div className="ship-grid">
                        {Object.entries(SHIP_RESOURCES).map(([name, data]) => {
                            const stationaryCount = stationaryTotals[name] || 0;
                            const flyingCount = flyingTotals[name] || 0;
                            const maxCount = effectiveMaxTotals[name] || 0;
                            const curValue = fleet[name] || 0;
                            const sliderMax = fleetMode === 'manual' ? Math.max(maxCount, curValue, 100) : maxCount;

                            return (
                                <div key={name} className={`ship-pill ${fleetMode === 'manual' && curValue > maxCount ? 'over-max' : ''}`}>
                                    <div className="ship-pill-top">
                                        <div className="ship-pill-info">
                                            <img src={data.icon} className="ship-pill-icon" alt="" />
                                            <div className="ship-pill-name-wrap">
                                                <span className="ship-pill-name">{getEntityName(data.id)}</span>
                                                <span className="ship-pill-owned">
                                                    {fleetMode === 'stationary' ? (
                                                        `Stationary: ${stationaryCount.toLocaleString()}`
                                                    ) : fleetMode === 'manual' ? (
                                                        <>
                                                            <span>Owned: {maxCount.toLocaleString()}</span>
                                                            <span className="manual-badge">Manual</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Owned: {maxCount.toLocaleString()}</span>
                                                            {flyingCount > 0 && (
                                                                <span
                                                                    className="flying-badge"
                                                                    title={`${stationaryCount.toLocaleString()} stationary + ${flyingCount.toLocaleString()} flying`}
                                                                >
                                                                    (+{flyingCount.toLocaleString()} flying)
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </span>
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
                                            min="0"
                                            max={sliderMax}
                                            value={curValue}
                                            onChange={e => handleFleetChange(name, parseInt(e.target.value) || 0)}
                                        />
                                        <div className="ship-pill-btns">
                                            <button className="btn-pill-action clear" onClick={() => handleFleetChange(name, 0)}>0</button>
                                            <button
                                                className="btn-pill-action"
                                                onClick={() => handleFleetChange(name, maxCount)}
                                                title={fleetMode === 'manual' ? 'Fill owned count' : 'Fill max'}
                                            >
                                                MAX
                                            </button>
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
                                                <span className="ship-pill-name">{getEntityName(data.id)}</span>
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
                    {storageOverflows.length > 0 && (
                        <div className="storage-overflow-shell">
                            <div className="storage-overflow-header">
                                <div className="storage-overflow-eyebrow">
                                    <span className="pulse-dot"></span>
                                    <span>{t('scrap.overflowAlertTitle', 'Storage Capacity Warning')}</span>
                                </div>
                                <div className="storage-overflow-title">
                                    <AlertTriangle size={14} className="warning-icon" />
                                    <span>Storage Level Suggestions</span>
                                </div>
                                <p className="storage-overflow-desc">
                                    {t('scrap.overflowAlertDesc', 'Total scrap yields exceed current planet capacity. Upgrade storages to prevent resource loss:')}
                                </p>
                            </div>

                            <div className="storage-overflow-list">
                                {storageOverflows.map(item => (
                                    <div key={item.res} className="storage-overflow-item" style={{ '--res-accent': item.color } as React.CSSProperties}>
                                        <div className="overflow-item-main">
                                            <div className="overflow-thumb-wrap">
                                                <img src={item.icon} alt={item.buildingName} className="overflow-building-thumb" />
                                            </div>
                                            <div className="overflow-details">
                                                <div className="overflow-title-row">
                                                    <span className="overflow-building-name">{item.buildingName}</span>
                                                    <div 
                                                        className="overflow-upgrade-pill" 
                                                        title={`Current capacity: ${item.currentCap.toLocaleString()} -> Needed: ${item.neededCap.toLocaleString()} -> Next capacity: ${item.newCap.toLocaleString()}`}
                                                    >
                                                        <span className="lvl-from">Lv {item.currentLevel}</span>
                                                        <ArrowRight size={10} className="lvl-arrow" />
                                                        <span className="lvl-to">Lv {item.requiredLevel}</span>
                                                        <span className="lvl-diff">+{item.levelsNeeded}</span>
                                                    </div>
                                                </div>

                                                <div className="overflow-meta-row">
                                                    <span className="overflow-amount-tag">+{formatCompact(item.overflowAmount)} overflow</span>
                                                    <div 
                                                        className="overflow-msu-badge" 
                                                        title={`Upgrade Cost: ${Math.floor(item.cost.metal).toLocaleString()} Metal${item.cost.crystal > 0 ? `, ${Math.floor(item.cost.crystal).toLocaleString()} Crystal` : ''}${item.cost.deuterium > 0 ? `, ${Math.floor(item.cost.deuterium).toLocaleString()} Deut` : ''} (${Math.floor(item.msuCost).toLocaleString()} MSU)`}
                                                    >
                                                        <span className="msu-label">Upgrade:</span>
                                                        <span className="msu-val">{formatCompact(item.msuCost)} MSU</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-sub-metrics">
                                            <div className="metric-chip">
                                                <span className="chip-label">Current:</span>
                                                <span className="chip-val">{formatCompact(item.currentCap)}</span>
                                            </div>
                                            <ArrowRight size={10} style={{ opacity: 0.35, color: 'var(--text-muted)' }} />
                                            <div className="metric-chip">
                                                <span className="chip-label">New Cap:</span>
                                                <span className="chip-val highlight">{formatCompact(item.newCap)}</span>
                                            </div>
                                            <div className="metric-chip right">
                                                <span className="chip-label">Needed:</span>
                                                <span className="chip-val warning">{formatCompact(item.neededCap)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="sidebar-title">
                        <Maximize2 size={16} /> {t('scrap.shipsToScrap', 'Ships to be scrapped')}
                    </div>

                    <div className="scrapped-ships-list">
                        {results && Object.keys(results.ships).length > 0 ? (
                            Object.entries(results.ships).map(([name, count]) => {
                                const entityId = SHIP_RESOURCES[name]?.id || DEFENCE_RESOURCES[name]?.id;
                                return (
                                    <div key={name} className="scrapped-ship-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={SHIP_RESOURCES[name]?.icon || DEFENCE_RESOURCES[name]?.icon} alt="" />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{getEntityName(entityId || name)}</span>
                                        </div>
                                        <b style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{count.toLocaleString()}</b>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3, border: '1px dashed' }}>
                                <X size={24} style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '0.7rem' }}>No logistics data.</div>
                            </div>
                        )}
                    </div>

                    <div className="res-summary-box">
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-metal)' }}>
                            <span>{getResource('metal')} Recovery</span>
                            <b style={{ color: 'var(--color-metal)' }}>{results ? Math.floor(results.totals.m).toLocaleString() : '0'}</b>
                        </div>
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-crystal)' }}>
                            <span>{getResource('crystal')} Recovery</span>
                            <b style={{ color: 'var(--color-crystal)' }}>{results ? Math.floor(results.totals.c).toLocaleString() : '0'}</b>
                        </div>
                        <div className="res-sidebar-box" style={{ borderBottomColor: 'var(--color-deuterium)' }}>
                            <span>{getResource('deuterium')} Recovery</span>
                            <b style={{ color: 'var(--color-deuterium)' }}>{results ? Math.floor(results.totals.d).toLocaleString() : '0'}</b>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ScrapOptimizer;
