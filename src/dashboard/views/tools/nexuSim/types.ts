export type UnitCategory = 'civil' | 'war' | 'defense' | 'missile';

export interface EntityCost {
    metal: number;
    crystal: number;
    deuterium: number;
}

export interface UnitDefinition {
    id: number;
    name: string;
    category: UnitCategory;
    weapon: number;
    shield: number;
    armour: number;
    cost: EntityCost;
    points: number;
    cargo: number;
    speed: number;
    fuel: number;
    rapidfireAgainst: Record<number, number>;
    rapidfireFrom: Record<number, number>;
}

export interface PlayerTechs {
    weapons: number;        // Tech 109
    shielding: number;      // Tech 110
    armour: number;         // Tech 111
    combustion: number;     // Tech 115
    impulse: number;        // Tech 117
    hyperspace: number;     // Tech 118
    hyperspaceTech: number; // Tech 114
}

export interface LifeformBonusOverrides {
    globalWeapon: number;  // % bonus
    globalShield: number;  // % bonus
    globalArmour: number;  // % bonus
    perShipWeapon: Record<number, number>;
    perShipShield: Record<number, number>;
    perShipArmour: Record<number, number>;
}

export interface Coordinates {
    galaxy: number;
    system: number;
    position: number;
}

export interface FleetParty {
    id: number;
    name: string;
    coords: Coordinates;
    playerClass: number;   // 0: None, 1: Collector, 2: General, 3: Discoverer
    allianceClass: number; // 0: None, 1: Warrior, 2: Trader, 3: Researcher
    techs: PlayerTechs;
    spaceDock: number;
    nanoRepairBots: number;
    engineer: boolean;
    advancedRecyclingPlant?: number;
    lifeformBonuses: LifeformBonusOverrides;
    units: Record<number, number>;
}

export interface ServerSettings {
    universeSpeedWar: number;
    debrisFactor: number;        // 0.3, 0.5, 0.7, 0.8
    debrisFactorDef: number;     // 0.0 to 0.5
    deuteriumInDebris: boolean;
    repairFactor: number;        // Standard 0.7 (70% defense repair)
    lifeforms: boolean;
    rapidFire: boolean;
    galaxies: number;
    systems: number;
    donutGalaxy: boolean;
    donutSystem: boolean;
    combatDebrisFieldLimit: number; // 0.25 (Reaper harvest fraction)
}

export interface RawSimulationRun {
    lost: {
        attackers: Record<number, Record<number, number>>;
        defenders: Record<number, Record<number, number>>;
    };
    remaining: {
        attackers: Record<number, Record<number, number>>;
        defenders: Record<number, Record<number, number>>;
    };
    result: {
        attackers?: number;
        defenders?: number;
        draw?: number;
    };
    rounds: number;
}

export interface ParsedScenario {
    outcome: 'attackers' | 'defenders' | 'draw';
    rounds: number;
    lostUnits: {
        attackers: Record<number, number>;
        defenders: Record<number, number>;
    };
    remainingUnits: {
        attackers: Record<number, number>;
        defenders: Record<number, number>;
    };
    losses: {
        attackers: { metal: number; crystal: number; deuterium: number; total: number; msu: number };
        defenders: { metal: number; crystal: number; deuterium: number; total: number; msu: number };
    };
    debris: {
        metal: number;
        crystal: number;
        deuterium: number;
        total: number;
    };
    moonChance: number;
    reaperHarvest: {
        metal: number;
        crystal: number;
        deuterium: number;
        total: number;
    };
    plunder: {
        possible: { metal: number; crystal: number; deuterium: number; total: number };
        captured: { metal: number; crystal: number; deuterium: number; total: number };
    };
    wreckfield: {
        attackers: Record<number, number>;
        defenders: Record<number, number>;
        resources: { metal: number; crystal: number; deuterium: number; total: number };
    };
    profit: {
        metal: number;
        crystal: number;
        deuterium: number;
        total: number;
        msu: number;
    };
    cargoNeeded: {
        smallCargo: number;
        largeCargo: number;
    };
    recyclersNeeded: number;
}

export interface SimulationAggregateResult {
    totalRuns: number;
    executionTimeMs: number;
    winRates: {
        attackers: number;
        defenders: number;
        draw: number;
    };
    averageRounds: number;
    scenarios: {
        average: ParsedScenario;
        bestCase: ParsedScenario;
        worstCase: ParsedScenario;
        maxDebris: ParsedScenario;
    };
}

export interface IpmStrikeResult {
    ipmLaunched: number;
    abmIntercepted: number;
    effectiveIpm: number;
    neutralizedDefenses: Record<number, number>;
    remainingDefenses: Record<number, number>;
    attackerLossCost: { metal: number; crystal: number; deuterium: number; total: number };
    defenderLossCost: { metal: number; crystal: number; deuterium: number; total: number };
}
