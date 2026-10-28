import {
    FleetParty,
    ServerSettings,
    RawSimulationRun,
    ParsedScenario,
    SimulationAggregateResult,
    IpmStrikeResult,
    Coordinates
} from './types';
import { UNITS, DEFENSE_IDS } from './constants';

export class NexuSimEngine {
    /**
     * Compute effective combat statistics for a unit given player research, class, and lifeform bonuses.
     */
    static calculateUnitStats(unitId: number, party: FleetParty, serverSettings: ServerSettings) {
        const base = UNITS[unitId];
        if (!base) {
            return { weapon: 0, shield: 0, armour: 0, hull: 0, cargo: 0, speed: 0, fuel: 0 };
        }

        // Standard Laboratory Research bonuses (+10% per level)
        let weaponBonus = 0.10 * base.weapon * party.techs.weapons;
        let shieldBonus = 0.10 * base.shield * party.techs.shielding;
        let armourBonus = 0.10 * base.armour * party.techs.armour;

        // General Class bonus (+20% combat tech scaling for combat ships)
        if (party.playerClass === 2 && base.category === 'war') {
            weaponBonus += 0.20 * base.weapon;
            shieldBonus += 0.20 * base.shield;
            armourBonus += 0.20 * base.armour;
        }

        // Lifeforms Bonuses
        if (serverSettings.lifeforms && party.lifeformBonuses) {
            const lf = party.lifeformBonuses;
            const shipWep = (lf.globalWeapon || 0) + (lf.perShipWeapon[unitId] || 0);
            const shipShd = (lf.globalShield || 0) + (lf.perShipShield[unitId] || 0);
            const shipArm = (lf.globalArmour || 0) + (lf.perShipArmour[unitId] || 0);

            weaponBonus += base.weapon * shipWep * 0.01;
            shieldBonus += base.shield * shipShd * 0.01;
            armourBonus += base.armour * shipArm * 0.01;
        }

        const weapon = Math.max(0, Math.floor(base.weapon + weaponBonus));
        const shield = Math.max(0, Math.floor(base.shield + shieldBonus));
        const armour = Math.max(1, Math.floor(base.armour + armourBonus));
        const hull = armour * 0.10;

        // Hyperspace Tech (+5% cargo per level)
        const cargoBonus = 0.05 * base.cargo * party.techs.hyperspaceTech;
        const cargo = Math.floor(base.cargo + cargoBonus);

        return {
            weapon,
            shield,
            armour,
            hull,
            cargo,
            speed: base.speed,
            fuel: base.fuel
        };
    }

    /**
     * Executes the Monte Carlo simulation runs using high-performance ArrayBuffers.
     */
    static runSimulations(
        attackers: FleetParty[],
        defenders: FleetParty[],
        serverSettings: ServerSettings,
        iterations: number = 100,
        onProgress?: (progressPercent: number) => void
    ): RawSimulationRun[] {
        const startTime = performance.now();
        const runs: RawSimulationRun[] = [];

        // Precompute stats per party
        const atkPartyData = attackers.map((party, idx) => {
            const stats: Record<number, { weapon: number; shield: number; hull: number; cargo: number }> = {};
            for (const idStr of Object.keys(party.units)) {
                const id = parseInt(idStr);
                if (party.units[id] > 0) {
                    const uStats = NexuSimEngine.calculateUnitStats(id, party, serverSettings);
                    stats[id] = { weapon: uStats.weapon, shield: uStats.shield, hull: uStats.hull, cargo: uStats.cargo };
                }
            }
            return { id: idx, ships: { ...party.units }, stats };
        });

        const defPartyData = defenders.map((party, idx) => {
            const stats: Record<number, { weapon: number; shield: number; hull: number; cargo: number }> = {};
            for (const idStr of Object.keys(party.units)) {
                const id = parseInt(idStr);
                if (party.units[id] > 0) {
                    const uStats = NexuSimEngine.calculateUnitStats(id, party, serverSettings);
                    stats[id] = { weapon: uStats.weapon, shield: uStats.shield, hull: uStats.hull, cargo: uStats.cargo };
                }
            }
            return { id: idx, ships: { ...party.units }, stats };
        });

        for (let runIdx = 0; runIdx < iterations; runIdx++) {
            const simAtk = new SimParty(atkPartyData);
            const simDef = new SimParty(defPartyData);

            let round = 0;
            while (round < 6 && simAtk.remaining > 0 && simDef.remaining > 0) {
                round++;
                simAtk.shootTo(simDef, serverSettings.rapidFire);
                simDef.shootTo(simAtk, serverSettings.rapidFire);
                simAtk.resetEntities();
                simDef.resetEntities();
            }

            const outcome: { attackers?: number; defenders?: number; draw?: number } = {};
            if (simAtk.remaining === 0 && simDef.remaining === 0) {
                outcome.draw = 1;
            } else if (simAtk.remaining === 0) {
                outcome.defenders = 1;
            } else if (simDef.remaining === 0) {
                outcome.attackers = 1;
            } else {
                outcome.draw = 1;
            }

            runs.push({
                lost: {
                    attackers: simAtk.getLostEntities(),
                    defenders: simDef.getLostEntities()
                },
                remaining: {
                    attackers: simAtk.getRemainingEntities(),
                    defenders: simDef.getRemainingEntities()
                },
                result: outcome,
                rounds: round
            });

            simAtk.clear();
            simDef.clear();

            if (onProgress && (runIdx % 25 === 0 || runIdx === iterations - 1)) {
                onProgress(Math.round(((runIdx + 1) / iterations) * 100));
            }
        }

        return runs;
    }

