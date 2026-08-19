export type AssistantCategory = 'critical' | 'logistics' | 'intel' | 'growth' | 'reminder';

export type AssistantSeverity = 'danger' | 'warning' | 'info' | 'success';

export type AssistantDomainId = 'resources' | 'expeditions' | 'empire' | 'fleet_tactical';

export type AssistantSubCategoryId =
  | 'storage_tanks'
  | 'energy_grid'
  | 'boosters_crawlers'
  | 'amortization_roi'
  | 'expedition_ops'
  | 'expedition_intel'
  | 'research_lab'
  | 'lifeforms'
  | 'officers'
  | 'fleet_safety'
  | 'galaxy_intel'
  | 'import_export';

export interface AssistantNotification {
  id: string; // Unique rule identifier (e.g., 'storage_overflow_33699985_deut', 'fleet_save_reminder')
  ruleId: string; // Rule category ID (e.g., 'fleet_save', 'storage_overflow_deuterium', 'import_export')
  domain?: AssistantDomainId; // Level 1: Category / Domain
  subCategory?: AssistantSubCategoryId; // Level 2: Sub-Category 1
  category: AssistantCategory;
  severity: AssistantSeverity;
  icon: string;
  iconTooltip?: string;
  badgeText?: string;
  title: string;
  message: string;
  shortMessage: string; // Compact format for slim info bar
  timestamp: number;
  planetId?: string;
  planetName?: string;
  planetImgUrl?: string;
  coords?: string;
  actionLabel?: string;
  actionUrl?: string;
  meta?: Record<string, any>;
}

export interface SnoozeRecord {
  type: 'forever' | 'until';
  untilTimestamp?: number;
  snoozedAt: number;
  level?: 'domain' | 'subCategory' | 'rule' | 'instance';
  title?: string;
  icon?: string;
  planetName?: string;
  planetImgUrl?: string;
  coords?: string;
  ruleId?: string;
}

export interface DiscoveredDebrisField {
  coords: string;
  galaxy: number;
  system: number;
  position: number;
  metal: number;
  crystal: number;
  deuterium: number;
  msu: number;
  recyclersNeeded: number;
  timestamp: number;
  expiresAt: number;
}

export interface AssistantSettings {
  enabled?: boolean;
  snoozedRules: Record<string, SnoozeRecord>;
  thresholds: {
    storageOverflowHours: number; // default: 3 hours
    minFleetSaveMsu: number; // default: 1,000,000 MSU
    minFleetSaveShips: number; // default: 20 ships
    officerExpiryHours: number; // default: 12 hours
    minDebrisMsu: number; // default: 1,000,000 MSU
    artifactsWarningThreshold: number; // default: 3000
    maxExpoDepletionPct?: number; // default: 10%
  };
}

export interface TaxonomyRuleDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  defaultSeverity: AssistantSeverity;
}

export interface TaxonomySubCategoryDef {
  id: AssistantSubCategoryId;
  name: string;
  desc: string;
  icon: string;
  rules: TaxonomyRuleDef[];
}

export interface TaxonomyDomainDef {
  id: AssistantDomainId;
  name: string;
  desc: string;
  icon: string;
  subCategories: TaxonomySubCategoryDef[];
}

