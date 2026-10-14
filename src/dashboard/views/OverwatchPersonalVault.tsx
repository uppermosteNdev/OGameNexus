// ============================================================================
// NEXUS OVERWATCH — PERSONAL VAULT VIEW (HIGH-END VISUAL DESIGN)
// Hardware Avionics & Ethereal Glass Cross-Device Synchronization Enclave
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  RefreshCw,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  Key,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Database,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Clock,
  Zap,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ThemeIcon } from '../components/ThemeIcon';
import {
  getStoredVaultKey,
  saveStoredVaultKey,
  generateNewVaultKey,
  fetchVaultSummary,
  sendLocalDataToVault,
  fetchVaultDataToLocal,
  VaultSummaryResponse,
  VaultProgressUpdate,
} from '../../utils/personalVaultClient';
import { isSameUniverse } from '../../utils/universe';
import './OverwatchPersonalVault.css';

interface OverwatchPersonalVaultProps {
  universeId: string;
  playerId: string;
  playerName?: string;
  onNavigateTab?: (tab: string) => void;
}

export const OverwatchPersonalVault: React.FC<OverwatchPersonalVaultProps> = ({
  universeId,
  playerId,
  playerName = 'Commander',
}) => {
  const [vaultKey, setVaultKey] = useState<string>('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string>(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile ? 'Mobile Terminal' : 'Primary Desktop';
  });

  const [vaultSummary, setVaultSummary] = useState<VaultSummaryResponse | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [forceFullSync, setForceFullSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState<VaultProgressUpdate | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Live 1-second tick for real-time 2-minute cooldown countdown
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const COOLDOWN_DURATION_MS = 120_000; // 2 minutes (120 seconds)

  const lastSent = vaultSummary?.lastSentAt ? Number(vaultSummary.lastSentAt) : 0;
  const sendElapsed = lastSent > 0 ? currentTime - lastSent : Infinity;
  const sendCooldownRemainingMs = Math.max(0, COOLDOWN_DURATION_MS - sendElapsed);
  const isSendOnCooldown = sendCooldownRemainingMs > 0;

  const lastFetched = vaultSummary?.lastFetchedAt ? Number(vaultSummary.lastFetchedAt) : 0;
  const fetchElapsed = lastFetched > 0 ? currentTime - lastFetched : Infinity;
  const fetchCooldownRemainingMs = Math.max(0, COOLDOWN_DURATION_MS - fetchElapsed);
  const isFetchOnCooldown = fetchCooldownRemainingMs > 0;

  const formatCooldown = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  };

  // Live queries for local Dexie counts
  const localExpeditionsCount = useLiveQuery(
    () => db.expeditions.where('playerId').equals(playerId).count(),
    [playerId]
  ) ?? 0;

  const localCombatsCount = useLiveQuery(
    () => db.combatReports.where('playerId').equals(playerId).count(),
    [playerId]
  ) ?? 0;

  const localHarvestsCount = useLiveQuery(
    () => db.debrisHarvests.where('playerId').equals(playerId).count(),
    [playerId]
  ) ?? 0;

  const localDiscoveriesCount = useLiveQuery(
    () => db.lifeformDiscoveries.where('playerId').equals(playerId).count(),
    [playerId]
  ) ?? 0;

  const localPlannerCount = useLiveQuery(
    async () => {
      const pidStr = String(playerId || '').trim();
      const all = await db.todoProjects.toArray();
      const userTodos = all.filter(p => !p.playerId || String(p.playerId).trim() === pidStr);

      let cartCount = 0;
      if (pidStr) {
        const cartSetting = await db.settings.get('costs_planner_cart_' + pidStr);
        if (Array.isArray((cartSetting as any)?.cartItems)) {
          cartCount = (cartSetting as any).cartItems.length;
        }
      }
      if (cartCount === 0) {
        const allSettings = await db.settings.toArray();
        const found = allSettings.find(s => String(s.id).startsWith('costs_planner_cart_'));
        if (found && Array.isArray((found as any)?.cartItems)) {
          cartCount = (found as any).cartItems.length;
        }
      }

      return userTodos.length + cartCount;
    },
    [playerId]
  ) ?? 0;

  const localRadarCount = useLiveQuery(
    async () => {
      const all = await db.spiedPlanets.toArray();
      return all.filter(p => isSameUniverse(p.universe, universeId)).length;
    },
    [universeId]
  ) ?? 0;

  // Load vault key on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadKey() {
      if (!universeId || !playerId) return;
      const key = await getStoredVaultKey(universeId, playerId);
      if (!isCancelled) {
        setVaultKey(key);
      }
    }
    loadKey();
    return () => {
      isCancelled = true;
    };
  }, [universeId, playerId]);

  // Load vault summary from Edge
  const loadSummary = useCallback(async () => {
    if (!universeId || !playerId || !vaultKey) return;
    setIsFetchingSummary(true);
    try {
      const summary = await fetchVaultSummary(universeId, playerId, vaultKey);
      setVaultSummary(summary);
      if (summary.error) {
        setNotification({ type: 'error', message: summary.error });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load vault summary' });
    } finally {
      setIsFetchingSummary(false);
    }
  }, [universeId, playerId, vaultKey]);

  useEffect(() => {
    if (vaultKey) {
      loadSummary();
    }
  }, [vaultKey, loadSummary]);

  // Copy Vault Key handler
  const handleCopyKey = () => {
    if (!vaultKey) return;
    navigator.clipboard.writeText(vaultKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2200);
  };

  // Generate / Cycle Vault Key
  const handleRegenerateKey = async () => {
    if (!window.confirm('Generate a new Vault Key? Secondary devices using the old key will need to be updated with the new key.')) {
      return;
    }
    const newKey = generateNewVaultKey();
    setVaultKey(newKey);
    await saveStoredVaultKey(universeId, playerId, newKey);
    setNotification({ type: 'info', message: 'New Vault Key generated. Remember to update your other devices.' });
    loadSummary();
  };

  // Manual key change handler
  const handleKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    setVaultKey(val);
    await saveStoredVaultKey(universeId, playerId, val);
  };

  // Push Local Data to Cloud Vault
  const handleSendToVault = async () => {
    if (!vaultKey) {
      setNotification({ type: 'error', message: 'Please specify a valid Vault Key first' });
      return;
    }
    setIsSending(true);
    setNotification(null);
    setSyncProgress(null);
    try {
      const res = await sendLocalDataToVault(
        universeId,
        playerId,
        vaultKey,
        deviceLabel,
        p => setSyncProgress(p),
        { forceFullResync: forceFullSync }
      );
      if (res.success && res.saved) {
        let msg = '';
        if (res.isDelta) {
          const newExp = res.saved.expeditions;
          const totalExp = res.totalLocal?.expeditions || newExp;
          msg = `Vault synchronized (Smart Sync): ${newExp === 0 ? `all ${totalExp.toLocaleString()} expeditions verified in sync` : `${newExp.toLocaleString()} new expeditions uploaded (${totalExp.toLocaleString()} total)`}, ${res.saved.combats.toLocaleString()} combats, ${res.saved.harvests.toLocaleString()} harvests, ${res.saved.discoveries.toLocaleString()} discoveries, and ${res.saved.radar.toLocaleString()} radar targets merged.`;
        } else {
          msg = `Vault synchronized (Full Backup): ${res.saved.expeditions.toLocaleString()} expeditions, ${res.saved.combats.toLocaleString()} combats, ${res.saved.harvests.toLocaleString()} harvests, ${res.saved.discoveries.toLocaleString()} discoveries, ${res.saved.planner.toLocaleString()} planner items, and ${res.saved.radar.toLocaleString()} radar targets uploaded.`;
        }
        setNotification({
          type: 'success',
          message: msg,
        });
        setTimeout(() => {
          setNotification(curr => (curr?.message === msg ? null : curr));
        }, 15000);
        setVaultSummary(prev => prev ? { ...prev, lastSentAt: res.lastSentAt || Date.now() } : null);
        try {
          const summary = await fetchVaultSummary(universeId, playerId, vaultKey);
          setVaultSummary(summary);
        } catch {}
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to upload data to vault' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Network error during upload' });
    } finally {
      setIsSending(false);
      setTimeout(() => setSyncProgress(null), 800);
    }
  };

  // Fetch Cloud Vault Data to Local Dexie
  const handleFetchFromVault = async () => {
    if (!vaultKey) {
      setNotification({ type: 'error', message: 'Please specify a valid Vault Key first' });
      return;
    }
    setIsFetching(true);
    setNotification(null);
    setSyncProgress(null);
    try {
      const res = await fetchVaultDataToLocal(
        universeId,
        playerId,
        vaultKey,
        p => setSyncProgress(p),
        { forceFullDownload: forceFullSync }
      );
      if (res.success && res.hydrated) {
        const totalItems = (res.hydrated.expeditions || 0) + (res.hydrated.combats || 0) + (res.hydrated.harvests || 0) + (res.hydrated.discoveries || 0) + (res.hydrated.planner || 0) + (res.hydrated.radar || 0);
        const modeLabel = forceFullSync ? 'Full Sync' : 'Smart Sync';
        const fetchMsg = totalItems === 0
          ? `Vault synchronized (${modeLabel}): All local records are verified in sync with the cloud.`
          : `Vault synchronized (${modeLabel}): Successfully restored ${res.hydrated.expeditions.toLocaleString()} expeditions, ${res.hydrated.combats.toLocaleString()} combats, ${res.hydrated.harvests.toLocaleString()} harvests, ${res.hydrated.discoveries.toLocaleString()} discoveries, ${res.hydrated.planner.toLocaleString()} planner items, and ${res.hydrated.radar.toLocaleString()} radar targets.`;
        setNotification({
          type: 'success',
          message: fetchMsg,
        });
        setTimeout(() => {
          setNotification(curr => (curr?.message === fetchMsg ? null : curr));
        }, 15000);
        setVaultSummary(prev => prev ? { ...prev, lastFetchedAt: res.lastFetchedAt || Date.now() } : null);
        try {
          const summary = await fetchVaultSummary(universeId, playerId, vaultKey);
          setVaultSummary(summary);
        } catch {}
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to fetch data from vault' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Network error during download' });
    } finally {
      setIsFetching(false);
      setTimeout(() => setSyncProgress(null), 800);
    }
  };

  const categories = [
    {
      id: 'expeditions',
      label: 'Expeditions',
      iconName: 'navigation',
      localCount: localExpeditionsCount,
      vaultCount: vaultSummary?.counts?.expeditions ?? 0,
      description: 'Expedition findings, resources, and Dark Matter.',
    },
    {
      id: 'combats',
      label: 'Combat Reports',
      iconName: 'sword',
      localCount: localCombatsCount,
      vaultCount: vaultSummary?.counts?.combats ?? 0,
      description: 'Battle results, plunder, debris, and losses.',
    },
    {
      id: 'harvests',
      label: 'Debris Harvests',
      iconName: 'debris-field',
      localCount: localHarvestsCount,
      vaultCount: vaultSummary?.counts?.harvests ?? 0,
      description: 'Recycler debris harvest reports.',
    },
    {
      id: 'discoveries',
      label: 'Lifeform Discoveries',
      iconName: 'leaf',
      localCount: localDiscoveriesCount,
      vaultCount: vaultSummary?.counts?.discoveries ?? 0,
      description: 'Lifeform missions, XP gains, and artifacts.',
    },
    {
      id: 'planner',
      label: 'Costs Planner',
      iconName: 'shopping-cart',
      localCount: localPlannerCount,
      vaultCount: vaultSummary?.counts?.planner ?? 0,
      description: 'Saved building, research, and shipyard queues.',
    },
    {
      id: 'radar',
      label: 'Raid Radar Targets',
      iconName: 'radar',
      localCount: localRadarCount,
      vaultCount: vaultSummary?.counts?.radar ?? 0,
      description: 'Spied planet coordinates and estimated production rates.',
    },
  ];

  return (
    <div className="pv-root">
      {/* Dynamic Multi-Orb Ambient Background Lighting */}
      <div className="pv-ambient-glow" />

      {/* 1. Header Console (Double-Bezel Architecture) */}
      <div className="pv-double-bezel cyan-accent">
        <div className="pv-inner-core">
          <div className="pv-hero-core">
            <div className="pv-hero-left">
              <div className="pv-aperture-shield">
                <Shield size={28} style={{ color: '#00f2ff' }} />
              </div>

              <div className="pv-hero-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span className="pv-eyebrow">Multi-Device Sync</span>
                </div>

                <h2>OVERWATCH PERSONAL VAULT</h2>

                <p>
                  Backup and sync your account data for <strong style={{ color: '#f8fafc' }}>{playerName}</strong> ({universeId} • #{playerId}) across your devices.
                </p>
              </div>
            </div>

            {/* Quick Status Capsule & Refresh */}
            <div className="pv-hero-right">
              <div className="pv-status-capsule">
                <span
                  className="pv-pulse-dot"
                  style={{
                    background: vaultSummary?.vaultRegistered ? '#10b981' : '#f59e0b',
                    boxShadow: `0 0 10px ${vaultSummary?.vaultRegistered ? '#10b981' : '#f59e0b'}`,
                  }}
                />
                <span>{vaultSummary?.vaultRegistered ? 'Cloud Vault Connected' : 'Ready to Connect'}</span>
              </div>

              <button
                type="button"
                onClick={loadSummary}
                disabled={isFetchingSummary}
                className="pv-btn-pill ghost-subtle"
                title="Refresh vault status"
              >
                <RefreshCw size={13} className={isFetchingSummary ? 'pv-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Notification Toast / Alert */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            style={{
              padding: '14px 20px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background:
                notification.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : notification.type === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(0, 242, 255, 0.12)',
              border:
                notification.type === 'success'
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : notification.type === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(0, 242, 255, 0.35)',
              color:
                notification.type === 'success'
                  ? '#34d399'
                  : notification.type === 'error'
                  ? '#f87171'
                  : '#00f2ff',
              fontSize: '13px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {notification.type === 'success' ? (
                <CheckCircle2 size={17} />
              ) : notification.type === 'error' ? (
                <AlertTriangle size={17} />
              ) : (
                <Info size={17} />
              )}
              <span style={{ fontWeight: 500 }}>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Security & Key Enclave (Double-Bezel Architecture) */}
      <div className="pv-double-bezel">
        <div className="pv-inner-core">
          <div className="pv-key-header">
            <div className="pv-key-title">
              <div className="pv-mini-icon-aperture" style={{ color: '#00f2ff' }}>
                <Key size={16} />
              </div>
              <span>Personal Vault Key</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Device Name:</span>
              <div className="pv-terminal-badge">
                {/Mobile|Android|iPhone|iPad/i.test(deviceLabel) ? (
                  <Smartphone size={13} style={{ color: '#00f2ff' }} />
                ) : (
                  <Laptop size={13} style={{ color: '#00f2ff' }} />
                )}
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={e => setDeviceLabel(e.target.value)}
                  placeholder="e.g. Primary Desktop"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '11px',
                    fontWeight: 600,
                    width: '135px',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pv-key-chamber">
            <div className="pv-input-frame">
              <input
                type={isKeyVisible ? 'text' : 'password'}
                value={vaultKey}
                onChange={handleKeyChange}
                placeholder="NX-VLT-XXXX-XXXX-XXXX"
                className="pv-key-input"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="pv-input-reveal-btn"
                title={isKeyVisible ? 'Hide Key' : 'Reveal Key'}
              >
                {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Button-in-Button Copy CTA */}
            <button
              type="button"
              onClick={handleCopyKey}
              className={`pv-btn-pill ${copiedKey ? 'glass-emerald' : 'glass-cyan'}`}
            >
              <div className="pv-btn-icon-capsule">
                {copiedKey ? <Check size={16} /> : <Copy size={16} />}
              </div>
              <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy Key'}</span>
            </button>

            {/* Regenerate Key CTA */}
            <button
              type="button"
              onClick={handleRegenerateKey}
              className="pv-btn-pill ghost-subtle"
              title="Generate a brand new Vault Key"
            >
              <RefreshCw size={13} />
              <span>New Key</span>
            </button>
          </div>

          {/* 3-Step Interactive Pairing Stepper */}
          <div className="pv-pairing-stepper">
            <div className="pv-step-chip">
              <div className="pv-step-num">1</div>
              <span>Open <strong>Nexus Overwatch</strong> on your other device</span>
            </div>
            <div className="pv-step-chip">
              <div className="pv-step-num">2</div>
              <span>Go to the <strong>Personal Vault</strong> tab</span>
            </div>
            <div className="pv-step-chip">
              <div className="pv-step-num">3</div>
              <span>Paste your <strong>Vault Key</strong> to connect</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3B. Sync Mode Selection (Smart Sync vs Full Sync) & Cooldown Status */}
      <div className={`pv-double-bezel ${forceFullSync ? 'amber-accent' : 'cyan-accent'}`}>
        <div className="pv-inner-core pv-sync-mode-core">
          <div className="pv-sync-mode-info">
            <div className={`pv-sync-mode-orb ${forceFullSync ? 'amber' : 'cyan'}`}>
              {forceFullSync ? <RefreshCw size={20} /> : <Zap size={20} />}
            </div>
            <div className="pv-sync-mode-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="pv-mode-title" style={{ color: forceFullSync ? '#f59e0b' : '#00f2ff' }}>
                  {forceFullSync ? 'Full Sync Mode' : 'Smart Sync Mode'}
                </span>
                <span className={`pv-eyebrow ${forceFullSync ? 'amber' : ''}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                  {forceFullSync ? 'All History' : 'New Data Only'}
                </span>
                {isSendOnCooldown && (
                  <span className="pv-eyebrow amber" style={{ fontSize: '9px', padding: '1px 6px' }}>
                    Upload Cooldown ({formatCooldown(sendCooldownRemainingMs)})
                  </span>
                )}
                {isFetchOnCooldown && !isSendOnCooldown && (
                  <span className="pv-eyebrow emerald" style={{ fontSize: '9px', padding: '1px 6px' }}>
                    Download Cooldown ({formatCooldown(fetchCooldownRemainingMs)})
                  </span>
                )}
              </div>
              <p>
                {forceFullSync
                  ? 'Complete sync: transfers and checks your entire historical database across devices. Ideal when setting up a new device or re-checking all records.'
                  : 'Fast sync: transfers only newly recorded expeditions, combats, and discoveries since your last sync. Recommended for daily play.'}
              </p>
            </div>
          </div>

          {/* 2-Option Segmented Selector */}
          <div className="pv-segmented-selector" role="radiogroup" aria-label="Sync Mode Selection">
            <button
              type="button"
              className={`pv-segment-btn ${!forceFullSync ? 'active-smart' : ''}`}
              onClick={() => setForceFullSync(false)}
              title="Fast sync: only transfers new records added since your last sync"
            >
              <div className="pv-segment-btn-inner">
                <Zap size={14} />
                <span className="pv-segment-main">Smart Sync</span>
              </div>
              <span className="pv-segment-sub">New Data Only</span>
            </button>

            <button
              type="button"
              className={`pv-segment-btn ${forceFullSync ? 'active-full' : ''}`}
              onClick={() => setForceFullSync(true)}
              title="Complete sync: transfers all historical records"
            >
              <div className="pv-segment-btn-inner">
                <RefreshCw size={14} />
                <span className="pv-segment-main">Full Sync</span>
              </div>
              <span className="pv-segment-sub">All History</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Action Command Deck (Push vs Pull - Dual Chamber) */}
      <div className="pv-command-deck">
        {/* Command Pod A: Backup to Cloud (Push) */}
        <div className="pv-double-bezel cyan-accent">
          <div className="pv-inner-core pv-command-core">
            <div>
              <div className="pv-command-header">
                <div className="pv-orb-icon cyan">
                  <UploadCloud size={24} />
                </div>
                <div className="pv-command-title-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="pv-eyebrow">Cloud Backup</span>
                  </div>
                  <h3>Backup to Cloud</h3>
                  <p>
                    {forceFullSync
                      ? 'Uploads your complete local history to ensure your cloud vault has all past records.'
                      : 'Uploads only new expeditions, combats, debris harvests, discoveries, and spied radar.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pv-command-footer">
              <div className="pv-timestamp">
                <Clock size={13} />
                <span>
                  {vaultSummary?.lastSentAt
                    ? `Last uploaded: ${new Date(vaultSummary.lastSentAt).toLocaleString()}`
                    : 'Never uploaded from this device'}
                </span>
              </div>

              {/* Button-in-Button Push CTA with Live 2-Minute Cooldown */}
              <button
                type="button"
                onClick={handleSendToVault}
                disabled={isSending || isFetching || isSendOnCooldown}
                className={`pv-btn-pill primary-cyan ${isSendOnCooldown ? 'disabled-cooldown' : ''}`}
                title={
                  isSendOnCooldown
                    ? `Upload cooldown active. Ready in ${formatCooldown(sendCooldownRemainingMs)}`
                    : forceFullSync
                    ? 'Upload complete history to Cloud Vault'
                    : 'Upload new records to Cloud Vault'
                }
              >
                <div className="pv-btn-icon-capsule">
                  {isSending ? (
                    <RefreshCw size={15} className="pv-spin" />
                  ) : isSendOnCooldown ? (
                    <Clock size={15} />
                  ) : (
                    <UploadCloud size={16} />
                  )}
                </div>
                <span>
                  {isSending
                    ? (forceFullSync ? 'Uploading All History...' : 'Uploading New Data...')
                    : isSendOnCooldown
                    ? `Cooldown (${formatCooldown(sendCooldownRemainingMs)})`
                    : forceFullSync
                    ? 'Backup All History'
                    : 'Backup New Data'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Command Pod B: Restore from Cloud (Pull) */}
        <div className="pv-double-bezel emerald-accent">
          <div className="pv-inner-core pv-command-core">
            <div>
              <div className="pv-command-header">
                <div className="pv-orb-icon emerald">
                  <DownloadCloud size={24} />
                </div>
                <div className="pv-command-title-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="pv-eyebrow emerald">Cloud Restore</span>
                  </div>
                  <h3>Restore from Cloud</h3>
                  <p>
                    {forceFullSync
                      ? 'Downloads and verifies your entire cloud history, restoring any missing past records.'
                      : 'Downloads newly saved data from your other devices since your last sync without re-fetching existing history.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pv-command-footer">
              <div className="pv-timestamp">
                <Clock size={13} />
                <span>
                  {vaultSummary?.lastFetchedAt
                    ? `Last downloaded: ${new Date(vaultSummary.lastFetchedAt).toLocaleString()}`
                    : 'Never downloaded to this device'}
                </span>
              </div>

              {/* Button-in-Button Pull CTA with Live 2-Minute Cooldown */}
              <button
                type="button"
                onClick={handleFetchFromVault}
                disabled={isSending || isFetching || isFetchOnCooldown}
                className={`pv-btn-pill primary-emerald ${isFetchOnCooldown ? 'disabled-cooldown' : ''}`}
                title={
                  isFetchOnCooldown
                    ? `Download cooldown active. Ready in ${formatCooldown(fetchCooldownRemainingMs)}`
                    : forceFullSync
                    ? 'Restore complete history from Cloud Vault'
                    : 'Restore new records from Cloud Vault'
                }
              >
                <div className="pv-btn-icon-capsule">
                  {isFetching ? (
                    <RefreshCw size={15} className="pv-spin" />
                  ) : isFetchOnCooldown ? (
                    <Clock size={15} />
                  ) : (
                    <DownloadCloud size={16} />
                  )}
                </div>
                <span>
                  {isFetching
                    ? (forceFullSync ? 'Restoring All History...' : 'Restoring New Data...')
                    : isFetchOnCooldown
                    ? `Cooldown (${formatCooldown(fetchCooldownRemainingMs)})`
                    : forceFullSync
                    ? 'Restore All History'
                    : 'Restore New Data'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress HUD (Visible while Sending or Fetching) */}
      <AnimatePresence>
        {(isSending || isFetching) && syncProgress && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={`pv-double-bezel ${isSending ? 'cyan-accent' : 'emerald-accent'}`}
          >
            <div className="pv-inner-core">
              <div className="pv-progress-hud">
                <div className="pv-progress-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={16} className="pv-spin" style={{ color: isSending ? '#00f2ff' : '#10b981' }} />
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{syncProgress.stage}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
                    <span style={{ color: isSending ? '#00f2ff' : '#10b981', fontWeight: 700, fontFamily: 'monospace', fontSize: '15px' }}>
                      {syncProgress.percent}%
                    </span>
                  </div>
                </div>

                <div className="pv-progress-track">
                  <div
                    className={`pv-progress-bar-fill ${isSending ? 'cyan' : 'emerald'}`}
                    style={{ width: `${syncProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Synced Data Overview (Bento Grid) */}
      <div className="pv-telemetry-section">
        <div className="pv-telemetry-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pv-mini-icon-aperture" style={{ color: '#00f2ff' }}>
              <Database size={15} />
            </div>
            <div>
              <h3>Synced Data Overview</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                This Device vs Cloud Vault
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pv-delta-pill in-sync">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live Status
            </span>
          </div>
        </div>

        <div className="pv-bento-grid">
          {categories.map(cat => {
            const isMatch = cat.localCount === cat.vaultCount;
            const hasLocalLead = cat.localCount > cat.vaultCount;
            const hasVaultLead = cat.vaultCount > cat.localCount;

            return (
              <div key={cat.id} className="pv-double-bezel">
                <div className="pv-inner-core pv-bento-core">
                  <div className="pv-bento-top">
                    <div className="pv-bento-label-group">
                      <div className="pv-mini-icon-aperture">
                        <ThemeIcon name={cat.iconName} size={15} />
                      </div>
                      <span className="pv-bento-name">{cat.label}</span>
                    </div>

                    <span
                      className={`pv-delta-pill ${
                        isMatch ? 'in-sync' : hasLocalLead ? 'local-lead' : 'vault-lead'
                      }`}
                    >
                      {isMatch
                        ? 'IN SYNC'
                        : hasLocalLead
                        ? `+${(cat.localCount - cat.vaultCount).toLocaleString()} LOCAL`
                        : `+${(cat.vaultCount - cat.localCount).toLocaleString()} VAULT`}
                    </span>
                  </div>

                  <div className="pv-split-chamber">
                    <div>
                      <div className="pv-metric-col-title">This Device</div>
                      <div className="pv-metric-col-val">
                        {cat.localCount.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '14px' }}>
                      <div className="pv-metric-col-title">Cloud Vault</div>
                      <div className="pv-metric-col-val cloud">
                        {cat.vaultCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="pv-bento-subtext">
                    {cat.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Sync Rules & Storage Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        <div className="pv-double-bezel">
          <div className="pv-inner-core" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div className="pv-mini-icon-aperture" style={{ color: '#00f2ff' }}>
                <Sparkles size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc', fontFamily: 'Space Grotesk, sans-serif' }}>
                Raid Radar Merge Rules
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
              • <strong style={{ color: '#e2e8f0' }}>Higher Production Kept:</strong> If a target exists both on this device and in the vault, the scan with higher estimated production is preserved.<br />
              • <strong style={{ color: '#e2e8f0' }}>Latest Resource Scan:</strong> Scanned loot quantities and report hashes always use the newest timestamp.<br />
              • <strong style={{ color: '#e2e8f0' }}>Safe Merge:</strong> Existing targets are never deleted or corrupted.
            </p>
          </div>
        </div>

        <div className="pv-double-bezel">
          <div className="pv-inner-core" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div className="pv-mini-icon-aperture" style={{ color: '#10b981' }}>
                <Database size={16} />
              </div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc', fontFamily: 'Space Grotesk, sans-serif' }}>
                Cloud Vault &amp; Safety Cooldown
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
              • <strong style={{ color: '#e2e8f0' }}>Cloud Vault Storage:</strong> Your expeditions, combats, debris harvests, discoveries, planner items, and raid radar are safely synchronized to your private cloud storage.<br />
              • <strong style={{ color: '#e2e8f0' }}>2-Minute Cooldown:</strong> Upload and download operations have a 120-second safety cooldown to ensure data consistency and prevent conflicts between devices.<br />
              • <strong style={{ color: '#e2e8f0' }}>Device Privacy:</strong> UI settings, scout filters, and local preferences remain stored privately on each device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverwatchPersonalVault;