    /**
     * Parses the raw simulation runs into statistical scenarios, debris, plunder, and financial ROI.
     */
    static processSimulationResults(
        runs: RawSimulationRun[],
        attackers: FleetParty[],
        defenders: FleetParty[],
        serverSettings: ServerSettings,
        targetResources: { metal: number; crystal: number; deuterium: number },
        plunderRate: number = 50,
        executionTimeMs: number = 0
    ): SimulationAggregateResult {
        let winAtk = 0;
        let winDef = 0;
        let draws = 0;
        let totalRounds = 0;

        const parsedRuns: ParsedScenario[] = runs.map(run => {
            if (run.result.attackers) winAtk++;
            else if (run.result.defenders) winDef++;
            else draws++;
            totalRounds += run.rounds;

            return NexuSimEngine.parseSingleRun(run, attackers, defenders, serverSettings, targetResources, plunderRate);
        });

        // Scenario 1: Average Scenario (Mean averages)
        const avgScenario = NexuSimEngine.createAverageScenario(parsedRuns, runs.length);

        // Scenario 2: Best Case for Attacker (Highest Attacker Profit)
        let bestAtk = parsedRuns[0];
        let worstAtk = parsedRuns[0];
        let maxDebris = parsedRuns[0];

        for (const p of parsedRuns) {
            if (p.profit.msu > bestAtk.profit.msu) bestAtk = p;
            if (p.profit.msu < worstAtk.profit.msu) worstAtk = p;
            if (p.debris.total > maxDebris.debris.total) maxDebris = p;
        }

        return {
            totalRuns: runs.length,
            executionTimeMs,
            winRates: {
                attackers: (winAtk / runs.length) * 100,
                defenders: (winDef / runs.length) * 100,
                draw: (draws / runs.length) * 100
            },
            averageRounds: totalRounds / runs.length,
            scenarios: {
                average: avgScenario,
                bestCase: bestAtk,
                worstCase: worstAtk,
                maxDebris: maxDebris
            }
        };
    }

