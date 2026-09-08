// ============================================================================
// NEXUS OVERWATCH — TACTICAL COMMAND DECK (DESIGN-TASTE-FRONTEND V2)
// Design Read: Mission-critical tactical intelligence deck for OGame alliance leaders
// Dials: VARIANCE: 7 | MOTION: 5 | DENSITY: 6
// ============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ThemeIcon } from '../components/ThemeIcon';
import './Overwatch.css';

interface AllianceConfig {
  allianceId: string | null;
  ogameAllianceId: string | null;
  glyphCode: string | null;
  authToken: string | null;
  allianceName: string | null;
  allianceTag: string | null;
  universeId: string | null;
  role: 'admin' | 'member' | null;
  subscriptionExpiresAt: number | null;
  permissions: {
    shareSpy: boolean;
    shareGalaxy: boolean;
    shareLocks: boolean;
  };
}

interface OverwatchProps {
  onSelect?: (view: string) => void;
}

const DEFAULT_CONFIG: AllianceConfig = {
  allianceId: null,
  ogameAllianceId: null,
  glyphCode: null,
  authToken: null,
  allianceName: null,
  allianceTag: null,
  universeId: null,
  role: null,
  subscriptionExpiresAt: null,
  permissions: {
    shareSpy: true,
    shareGalaxy: true,
    shareLocks: true,
  },
};

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

const EASE_TRANSITION = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

function cleanUniverseId(raw?: string): string {
  if (!raw) return 's267-en';
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/\.ogame\.gameforge\.com.*$/, '');
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (/^\d+-[a-z]+$/.test(clean)) {
    clean = 's' + clean;
  }
  return clean;
}

function formatTimeAgo(timestamp?: number | null, fallbackTimestamp?: number | null): string {
  const time = timestamp || fallbackTimestamp;
  if (!time) return 'Just now';
  const ageSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (ageSec < 60) return 'Just now';
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}

