import Dexie, { Table } from 'dexie';
import { SHIP_DATA, LIFEFORM_SPECIES_DATA, RESEARCH_DATA, DEFENCE_DATA, BUILDING_DATA, LIFEFORM_RESEARCH_DATA, LIFEFORM_BUILDING_DATA } from './staticData';
import { LIFEFORM_TECH_DATA } from './lifeformTechData';
import { LIFEFORM_BONUS_BREAKDOWN_DATA } from './lifeformBonusData';

export interface Account {
    playerId: string;
    playerName: string;
    universe: string;
    universeName: string;
    allianceId?: string;
    allianceName?: string;
    allianceTag?: string;
    avatarUrl?: string;
    serverUrl?: string;
    playerClass?: number; // 1: Collector, 2: Warrior, 3: Discoverer
    allianceClass?: number; // 0: None/Other, 1: Trader, 2: Researcher, 3: Warrior
    hasCommander?: boolean;
    hasAdmiral?: boolean;
    hasEngineer?: boolean;
    hasGeologist?: boolean;
    hasTechnocrat?: boolean;
    lastSeen: number;
    // Current / Total (Type 0)
    score?: number;
    rank?: number;
    totalPlayers?: number;
    honorPoints?: number;
    honorRank?: number; // Type 7

    // Extended Stats from XML API
    economyScore?: number; // Type 1
    economyRank?: number;
    researchScore?: number; // Type 2
    researchRank?: number;
    militaryScore?: number; // Type 3
    militaryRank?: number;
    shipCount?: number;
    militaryLostScore?: number; // Type 4
    militaryLostRank?: number;
    militaryBuiltScore?: number; // Type 5
    militaryBuiltRank?: number;
    militaryDestroyedScore?: number; // Type 6
    militaryDestroyedRank?: number;
    lifeformScore?: number; // Type 8
    lifeformRank?: number;
    lifeformEconomyScore?: number; // Type 9
    lifeformEconomyRank?: number;
    lifeformTechScore?: number; // Type 10
    lifeformTechRank?: number;
    lifeformDiscoveryScore?: number; // Type 11
    lifeformDiscoveryRank?: number;

    // Server Data from /api/serverData.xml
    universeSpeed?: number;
    topScore?: number;
    speedFleetPeaceful?: number;
    speedFleetWar?: number;
    speedFleetHolding?: number;
    donutGalaxy?: number;
    donutSystem?: number;
    galaxies?: number;
    systems?: number;
    bonusFields?: number;
    cargoHyperspaceTechMultiplier?: number;

    lastApiUpdate?: number;
    researches?: { id: number, level: number }[];
    lifeformExperience?: {
        lifeformId: number,
        level: number,
        currentExp: number,
        nextLevelExp: number
    }[];
}

export interface Planet {
    id: string;
    playerId: string;
    name: string;
    coords: string;
    type: string;
    parentPlanetId?: string;
    imgUrl?: string;
    diameter?: number;
    fieldsUsed?: number;
    fieldsTotal?: number;
    tempMin?: number;
    tempMax?: number;
    // Resource Buildings
    metalMine?: number;
    crystalMine?: number;
    deuteriumMine?: number;
    solarPlant?: number;
    fusionReactor?: number;
    solarSatellites?: number;
    metalStorage?: number;
    crystalStorage?: number;
    deuteriumStorage?: number;
    metalCapacity?: number;
    crystalCapacity?: number;
    deuteriumCapacity?: number;
    crawlers?: number;
    production?: {
        metal: number;
        crystal: number;
        deuterium: number;
        lastUpdated: number;
    };
    lifeformId?: number; // 1-4
    sandboxSetup?: { slotNumber: number, selectedTechId: number | null, level: number }[];
    lifeformSetup?: { slotNumber: number, selectedTechId: number | null, level: number }[];
    lifeformBuildings?: { id: number, name?: string, level: number }[];
    // Facilities
    roboticsFactory?: number;
    shipyard?: number;
    researchLab?: number;
    allianceDepot?: number;
    missileSilo?: number;
    naniteFactory?: number;
    terraformer?: number;
    spaceDock?: number;
    facilities?: { id: number, name?: string, level: number }[];
    // Moon Facilities
    lunarBase?: number;
    sensorPhalanx?: number;
    jumpGate?: number;
    ships?: Record<number, number>;
    defenses?: Record<number, number>;
    lastUpdated: number;
    activeItems?: ActiveItem[];
    boosters?: {
        metal: number;
        crystal: number;
        deuterium: number;
    };
}