    private static parseSingleRun(
        run: RawSimulationRun,
        attackers: FleetParty[],
        defenders: FleetParty[],
        serverSettings: ServerSettings,
        targetResources: { metal: number; crystal: number; deuterium: number },
        plunderRate: number
    ): ParsedScenario {
        const outcome = run.result.attackers ? 'attackers' : run.result.defenders ? 'defenders' : 'draw';
        const lostUnitsAtk: Record<number, number> = {};
        const lostUnitsDef: Record<number, number> = {};
        const remainingUnitsAtk: Record<number, number> = {};
        const remainingUnitsDef: Record<number, number> = {};

        let atkLossMetal = 0, atkLossCrystal = 0, atkLossDeut = 0;
        let defLossMetal = 0, defLossCrystal = 0, defLossDeut = 0;
        let debrisMetal = 0, debrisCrystal = 0, debrisDeut = 0;

        // Attacker losses
        for (const [pIdStr, units] of Object.entries(run.lost.attackers)) {
            for (const [uIdStr, count] of Object.entries(units)) {
                const uId = parseInt(uIdStr);
                lostUnitsAtk[uId] = (lostUnitsAtk[uId] || 0) + count;
                const def = UNITS[uId];
                if (def) {
                    atkLossMetal += def.cost.metal * count;
                    atkLossCrystal += def.cost.crystal * count;
                    atkLossDeut += def.cost.deuterium * count;

                    debrisMetal += def.cost.metal * count * serverSettings.debrisFactor;
                    debrisCrystal += def.cost.crystal * count * serverSettings.debrisFactor;
                    if (serverSettings.deuteriumInDebris) {
                        debrisDeut += def.cost.deuterium * count * serverSettings.debrisFactor;
                    }
                }
            }
        }

        // Defender losses
        for (const [pIdStr, units] of Object.entries(run.lost.defenders)) {
            const pId = parseInt(pIdStr);
            const party = defenders[pId] || defenders[0];
            const repairRate = party?.engineer ? (1 - serverSettings.repairFactor) / 2 : (1 - serverSettings.repairFactor);

            for (const [uIdStr, count] of Object.entries(units)) {
                const uId = parseInt(uIdStr);
                lostUnitsDef[uId] = (lostUnitsDef[uId] || 0) + count;
                const def = UNITS[uId];
                if (def) {
                    defLossMetal += def.cost.metal * count;
                    defLossCrystal += def.cost.crystal * count;
                    defLossDeut += def.cost.deuterium * count;

                    if (uId >= 400 && uId <= 500) {
                        // Planetary Defense to Debris
                        if (serverSettings.debrisFactorDef > 0) {
                            debrisMetal += def.cost.metal * count * repairRate * serverSettings.debrisFactorDef;
                            debrisCrystal += def.cost.crystal * count * repairRate * serverSettings.debrisFactorDef;
                        }
                    } else if (uId < 300) {
                        // Ships to Debris
                        debrisMetal += def.cost.metal * count * serverSettings.debrisFactor;
                        debrisCrystal += def.cost.crystal * count * serverSettings.debrisFactor;
                        if (serverSettings.deuteriumInDebris) {
                            debrisDeut += def.cost.deuterium * count * serverSettings.debrisFactor;
                        }
                    }
                }
            }
        }

        // Remaining units
        let totalAtkCargo = 0;
        let reaperCargo = 0;

        for (const [pIdStr, units] of Object.entries(run.remaining.attackers)) {
            const pId = parseInt(pIdStr);
            const party = attackers[pId] || attackers[0];
            for (const [uIdStr, count] of Object.entries(units)) {
                const uId = parseInt(uIdStr);
                remainingUnitsAtk[uId] = (remainingUnitsAtk[uId] || 0) + count;
                const stats = NexuSimEngine.calculateUnitStats(uId, party, serverSettings);
                totalAtkCargo += stats.cargo * count;
                if (uId === 218) { // Reaper
                    reaperCargo += stats.cargo * count;
                }
            }
        }

        for (const [pIdStr, units] of Object.entries(run.remaining.defenders)) {
            for (const [uIdStr, count] of Object.entries(units)) {
                const uId = parseInt(uIdStr);
                remainingUnitsDef[uId] = (remainingUnitsDef[uId] || 0) + count;
            }
        }

        // Debris Total & Moon Chance
        const totalDebris = debrisMetal + debrisCrystal + debrisDeut;
        const moonChance = Math.min(20, Math.floor(totalDebris / 100000));

        // Reaper Harvest (Up to 25% of debris field harvested instantly by General Reapers)
        let reaperHarvestMetal = 0, reaperHarvestCrystal = 0, reaperHarvestDeut = 0;
        if (totalDebris > 0 && reaperCargo > 0) {
            const reaperMaxTotal = Math.min(reaperCargo, totalDebris * serverSettings.combatDebrisFieldLimit);
            const mRatio = debrisMetal / totalDebris;
            const cRatio = debrisCrystal / totalDebris;
            const dRatio = debrisDeut / totalDebris;

            reaperHarvestMetal = Math.floor(reaperMaxTotal * mRatio);
            reaperHarvestCrystal = Math.floor(reaperMaxTotal * cRatio);
            reaperHarvestDeut = Math.floor(reaperMaxTotal * dRatio);

            totalAtkCargo = Math.max(0, totalAtkCargo - (reaperHarvestMetal + reaperHarvestCrystal + reaperHarvestDeut));
        }

        // Plunder Calculation (OGame 7-Step Loot Distribution)
        let plunderMetal = 0, plunderCrystal = 0, plunderDeut = 0;
        const rateFrac = plunderRate / 100;
        const possMetal = targetResources.metal * rateFrac;
        const possCrystal = targetResources.crystal * rateFrac;
        const possDeut = targetResources.deuterium * rateFrac;

        if (outcome === 'attackers' && totalAtkCargo > 0) {
            let remCargo = totalAtkCargo;
            let mPool = possMetal;
            let cPool = possCrystal;
            let dPool = possDeut;

            // Step 1: Up to 1/3 cargo for metal
            const step1 = remCargo / 3;
            if (mPool <= step1) { plunderMetal += mPool; remCargo -= mPool; mPool = 0; }
            else { plunderMetal += step1; remCargo -= step1; mPool -= step1; }

            // Step 2: Up to 1/2 of remaining cargo for crystal
            const step2 = remCargo / 2;
            if (cPool <= step2) { plunderCrystal += cPool; remCargo -= cPool; cPool = 0; }
            else { plunderCrystal += step2; remCargo -= step2; cPool -= step2; }

            // Step 3: Deuterium with all remaining cargo
            if (dPool <= remCargo) { plunderDeut += dPool; remCargo -= dPool; dPool = 0; }
            else { plunderDeut += remCargo; dPool -= remCargo; remCargo = 0; }

            // Step 4: Any leftover cargo takes remaining metal (up to 1/2)
            if (remCargo > 0) {
                const step4 = remCargo / 2;
                if (mPool <= step4) { plunderMetal += mPool; remCargo -= mPool; mPool = 0; }
                else { plunderMetal += step4; remCargo -= step4; mPool -= step4; }
            }

            // Step 5: Remaining cargo takes remaining crystal
            if (remCargo > 0) {
                if (cPool <= remCargo) { plunderCrystal += cPool; remCargo -= cPool; cPool = 0; }
                else { plunderCrystal += remCargo; cPool -= remCargo; remCargo = 0; }
            }

            // Step 6: Remaining cargo takes remaining metal
            if (remCargo > 0) {
                if (mPool <= remCargo) { plunderMetal += mPool; remCargo -= mPool; mPool = 0; }
                else { plunderMetal += remCargo; mPool -= remCargo; remCargo = 0; }
            }
        }

        // Wreckfield Calculation (Space Dock recovery)
        const defWreckfield: Record<number, number> = {};
        let defWreckMetal = 0, defWreckCrystal = 0, defWreckDeut = 0;
        const primaryDefender = defenders[0];

        if (primaryDefender && primaryDefender.spaceDock > 0) {
            let totalLossPoints = 0;
            for (const [uIdStr, count] of Object.entries(lostUnitsDef)) {
                const uId = parseInt(uIdStr);
                if (uId < 400 && uId !== 210 && uId !== 212 && uId !== 217) {
                    totalLossPoints += (UNITS[uId]?.points || 0) * count;
                }
            }

            const dockBase = Math.round(45 * Math.pow(primaryDefender.spaceDock, 0.08) * (1 - serverSettings.debrisFactor));
            const nanoBonus = primaryDefender.nanoRepairBots ? 1 + (1.3 * primaryDefender.nanoRepairBots / 100) : 1;
            const recoveryFrac = Math.min(0.85, (dockBase * nanoBonus) / 100);

            for (const [uIdStr, count] of Object.entries(lostUnitsDef)) {
                const uId = parseInt(uIdStr);
                if (uId < 400 && uId !== 210 && uId !== 212 && uId !== 217) {
                    const restored = Math.floor(count * recoveryFrac);
                    if (restored > 0) {
                        defWreckfield[uId] = restored;
                        const def = UNITS[uId];
                        if (def) {
                            defWreckMetal += def.cost.metal * restored;
                            defWreckCrystal += def.cost.crystal * restored;
                            defWreckDeut += def.cost.deuterium * restored;
                        }
                    }
                }
            }
        }

        // Net Profit (MSU Ratio 3:2:1)
        const profitMetal = plunderMetal + (debrisMetal - reaperHarvestMetal) + reaperHarvestMetal - atkLossMetal;
        const profitCrystal = plunderCrystal + (debrisCrystal - reaperHarvestCrystal) + reaperHarvestCrystal - atkLossCrystal;
        const profitDeut = plunderDeut + (debrisDeut - reaperHarvestDeut) + reaperHarvestDeut - atkLossDeut;
        const profitMSU = profitMetal + (profitCrystal * 1.5) + (profitDeut * 3.0);

        const atkLossTotal = atkLossMetal + atkLossCrystal + atkLossDeut;
        const defLossTotal = defLossMetal + defLossCrystal + defLossDeut;

        const plunderTotal = plunderMetal + plunderCrystal + plunderDeut;
        const hypTech = attackers[0]?.techs?.hyperspaceTech || 0;
        const scCap = 5000 * (1 + 0.05 * hypTech);
        const lcCap = 25000 * (1 + 0.05 * hypTech);
        const recCap = 20000 * (1 + 0.05 * hypTech);

        return {
            outcome,
            rounds: run.rounds,
            lostUnits: {
                attackers: lostUnitsAtk,
                defenders: lostUnitsDef
            },
            remainingUnits: {
                attackers: remainingUnitsAtk,
                defenders: remainingUnitsDef
            },
            losses: {
                attackers: {
                    metal: atkLossMetal,
                    crystal: atkLossCrystal,
                    deuterium: atkLossDeut,
                    total: atkLossTotal,
                    msu: atkLossMetal + (atkLossCrystal * 1.5) + (atkLossDeut * 3.0)
                },
                defenders: {
                    metal: defLossMetal,
                    crystal: defLossCrystal,
                    deuterium: defLossDeut,
                    total: defLossTotal,
                    msu: defLossMetal + (defLossCrystal * 1.5) + (defLossDeut * 3.0)
                }
            },
            debris: {
                metal: debrisMetal,
                crystal: debrisCrystal,
                deuterium: debrisDeut,
                total: totalDebris
            },
            moonChance,
            reaperHarvest: {
                metal: reaperHarvestMetal,
                crystal: reaperHarvestCrystal,
                deuterium: reaperHarvestDeut,
                total: reaperHarvestMetal + reaperHarvestCrystal + reaperHarvestDeut
            },
            plunder: {
                possible: {
                    metal: possMetal,
                    crystal: possCrystal,
                    deuterium: possDeut,
                    total: possMetal + possCrystal + possDeut
                },
                captured: {
                    metal: plunderMetal,
                    crystal: plunderCrystal,
                    deuterium: plunderDeut,
                    total: plunderTotal
                }
            },
            wreckfield: {
                attackers: {},
                defenders: defWreckfield,
                resources: {
                    metal: defWreckMetal,
                    crystal: defWreckCrystal,
                    deuterium: defWreckDeut,
                    total: defWreckMetal + defWreckCrystal + defWreckDeut
                }
            },
            profit: {
                metal: profitMetal,
                crystal: profitCrystal,
                deuterium: profitDeut,
                total: profitMetal + profitCrystal + profitDeut,
                msu: profitMSU
            },
            cargoNeeded: {
                smallCargo: Math.ceil(plunderTotal / scCap),
                largeCargo: Math.ceil(plunderTotal / lcCap)
            },
            recyclersNeeded: Math.ceil(totalDebris / recCap)
        };
    }