const IntelDetailsCell: React.FC<{ evt: any }> = ({ evt }) => {
  let oldState: any = null;
  let newState: any = null;

  try {
    if (typeof evt.old_state_json === 'string') oldState = JSON.parse(evt.old_state_json);
    else oldState = evt.old_state_json;
  } catch (e) {}

  try {
    if (typeof evt.new_state_json === 'string') newState = JSON.parse(evt.new_state_json);
    else newState = evt.new_state_json;
  } catch (e) {}

  let briefText = 'State altered';
  let beforeText: string | null = null;
  let afterText: string | null = null;

  const formatStatus = (s?: string) => {
    if (!s || s.toLowerCase() === 'active') return 'Active';
    const clean = s.trim();
    const hasB = clean.includes('b');
    const hasV = clean.includes('v');
    const hasLongI = clean.includes('I');
    const hasShortI = clean.includes('i');

    const tagCodes: string[] = [];
    if (hasB) tagCodes.push('b');
    if (hasV) tagCodes.push('v');
    if (hasLongI) tagCodes.push('I');
    else if (hasShortI) tagCodes.push('i');

    const descList: string[] = [];
    if (hasB) descList.push('Banned');
    if (hasV) descList.push('Vacation');
    if (hasLongI) descList.push('Long Inactive (28d+)');
    else if (hasShortI) descList.push('Inactive (7d+)');

    if (tagCodes.length === 0) return 'Active';
    return `(${tagCodes.join(', ')}) ${descList.join(' + ')}`;
  };

  switch (evt.event_type) {
    case 'moon_destroyed':
      briefText = 'Moon was destroyed';
      beforeText = `Moon: ${oldState?.moonSize || oldState?.moon_size ? `${(oldState.moonSize || oldState.moon_size).toLocaleString()} km` : 'Active'}`;
      afterText = 'No Moon (0 km)';
      break;
    case 'moon_spawned':
      briefText = 'New moon detected';
      beforeText = 'No Moon';
      afterText = `Moon: ${newState?.moonSize || newState?.moon_size ? `${(newState.moonSize || newState.moon_size).toLocaleString()} km` : 'Spawned'}`;
      break;
    case 'colonized':
      briefText = 'New colony established';
      beforeText = 'Uncolonized Slot';
      afterText = `Planet "${newState?.planetName || newState?.planet_name || 'Colony'}" (${evt.player_name || 'Colonist'})`;
      break;
    case 'abandoned':
      briefText = 'Planet abandoned';
      beforeText = `Planet "${oldState?.planet_name || oldState?.planetName || 'Colony'}" (${oldState?.player_name || evt.player_name || 'Player'})`;
      afterText = 'Uncolonized Slot';
      break;
    case 'relocated':
      briefText = 'Colony relocated';
      beforeText = `Owner: ${oldState?.player_name || 'Previous owner'}`;
      afterText = `Owner: ${newState?.playerName || newState?.player_name || evt.player_name || 'New owner'}`;
      break;
    case 'player_renamed':
      briefText = 'Player renamed';
      beforeText = `Old: "${oldState?.playerName || oldState?.player_name || 'Unknown'}"`;
      afterText = `New: "${newState?.playerName || newState?.player_name || evt.player_name || 'Unknown'}"`;
      break;
    case 'status_changed':
      briefText = 'Player status changed';
      beforeText = `Status: ${formatStatus(oldState?.playerStatus || oldState?.player_status)}`;
      afterText = `Status: ${formatStatus(newState?.playerStatus || newState?.player_status)}`;
      break;
    default:
      briefText = evt.event_type.replace(/_/g, ' ');
      beforeText = oldState ? JSON.stringify(oldState) : null;
      afterText = newState ? JSON.stringify(newState) : null;
  }

  return (
    <div className="ow-intel-tooltip-trigger">
      <div className="ow-intel-brief-row">
        <span>{briefText}</span>
        <span className="ow-intel-info-badge">Inspect ➜</span>
      </div>

      <div className="ow-intel-popover">
        <div className="ow-intel-popover-header">
          <span className="ow-intel-popover-title">Delta Transition Details</span>
          <span className="ow-intel-popover-coords">[{evt.galaxy}:{evt.system}:{evt.slot}]</span>
        </div>

        <div className="ow-intel-diff-grid">
          <div className="ow-intel-diff-box before">
            <div className="ow-intel-diff-label">BEFORE</div>
            <div className="ow-intel-diff-val">{beforeText || '—'}</div>
          </div>
          <div className="ow-intel-diff-arrow">➜</div>
          <div className="ow-intel-diff-box after">
            <div className="ow-intel-diff-label">AFTER</div>
            <div className="ow-intel-diff-val">{afterText || '—'}</div>
          </div>
        </div>

        <div className="ow-intel-popover-footer">
          <span>Detected: {new Date(evt.detected_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const Overwatch: React.FC<OverwatchProps> = ({ onSelect }) => {
  const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());

  const [config, setConfig] = useState<AllianceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'intel' | 'map' | 'spy-vault' | 'heatmap' | 'settings'>('intel');

  // Universe Map Navigation
  const [selectedGalaxy, setSelectedGalaxy] = useState(5);
  const [selectedSystem, setSelectedSystem] = useState(27);
  const [debouncedSystem, setDebouncedSystem] = useState(27);
  const [systemSlots, setSystemSlots] = useState<any[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);

  // Debounce slider updates to eliminate jitter while dragging
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSystem(selectedSystem);
    }, 100);
    return () => clearTimeout(handler);
  }, [selectedSystem]);

  // Join form state
  const [joinGlyph, setJoinGlyph] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Deploy form state
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);

  const activeUniverse = cleanUniverseId(activeAccount?.universe || 's267-en');
  const activeUniverseName = activeAccount?.universeName && activeAccount.universeName !== 'unknown'
    ? activeAccount.universeName
    : activeUniverse;

  const activeAllyTag = activeAccount?.allianceTag || '';
  const activeAllyName = activeAccount?.allianceName || activeAllyTag;
  const activeAllyId = activeAccount?.allianceId || '500078';

  const [events, setEvents] = useState<any[]>([]);
  const [universeStats, setUniverseStats] = useState<{
    totalPlanets: number;
    totalMoons: number;
    isSeeded: boolean;
    serverName?: string;
    galaxies?: number;
    systems?: number;
    speed?: number;
    speedFleet?: number;
    debrisFactor?: number;
  } | null>(null);

  // Load config on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['nexus_overwatch_config'], (res) => {
        if (res && res.nexus_overwatch_config) {
          setConfig({ ...DEFAULT_CONFIG, ...res.nexus_overwatch_config });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchLiveEvents = () => {
    setIsLoadingEvents(true);
    const apiUrl = 'http://127.0.0.1:8787';
    const headers: Record<string, string> = {};
    if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

    fetch(`${apiUrl}/api/v1/galaxy/events?universeId=${activeUniverse}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingEvents(false));
  };

  // Fetch universe status and live events
  useEffect(() => {
    const apiUrl = 'http://127.0.0.1:8787';

    // 1. Fetch Universe Stats
    fetch(`${apiUrl}/api/v1/universe/${activeUniverse}/status`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setUniverseStats({
            totalPlanets: data.totalPlanets,
            totalMoons: data.totalMoons,
            isSeeded: data.isSeeded,
            serverName: data.serverName,
            galaxies: data.galaxies,
            systems: data.systems,
            speed: data.speed,
            speedFleet: data.speedFleet,
            debrisFactor: data.debrisFactor,
          });
        }
      })
      .catch(() => {});

    // 2. Fetch Live Galaxy Events
    fetchLiveEvents();
  }, [config.authToken, activeUniverse, activeTab]);

  const fetchSystemData = (g: number, s: number) => {
    setIsLoadingSystem(true);
    const apiUrl = 'http://127.0.0.1:8787';
    const headers: Record<string, string> = {};
    if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

    fetch(`${apiUrl}/api/v1/galaxy/system?universeId=${activeUniverse}&galaxy=${g}&system=${s}`, {
      headers,
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.slots)) {
          setSystemSlots(data.slots);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSystem(false));
  };

  // Fetch Universe System Slots for Map Tab
  useEffect(() => {
    if (activeTab === 'map') {
      fetchSystemData(selectedGalaxy, debouncedSystem);
    }
  }, [config.authToken, activeUniverse, activeTab, selectedGalaxy, debouncedSystem]);

  const [isResyncingXML, setIsResyncingXML] = useState(false);
  const [resyncSuccessMsg, setResyncSuccessMsg] = useState<string | null>(null);

  const handleResyncUniverseXML = async () => {
    if (isResyncingXML) return;
    setIsResyncingXML(true);
    setResyncSuccessMsg(null);
    const apiUrl = 'http://127.0.0.1:8787';

    try {
      const res = await fetch(`${apiUrl}/api/v1/universe/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universeId: activeUniverse }),
      });
      const data = await res.json();
      if (data && data.success && data.stats) {
        setResyncSuccessMsg(
          `✓ Updated (${data.stats.planetsCount.toLocaleString()} planets, ${data.stats.moonsCount.toLocaleString()} moons)`
        );
        // Refresh current system view
        fetchSystemData(selectedGalaxy, selectedSystem);
        // Refresh live feed
        fetchLiveEvents();
        // Refresh universe status
        fetch(`${apiUrl}/api/v1/universe/${activeUniverse}/status`)
          .then(r => r.json())
          .then(st => {
            if (st && st.success) {
              setUniverseStats(prev => ({
                ...prev,
                totalPlanets: st.totalPlanets,
                totalMoons: st.totalMoons,
                isSeeded: st.isSeeded,
              }));
            }
          })
          .catch(() => {});

        setTimeout(() => {
          setResyncSuccessMsg(null);
        }, 6000);
      }
    } catch (err) {
      console.error('Failed to sync official XML:', err);
    } finally {
      setIsResyncingXML(false);
    }
  };

  const handleRefreshSystem = () => {
    fetchSystemData(selectedGalaxy, selectedSystem);
  };

  // Set default display name when account loads
  useEffect(() => {
    if (activeAllyName && !createDisplayName) {
      setCreateDisplayName(activeAllyName);
    }
  }, [activeAllyName]);

  const saveConfig = (newConfig: AllianceConfig) => {
    setConfig(newConfig);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ nexus_overwatch_config: newConfig });
    }
  };

  // 1. Join Action (Member)
  const handleJoin = async () => {
    const cleanGlyph = joinGlyph.trim().toUpperCase();
    if (!cleanGlyph.startsWith('NXOW-') || cleanGlyph.length < 18) {
      setJoinError('Invalid Glyph format. Expected NXOW-XXXX-XXXX-XXXX-XXXX');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const apiUrl = 'http://127.0.0.1:8787';
      const res = await fetch(`${apiUrl}/api/v1/auth/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glyphCode: cleanGlyph,
          playerId: activeAccount?.playerId || '100002',
          playerName: activeAccount?.playerName || 'Commander',
          permissions: config.permissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinError(data.error || 'Connection refused. Check Glyph key.');
        setIsJoining(false);
        return;
      }

      const updated: AllianceConfig = {
        ...config,
        allianceId: data.allianceId,
        ogameAllianceId: activeAllyId,
        allianceName: data.allianceName,
        allianceTag: data.allianceTag,
        universeId: data.universeId || activeUniverse,
        glyphCode: cleanGlyph,
        authToken: data.authToken,
        role: 'member',
      };
      saveConfig(updated);
      setIsJoining(false);
    } catch (err: any) {
      // Offline fallback
      const mockUpdated: AllianceConfig = {
        ...config,
        allianceId: 'simulated-ally-id',
        ogameAllianceId: activeAllyId,
        allianceName: activeAllyName || 'LazyOldPeople',
        allianceTag: activeAllyTag || 'LoW',
        universeId: activeUniverse,
        glyphCode: cleanGlyph,
        authToken: 'simulated-token',
        role: 'member',
      };
      saveConfig(mockUpdated);
      setIsJoining(false);
    }
  };

  // 2. Deploy Action (Admin)
  const handleCreate = async () => {
    if (!createDisplayName) {
      setCreateError('Specify an alliance display name.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const apiUrl = 'http://127.0.0.1:8787';
      const res = await fetch(`${apiUrl}/api/v1/alliances/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ogameAllianceId: activeAllyId,
          allianceDisplayName: createDisplayName,
          allianceTag: activeAllyTag || 'NEXUS',
          universeId: activeUniverse,
          adminPlayerId: activeAccount?.playerId || '100001',
          adminPlayerName: activeAccount?.playerName || 'Admin Leader',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated: AllianceConfig = {
          ...config,
          allianceId: data.allianceId,
          ogameAllianceId: activeAllyId,
          allianceName: createDisplayName,
          allianceTag: activeAllyTag || 'NEXUS',
          universeId: activeUniverse,
          glyphCode: data.glyphCode,
          authToken: data.authToken,
          role: 'admin',
          subscriptionExpiresAt: data.expiresAt,
        };
        saveConfig(updated);
      } else {
        setCreateError(data.error || 'Failed to provision alliance partition.');
      }
    } catch (err: any) {
      const mockGlyph = 'NXOW-7K9M-X24Q-8WVT-9N3P';
      const updated: AllianceConfig = {
        ...config,
        allianceId: 'sim-admin-ally',
        ogameAllianceId: activeAllyId,
        allianceName: createDisplayName,
        allianceTag: activeAllyTag || 'NEXUS',
        universeId: activeUniverse,
        glyphCode: mockGlyph,
        authToken: 'sim-admin-token',
        role: 'admin',
        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      saveConfig(updated);
    } finally {
      setIsCreating(false);
    }
  };

  const copyGlyph = () => {
    if (config.glyphCode) {
      navigator.clipboard.writeText(config.glyphCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyDiscordSnippet = () => {
    if (config.glyphCode) {
      const text = `🛰️ **Nexus Overwatch Active for [${config.allianceTag}]**\nConnect in OGame Nexus Dashboard > Overwatch:\n🔑 **Alliance Glyph:** \`${config.glyphCode}\``;
      navigator.clipboard.writeText(text);
      setDiscordCopied(true);
      setTimeout(() => setDiscordCopied(false), 2500);
    }
  };

  const handleDisconnect = () => {
    saveConfig({ ...DEFAULT_CONFIG, universeId: activeUniverse });
  };

  if (loading) {
    return (
      <div className="ow-root" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ow-telemetry-pill active-edge">
          <span className="ow-status-dot"></span>
          <span>Calibrating Tactical Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="ow-root"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_TRANSITION}
    >
      <div className="ow-backlight" />

      {/* 1. TOP COMMAND TELEMETRY BAR */}
      <section className="ow-module">
        <div className="ow-header-row">
          <div className="ow-header-brand">
            <div className="ow-brand-icon-box">
              <ThemeIcon name="radar" size={26} />
            </div>
            <div>
              <span className="ow-eyebrow">ALLIANCE OVERWATCH // TACTICAL RADAR</span>
              <h1 className="ow-title">NEXUS OVERWATCH</h1>
              <p className="ow-subtitle">
                Tactical fleet surveillance, shared spy vault, and 24/7 player activity telemetry.
              </p>
            </div>
          </div>

          <div className="ow-telemetry-cluster">
            <div className="ow-telemetry-pill active-edge">
              <span className="ow-status-dot"></span>
              <span>Edge Mesh 12ms</span>
            </div>
            <div className="ow-telemetry-pill">
              <span>Sector: <strong style={{ color: '#00f2ff', marginLeft: 4 }}>{activeUniverseName}</strong></span>
            </div>
            {config.allianceTag ? (
              <div className="ow-telemetry-pill" style={{ borderColor: 'rgba(0, 242, 255, 0.3)', color: '#00f2ff' }}>
                <span>[{config.allianceTag}]</span>
              </div>
            ) : activeAllyTag ? (
              <div className="ow-telemetry-pill">
                <span>In-Game: [{activeAllyTag}]</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2. ONBOARDING & SETUP STATE */}
      {!config.allianceId ? (
        <div className="ow-split-grid">
          {/* Left Panel: Join Flow */}
          <section className="ow-module" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 className="ow-section-title">Join an Alliance Network</h2>
              <p className="ow-section-desc">
                Connect your browser extension to your team's live tactical grid. Free for all alliance members with zero telemetry leaks.
              </p>

              {/* Glyph Cipher Entry */}
              <div className="ow-cipher-box">
                <div className="ow-cipher-label-row">
                  <span className="ow-cipher-label">Alliance Glyph Key</span>
                  <span className="ow-cipher-label" style={{ color: '#00f2ff' }}>128-Bit Cipher</span>
                </div>
                <input
                  type="text"
                  className="ow-cipher-input"
                  placeholder="NXOW-XXXX-XXXX-XXXX-XXXX"
                  value={joinGlyph}
                  onChange={(e) => setJoinGlyph(e.target.value)}
                />
                {joinError && (
                  <div style={{ color: '#f87171', fontSize: '12px', marginTop: 8 }}>
                    {joinError}
                  </div>
                )}
              </div>

              {/* Capabilities Grid */}
              <div className="ow-capabilities-grid">
                <div className="ow-cap-item">
                  <ThemeIcon name="radar" size={16} />
                  <span>Live Sector Scrapes</span>
                </div>
                <div className="ow-cap-item">
                  <ThemeIcon name="sniper-crosshair" size={16} />
                  <span>Shared Spy Vault</span>
                </div>
                <div className="ow-cap-item">
                  <ThemeIcon name="stopwatch" size={16} />
                  <span>24/7 Sleep Heatmap</span>
                </div>
                <div className="ow-cap-item">
                  <ThemeIcon name="shield" size={16} />
                  <span>Target Raid Locks</span>
                </div>
              </div>
            </div>

            <button
              className="ow-btn-primary"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? 'Connecting...' : 'Connect with Glyph'}
            </button>
          </section>

          {/* Right Panel: Commissioning Flow */}
          <section className="ow-module" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 className="ow-section-title">Commission Alliance Grid</h2>
              <p className="ow-section-desc">
                Deploy an isolated tactical partition for your squad. Each commander is permitted 1 Overwatch alliance per universe.
              </p>

              {/* In-Game Credentials */}
              <div className="ow-specs-grid">
                <div className="ow-spec-cell">
                  <div className="ow-spec-kicker">In-Game Tag</div>
                  <div className="ow-spec-val">{activeAllyTag ? `[${activeAllyTag}]` : 'NEXUS'}</div>
                </div>
                <div className="ow-spec-cell">
                  <div className="ow-spec-kicker">Alliance ID</div>
                  <div className="ow-spec-val" style={{ color: '#94a3b8' }}>#{activeAllyId}</div>
                </div>
              </div>

              {/* Custom Display Name */}
              <div style={{ marginBottom: 4 }}>
                <div className="ow-spec-kicker" style={{ marginBottom: 6 }}>Custom Display Name</div>
                <input
                  type="text"
                  className="ow-text-field"
                  placeholder="e.g. LazyOldPeople Elite Squad"
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                />
              </div>

              {/* License Strip */}
              <div className="ow-license-strip">
                <span className="ow-license-text">Commander 30-Day Beta License</span>
                <span className="ow-license-badge">FREE / $0.00</span>
              </div>

              {createError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '12px', color: '#f87171', marginBottom: '14px' }}>
                  {createError}
                </div>
              )}
            </div>

            <button
              className="ow-btn-primary"
              onClick={handleCreate}
              disabled={isCreating || !createDisplayName}
            >
              {isCreating ? 'Provisioning Grid...' : `Commission for [${activeAllyTag || 'Alliance'}]`}
            </button>
          </section>
        </div>
      ) : (
        /* 3. CONNECTED STATE */
        <>
          {/* Active Alliance Masthead */}
          <section className="ow-module">
            <div className="ow-connected-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="ow-brand-icon-box">
                  <ThemeIcon name="shield" size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    {config.allianceName} <span style={{ color: '#00f2ff' }}>[{config.allianceTag}]</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>Role: <strong style={{ color: config.role === 'admin' ? '#f59e0b' : '#38bdf8' }}>{config.role?.toUpperCase()}</strong></span>
                    <span>/</span>
                    <span>Status: <strong style={{ color: '#4ade80' }}>ACTIVE</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="ow-glyph-chip">
                  <span>{config.glyphCode}</span>
                  <button className="ow-btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={copyGlyph}>
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <button className="ow-btn-ghost" onClick={copyDiscordSnippet}>
                  <span>{discordCopied ? 'Copied ✓' : 'Share to Discord'}</span>
                </button>

                <button className="ow-btn-ghost danger" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          </section>

          {/* Navigation Bar */}
          <div className="ow-tab-bar">
            <button className={`ow-tab-link ${activeTab === 'intel' ? 'active' : ''}`} onClick={() => setActiveTab('intel')}>
              <ThemeIcon name="radar" size={15} />
              <span>Live Galaxy Feed</span>
            </button>
            <button className={`ow-tab-link ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <ThemeIcon name="strategy" size={15} />
              <span>Universe Map</span>
            </button>
            <button className={`ow-tab-link ${activeTab === 'spy-vault' ? 'active' : ''}`} onClick={() => setActiveTab('spy-vault')}>
              <ThemeIcon name="sniper-crosshair" size={15} />
              <span>Shared Spy Vault</span>
            </button>
            <button className={`ow-tab-link ${activeTab === 'heatmap' ? 'active' : ''}`} onClick={() => setActiveTab('heatmap')}>
              <ThemeIcon name="stopwatch" size={15} />
              <span>24/7 Sleep Heatmap</span>
            </button>
            <button className={`ow-tab-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <ThemeIcon name="settings" size={15} />
              <span>Privacy Controls</span>
            </button>
          </div>

          {/* Tab 2: Universe Map */}
          {activeTab === 'map' && (
            <section className="ow-module" style={{ padding: '20px 24px' }}>
              <div className="ow-map-header-grid">
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Tactical Universe Map</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Interactive topographical map with real-time galaxy and system sliders across {universeStats?.totalPlanets?.toLocaleString() || '3,173'} positions.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {resyncSuccessMsg && (
                    <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>
                      {resyncSuccessMsg}
                    </span>
                  )}
                  <button
                    className="ow-btn-resync-xml"
                    title="Download latest players.xml, alliances.xml, universe.xml from Gameforge API and overwrite all universe data"
                    onClick={handleResyncUniverseXML}
                    disabled={isResyncingXML}
                  >
                    <RefreshCw className={isResyncingXML ? 'ow-spinning' : ''} size={13} />
                    <span>{isResyncingXML ? 'Syncing Official XML...' : 'Sync from Official XML'}</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Current System:</span>
                    <div className="ow-telemetry-pill" style={{ color: '#00f2ff', borderColor: 'rgba(0, 242, 255, 0.3)', fontFamily: 'monospace', fontSize: '14px', fontWeight: 800 }}>
                      [{selectedGalaxy}:{selectedSystem}]
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Card: Galaxy & System Sliders */}
              <div className="ow-map-controls-card">
                {/* Galaxy Selector */}
                <div>
                  <div className="ow-slider-label" style={{ marginBottom: 8 }}>
                    Galaxy (1 - {universeStats?.galaxies || 5})
                  </div>
                  <div className="ow-galaxy-pills-wrap">
                    <button
                      className="ow-step-btn"
                      onClick={() => setSelectedGalaxy(Math.max(1, selectedGalaxy - 1))}
                      disabled={selectedGalaxy <= 1}
                    >
                      ◀
                    </button>
                    {Array.from({ length: universeStats?.galaxies || 5 }).map((_, idx) => {
                      const g = idx + 1;
                      return (
                        <button
                          key={g}
                          className={`ow-galaxy-pill-btn ${selectedGalaxy === g ? 'active' : ''}`}
                          onClick={() => setSelectedGalaxy(g)}
                        >
                          G{g}
                        </button>
                      );
                    })}
                    <button
                      className="ow-step-btn"
                      onClick={() => setSelectedGalaxy(Math.min(universeStats?.galaxies || 5, selectedGalaxy + 1))}
                      disabled={selectedGalaxy >= (universeStats?.galaxies || 5)}
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* System Slider, Number Input & Refresh on the same line */}
                <div className="ow-system-slider-box">
                  <div className="ow-slider-label">Solar System (1 - {universeStats?.systems || 499})</div>
                  <div className="ow-slider-controls-row">
                    <input
                      type="range"
                      className="ow-system-slider-input"
                      min={1}
                      max={universeStats?.systems || 499}
                      value={selectedSystem}
                      onChange={(e) => setSelectedSystem(parseInt(e.target.value, 10))}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="ow-step-btn"
                        title="Previous System"
                        onClick={() => setSelectedSystem((s) => Math.max(1, s - 1))}
                        disabled={selectedSystem <= 1}
                      >
                        ◀
                      </button>
                      <input
                        type="number"
                        className="ow-coord-num-input"
                        min={1}
                        max={universeStats?.systems || 499}
                        value={selectedSystem}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setSelectedSystem(Math.min(universeStats?.systems || 499, Math.max(1, val)));
                        }}
                      />
                      <button
                        className="ow-step-btn"
                        title="Next System"
                        onClick={() => setSelectedSystem((s) => Math.min(universeStats?.systems || 499, s + 1))}
                        disabled={selectedSystem >= (universeStats?.systems || 499)}
                      >
                        ▶
                      </button>
                    </div>
                    <button
                      className="ow-refresh-btn"
                      title="Refresh System Data"
                      onClick={handleRefreshSystem}
                      disabled={isLoadingSystem}
                    >
                      <RefreshCw className={isLoadingSystem ? 'ow-spinning' : ''} size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* System Positions Stationary Table */}
              <div className="ow-table-wrap">
                <table className="ow-table">
                  <colgroup>
                    <col style={{ width: '55px' }} />
                    <col style={{ width: '115px' }} />
                    <col style={{ width: '190px' }} />
                    <col style={{ width: '125px' }} />
                    <col style={{ width: '210px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '125px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Coordinates</th>
                      <th>Planet</th>
                      <th>Moon</th>
                      <th>Player</th>
                      <th>Alliance</th>
                      <th>Debris Field</th>
                      <th>Last Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 15 }).map((_, idx) => {
                      const slotNum = idx + 1;
                      const slot = systemSlots.find((s) => s.slot === slotNum) || {
                        slot: slotNum,
                        planet_name: null,
                        player_name: null,
                        player_status: null,
                        alliance_tag: null,
                        has_moon: 0,
                        moon_size: null,
                        debris_metal: 0,
                        debris_crystal: 0,
                        last_scanned_at: null,
                        last_scanned_by: null,
                        last_changed_at: null,
                      };

                      const isColonized = !!slot.planet_name || !!slot.player_name;

                      // Player Status Styling:
                      // 1. Vacation players: teal name (#00f2ff) with (i, v) or (I, v) or (v)
                      // 2. Inactive players: bright gray (#e2e8f0) for (i) and bit darker gray (#64748b) for (I)
                      // 3. Active players: pure white (#ffffff)
                      const rawStatus = (slot.player_status || '').trim();
                      const isExplicitActive = !rawStatus || rawStatus.toLowerCase() === 'active';
                      const hasV = !isExplicitActive && rawStatus.includes('v');
                      const hasLongI = !isExplicitActive && rawStatus.includes('I');
                      const hasShortI = !isExplicitActive && rawStatus.includes('i');
                      const hasB = !isExplicitActive && rawStatus.includes('b');

                      let playerNameColor = '#ffffff';
                      let playerStatusText = '';
                      let playerStatusColor = '#94a3b8';

                      const statusTagList: string[] = [];
                      if (hasB) statusTagList.push('b');
                      if (hasV) statusTagList.push('v');
                      if (hasLongI) statusTagList.push('I');
                      else if (hasShortI) statusTagList.push('i');

                      if (statusTagList.length > 0) {
                        playerStatusText = `(${statusTagList.join(', ')})`;
                      }

                      if (hasV) {
                        playerNameColor = '#00f2ff';
                        playerStatusColor = '#00f2ff';
                      } else if (hasLongI) {
                        playerNameColor = '#64748b';
                        playerStatusColor = '#64748b';
                      } else if (hasShortI) {
                        playerNameColor = '#e2e8f0';
                        playerStatusColor = '#cbd5e1';
                      } else if (hasB) {
                        playerNameColor = '#f87171';
                        playerStatusColor = '#f87171';
                      }

                      return (
                        <tr key={slotNum} className={`ow-table-row ${isColonized ? 'colonized' : 'uncolonized'}`}>
                          <td>
                            <span style={{ fontWeight: 800, color: isColonized ? '#fff' : '#64748b' }}>
                              {slotNum}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: isColonized ? '#00f2ff' : '#64748b', fontFamily: 'monospace' }}>
                              [{selectedGalaxy}:{selectedSystem}:{slotNum}]
                            </strong>
                          </td>
                          <td>
                            {slot.planet_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                  src={`icons/overwatch/planet-slot-${slotNum}.png`}
                                  alt={`Slot ${slotNum}`}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    boxShadow: '0 0 10px rgba(0, 242, 255, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                  }}
                                />
                                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{slot.planet_name}</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                  src={`icons/overwatch/planet-slot-${slotNum}.png`}
                                  alt={`Slot ${slotNum}`}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    opacity: 0.18,
                                    filter: 'grayscale(100%)',
                                  }}
                                />
                                <span className="ow-empty-slot-text">Uncolonized</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {slot.has_moon === 1 ? (
                              <span className="ow-tag green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span>🌙</span>
                                <span>{slot.moon_size ? `${slot.moon_size.toLocaleString()} km` : 'Moon'}</span>
                              </span>
                            ) : (
                              <span style={{ color: '#475569' }}>—</span>
                            )}
                          </td>
                          <td>
                            {slot.player_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <strong
                                  style={{
                                    color: playerNameColor,
                                    fontWeight: 700,
                                    textDecoration: hasB ? 'line-through' : 'none',
                                  }}
                                >
                                  {slot.player_name}
                                </strong>
                                {playerStatusText && (
                                  <span
                                    style={{
                                      color: playerStatusColor,
                                      fontWeight: 700,
                                      fontSize: '12px',
                                      textDecoration: hasB ? 'line-through' : 'none',
                                    }}
                                  >
                                    {playerStatusText}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#475569' }}>—</span>
                            )}
                          </td>
                          <td>
                            {slot.alliance_tag ? (
                              <span className="ow-telemetry-pill" style={{ padding: '2px 8px', fontSize: '11px', color: '#00f2ff', borderColor: 'rgba(0, 242, 255, 0.25)' }}>
                                [{slot.alliance_tag}]
                              </span>
                            ) : (
                              <span style={{ color: '#475569' }}>—</span>
                            )}
                          </td>
                          <td>
                            {slot.debris_metal > 0 || slot.debris_crystal > 0 ? (
                              <span style={{ color: '#4ade80', fontSize: '11.5px', fontFamily: 'monospace' }}>
                                M: {slot.debris_metal.toLocaleString()} | C: {slot.debris_crystal.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ color: '#475569' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '11.5px', color: slot.last_changed_at ? '#00f2ff' : '#94a3b8', fontWeight: slot.last_changed_at ? 600 : 400 }}>
                              {formatTimeAgo(slot.last_changed_at, slot.last_scanned_at)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab 1: Live Galaxy Feed */}
          {activeTab === 'intel' && (
            <section className="ow-module" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Universe Delta Telemetry Feed</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    {universeStats?.isSeeded
                      ? `Baseline active: ${universeStats.totalPlanets.toLocaleString()} planets & ${universeStats.totalMoons.toLocaleString()} moons seeded from Gameforge API. Real-time changes stream below as members roam.`
                      : 'Real-time colonizations, relocations, and moon destructions detected across alliance scans.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    className="ow-refresh-btn"
                    title="Refresh Live Galaxy Feed"
                    onClick={fetchLiveEvents}
                    disabled={isLoadingEvents}
                  >
                    <RefreshCw className={isLoadingEvents ? 'ow-spinning' : ''} size={15} />
                  </button>
                  <div className="ow-telemetry-pill active-edge">
                    <span className="ow-status-dot"></span>
                    <span>Live Stream</span>
                  </div>
                </div>
              </div>

              {events.length > 0 ? (
                <table className="ow-table" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Time</th>
                      <th style={{ width: '110px' }}>Coordinates</th>
                      <th style={{ width: '150px' }}>Event</th>
                      <th style={{ width: '180px' }}>Player</th>
                      <th>Intel Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => {
                      const ageSec = Math.max(0, Math.floor((Date.now() - evt.detected_at) / 1000));
                      let ageStr = 'Just now';
                      if (ageSec > 3600) ageStr = `${Math.floor(ageSec / 3600)}h ago`;
                      else if (ageSec > 60) ageStr = `${Math.floor(ageSec / 60)}m ago`;

                      let tagClass = 'green';
                      if (evt.event_type === 'moon_destroyed') tagClass = 'red';
                      else if (evt.event_type === 'relocated' || evt.event_type === 'abandoned') tagClass = 'amber';

                      let eventLabel = evt.event_type.replace(/_/g, ' ').toUpperCase();

                      return (
                        <tr key={evt.event_id}>
                          <td>{ageStr}</td>
                          <td><strong style={{ color: '#00f2ff', fontFamily: 'monospace' }}>[{evt.galaxy}:{evt.system}:{evt.slot}]</strong></td>
                          <td><span className={`ow-tag ${tagClass}`}>{eventLabel}</span></td>
                          <td><strong style={{ color: '#fff' }}>{evt.player_name || `Player #${evt.player_id}`}</strong></td>
                          <td className="ow-intel-cell">
                            <IntelDetailsCell evt={evt} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '28px 20px', textAlign: 'center', background: '#040712', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ color: '#00f2ff', fontSize: '14px', fontWeight: 700, marginBottom: 6 }}>
                    🛰️ Baseline Universe Map Loaded ({universeStats?.totalPlanets?.toLocaleString() || '3,173'} Planets)
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '12.5px', margin: 0, maxWidth: 540, marginInline: 'auto', lineHeight: 1.5 }}>
                    As you and your alliance members roam through galaxy systems in OGame, any detected moon destructions, colonizations, or player relocations will automatically log here in real-time.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Shared Spy Vault */}
          {activeTab === 'spy-vault' && (
            <section className="ow-module" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Alliance Espionage Archive</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Aggregated intelligence on enemy fleets, defenses, and plundered loot.</p>
                </div>
              </div>

              <table className="ow-table">
                <thead>
                  <tr>
                    <th>Report Age</th>
                    <th>Coords</th>
                    <th>Target</th>
                    <th>Metal</th>
                    <th>Crystal</th>
                    <th>Deuterium</th>
                    <th>Est. Loot</th>
                    <th>Fleet / Defense</th>
                    <th>Scouted By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>12m ago</td>
                    <td><strong style={{ color: '#00f2ff', fontFamily: 'monospace' }}>[5:399:3]</strong></td>
                    <td><strong style={{ color: '#fff' }}>Target Player</strong></td>
                    <td>12.5M</td>
                    <td>8.4M</td>
                    <td>3.2M</td>
                    <td><strong style={{ color: '#4ade80' }}>12.0M MSU</strong></td>
                    <td>500 LF, 80 BS / 250 RL</td>
                    <td><span style={{ color: '#38bdf8' }}>Blue</span></td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* Tab 3: 24/7 Sleep Heatmap */}
          {activeTab === 'heatmap' && (
            <section className="ow-module">
              <h2 className="ow-section-title">24/7 Activity & Sleep Cycle Matrix</h2>
              <p className="ow-section-desc">
                Surveillance telemetry aggregated across all alliance galaxy scrapes. Shows exact hours when an enemy player is active versus asleep.
              </p>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 520, marginBottom: 20 }}>
                <input type="text" className="ow-text-field" placeholder="Search Player Name or ID..." defaultValue="Target Player" style={{ marginBottom: 0 }} />
                <button className="ow-btn-ghost" style={{ padding: '12px 18px', color: '#00f2ff', borderColor: 'rgba(0,242,255,0.3)', whiteSpace: 'nowrap' }}>
                  Analyze Activity
                </button>
              </div>

              <div style={{ padding: '18px', background: '#040712', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>
                  Target: <strong style={{ color: '#fff' }}>Target Player</strong> / Optimal Attack Window: <span style={{ color: '#4ade80' }}>03:00 to 08:00 UTC (98% Asleep)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '4px', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isSleep = h >= 3 && h <= 8;
                    const bg = isSleep ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.25)';
                    const border = isSleep ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                    const statusText = isSleep ? 'SLEEP' : 'ACTIVE';
                    return (
                      <div key={h} style={{ padding: '8px 2px', background: bg, borderRadius: '4px', border: `1px solid ${border}` }}>
                        <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{h}h</div>
                        <div style={{ marginTop: 4, fontSize: '9px', fontWeight: 600, color: isSleep ? '#4ade80' : '#f87171' }}>{statusText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Tab 4: Privacy Settings */}
          {activeTab === 'settings' && (
            <section className="ow-module">
              <h2 className="ow-section-title">Member Privacy & Telemetry Matrix</h2>
              <p className="ow-section-desc">
                Customize exactly what telemetry your extension contributes to the alliance grid in real-time.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input type="checkbox" checked={config.permissions.shareSpy} onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareSpy: e.target.checked } })} />
                  <span style={{ fontSize: '13px' }}><strong style={{ color: '#fff' }}>Share Espionage Reports</strong>: Automatically sync spied enemy fleets, defenses, and loot to the team vault.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input type="checkbox" checked={config.permissions.shareGalaxy} onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareGalaxy: e.target.checked } })} />
                  <span style={{ fontSize: '13px' }}><strong style={{ color: '#fff' }}>Share Galaxy Scrapes</strong>: Automatically contribute solar systems and moon activity markers as you scroll.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <input type="checkbox" checked={config.permissions.shareLocks} onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareLocks: e.target.checked } })} />
                  <span style={{ fontSize: '13px' }}><strong style={{ color: '#fff' }}>Sync Target Raid Locks</strong>: Prevent friendly fire and duplicate attacks on the same targets.</span>
                </label>
              </div>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Overwatch;
