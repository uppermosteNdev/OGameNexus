import { useState, useEffect } from 'react';
import { SHIP_DATA } from '../db/staticData';
import { calculateEmpireProduction } from './amortizationCalc';

export interface EmpireYieldConfig {
    includeMines: boolean;
    includeExpeditions: boolean;
    includeSalvagedFleet: boolean;
    includeCombatProfits: boolean;
    includeDebrisFields: boolean;
    scrapMerchantRatio: number; // e.g. 0.75 for 75%
}

export const DEFAULT_EMPIRE_YIELD_CONFIG: EmpireYieldConfig = {
    includeMines: true,
    includeExpeditions: true,
    includeSalvagedFleet: true,
    includeCombatProfits: true,
    includeDebrisFields: true,
    scrapMerchantRatio: 0.75
};

export const YIELD_CONFIG_STORAGE_KEY = 'og_nexus_empire_yield_config';

export function getEmpireYieldConfig(): EmpireYieldConfig {
    try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(YIELD_CONFIG_STORAGE_KEY) : null;
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                includeMines: parsed.includeMines !== undefined ? Boolean(parsed.includeMines) : true,
                includeExpeditions: parsed.includeExpeditions !== undefined ? Boolean(parsed.includeExpeditions) : true,
                includeSalvagedFleet: parsed.includeSalvagedFleet !== undefined ? Boolean(parsed.includeSalvagedFleet) : true,
                includeCombatProfits: parsed.includeCombatProfits !== undefined ? Boolean(parsed.includeCombatProfits) : true,
                includeDebrisFields: parsed.includeDebrisFields !== undefined ? Boolean(parsed.includeDebrisFields) : true,
                scrapMerchantRatio: typeof parsed.scrapMerchantRatio === 'number' && parsed.scrapMerchantRatio >= 0 && parsed.scrapMerchantRatio <= 1
                    ? parsed.scrapMerchantRatio
                    : 0.75
            };
        }
    } catch (e) {
        console.warn('OGame Nexus: Failed to parse empire yield config from storage', e);
    }
    return { ...DEFAULT_EMPIRE_YIELD_CONFIG };
}

export function saveEmpireYieldConfig(config: Partial<EmpireYieldConfig>): EmpireYieldConfig {
    const current = getEmpireYieldConfig();
    const updated: EmpireYieldConfig = {
        ...current,
        ...config
    };
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(YIELD_CONFIG_STORAGE_KEY, JSON.stringify(updated));
        }
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.set({ [YIELD_CONFIG_STORAGE_KEY]: updated });
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nexus_yield_config_changed', { detail: updated }));
        }
    } catch (e) {
        console.warn('OGame Nexus: Failed to save empire yield config', e);
    }
    return updated;
}

export function useEmpireYieldConfig(): [EmpireYieldConfig, (newConfig: Partial<EmpireYieldConfig>) => void] {
    const [config, setConfig] = useState<EmpireYieldConfig>(getEmpireYieldConfig);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<EmpireYieldConfig>).detail;
            if (detail) {
                setConfig(detail);
            } else {
                setConfig(getEmpireYieldConfig());
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('nexus_yield_config_changed', handler);
            window.addEventListener('storage', handler);
        }

        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.get(YIELD_CONFIG_STORAGE_KEY, (res) => {
                if (res && res[YIELD_CONFIG_STORAGE_KEY]) {
                    setConfig(res[YIELD_CONFIG_STORAGE_KEY]);
                    try {
                        localStorage.setItem(YIELD_CONFIG_STORAGE_KEY, JSON.stringify(res[YIELD_CONFIG_STORAGE_KEY]));
                    } catch {}
                }
            });
            const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
                if (areaName === 'local' && changes[YIELD_CONFIG_STORAGE_KEY]) {
                    setConfig(changes[YIELD_CONFIG_STORAGE_KEY].newValue);
                }
            };
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                if (typeof window !== 'undefined') {
                    window.removeEventListener('nexus_yield_config_changed', handler);
                    window.removeEventListener('storage', handler);
                }
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('nexus_yield_config_changed', handler);
                window.removeEventListener('storage', handler);
            }
        };
    }, []);

    const updateConfig = (newConfig: Partial<EmpireYieldConfig>) => {
        const updated = saveEmpireYieldConfig(newConfig);
        setConfig(updated);
    };

    return [config, updateConfig];
}