    private static createAverageScenario(runs: ParsedScenario[], total: number): ParsedScenario {
        const avg = (fn: (r: ParsedScenario) => number) => runs.reduce((acc, r) => acc + fn(r), 0) / total;

        const avgLostAtk: Record<number, number> = {};
        const avgLostDef: Record<number, number> = {};
        const avgRemAtk: Record<number, number> = {};
        const avgRemDef: Record<number, number> = {};

        runs.forEach(r => {
            for (const [k, v] of Object.entries(r.lostUnits.attackers)) avgLostAtk[+k] = (avgLostAtk[+k] || 0) + v / total;
            for (const [k, v] of Object.entries(r.lostUnits.defenders)) avgLostDef[+k] = (avgLostDef[+k] || 0) + v / total;
            for (const [k, v] of Object.entries(r.remainingUnits.attackers)) avgRemAtk[+k] = (avgRemAtk[+k] || 0) + v / total;
            for (const [k, v] of Object.entries(r.remainingUnits.defenders)) avgRemDef[+k] = (avgRemDef[+k] || 0) + v / total;
        });

        // Round unit counts
        for (const k of Object.keys(avgLostAtk)) avgLostAtk[+k] = Math.round(avgLostAtk[+k]);
        for (const k of Object.keys(avgLostDef)) avgLostDef[+k] = Math.round(avgLostDef[+k]);
        for (const k of Object.keys(avgRemAtk)) avgRemAtk[+k] = Math.round(avgRemAtk[+k]);
        for (const k of Object.keys(avgRemDef)) avgRemDef[+k] = Math.round(avgRemDef[+k]);

        return {
            outcome: 'attackers',
            rounds: avg(r => r.rounds),
            lostUnits: { attackers: avgLostAtk, defenders: avgLostDef },
            remainingUnits: { attackers: avgRemAtk, defenders: avgRemDef },
            losses: {
                attackers: {
                    metal: Math.round(avg(r => r.losses.attackers.metal)),
                    crystal: Math.round(avg(r => r.losses.attackers.crystal)),
                    deuterium: Math.round(avg(r => r.losses.attackers.deuterium)),
                    total: Math.round(avg(r => r.losses.attackers.total)),
                    msu: Math.round(avg(r => r.losses.attackers.msu))
                },
                defenders: {
                    metal: Math.round(avg(r => r.losses.defenders.metal)),
                    crystal: Math.round(avg(r => r.losses.defenders.crystal)),
                    deuterium: Math.round(avg(r => r.losses.defenders.deuterium)),
                    total: Math.round(avg(r => r.losses.defenders.total)),
                    msu: Math.round(avg(r => r.losses.defenders.msu))
                }
            },
            debris: {
                metal: Math.round(avg(r => r.debris.metal)),
                crystal: Math.round(avg(r => r.debris.crystal)),
                deuterium: Math.round(avg(r => r.debris.deuterium)),
                total: Math.round(avg(r => r.debris.total))
            },
            moonChance: Math.round(avg(r => r.moonChance)),
            reaperHarvest: {
                metal: Math.round(avg(r => r.reaperHarvest.metal)),
                crystal: Math.round(avg(r => r.reaperHarvest.crystal)),
                deuterium: Math.round(avg(r => r.reaperHarvest.deuterium)),
                total: Math.round(avg(r => r.reaperHarvest.total))
            },
            plunder: {
                possible: runs[0].plunder.possible,
                captured: {
                    metal: Math.round(avg(r => r.plunder.captured.metal)),
                    crystal: Math.round(avg(r => r.plunder.captured.crystal)),
                    deuterium: Math.round(avg(r => r.plunder.captured.deuterium)),
                    total: Math.round(avg(r => r.plunder.captured.total))
                }
            },
            wreckfield: runs[0].wreckfield,
            profit: {
                metal: Math.round(avg(r => r.profit.metal)),
                crystal: Math.round(avg(r => r.profit.crystal)),
                deuterium: Math.round(avg(r => r.profit.deuterium)),
                total: Math.round(avg(r => r.profit.total)),
                msu: Math.round(avg(r => r.profit.msu))
            },
            cargoNeeded: {
                smallCargo: Math.round(avg(r => r.cargoNeeded.smallCargo)),
                largeCargo: Math.round(avg(r => r.cargoNeeded.largeCargo))
            },
            recyclersNeeded: Math.round(avg(r => r.recyclersNeeded))
        };
    }