export const OVERSEER_TAXONOMY: TaxonomyDomainDef[] = [
  {
    id: 'resources',
    name: 'Resources & Infrastructure',
    desc: 'Planetary mines, storage capacities, power grid, and economic expansion',
    icon: '🪐',
    subCategories: [
      {
        id: 'storage_tanks',
        name: 'Storage Tanks',
        desc: 'Overflow warnings when planetary storages reach capacity within threshold hours',
        icon: 'icons/resources/metal_storage_large.jpg',
        rules: [
          {
            id: 'storage_overflow_metal',
            name: 'Metal Storage Overflow',
            desc: 'Alerts when Metal Storage will reach capacity or is completely full',
            icon: 'icons/resources/metal_storage_large.jpg',
            defaultSeverity: 'warning'
          },
          {
            id: 'storage_overflow_crystal',
            name: 'Crystal Storage Overflow',
            desc: 'Alerts when Crystal Storage will reach capacity or is completely full',
            icon: 'icons/resources/crystal_storage_large.jpg',
            defaultSeverity: 'warning'
          },
          {
            id: 'storage_overflow_deuterium',
            name: 'Deuterium Tank Overflow',
            desc: 'Alerts when Deuterium Tank will reach capacity or is completely full',
            icon: 'icons/resources/deuterium_storage_large.jpg',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'energy_grid',
        name: 'Energy & Power Grid',
        desc: 'Planetary solar, fusion, and satellite power production balance',
        icon: 'icons/resources/solar-plant-large.jpg',
        rules: [
          {
            id: 'energy_deficit',
            name: 'Planetary Energy Deficit',
            desc: 'Alerts when negative energy balance reduces mine production rates',
            icon: 'icons/resources/solar-plant-large.jpg',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'boosters_crawlers',
        name: 'Mine Boosters & Crawlers',
        desc: 'Inventory resource boosters and crawler saturation limits',
        icon: 'icons/misc/discoverer_resource_bonus.png',
        rules: [
          {
            id: 'booster_gap_metal',
            name: 'Metal Booster Gap Advisor',
            desc: 'Alerts when stored Metal Boosters can be equipped on unboosted high mines',
            icon: 'icons/resources/metal-icon-medium.jpg',
            defaultSeverity: 'info'
          },
          {
            id: 'booster_gap_crystal',
            name: 'Crystal Booster Gap Advisor',
            desc: 'Alerts when stored Crystal Boosters can be equipped on unboosted high mines',
            icon: 'icons/resources/crystal-icon-medium.jpg',
            defaultSeverity: 'info'
          },
          {
            id: 'booster_gap_deuterium',
            name: 'Deuterium Booster Gap Advisor',
            desc: 'Alerts when stored Deuterium Boosters can be equipped on unboosted high mines',
            icon: 'icons/resources/deuterium-icon-medium.jpg',
            defaultSeverity: 'info'
          },
          {
            id: 'crawler_deficit',
            name: 'Crawler Saturation Shortage',
            desc: 'Alerts when a planet has fewer crawlers than its maximum mine saturation cap',
            icon: 'icons/ships/crawler-large.jpg',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'amortization_roi',
        name: 'Amortization & ROI',
        desc: 'Mathematical return-on-investment building recommendations',
        icon: '💡',
        rules: [
          {
            id: 'amortization_recommendation',
            name: 'Optimal ROI Upgrade Recommendation',
            desc: 'Recommends the best economic mine or lifeform building upgrade based on payback time',
            icon: '💡',
            defaultSeverity: 'info'
          },
          {
            id: 'planet_amortization_todos',
            name: 'Planet To-Dos',
            desc: 'Notifies top prioritized amortization projects scheduled on the current active planet',
            icon: '📋',
            defaultSeverity: 'info'
          }
        ]
      }
    ]
  },
  {
    id: 'expeditions',
    name: 'Expeditions & Deep Space',
    desc: 'Deep space missions, fleet discovery outcomes, and sector telemetry',
    icon: '🧭',
    subCategories: [
      {
        id: 'expedition_ops',
        name: 'Expedition Operations',
        desc: 'Fleet dispatch slots, mission availability, and sector depletion tracking',
        icon: '🧭',
        rules: [
          {
            id: 'idle_expedition_slots',
            name: 'Idle Expedition Slots',
            desc: 'Alerts when available expedition fleet slots are sitting unlaunched',
            icon: '🧭',
            defaultSeverity: 'warning'
          },
          {
            id: 'expedition_depletion',
            name: 'Sector Depletion Rate Warning',
            desc: 'Alerts when recent expeditions encounter high sector depletion rates (>10%)',
            icon: '🧭',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'expedition_intel',
        name: 'Expedition Intel & Highlights',
        desc: 'Daily expedition yield summaries and top recovery spotlights',
        icon: '📊',
        rules: [
          {
            id: 'today_expedition_yield',
            name: 'Daily Expedition Yield Summary',
            desc: 'Summarizes total daily resources and MSU hauled from deep space missions',
            icon: '📊',
            defaultSeverity: 'info'
          },
          {
            id: 'top_expedition_find',
            name: 'Top Daily Expedition Finds',
            desc: 'Highlights top largest resource and ship recoveries made today',
            icon: '✨',
            defaultSeverity: 'info'
          }
        ]
      }
    ]
  },
  {
    id: 'empire',
    name: 'Empire & Laboratory',
    desc: 'Empire-wide research labs, Lifeform relics, and Officer Mess management',
    icon: '🔬',
    subCategories: [
      {
        id: 'research_lab',
        name: 'Research & Laboratories',
        desc: 'Empire-wide laboratory uptime and technology progression',
        icon: 'icons/facilities/research_lab_large.jpg',
        rules: [
          {
            id: 'idle_research',
            name: 'Empire Research Lab Idle',
            desc: 'Alerts when zero technologies are currently being researched across your empire',
            icon: 'icons/facilities/research_lab_large.jpg',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'lifeforms',
        name: 'Lifeform Civilization',
        desc: 'Lifeform relic collection and artifact storage management',
        icon: '🔮',
        rules: [
          {
            id: 'artifacts_limit',
            name: 'Artifact Storage Limits',
            desc: 'Warns when collected Lifeform Artifacts approach 3,000 or cap out at 3,600',
            icon: '🔮',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'officers',
        name: 'Officers Mess',
        desc: 'Active officer status, Commander renewals, and Geologist boosts',
        icon: '⏱️',
        rules: [
          {
            id: 'officer_expiring',
            name: 'Officer Expiration Window (<12h)',
            desc: 'Alerts when active officers will expire within the configured window',
            icon: '⏱️',
            defaultSeverity: 'warning'
          },
          {
            id: 'officer_alert',
            name: 'Inactive Geologist Alert',
            desc: 'Alerts when inactive Geologist drops daily mine production by -10%',
            icon: '⚠️',
            defaultSeverity: 'warning'
          }
        ]
      }
    ]
  },
  {
    id: 'fleet_tactical',
    name: 'Fleet & Tactical Recon',
    desc: 'Stationary fleet safety, scanned galaxy debris, and mystery container dealer',
    icon: '🛡️',
    subCategories: [
      {
        id: 'fleet_safety',
        name: 'Fleet Security',
        desc: 'Stationary fleet protection and exposed asset reminders',
        icon: '🔔',
        rules: [
          {
            id: 'fleet_save',
            name: 'Stationary Fleet Save Reminder',
            desc: 'Alerts when stationary fleets and resources are sitting exposed without fleetsave',
            icon: '🔔',
            defaultSeverity: 'warning'
          }
        ]
      },
      {
        id: 'galaxy_intel',
        name: 'Galaxy Recon',
        desc: 'Scanned galaxy debris fields and harvest opportunities',
        icon: '☄️',
        rules: [
          {
            id: 'debris_opportunity',
            name: 'Galaxy Debris Field Opportunities',
            desc: 'Alerts when a scanned galaxy debris field exceeds the configured MSU threshold',
            icon: '☄️',
            defaultSeverity: 'info'
          }
        ]
      },
      {
        id: 'import_export',
        name: 'Import / Export Trader',
        desc: 'Daily mystery container trader offers and booster claims',
        icon: '📦',
        rules: [
          {
            id: 'import_export',
            name: 'Daily Mystery Container Ready',
            desc: 'Alerts when today\'s mystery container is available for purchase at the dealer',
            icon: '📦',
            defaultSeverity: 'info'
          }
        ]
      }
    ]
  }
];
