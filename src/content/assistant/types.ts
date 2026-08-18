export type AssistantCategory = 'critical' | 'logistics' | 'intel' | 'growth' | 'reminder';

export type AssistantSeverity = 'danger' | 'warning' | 'info' | 'success';

export interface AssistantNotification {
  id: string; // Unique rule identifier (e.g., 'storage_overflow_33699985_deut', 'fleet_save_reminder')
  ruleId: string; // Rule category ID (e.g., 'fleet_save', 'storage_overflow', 'import_export')
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