    /**
     * Interplanetary Missiles (IPM) Pre-Strike Calculator against defender structures.
     */
    static calculateIpmStrike(
        ipmCount: number,
        primaryTargetId: number,
        defenderUnits: Record<number, number>,
        defenderTechs: { armour: number },
        attackerTechs: { weapons: number }
    ): IpmStrikeResult {
        const abmCount = defenderUnits[502] || 0;
        const abmIntercepted = Math.min(abmCount, ipmCount);
        const effectiveIpm = ipmCount - abmIntercepted;

        const remainingDef: Record<number, number> = { ...defenderUnits };
        const neutralized: Record<number, number> = {};
        neutralized[502] = abmIntercepted;
        remainingDef[502] = Math.max(0, abmCount - abmIntercepted);

        if (effectiveIpm <= 0) {
            return {
                ipmLaunched: ipmCount,
                abmIntercepted,
                effectiveIpm: 0,
                neutralizedDefenses: neutralized,
                remainingDefenses: remainingDef,
                attackerLossCost: {
                    metal: ipmCount * 12500,
                    crystal: ipmCount * 2500,
                    deuterium: ipmCount * 10000,
                    total: ipmCount * 25000
                },
                defenderLossCost: {
                    metal: abmIntercepted * 8000,
                    crystal: 0,
                    deuterium: abmIntercepted * 2000,
                    total: abmIntercepted * 10000
                }
            };
        }

        // Each IPM deals 12,000 * (1 + 0.1 * WeaponsTech) damage
        let remainingDamage = effectiveIpm * 12000 * (1 + 0.10 * attackerTechs.weapons);
        const armourMult = 1 + (0.10 * defenderTechs.armour);

        // Sequence: Primary Target first, then sequentially through other defenses
        const strikeOrder = [primaryTargetId, ...DEFENSE_IDS.filter(id => id !== primaryTargetId)];

        for (const targetId of strikeOrder) {
            if (remainingDamage <= 0) break;
            const currentAmount = remainingDef[targetId] || 0;
            if (currentAmount <= 0) continue;

            const baseDef = UNITS[targetId];
            if (!baseDef) continue;

            const unitHull = (baseDef.armour * armourMult) * 0.10;
            const destroyed = Math.min(currentAmount, Math.floor(remainingDamage / unitHull));

            if (destroyed > 0) {
                neutralized[targetId] = (neutralized[targetId] || 0) + destroyed;
                remainingDef[targetId] -= destroyed;
                remainingDamage -= destroyed * unitHull;
            }
        }

        // Compute loss costs
        let defLostMetal = abmIntercepted * 8000;
        let defLostCrystal = 0;
        let defLostDeut = abmIntercepted * 2000;

        for (const [idStr, count] of Object.entries(neutralized)) {
            const id = parseInt(idStr);
            if (id === 502) continue; // Already counted above
            const def = UNITS[id];
            if (def) {
                defLostMetal += def.cost.metal * count;
                defLostCrystal += def.cost.crystal * count;
                defLostDeut += def.cost.deuterium * count;
            }
        }

        return {
            ipmLaunched: ipmCount,
            abmIntercepted,
            effectiveIpm,
            neutralizedDefenses: neutralized,
            remainingDefenses: remainingDef,
            attackerLossCost: {
                metal: ipmCount * 12500,
                crystal: ipmCount * 2500,
                deuterium: ipmCount * 10000,
                total: ipmCount * 25000
            },
            defenderLossCost: {
                metal: defLostMetal,
                crystal: defLostCrystal,
                deuterium: defLostDeut,
                total: defLostMetal + defLostCrystal + defLostDeut
            }
        };
    }