export interface ActiveItem {
    name: string;
    title: string;
    rarity?: string;
    timeRemaining?: string;
    expiryTimestamp?: number;
    duration?: string;
    isPermanent: boolean;
    bonus?: number;
    type: 'metal' | 'crystal' | 'deuterium' | 'resource' | 'expedition_res' | 'expedition_slots' | 'fleet_slots' | 'fields' | 'other';
}

export interface Expedition {
    messageId: string; // Unique ID from data-msg-id
    playerId: string; // Link to account
    timestamp: number; // Unix timestamp from data-raw-timestamp
    coords: string; // Coordinates from data-raw-coords
    depletion: number; // Depletion level from data-raw-depletion
    size: number; // Fleet size from data-raw-size
    result: string; // Result type from data-raw-expeditionresult (e.g., "shipwrecks", "darkmatter", "resources")
    resultDetails?: any; // JSON data specific to the result type (navigation, resources, ships, etc.)
    tracked: boolean; // Whether this has been marked as tracked in UI
}

export interface LifeformDiscovery {
    messageId: string; // Unique ID from data-msg-id
    playerId: string; // Link to account
    timestamp: number; // Unix timestamp from data-raw-timestamp
    coords: string;
    lifeform?: number; // data-raw-lifeform (1-4)
    discoveryType: string; // data-raw-discoverytype (lifeform-xp, ship-lost, artifacts)
    lifeformGainedExperience?: number; // data-raw-lifeformgainedexperience
    artifactsFound?: number; // data-raw-artifactsfound
    artifactSize?: string; // data-raw-artifactssize (normal, big, huge)
    tracked: boolean;
}

export interface DebrisHarvest {
    messageId: string;
    playerId: string;
    timestamp: number;
    coords: string;
    recycledResources?: {
        metal: number;
        crystal: number;
        deuterium: number;
    };
    recyclerAmount?: number;
    totalCapacity?: number;
    tracked: boolean;
}

export interface CombatReport {
    messageId: string; // Unique ID from data-msg-id
    playerId: string; // Link to account
    timestamp: number; // Unix timestamp from data-raw-timestamp
    coords: string; // From data-raw-coords
    winner: string; // "attacker", "defender", "none"
    loot?: {
        metal: number;
        crystal: number;
        deuterium: number;
        food: number;
    };
    debris?: {
        metal: number;
        crystal: number;
        deuterium: number;
    };
    attackerLosses: number;
    defenderLosses: number;
    attackerName?: string;
    defenderName?: string;
    myLosses?: number; // Total MSU losses for the player
    honor?: number;
    moonChance?: number;
    isAcs: boolean;
    isExpedition: boolean;
    expeditionAttackType?: "pirates" | "aliens" | null;
    isNew?: boolean; // temporary flag for UI animations
    tracked: boolean;
    rawFleets?: any; // Full participants JSON for detailed view
    rawResult?: any; // Full combat result JSON for detailed view
}

export interface GameKnowledge {
    id: number;
    category: string; // 'ships', 'buildings', etc.
    name: string;
    icon?: string;
    description?: string;
    metadata?: any;
}

export interface LifeformSpecies {
    lifeformId: number;
    lifeformName: string;
    lifeformLevel: number;
    lifeformXP: number;
    iconPath: string;
}

export interface LifeformTechnology {
    id: number;
    lifeformId: number;
    gkId?: number;
    name: string;
    description: string;
    shortDesc: string;
    metalBaseCost: number;
    crystalBaseCost: number;
    deutBaseCost: number;
    energyBaseCost: number;
    metalIncreaseFactor: number;
    crystalIncreaseFactor: number;
    deutIncreaseFactor: number;
    energyIncreaseFactor: number;
    bonus1BaseValue?: number;
    bonus1IncreaseFactor?: number;
    bonus1Max?: string | null;
    bonus2BaseValue?: number;
    bonus2IncreaseFactor?: number;
    bonus2Max?: string | null;
    bonus3BaseValue?: number;
    bonus3IncreaseFactor?: number;
    bonus3Max?: string | null;
    durationFactor: number;
    durationBase: number;
    target?: any[];
}

export interface ResourceRate {
    id: string;
    metal: number;
    crystal: number;
    deuterium: number;
}

export interface LifeformBonusBreakdown {
    id: number;
    bonusName: string;
    maxBoostPercentage: number | null;
    boostDetails?: {
        name: string;
        defaultValue: string;
        icon: string;
    }[];
}

