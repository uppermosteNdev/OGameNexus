import { db, CombatReport, AnomalyMission } from '../db';
import { SHIP_DATA } from '../db/staticData';

export interface CombatLossesBreakdown {
    playerLossesMsu: number;
    playerLossesRaw: number;
    enemyDestroyedMsu: number;
    enemyDestroyedRaw: number;
    playerLostShips: Record<string, number>;
    isPlayerAttacker: boolean;
    isPlayerDefender: boolean;
    opponentName: string;
    isWin: boolean;
    isLoss: boolean;
    isDraw: boolean;
}

export const TECH_ID_TO_COST: Record<number, { name: string; metal: number; crystal: number; deuterium: number; msu: number }> = {};

SHIP_DATA.forEach((s) => {
    const m = s.metadata?.cost?.metal || 0;
    const c = s.metadata?.cost?.crystal || 0;
    const d = s.metadata?.cost?.deuterium || 0;
    const msu = m * 1.0 + c * 1.5 + d * 3.0;
    TECH_ID_TO_COST[s.id] = { name: s.name, metal: m, crystal: c, deuterium: d, msu };
});

/**
 * Calculates the exact player and enemy casualties for any combat report,
 * correctly accounting for whether the player was attacker or defender.
 */
export function getCombatPlayerAndEnemyLosses(
    combat: CombatReport | any,
    playerId?: string,
    playerName?: string
): CombatLossesBreakdown {
    const pIdStr = playerId ? String(playerId).trim() : '';
    const pNameLower = playerName ? playerName.toLowerCase().trim() : '';

    let isPlayerAttacker = false;
    let isPlayerDefender = false;
    const playerFleetIds = new Set<number>();
    let opponentName = '';

    if (combat.rawFleets && Array.isArray(combat.rawFleets)) {
        combat.rawFleets.forEach((f: any) => {
            const fPlayerId = f.player?.id ? String(f.player.id).trim() : '';
            const fPlayerName = f.player?.name ? f.player.name.toLowerCase().trim() : '';
            const isMatch = (pIdStr && fPlayerId === pIdStr) || (pNameLower && fPlayerName === pNameLower);

            if (isMatch) {
                if (f.side === 'attacker' || f.isAttacker) isPlayerAttacker = true;
                if (f.side === 'defender' || f.isDefender) isPlayerDefender = true;
                if (f.fleetId) playerFleetIds.add(Number(f.fleetId));
            } else {
                if (!opponentName && f.player?.name) {
                    opponentName = f.player.name;
                }
            }
        });
    }

    // Fallback: check attackerName / defenderName
    if (!isPlayerAttacker && !isPlayerDefender) {
        if (pNameLower && combat.attackerName && combat.attackerName.toLowerCase().trim() === pNameLower) {
            isPlayerAttacker = true;
            opponentName = combat.defenderName || '';
        } else if (pNameLower && combat.defenderName && combat.defenderName.toLowerCase().trim() === pNameLower) {
            isPlayerDefender = true;
            opponentName = combat.attackerName || '';
        } else {
            const isNpcAttacker = combat.attackerName?.toLowerCase().includes('deep space') ||
                                  combat.attackerName?.toLowerCase().includes('pirate') ||
                                  combat.attackerName?.toLowerCase().includes('alien');
            if (isNpcAttacker) {
                isPlayerDefender = true;
                opponentName = combat.attackerName || 'Deep space';
            } else {
                isPlayerDefender = true;
                opponentName = combat.attackerName || 'Enemy';
            }
        }
    }

    if (!opponentName) {
        opponentName = isPlayerAttacker ? (combat.defenderName || 'Defender') : (combat.attackerName || 'Attacker');
    }

    const rawWinner = combat.winner || combat.rawResult?.winner || 'none';
    const isWin = (rawWinner === 'attacker' && isPlayerAttacker) || (rawWinner === 'defender' && isPlayerDefender);
    const isLoss = (rawWinner === 'attacker' && isPlayerDefender) || (rawWinner === 'defender' && isPlayerAttacker);
    const isDraw = rawWinner === 'none' || rawWinner === 'draw';

    let playerLossesMsu = 0;
    let playerLossesRaw = 0;
    let enemyDestroyedMsu = 0;
    let enemyDestroyedRaw = 0;
    const playerLostShips: Record<string, number> = {};
    let calculatedFromRounds = false;

    // Check last combat round for precise technology-level destroyed counts
    const rounds = combat.rawCombatRounds || combat.rawResult?.combatRounds;
    if (Array.isArray(rounds) && rounds.length > 0) {
        const lastRound = rounds[rounds.length - 1];
        if (lastRound && Array.isArray(lastRound.fleets)) {
            lastRound.fleets.forEach((rf: any) => {
                const rfId = Number(rf.fleetId);
                const isPlayerFleet = playerFleetIds.size > 0 
                    ? playerFleetIds.has(rfId)
                    : (isPlayerAttacker ? rf.side === 'attacker' : rf.side === 'defender');

                if (Array.isArray(rf.technologies)) {
                    rf.technologies.forEach((tech: any) => {
                        const count = Number(tech.destroyedTotal || tech.destroyed || 0);
                        if (count <= 0) return;

                        const costInfo = TECH_ID_TO_COST[tech.technologyId];
                        const unitMsu = costInfo ? costInfo.msu : 0;
                        const unitRaw = costInfo ? (costInfo.metal + costInfo.crystal + costInfo.deuterium) : 0;

                        if (isPlayerFleet) {
                            calculatedFromRounds = true;
                            playerLossesMsu += unitMsu * count;
                            playerLossesRaw += unitRaw * count;
                            const shipName = costInfo ? costInfo.name : `Ship ${tech.technologyId}`;
                            playerLostShips[shipName] = (playerLostShips[shipName] || 0) + count;
                        } else {
                            enemyDestroyedMsu += unitMsu * count;
                            enemyDestroyedRaw += unitRaw * count;
                        }
                    });
                }
            });
        }
    }

    // Fallback if combat rounds were not available
    if (!calculatedFromRounds || playerLossesMsu === 0) {
        const attLosses = Number(combat.attackerLosses || 0);
        const defLosses = Number(combat.defenderLosses || 0);

        if (isPlayerAttacker) {
            playerLossesRaw = attLosses;
            enemyDestroyedRaw = defLosses;
        } else {
            playerLossesRaw = defLosses;
            enemyDestroyedRaw = attLosses;
        }

        // Try to reconstruct exact ship losses from rawFleets if fleet was completely destroyed
        let reconstructedFromFleets = false;
        if (combat.rawFleets && Array.isArray(combat.rawFleets)) {
            const playerFleets = combat.rawFleets.filter((f: any) => {
                const fId = Number(f.fleetId);
                return playerFleetIds.size > 0 ? playerFleetIds.has(fId) : (isPlayerAttacker ? (f.side === 'attacker' || f.isAttacker) : (f.side === 'defender' || f.isDefender));
            });

            let fleetTotalRaw = 0;
            let fleetTotalMsu = 0;
            const tempLostShips: Record<string, number> = {};

            playerFleets.forEach((pf: any) => {
                if (Array.isArray(pf.combatTechnologies)) {
                    pf.combatTechnologies.forEach((ct: any) => {
                        const count = Number(ct.amount || 0);
                        const costInfo = TECH_ID_TO_COST[ct.technologyId];
                        if (costInfo && count > 0) {
                            const raw = (costInfo.metal + costInfo.crystal + costInfo.deuterium) * count;
                            fleetTotalRaw += raw;
                            fleetTotalMsu += costInfo.msu * count;
                            tempLostShips[costInfo.name] = (tempLostShips[costInfo.name] || 0) + count;
                        }
                    });
                }
            });

            // If player lost the battle or all ships were wiped
            if (fleetTotalRaw > 0 && (isLoss || Math.abs(fleetTotalRaw - playerLossesRaw) < 1000)) {
                playerLossesMsu = fleetTotalMsu;
                playerLossesRaw = fleetTotalRaw;
                Object.assign(playerLostShips, tempLostShips);
                reconstructedFromFleets = true;
            }
        }

        if (!reconstructedFromFleets) {
            playerLossesMsu = playerLossesMsu > 0 ? playerLossesMsu : Math.round(playerLossesRaw * 1.35);
        }
        enemyDestroyedMsu = enemyDestroyedMsu > 0 ? enemyDestroyedMsu : Math.round(enemyDestroyedRaw * 1.35);
    }

    return {
        playerLossesMsu,
        playerLossesRaw,
        enemyDestroyedMsu,
        enemyDestroyedRaw,
        playerLostShips,
        isPlayerAttacker,
        isPlayerDefender,
        opponentName,
        isWin,
        isLoss,
        isDraw
    };
}