    /**
     * Compute flight distance and duration between two coordinates.
     */
    static calculateDistance(origin: Coordinates, target: Coordinates, serverSettings: ServerSettings): number {
        if (!origin || !target) return 0;
        if (origin.galaxy !== target.galaxy) {
            let diff = Math.abs(origin.galaxy - target.galaxy);
            const halfG = serverSettings.galaxies / 2;
            if (serverSettings.donutGalaxy && diff > halfG) {
                diff = serverSettings.galaxies - diff;
            }
            return 20000 * diff;
        }

        if (origin.system !== target.system) {
            let diff = Math.abs(origin.system - target.system);
            const halfS = serverSettings.systems / 2;
            if (serverSettings.donutSystem && diff > halfS) {
                diff = serverSettings.systems - diff;
            }
            return 2700 + (95 * diff);
        }

        if (origin.position !== target.position) {
            return 1000 + (5 * Math.abs(origin.position - target.position));
        }

        return 5;
    }

    static calculateFlightDuration(distance: number, slowestSpeed: number, speedFactor: number, universeWarSpeed: number): number {
        if (!distance || slowestSpeed <= 0) return 0;
        const factor = speedFactor / 100;
        return Math.round((10 + (3500 / factor) * Math.sqrt((10 * distance) / slowestSpeed)) / universeWarSpeed);
    }
}

