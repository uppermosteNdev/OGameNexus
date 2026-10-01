// ============================================================================
// NEXUS OVERWATCH — INACTIVE TARGET SCOUT COMPONENT
// ============================================================================
// Deep-scans official Universe Map baseline data against Cloud Raid Radar
// to locate prime, unmonitored inactive farming colonies across the universe.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Crosshair,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Trophy,
  Radio,
  AlertCircle,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Planet } from '../../db';
import { ThemeIcon } from '../components/ThemeIcon';
import {
  fetchInactiveScoutData,
  InactiveTarget,
  InactiveScoutStats,
  calculateOgameDistance,
  parseCoordinates,
} from '../../utils/inactiveScoutClient';
import { cleanUniverseId, isSameUniverse } from '../../utils/universe';
import './OverwatchInactiveScout.css';

interface OverwatchInactiveScoutProps {
  universeId: string;
  playerId: string;
  playerName: string;
  galaxiesCount?: number;
  onJumpToCoordinates: (galaxy: number | string, system: number | string, slot?: number | string) => void;
}

export const OverwatchInactiveScout: React.FC<OverwatchInactiveScoutProps> = ({
  universeId,
  playerId,
  playerName,
  galaxiesCount,
  onJumpToCoordinates,
}) => {
  const cleanUni = cleanUniverseId(universeId);

  // 1. Fetch Local User Colonies for Proximity Flight Calculations
  const userColonies = useLiveQuery(
    async () => {
      const all = await db.planets.toArray();
      return all.filter(p => !p.playerId || String(p.playerId) === String(playerId));
    },
    [playerId],
    []
  );

  // 2. Fetch Local Raid Radar targets to ensure instant real-time deduplication
  const localRadarCoordsSet = useLiveQuery(
    async () => {
      const allSpied = await db.spiedPlanets.toArray();
      const set = new Set<string>();
      allSpied
        .filter(p => isSameUniverse(p.universe, cleanUni))
        .forEach(p => {
          if (p.coords) {
            set.add(p.coords.trim());
            set.add(p.coords.replace(/[\[\]\s]/g, ''));
          }
          if (p.planetId) set.add(String(p.planetId).trim());
        });
      return set;
    },
    [cleanUni],
    new Set<string>()
  );

  // Total count of local Raid Radar targets in user's vault for this universe
  const totalRadarTargetsCount = useLiveQuery(
    async () => {
      const allSpied = await db.spiedPlanets.toArray();
      return allSpied.filter(p => isSameUniverse(p.universe, cleanUni)).length;
    },
    [cleanUni],
    0
  );

  // Fetch account galaxies count from Dexie if available
  const accountGalaxies = useLiveQuery(
    async () => {
      const all = await db.accounts.toArray();
      const matched = all.find(a => isSameUniverse(a.universe, cleanUni));
      return matched?.galaxies;
    },
    [cleanUni]
  );

  // Component State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [rawTargets, setRawTargets] = useState<InactiveTarget[]>([]);
  const [serverGalaxies, setServerGalaxies] = useState<number | null>(null);
  const [stats, setStats] = useState<InactiveScoutStats>({
    totalInactives: 0,
    covered: 0,
    uncovered: 0,
    coverageRate: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<number | null>(null);

  // Filter State
  const [selectedGalaxy, setSelectedGalaxy] = useState<number | null>(null); // null = all
  const [statusFilter, setStatusFilter] = useState<'all' | 'I' | 'i'>('all');
  const [unscoutedOnly, setUnscoutedOnly] = useState<boolean>(true);
  const [excludeVacation, setExcludeVacation] = useState<boolean>(true);
  const [copiedCoords, setCopiedCoords] = useState<string | null>(null);
  const [copiedAllBatch, setCopiedAllBatch] = useState<boolean>(false);

  // 3. Scan Action (Triggers on button click)
  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchInactiveScoutData(cleanUni, playerId, excludeVacation);
      if (res && res.success) {
        setRawTargets(res.targets || []);
        setStats(res.stats);
        if (res.galaxies && res.galaxies > 0) {
          setServerGalaxies(res.galaxies);
        }
        setHasScanned(true);
        setLastScannedTime(Date.now());
      } else {
        throw new Error('Invalid response from Overwatch edge');
      }
    } catch (err: any) {
      console.error('Failed to scout inactives:', err);
      setError(err?.message || 'Failed to connect to Overwatch server.');
    } finally {
      setIsLoading(false);
    }
  }, [cleanUni, playerId, excludeVacation]);

  // Initial auto-scan on first mount
  useEffect(() => {
    handleScan();
  }, [handleScan]);

  // 4. Compute Distance & Proximity for each Target from User Colonies
  const enrichedTargets = useMemo(() => {
    return rawTargets
      .filter(target => {
        // Defensive check: ensure active players are never included in inactive scouting
        const rawStatus = (target.playerStatus || '').trim().toLowerCase();
        if (!rawStatus || rawStatus === 'active') return false;
        return true;
      })
      .map(target => {
        // Check real-time coverage: covered in cloud vault OR local Dexie
        const isCoveredLocal =
          target.isCovered ||
          localRadarCoordsSet.has(target.coords) ||
          (target.planetId ? localRadarCoordsSet.has(String(target.planetId)) : false);

        let bestDistance = Infinity;
        let bestNearestColony: { name: string; coords: string; systemsAway: number } | null = null;

        if (userColonies && userColonies.length > 0) {
          for (const col of userColonies) {
            if (!col.coords) continue;
            const { distance, systemsAway } = calculateOgameDistance(target.coords, col.coords);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestNearestColony = {
                name: col.name || 'Colony',
                coords: col.coords,
                systemsAway,
              };
            }
          }
        }

        return {
          ...target,
          isCovered: isCoveredLocal,
          distance: bestDistance < Infinity ? bestDistance : undefined,
          nearestColony: bestNearestColony,
        };
      });
  }, [rawTargets, localRadarCoordsSet, userColonies]);

  // Recalculate live stats based on real-time enriched targets
  const liveStats = useMemo(() => {
    const total = enrichedTargets.length;
    const covered = enrichedTargets.filter(t => t.isCovered).length;
    const uncovered = total - covered;
    const rate = total > 0 ? Math.round((covered / total) * 1000) / 10 : 0;
    return {
      totalInactives: total,
      covered,
      uncovered,
      coverageRate: rate,
    };
  }, [enrichedTargets]);

  // Determine available galaxies dynamically from Universe Info, Account, Edge API, or Target coords
  const maxGalaxyFromTargets = useMemo(() => {
    return rawTargets.reduce((max, t) => Math.max(max, t.galaxy || 0), 0);
  }, [rawTargets]);

  const totalGalaxies = useMemo(() => {
    if (accountGalaxies && accountGalaxies > 0) return accountGalaxies;
    if (galaxiesCount && galaxiesCount > 0) return galaxiesCount;
    if (serverGalaxies && serverGalaxies > 0) return serverGalaxies;
    if (maxGalaxyFromTargets > 0) return maxGalaxyFromTargets;
    return 5;
  }, [accountGalaxies, galaxiesCount, serverGalaxies, maxGalaxyFromTargets]);

  const availableGalaxies = useMemo(() => {
    return Array.from({ length: totalGalaxies }, (_, i) => i + 1);
  }, [totalGalaxies]);

  // Keep selectedGalaxy in valid bounds if universe has fewer galaxies
  useEffect(() => {
    if (selectedGalaxy !== null && selectedGalaxy > totalGalaxies) {
      setSelectedGalaxy(null);
    }
  }, [selectedGalaxy, totalGalaxies]);

  // 5. Apply Active Filters & Sorting (Default Highscore Rank #1 First)
  const filteredTargets = useMemo(() => {
    let result = enrichedTargets;

    // Filter: Unscouted Only
    if (unscoutedOnly) {
      result = result.filter(t => !t.isCovered);
    }

    // Filter: Galaxy
    if (selectedGalaxy !== null) {
      result = result.filter(t => t.galaxy === selectedGalaxy);
    }

    // Filter: Status (I vs i)
    if (statusFilter === 'I') {
      result = result.filter(t => {
        const raw = (t.playerStatus || '').trim();
        const isExplicitActive = !raw || raw.toLowerCase() === 'active';
        return !isExplicitActive && raw.includes('I');
      });
    } else if (statusFilter === 'i') {
      result = result.filter(t => {
        const raw = (t.playerStatus || '').trim();
        const isExplicitActive = !raw || raw.toLowerCase() === 'active';
        return !isExplicitActive && raw.includes('i') && !raw.includes('I');
      });
    }

    // Sort Result: Default highscore sorting (Rank #1 is best, lowest number)
    return [...result].sort((a, b) => {
      const rankA = a.playerRank && a.playerRank > 0 ? a.playerRank : 999999;
      const rankB = b.playerRank && b.playerRank > 0 ? b.playerRank : 999999;
      if (rankA !== rankB) return rankA - rankB;
      // Tie-break by score
      return (b.playerScore || 0) - (a.playerScore || 0);
    });
  }, [enrichedTargets, unscoutedOnly, selectedGalaxy, statusFilter]);

  // High-Rank Inactive Count (#1 to #100)
  const top100InactivesCount = useMemo(() => {
    return enrichedTargets.filter(t => !t.isCovered && t.playerRank && t.playerRank <= 100).length;
  }, [enrichedTargets]);

  // Copy Single Coords Handler
  const handleCopyCoords = (coords: string) => {
    navigator.clipboard.writeText(`[${coords}]`);
    setCopiedCoords(coords);
    setTimeout(() => setCopiedCoords(null), 2000);
  };

  // Copy All Filtered Coords Handler
  const handleCopyAllFiltered = () => {
    if (!filteredTargets.length) return;
    const batch = filteredTargets.map(t => t.coords).join(' ');
    navigator.clipboard.writeText(batch);
    setCopiedAllBatch(true);
    setTimeout(() => setCopiedAllBatch(false), 2500);
  };

  return (
    <div className="ow-scout-container">
      {/* 1. Hero / Header Banner */}
      <section className="ow-scout-hero">
        <div className="ow-scout-hero-left">
          <div className="ow-scout-eyebrow">
            <Crosshair size={13} />
            <span>TACTICAL TOOLS // RECONNAISSANCE</span>
          </div>
          <h2 className="ow-scout-title">
            <span>Inactive Target Scout</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                letterSpacing: '0.04em',
              }}
            >
              UNSCOUTED RADAR RECON
            </span>
          </h2>
          <p className="ow-scout-desc">
            Cross-references Universe Map colonized planets against your synced Cloud Raid Radar to detect
            inactive and abandoned colonies not yet scouted or tracked. For best results, make sure to cloud-sync
            your Raid Radar first in Personal Vault.
          </p>
        </div>

        <div className="ow-scout-hero-actions">
          <button
            type="button"
            className="ow-scout-scan-btn"
            onClick={handleScan}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'ow-spinning' : ''} />
            <span>{isLoading ? 'Scanning Universe Map...' : 'Scan for Uncovered Targets'}</span>
          </button>
        </div>
      </section>

      {/* 2. Telemetry Metrics Strip */}
      <section className="ow-scout-metrics-grid">
        <div className="ow-scout-metric-card">
          <div className="ow-scout-metric-kicker">
            <span>TOTAL INACTIVES</span>
            <Radio size={14} color="#64748b" />
          </div>
          <div className="ow-scout-metric-val">
            {liveStats.totalInactives.toLocaleString()}
          </div>
          <div className="ow-scout-metric-sub">Known by Overwatch Universe Map</div>
        </div>

        <div
          className="ow-scout-metric-card"
          title={`${liveStats.covered.toLocaleString()} known universe inactives covered out of ${totalRadarTargetsCount ? totalRadarTargetsCount.toLocaleString() : 'your'} total Raid Radar targets in Personal Vault.`}
        >
          <div className="ow-scout-metric-kicker">
            <span>INACTIVE PLANETS COVERED IN RADAR</span>
            <ThemeIcon name="radar" size={14} />
          </div>
          <div className="ow-scout-metric-val cyan">
            {liveStats.covered.toLocaleString()}
          </div>
          <div className="ow-scout-metric-sub">
            {liveStats.coverageRate}% Universe Coverage
            {totalRadarTargetsCount ? ` • ${totalRadarTargetsCount.toLocaleString()} planets in Vault` : ''}
          </div>
        </div>

        <div className="ow-scout-metric-card highlight">
          <div className="ow-scout-metric-kicker">
            <span>UNSCOUTED TARGETS</span>
            <Crosshair size={14} color="#fbbf24" />
          </div>
          <div className="ow-scout-metric-val amber">
            {liveStats.uncovered.toLocaleString()}
          </div>
          <div className="ow-scout-metric-sub">Prime farming targets ready to spy</div>
        </div>

        <div className="ow-scout-metric-card">
          <div className="ow-scout-metric-kicker">
            <span>HIGH-RANK INACTIVES</span>
            <Trophy size={14} color="#f59e0b" />
          </div>
          <div className="ow-scout-metric-val" style={{ color: '#f59e0b' }}>
            {top100InactivesCount.toLocaleString()}
          </div>
          <div className="ow-scout-metric-sub">Top 100 Highscore (Huge Mines)</div>
        </div>
      </section>

      {/* 3. Toolbar: Filtering Controls */}
      <section className="ow-scout-toolbar">
        <div className="ow-scout-toolbar-top">
          {/* Galaxy Selector Pills */}
          <div className="ow-scout-controls-group">
            <span className="ow-scout-label">Galaxy:</span>
            <div className="ow-scout-pills">
              <button
                type="button"
                className={`ow-scout-pill-btn ${selectedGalaxy === null ? 'active' : ''}`}
                onClick={() => setSelectedGalaxy(null)}
              >
                All
              </button>
              {availableGalaxies.map(g => (
                <button
                  key={g}
                  type="button"
                  className={`ow-scout-pill-btn ${selectedGalaxy === g ? 'active' : ''}`}
                  onClick={() => setSelectedGalaxy(g)}
                >
                  G{g}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="ow-scout-controls-group">
            <span className="ow-scout-label">Status:</span>
            <select
              className="ow-scout-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Inactives (I + i)</option>
              <option value="I">(I) 30d+ Long Inactive</option>
              <option value="i">(i) 7d Inactive</option>
            </select>
          </div>

          {/* Toggle Switches */}
          <div className="ow-scout-controls-group">
            <label className="ow-scout-toggle" title="Only display inactive targets that are not currently in your Raid Radar">
              <input
                type="checkbox"
                checked={unscoutedOnly}
                onChange={(e) => setUnscoutedOnly(e.target.checked)}
              />
              <span style={{ fontWeight: unscoutedOnly ? 700 : 400, color: unscoutedOnly ? '#fbbf24' : '#cbd5e1' }}>
                Unscouted Only ({liveStats.uncovered})
              </span>
            </label>

            <label className="ow-scout-toggle" title="Exclude vacation mode players (cannot be attacked in OGame)">
              <input
                type="checkbox"
                checked={excludeVacation}
                onChange={(e) => {
                  setExcludeVacation(e.target.checked);
                  // Rescan with updated vacation filter
                  setTimeout(handleScan, 50);
                }}
              />
              <span>Exclude Vacation (v)</span>
            </label>
          </div>
        </div>
      </section>

      {/* 4. Target List Section */}
      <section className="ow-scout-list-section">
        <div className="ow-scout-list-header">
          <div className="ow-scout-list-title">
            <Crosshair size={16} color="#fbbf24" />
            <span>
              Identified Inactive Targets (<strong>{filteredTargets.length.toLocaleString()}</strong> matching)
            </span>
          </div>

          <div className="ow-scout-list-actions">
            <button
              type="button"
              className="ow-scout-btn-subtle"
              onClick={handleCopyAllFiltered}
              disabled={filteredTargets.length === 0}
              title="Copy all currently filtered target coordinates for fleet queue"
            >
              {copiedAllBatch ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
              <span>{copiedAllBatch ? 'Copied All Coords!' : 'Copy All Coords'}</span>
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && filteredTargets.length === 0 && (
          <div className="ow-scout-empty">
            <RefreshCw size={28} className="ow-spinning" color="#fbbf24" />
            <h4 className="ow-scout-empty-title">Scanning Universe Map Baseline...</h4>
            <p className="ow-scout-empty-desc">
              Cross-referencing {cleanUni} colonized sectors with your cloud Raid Radar targets.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTargets.length === 0 && (
          <div className="ow-scout-empty">
            <Check size={36} color="#4ade80" />
            <h4 className="ow-scout-empty-title">
              {unscoutedOnly ? 'All Inactives Fully Covered!' : 'No Inactive Targets Match Your Filter'}
            </h4>
            <p className="ow-scout-empty-desc">
              {unscoutedOnly
                ? 'Every inactive planet matching your filter criteria is already scouted and tracked in your Raid Radar!'
                : 'Try adjusting your galaxy selector, distance range, or search query.'}
            </p>
          </div>
        )}

        {/* Target Cards */}
        {filteredTargets.map((target) => {
          const isTopRank = target.playerRank && target.playerRank <= 100;
          const rawStatus = (target.playerStatus || '').trim();
          const isExplicitActive = !rawStatus || rawStatus.toLowerCase() === 'active';
          const isLongInactive = !isExplicitActive && rawStatus.includes('I');
          const isShortInactive = !isExplicitActive && rawStatus.includes('i');
          const isCopied = copiedCoords === target.coords;

          return (
            <motion.div
              key={`${target.galaxy}_${target.system}_${target.slot}`}
              className={`ow-scout-card ${target.isCovered ? 'covered' : ''}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Column 1: Coordinate Badge */}
              <div
                className="ow-scout-coords-badge"
                onClick={() => onJumpToCoordinates(target.galaxy, target.system, target.slot)}
                title={`Jump to [${target.coords}] in Universe Map`}
              >
                [{target.coords}]
              </div>

              {/* Column 2: Inactive Planet */}
              <div className="ow-scout-planet-info">
                <div className="ow-scout-planet-name">
                  <span>{target.planetName || 'Homeworld'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Slot {target.slot} • {target.isCovered ? 'In Raid Radar' : 'Unscouted'}
                </div>
              </div>

              {/* Column 3: Player Info & Rank */}
              <div className="ow-scout-player-info">
                <div className="ow-scout-player-name">
                  <span className="ow-scout-player-name-text" title={target.playerName || 'Commander'}>
                    {target.playerName || 'Commander'}
                  </span>
                  {target.allianceTag && (
                    <span className="ow-scout-alliance-tag" title={`Alliance [${target.allianceTag}]`}>
                      [{target.allianceTag}]
                    </span>
                  )}
                  {!isExplicitActive && (isLongInactive || isShortInactive) && (
                    <span
                      className={`ow-scout-status-tag ${isLongInactive ? 'long-inactive' : 'inactive'}`}
                      title={isLongInactive ? '30+ Days Inactive (I)' : '7 Days Inactive (i)'}
                    >
                      {isLongInactive ? '(I)' : '(i)'}
                    </span>
                  )}
                </div>
                <div className="ow-scout-player-rank-row">
                  {target.playerRank ? (
                    <span className={`ow-scout-rank-badge ${isTopRank ? 'top-100' : ''}`}>
                      <Trophy size={11} />
                      <span>Rank #{target.playerRank}</span>
                      {target.playerScore ? (
                        <span style={{ color: '#64748b', fontWeight: 500 }}>
                          ({(target.playerScore / 1000000).toFixed(1)}M pts)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Unranked</span>
                  )}
                </div>
              </div>

              {/* Column 4: Nearest Colony */}
              <div
                className="ow-scout-distance-info"
                title={target.nearestColony && target.distance ? `${target.nearestColony.systemsAway} systems away (${target.distance.toLocaleString()} km)` : undefined}
              >
                {target.nearestColony ? (
                  <div className="ow-scout-colony-label">
                    <MapPin size={13} color="#00f2ff" style={{ flexShrink: 0 }} />
                    <span className="ow-scout-colony-name">{target.nearestColony.name}</span>
                    <span className="ow-scout-colony-coords">
                      [{target.nearestColony.coords}]
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>No colonies detected</span>
                )}
              </div>

              {/* Column 5: Action Buttons */}
              <div className="ow-scout-item-actions">
                <button
                  type="button"
                  className="ow-scout-action-btn map"
                  onClick={() => onJumpToCoordinates(target.galaxy, target.system, target.slot)}
                  title="View this system in Universe Map"
                >
                  <MapPin size={13} />
                  <span>Map</span>
                </button>

                <button
                  type="button"
                  className="ow-scout-action-btn copy"
                  onClick={() => handleCopyCoords(target.coords)}
                  title="Copy coordinates to clipboard"
                >
                  {isCopied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
};

export default OverwatchInactiveScout;