/**
 * Recalculates the true player casualties and net balance of an anomaly mission
 * based on all linked combat reports in Dexie DB.
 */
export async function recalculateAnomalyMissionLosses(
    missionId: string,
    playerId?: string
): Promise<AnomalyMission | null> {
    const mission = await db.anomalyMissions.get(missionId);
    if (!mission) return null;

    const account = playerId
        ? await db.accounts.get(String(playerId))
        : (mission.playerId ? await db.accounts.get(String(mission.playerId)) : (await db.accounts.toArray())[0]);

    // Gather all linked combat report IDs + any combats in DB matching this anomalyId
    const reportIdsSet = new Set<string>(mission.combatReportIds || []);
    try {
        const numId = Number(missionId);
        if (!isNaN(numId)) {
            const matchingAnomalyCombats = await db.combatReports.where('anomalyId').equals(numId).toArray();
            matchingAnomalyCombats.forEach((c) => {
                if (c.messageId) reportIdsSet.add(c.messageId);
            });
        }
        const strMatches = await db.combatReports.where('anomalyId').equals(missionId as any).toArray();
        strMatches.forEach((c) => {
            if (c.messageId) reportIdsSet.add(c.messageId);
        });
    } catch (e) {
        try {
            const allCombats = await db.combatReports.filter(c => String(c.anomalyId) === String(missionId)).toArray();
            allCombats.forEach(c => {
                if (c.messageId) reportIdsSet.add(c.messageId);
            });
        } catch (inner) {}
    }

    const reportIds = Array.from(reportIdsSet);
    let totalPlayerLossesMsu = 0;
    let totalEnemyDestroyedMsu = 0;

    if (reportIds.length > 0) {
        const combats = await db.combatReports.bulkGet(reportIds);
        for (const combat of combats) {
            if (!combat) continue;
            const b = getCombatPlayerAndEnemyLosses(combat, account?.playerId || playerId, account?.playerName);
            totalPlayerLossesMsu += b.playerLossesMsu;
            totalEnemyDestroyedMsu += b.enemyDestroyedMsu;
        }
    }

    const uniqueWaves = mission.waves || [];
    const waveGross = uniqueWaves.reduce((sum, w) => sum + (w.msuValue || 0), 0);
    const totalClaimedMsu = waveGross > 0 ? waveGross : (mission.totalClaimedMsu || 0);

    const debrisMsu = mission.totalDebrisHarvestedMsu || (mission.debrisHarvests || []).reduce((sum, d) => sum + (d.msuValue || 0), 0);
    const grossTotal = totalClaimedMsu + debrisMsu;
    const netProfitMsu = grossTotal - totalPlayerLossesMsu;
    const totalClaimedLithium = mission.totalClaimedLithium || 0;
    const msuPerLithium = totalClaimedLithium > 0 ? grossTotal / totalClaimedLithium : 0;

    const totalWaves = Math.max(mission.totalWaves || 1, uniqueWaves.length, reportIds.length);
    let status = mission.status;
    const nowSec = Math.floor(Date.now() / 1000);
    if (status === 'in_progress') {
        const isPastDespawn = mission.despawnTimestamp ? nowSec >= mission.despawnTimestamp : false;
        const isAllWavesCollected = (uniqueWaves.length > 0 && totalWaves > 0 && uniqueWaves.length >= totalWaves);
        const isOld = (Date.now() - (mission.updatedAt || mission.createdAt || 0)) > 24 * 3600 * 1000;
        if (isPastDespawn || isAllWavesCollected || isOld) {
            status = 'completed';
        }
    }

    const currentWave = status === 'completed' ? totalWaves : Math.max(mission.currentWave || 1, uniqueWaves.length, reportIds.length);

    const updated: AnomalyMission = {
        ...mission,
        status,
        combatReportIds: reportIds,
        totalWaves,
        currentWave,
        totalClaimedMsu,
        fleetLossesMsu: totalPlayerLossesMsu,
        enemyDestroyedMsu: totalEnemyDestroyedMsu,
        netProfitMsu,
        msuPerLithium,
        category: (totalPlayerLossesMsu > 0 || reportIds.length > 0) ? 'combat' : mission.category,
        updatedAt: Date.now()
    };

    await db.anomalyMissions.put(updated);
    return updated;
}

/**
 * Self-healing pass over all anomaly missions to fix any previously inverted
 * or missing combat casualties.
 */
export async function recalculateAllAnomalyMissionLosses(): Promise<void> {
    try {
        const missions = await db.anomalyMissions.toArray();
        for (const m of missions) {
            if ((m.combatReportIds && m.combatReportIds.length > 0) || m.id) {
                await recalculateAnomalyMissionLosses(m.id, m.playerId);
            }
        }
    } catch (err) {
        console.warn('OGame Nexus: Error recalculating all anomaly mission losses', err);
    }
}