/**
 * High-performance In-Memory Combat Party representation using Flat Memory Buffers.
 */
class SimParty {
    length: number = 0;
    remaining: number = 0;
    destroyed: number = 0;
    x: number = 0;

    dataBuffer: ArrayBuffer;
    dataBufferShields: ArrayBuffer;
    dataBufferHullPoints: ArrayBuffer;

    entities: DataView;
    entitiesState: DataView;
    entitiesShields: DataView;
    entitiesHullPoints: DataView;

    entityInfo: Record<number, Record<number, [number, number, number]>> = {};
    lostEntities: Record<number, Record<number, number>> = {};
    remainingEntities: Record<number, Record<number, number>> = {};

    constructor(parties: { id: number; ships: Record<number, number>; stats: Record<number, { weapon: number; shield: number; hull: number }> }[]) {
        for (const p of parties) {
            this.entityInfo[p.id] = {};
            this.lostEntities[p.id] = {};
            this.remainingEntities[p.id] = {};
            for (const [idStr, count] of Object.entries(p.ships)) {
                const id = parseInt(idStr);
                if (id <= 500 && count > 0) {
                    this.length += count;
                    this.remaining += count;
                }
            }
        }

        this.dataBuffer = new ArrayBuffer(2 * this.length);
        this.dataBufferShields = new ArrayBuffer(4 * this.length);
        this.dataBufferHullPoints = new ArrayBuffer(4 * this.length);

        this.entities = new DataView(this.dataBuffer, 0, this.length);
        this.entitiesState = new DataView(this.dataBuffer, this.length, this.length);
        this.entitiesShields = new DataView(this.dataBufferShields, 0, 4 * this.length);
        this.entitiesHullPoints = new DataView(this.dataBufferHullPoints, 0, 4 * this.length);

        for (const p of parties) {
            for (const [idStr, count] of Object.entries(p.ships)) {
                const id = parseInt(idStr);
                if (id > 500 || count <= 0) continue;
                const offsetId = id - 200;
                const stat = p.stats[id] || { weapon: 0, shield: 0, hull: 1 };
                this.entityInfo[p.id][offsetId] = [stat.weapon, stat.shield, stat.hull];
                this.lostEntities[p.id][id] = 0;

                for (let c = 0; c < count; c++) {
                    this.entities.setUint8(this.x, offsetId);
                    this.entitiesState.setUint8(this.x, 1 | (p.id << 1));
                    this.entitiesShields.setFloat32(4 * this.x, stat.shield);
                    this.entitiesHullPoints.setFloat32(4 * this.x, stat.hull);
                    this.x++;
                }
            }
        }
    }