export interface TodoProject {
    id?: number;
    projectKey: string; // identifier: planetId_type_name_targetLevel
    name: string;
    type: string;
    icon?: string;
    targetLevel: number;
    planetId?: string;
    planetName?: string;
    coords?: string;
    cost: {
        metal: number;
        crystal: number;
        deuterium: number;
    };
    msuCost: number;
    prodDelta: {
        metal: number;
        crystal: number;
        deuterium: number;
    };
    productionIncrease: number;
    roiHours: number;
    timestamp: number;
}

export interface LifeformSavedSetup {
    id?: number;
    name: string;
    setup: { slotNumber: number, selectedTechId: number | null, level: number }[];
    lastUpdated: number;
}

export class OGNexusDB extends Dexie {
    accounts!: Table<Account>;
    planets!: Table<Planet>;
    expeditions!: Table<Expedition>;
    lifeformDiscoveries!: Table<LifeformDiscovery>;
    lifeformSpecies!: Table<LifeformSpecies>;
    gameKnowledge!: Table<GameKnowledge>;
    settings!: Table<ResourceRate>;
    lifeformTechnologies!: Table<LifeformTechnology>;
    lifeformBonusBreakdown!: Table<LifeformBonusBreakdown>;
    lifeformSavedSetups!: Table<LifeformSavedSetup>;
    todoProjects!: Table<TodoProject>;
    debrisHarvests!: Table<DebrisHarvest>;
    combatReports!: Table<CombatReport>;

    constructor() {
        super('OGNexusDB');
        this.version(32).stores({
            accounts: 'playerId, playerName, universe, lastSeen',
            planets: 'id, playerId, coords, lifeformId',
            expeditions: 'messageId, playerId, timestamp, coords, result',
            lifeformDiscoveries: 'messageId, playerId, timestamp, coords, discoveryType',
            lifeformSpecies: 'lifeformId, lifeformName',
            gameKnowledge: 'id, category, name',
            settings: 'id',
            lifeformTechnologies: 'id, lifeformId, name',
            lifeformBonusBreakdown: 'id, bonusName',
            lifeformSavedSetups: '++id, name',
            todoProjects: '++id, projectKey, planetId, type',
            debrisHarvests: 'messageId, playerId, timestamp, coords',
            combatReports: 'messageId, playerId, timestamp, coords, winner'
        });

        // Seed data for new database installations
        this.on('populate', () => {
            this.seedKnowledge();
            this.seedSettings();
        });

        // Always sync static knowledge on startup to ensure icons and metadata stay up to date
        this.on('ready', () => {
            this.seedKnowledge();
            this.seedSettings();
        });
    }

    private async seedSettings() {
        try {
            const rates = await this.settings.get('conversion_rates');
            if (!rates) {
                await this.settings.add({
                    id: 'conversion_rates',
                    metal: 3,
                    crystal: 2,
                    deuterium: 1
                });
                console.log('OGame Nexus: Successfully seeded default conversion rates.');
            }
        } catch (error) {
            console.error('OGame Nexus: Failed to seed settings', error);
        }
    }

    private async seedKnowledge() {
        console.log('OGame Nexus: Seeding game knowledge database...');
        try {
            await this.gameKnowledge.bulkPut(SHIP_DATA);
            await this.gameKnowledge.bulkPut(RESEARCH_DATA);
            await this.gameKnowledge.bulkPut(DEFENCE_DATA);
            await this.gameKnowledge.bulkPut(BUILDING_DATA);
            await this.gameKnowledge.bulkPut(LIFEFORM_RESEARCH_DATA);
            await this.gameKnowledge.bulkPut(LIFEFORM_BUILDING_DATA);

            // Seed Lifeform Species only if empty to preserve user progress later
            const speciesCount = await this.lifeformSpecies.count();
            if (speciesCount === 0) {
                await this.lifeformSpecies.bulkAdd(LIFEFORM_SPECIES_DATA);
                console.log('OGame Nexus: Successfully seeded initial lifeform species.');
            }

            // Seed Static Lifeform Technologies
            await this.lifeformTechnologies.bulkPut(LIFEFORM_TECH_DATA as any);
            console.log('OGame Nexus: Successfully seeded lifeform technology data.');

            // Seed Lifeform Bonus Breakdown
            await this.lifeformBonusBreakdown.bulkPut(LIFEFORM_BONUS_BREAKDOWN_DATA);
            console.log('OGame Nexus: Successfully seeded lifeform bonus breakdown data.');

            console.log('OGame Nexus: Successfully seeded ship data.');
        } catch (error) {
            console.error('OGame Nexus: Failed to seed knowledge data', error);
        }
    }
}

export const db = new OGNexusDB();
