import { SHIP_DATA } from '../db/staticData';
import { calculateEmpireProduction } from './amortizationCalc';

export interface EmpireDailyYieldBreakdown {
    mineHourlyMSU: number;
    mineDailyMSU: number;
    expResDailyMSU: number;
    expShipDailyMSU: number;
    combatDailyMSU: number;
    debrisDailyMSU: number;
    totalDailyYieldMSU: number;
    daysTracked: number;
    rates: { metal: number; crystal: number; deuterium: number };
}

export function calculateTotalEmpireDailyYield(params: {
    activeAccount: any;
    planets: any[];
    expeditions?: any[];
    combatReports?: any[];
    debrisHarvests?: any[];
    rates?: { metal: number; crystal: number; deuterium: number };
}): EmpireDailyYieldBreakdown {
    const { activeAccount, planets, expeditions = [], combatReports = [], debrisHarvests = [] } = params;
    const rates = params.rates || { metal: 3, crystal: 2, deuterium: 1 };
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

    const nowSec = Date.now() / 1000;
    const last7Days = nowSec - (7 * 24 * 60 * 60);

    // 2. Expeditions (Last 7 Days)
    let expRes7dMSU = 0;
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

    // 3. Combat Loot (Last 7 Days)
    let combat7dMSU = 0;
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
                combat7dMSU += (m * mMultiplier) + (cr * cMultiplier) + (d * dMultiplier);
            }
        });
    }
    const combatDailyMSU = combat7dMSU / combatDaysTracked;

    // 4. Debris Harvests (Last 7 Days)
    let debris7dMSU = 0;
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
            debris7dMSU += (m * mMultiplier) + (cr * cMultiplier) + (det * dMultiplier);
        });
    }
    const debrisDailyMSU = debris7dMSU / debrisDaysTracked;

    const totalDailyYieldMSU = mineDailyMSU + expResDailyMSU + expShipDailyMSU + combatDailyMSU + debrisDailyMSU || 1;

    return {
        mineHourlyMSU,
        mineDailyMSU,
        expResDailyMSU,
        expShipDailyMSU,
        combatDailyMSU,
        debrisDailyMSU,
        totalDailyYieldMSU,
        daysTracked: expDaysTracked,
        rates
    };
}

export function formatGatherTime(days: number): string {
    if (days <= 0 || isNaN(days) || !isFinite(days)) return 'Instant';

    let remainingMinutes = Math.round(days * 24 * 60);

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