    shootTo(target: SimParty, rapidFireActive: boolean) {
        if (target.remaining <= 0 || this.remaining <= 0) return;
        const rand = Math.random;
        const entitiesView = this.entities;
        const count = this.remaining;
        let i = 0;
        let lastOffset = -1;
        let currentRfMap: Record<number, number> | undefined;

        while (i < count) {
            const offsetId = entitiesView.getUint8(i);
            const pId = this.entitiesState.getUint8(i) >> 1;

            if (offsetId !== lastOffset) {
                lastOffset = offsetId;
                const actualId = offsetId + 200;
                currentRfMap = UNITS[actualId]?.rapidfireAgainst;
            }

            const shooterWep = this.entityInfo[pId][offsetId][0];

            do {
                const targetIdx = Math.floor(rand() * target.remaining);
                const targetOffset = target.entities.getUint8(targetIdx);
                const targetPId = target.entitiesState.getUint8(targetIdx) >> 1;
                const targetOffsetByte = 4 * targetIdx;

                if ((target.entitiesState.getUint8(targetIdx) & 1) === 1 && shooterWep > 0) {
                    const currentShield = target.entitiesShields.getFloat32(targetOffsetByte);
                    const maxShield = target.entityInfo[targetPId][targetOffset][1];
                    let damage = shooterWep;

                    // 1% Bounce Rule
                    if (damage < maxShield && currentShield >= 0) {
                        const ratio = (damage / maxShield) * 100;
                        if (ratio > 1) {
                            const steps = Math.floor(ratio);
                            const newShield = currentShield - (0.01 * steps * maxShield);
                            target.entitiesShields.setFloat32(targetOffsetByte, Math.max(0, newShield));
                        }
                        damage = 0;
                    } else {
                        damage -= Math.max(0, currentShield);
                        target.entitiesShields.setFloat32(targetOffsetByte, -1);
                    }

                    // Hull damage
                    let currentHull = target.entitiesHullPoints.getFloat32(targetOffsetByte);
                    if (damage > 0) {
                        currentHull -= damage;
                        target.entitiesHullPoints.setFloat32(targetOffsetByte, currentHull);
                        if (currentHull <= 0) {
                            target.entitiesState.setUint8(targetIdx, target.entitiesState.getUint8(targetIdx) & -2);
                            target.destroyed++;
                        }
                    }

                    // 70% Catastrophic explosion check
                    const maxHull = target.entityInfo[targetPId][targetOffset][2];
                    if (
                        (target.entitiesState.getUint8(targetIdx) & 1) === 1 &&
                        currentHull <= 0.70 * maxHull &&
                        rand() >= (currentHull / maxHull)
                    ) {
                        target.entitiesState.setUint8(targetIdx, target.entitiesState.getUint8(targetIdx) & -2);
                        target.destroyed++;
                    }
                }

                // Rapid Fire Check
                if (!rapidFireActive || !currentRfMap) break;
                const targetActualId = targetOffset + 200;
                const rfVal = currentRfMap[targetActualId];
                if (!rfVal || rand() <= (1 / rfVal)) break;

            } while (true);

            i++;
        }
    }

    resetEntities() {
        const surviving = this.length - this.destroyed;
        let newIdx = 0;
        for (let i = 0; i < this.remaining; i++) {
            const offsetId = this.entities.getUint8(i);
            const pId = this.entitiesState.getUint8(i) >> 1;
            const actualId = offsetId + 200;

            if ((this.entitiesState.getUint8(i) & 1) === 0) {
                this.lostEntities[pId][actualId] = (this.lostEntities[pId][actualId] || 0) + 1;
            } else {
                this.entities.setUint8(newIdx, offsetId);
                this.entitiesState.setUint8(newIdx, 1 | (pId << 1));
                this.entitiesShields.setFloat32(4 * newIdx, this.entityInfo[pId][offsetId][1]); // 100% shield restore
                this.entitiesHullPoints.setFloat32(4 * newIdx, this.entitiesHullPoints.getFloat32(4 * i));
                newIdx++;
            }
        }
        this.remaining = surviving;
    }

    getRemainingEntities(): Record<number, Record<number, number>> {
        for (let i = 0; i < this.remaining; i++) {
            const offsetId = this.entities.getUint8(i);
            const pId = this.entitiesState.getUint8(i) >> 1;
            const actualId = offsetId + 200;
            this.remainingEntities[pId][actualId] = (this.remainingEntities[pId][actualId] || 0) + 1;
        }
        return this.remainingEntities;
    }

    getLostEntities(): Record<number, Record<number, number>> {
        return this.lostEntities;
    }

    clear() {
        this.dataBuffer = new ArrayBuffer(0);
        this.dataBufferShields = new ArrayBuffer(0);
        this.dataBufferHullPoints = new ArrayBuffer(0);
    }
}