export interface EmpireDailyYieldBreakdown {
    // Effective values (factoring in checkboxes & scrap merchant ratio)
    mineHourlyMSU: number;
    mineDailyMSU: number;
    expResDailyMSU: number;
    expShipDailyMSU: number;
    combatDailyMSU: number;
    debrisDailyMSU: number;
    totalDailyYieldMSU: number;

    // Raw unscaled values (for display/inspection in UI slats & modals)
    rawMineDailyMSU: number;
    rawExpResDailyMSU: number;
    rawExpShipDailyMSU: number;
    rawCombatDailyMSU: number;
    rawDebrisDailyMSU: number;
    rawTotalDailyMSU: number;

    // Scrap settings & config
    scrapMerchantRatio: number;
    config: EmpireYieldConfig;

    daysTracked: number;
    rates: { metal: number; crystal: number; deuterium: number };

    // Per-resource breakdown
    mineDailyMetal: number;
    mineDailyCrystal: number;
    mineDailyDeut: number;
    expDailyMetal: number;
    expDailyCrystal: number;
    expDailyDeut: number;
    combatDailyMetal: number;
    combatDailyCrystal: number;
    combatDailyDeut: number;
    debrisDailyMetal: number;
    debrisDailyCrystal: number;
    debrisDailyDeut: number;
    dailyMetal: number;
    dailyCrystal: number;
    dailyDeuterium: number;
}

export function calculateTotalEmpireDailyYield(params: {
    activeAccount: any;
    planets: any[];
    expeditions?: any[];
    combatReports?: any[];
    debrisHarvests?: any[];
    rates?: { metal: number; crystal: number; deuterium: number };
    yieldConfig?: EmpireYieldConfig;
}): EmpireDailyYieldBreakdown {
    const { activeAccount, planets, expeditions = [], combatReports = [], debrisHarvests = [] } = params;
    const rates = params.rates || { metal: 3, crystal: 2, deuterium: 1 };
    const config = params.yieldConfig || getEmpireYieldConfig();
    const scrapRatio = typeof config.scrapMerchantRatio === 'number' && !isNaN(config.scrapMerchantRatio) ? config.scrapMerchantRatio : 0.75;
    const mMultiplier = 1;
    const cMultiplier = rates.metal / rates.crystal;
    const dMultiplier = rates.metal / rates.deuterium;

    // 1. Mine production (24h)
    let totalMetalHourly = 0;
    let totalCrystalHourly = 0;
    let totalDeutHourly = 0;

    if (activeAccount && planets && planets.length > 0) {
        const calcResults = calculateEmpireProduction({ account: activeAccount, planets });
        if (calcResults) {
            planets.forEach(p => {
                const prod = calcResults.planets[p.id]?.total;
                if (prod) {
                    totalMetalHourly += prod.metal || 0;
                    totalCrystalHourly += prod.crystal || 0;
                    totalDeutHourly += prod.deuterium || 0;
                }
            });
        }
    }

    const mineHourlyMSU = (totalMetalHourly * mMultiplier) + (totalCrystalHourly * cMultiplier) + (totalDeutHourly * dMultiplier);
    const mineDailyMSU = mineHourlyMSU * 24;
    const mineDailyMetal = totalMetalHourly * 24;
    const mineDailyCrystal = totalCrystalHourly * 24;
    const mineDailyDeut = totalDeutHourly * 24;

    const nowSec = Date.now() / 1000;
    const last7Days = nowSec - (7 * 24 * 60 * 60);

    // 2. Expeditions (Last 7 Days)
    let expRes7dMSU = 0;
    let expRes7dMetal = 0;
    let expRes7dCrystal = 0;
    let expRes7dDeut = 0;
    let expShip7dMSU = 0;
    let expDaysTracked = 7;

    if (expeditions.length > 0) {
        const validTimestamps = expeditions.map(e => e.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        expDaysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

        const recentExps = expeditions.filter(e => e.timestamp >= last7Days);
        const shipCostMap: Record<number, any> = {};
        SHIP_DATA.forEach(s => { shipCostMap[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 }; });

        recentExps.forEach(e => {
            const res = (e.result || '').toLowerCase();
            if (e.resultDetails) {
                const m = Number(e.resultDetails.metal) || 0;
                const c = Number(e.resultDetails.crystal) || 0;
                const d = Number(e.resultDetails.deuterium) || 0;
                expRes7dMetal += m;
                expRes7dCrystal += c;
                expRes7dDeut += d;
                expRes7dMSU += (m * mMultiplier) + (c * cMultiplier) + (d * dMultiplier);

                if (res.includes('ship') || res.includes('wreck')) {
                    Object.entries(e.resultDetails).forEach(([id, data]: [string, any]) => {
                        const sid = parseInt(id);
                        const cost = shipCostMap[sid];
                        if (cost) {
                            const amount = data.amount || data;
                            const amt = typeof amount === 'number' ? amount : amount.amount || 0;
                            const sm = (cost.metal || 0) * amt;
                            const sc = (cost.crystal || 0) * amt;
                            const sd = (cost.deuterium || 0) * amt;
                            expShip7dMSU += (sm * mMultiplier) + (sc * cMultiplier) + (sd * dMultiplier);
                        }
                    });
                }
            }
        });
    }

    const expResDailyMSU = expRes7dMSU / expDaysTracked;
    const expShipDailyMSU = expShip7dMSU / expDaysTracked;
    const expDailyMetal = expRes7dMetal / expDaysTracked;
    const expDailyCrystal = expRes7dCrystal / expDaysTracked;
    const expDailyDeut = expRes7dDeut / expDaysTracked;

    // 3. Combat Loot (Last 7 Days)
    let combat7dMSU = 0;
    let combat7dMetal = 0;
    let combat7dCrystal = 0;
    let combat7dDeut = 0;
    let combatDaysTracked = 7;
    if (combatReports.length > 0) {
        const validTimestamps = combatReports.map(c => c.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        combatDaysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

        const recentCombats = combatReports.filter(c => c.timestamp >= last7Days && c.winner === 'attacker');
        recentCombats.forEach(c => {
            if (c.loot) {
                const m = c.loot.metal || 0;
                const cr = c.loot.crystal || 0;
                const d = c.loot.deuterium || 0;
                combat7dMetal += m;
                combat7dCrystal += cr;
                combat7dDeut += d;
                combat7dMSU += (m * mMultiplier) + (cr * cMultiplier) + (d * dMultiplier);
            }
        });
    }
    const combatDailyMSU = combat7dMSU / combatDaysTracked;
    const combatDailyMetal = combat7dMetal / combatDaysTracked;
    const combatDailyCrystal = combat7dCrystal / combatDaysTracked;
    const combatDailyDeut = combat7dDeut / combatDaysTracked;

    // 4. Debris Harvests (Last 7 Days)
    let debris7dMSU = 0;
    let debris7dMetal = 0;
    let debris7dCrystal = 0;
    let debris7dDeut = 0;
    let debrisDaysTracked = 7;
    if (debrisHarvests.length > 0) {
        const validTimestamps = debrisHarvests.map(d => d.timestamp).filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
        const minTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : nowSec;
        debrisDaysTracked = Math.min(7, Math.max(1, Math.ceil((nowSec - minTimestamp) / 86400)));

        const recentDebris = debrisHarvests.filter(d => d.timestamp >= last7Days && d.recycledResources);
        recentDebris.forEach(d => {
            const m = d.recycledResources?.metal || 0;
            const cr = d.recycledResources?.crystal || 0;
            const det = d.recycledResources?.deuterium || 0;
            debris7dMetal += m;
            debris7dCrystal += cr;
            debris7dDeut += det;
            debris7dMSU += (m * mMultiplier) + (cr * cMultiplier) + (det * dMultiplier);
        });
    }
    const debrisDailyMSU = debris7dMSU / debrisDaysTracked;
    const debrisDailyMetal = debris7dMetal / debrisDaysTracked;
    const debrisDailyCrystal = debris7dCrystal / debrisDaysTracked;
    const debrisDailyDeut = debris7dDeut / debrisDaysTracked;

    // Raw calculated values (unscaled, 100%)
    const rawMineDailyMSU = mineDailyMSU;
    const rawExpResDailyMSU = expResDailyMSU;
    const rawExpShipDailyMSU = expShipDailyMSU;
    const rawCombatDailyMSU = combatDailyMSU;
    const rawDebrisDailyMSU = debrisDailyMSU;
    const rawTotalDailyMSU = rawMineDailyMSU + rawExpResDailyMSU + rawExpShipDailyMSU + rawCombatDailyMSU + rawDebrisDailyMSU;

    // Effective values factoring in global category toggles & scrap merchant ratio
    const effectiveMineDailyMSU = config.includeMines ? rawMineDailyMSU : 0;
    const effectiveExpResDailyMSU = config.includeExpeditions ? rawExpResDailyMSU : 0;
    const effectiveExpShipDailyMSU = config.includeSalvagedFleet ? (rawExpShipDailyMSU * scrapRatio) : 0;
    const effectiveCombatDailyMSU = config.includeCombatProfits ? rawCombatDailyMSU : 0;
    const effectiveDebrisDailyMSU = config.includeDebrisFields ? rawDebrisDailyMSU : 0;

    const totalDailyYieldMSU = effectiveMineDailyMSU + effectiveExpResDailyMSU + effectiveExpShipDailyMSU + effectiveCombatDailyMSU + effectiveDebrisDailyMSU;

    // Per-resource totals factoring in included categories
    const dailyMetal = (config.includeMines ? mineDailyMetal : 0)
        + (config.includeExpeditions ? expDailyMetal : 0)
        + (config.includeCombatProfits ? combatDailyMetal : 0)
        + (config.includeDebrisFields ? debrisDailyMetal : 0);
    const dailyCrystal = (config.includeMines ? mineDailyCrystal : 0)
        + (config.includeExpeditions ? expDailyCrystal : 0)
        + (config.includeCombatProfits ? combatDailyCrystal : 0)
        + (config.includeDebrisFields ? debrisDailyCrystal : 0);
    const dailyDeuterium = (config.includeMines ? mineDailyDeut : 0)
        + (config.includeExpeditions ? expDailyDeut : 0)
        + (config.includeCombatProfits ? combatDailyDeut : 0)
        + (config.includeDebrisFields ? debrisDailyDeut : 0);

    return {
        mineHourlyMSU: config.includeMines ? mineHourlyMSU : 0,
        mineDailyMSU: effectiveMineDailyMSU,
        expResDailyMSU: effectiveExpResDailyMSU,
        expShipDailyMSU: effectiveExpShipDailyMSU,
        combatDailyMSU: effectiveCombatDailyMSU,
        debrisDailyMSU: effectiveDebrisDailyMSU,
        totalDailyYieldMSU,

        rawMineDailyMSU,
        rawExpResDailyMSU,
        rawExpShipDailyMSU,
        rawCombatDailyMSU,
        rawDebrisDailyMSU,
        rawTotalDailyMSU,

        scrapMerchantRatio: scrapRatio,
        config,

        daysTracked: expDaysTracked,
        rates,
        mineDailyMetal,
        mineDailyCrystal,
        mineDailyDeut,
        expDailyMetal,
        expDailyCrystal,
        expDailyDeut,
        combatDailyMetal,
        combatDailyCrystal,
        combatDailyDeut,
        debrisDailyMetal,
        debrisDailyCrystal,
        debrisDailyDeut,
        dailyMetal,
        dailyCrystal,
        dailyDeuterium
    };
}

export function formatGatherTime(days: number): string {
    if (days === null || days === undefined || isNaN(days) || !isFinite(days)) return 'N/A';
    if (days <= 0) return 'Instant';

    let remainingMinutes = Math.round(days * 24 * 60);
    if (remainingMinutes <= 0) return 'Instant';

    const minutesInYear = 365 * 24 * 60;
    const minutesInMonth = 30 * 24 * 60;
    const minutesInDay = 24 * 60;
    const minutesInHour = 60;

    const years = Math.floor(remainingMinutes / minutesInYear);
    remainingMinutes %= minutesInYear;

    const months = Math.floor(remainingMinutes / minutesInMonth);
    remainingMinutes %= minutesInMonth;

    const targetDays = Math.floor(remainingMinutes / minutesInDay);
    remainingMinutes %= minutesInDay;

    const hours = Math.floor(remainingMinutes / minutesInHour);
    const minutes = remainingMinutes % minutesInHour;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}mo`);
    if (targetDays > 0 || (months > 0 && targetDays === 0 && years === 0)) parts.push(`${targetDays}d`);
    if (hours > 0 || parts.length === 0) parts.push(`${hours}h`);
    if (years === 0 && months === 0 && (minutes > 0 || parts.length <= 1)) parts.push(`${minutes}m`);

    return parts.slice(0, 3).join(' ');
}
