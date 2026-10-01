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
          msg = `Vault synchronized (Fast Delta): ${newExp === 0 ? `all ${totalExp.toLocaleString()} expeditions verified in sync` : `${newExp.toLocaleString()} new expeditions uploaded (${totalExp.toLocaleString()} total)`}, ${res.saved.combats.toLocaleString()} combats, ${res.saved.harvests.toLocaleString()} harvests, ${res.saved.discoveries.toLocaleString()} discoveries, and ${res.saved.radar.toLocaleString()} radar targets merged.`;
        } else {
          msg = `Successfully uploaded to Personal Vault: ${res.saved.expeditions.toLocaleString()} expeditions, ${res.saved.combats.toLocaleString()} combats, ${res.saved.harvests.toLocaleString()} harvests, ${res.saved.discoveries.toLocaleString()} discoveries, ${res.saved.planner.toLocaleString()} planner items, and ${res.saved.radar.toLocaleString()} radar targets.`;
        }
        setNotification({
          type: 'success',
          message: msg,
        });
        setTimeout(() => {
          setNotification(curr => (curr?.message === msg ? null : curr));
        }, 15000);
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
        const fetchMsg = totalItems === 0
          ? 'Personal Vault is already up to date. All local records are verified in sync with the cloud.'
          : `Successfully downloaded from Personal Vault: ${res.hydrated.expeditions.toLocaleString()} expeditions, ${res.hydrated.combats.toLocaleString()} combats, ${res.hydrated.harvests.toLocaleString()} harvests, ${res.hydrated.discoveries.toLocaleString()} discoveries, ${res.hydrated.planner.toLocaleString()} planner items, and ${res.hydrated.radar.toLocaleString()} radar targets.`;
        setNotification({
          type: 'success',
          message: fetchMsg,
        });
        setTimeout(() => {
          setNotification(curr => (curr?.message === fetchMsg ? null : curr));
        }, 15000);
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

      {/* 3B. High-Speed Delta Sync & Edge Resource Optimization Banner */}
      {(() => {
        const canFullResync = vaultSummary?.canFullResync ?? true;
        const cooldownRemainingHours = vaultSummary?.fullResyncCooldownMs
          ? Math.max(1, Math.ceil(vaultSummary.fullResyncCooldownMs / (60 * 60 * 1000)))
          : 0;

        return (
          <div className={`pv-delta-banner ${forceFullSync ? 'active-full' : 'active-delta'}`}>
            <div className="pv-delta-info">
              <div className={`pv-delta-orb ${forceFullSync ? 'amber' : 'cyan'}`}>
                {forceFullSync ? <AlertTriangle size={18} /> : <Zap size={18} />}
              </div>
              <div className="pv-delta-titles">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ color: forceFullSync ? '#f59e0b' : '#00f2ff' }}>
                    {forceFullSync ? 'Full Archive Resync Mode' : 'Smart Delta Sync Active'}
                  </h4>
                  <span className={`pv-eyebrow ${forceFullSync ? 'amber' : ''}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {forceFullSync ? '1x / 24h Limit' : 'Ultra Fast'}
                  </span>
                  {!canFullResync && !forceFullSync && (
                    <span className="pv-eyebrow amber" style={{ fontSize: '9px', padding: '1px 6px' }}>
                      Cooldown (~{cooldownRemainingHours}h)
                    </span>
                  )}
                </div>
                <p>
                  {forceFullSync
                    ? 'Exhaustively re-evaluates all local records against Cloudflare D1. Limited to once every 24 hours to protect edge write quotas.'
                    : !canFullResync
                    ? `Transfers only newly scanned reports, expeditions, and radar changes. (Full resync is on 24-hour cooldown, next available in ~${cooldownRemainingHours}h).`
                    : 'Transfers only newly scanned reports, expeditions, and radar changes. Cuts Cloudflare row writes by ~99% and finishes in < 1 second.'}
                </p>
              </div>
            </div>

            <div
              className={`pv-toggle-wrap ${!canFullResync && !forceFullSync ? 'disabled' : ''}`}
              onClick={() => {
                if (!canFullResync && !forceFullSync) {
                  setNotification({
                    type: 'info',
                    message: `Force Full Resync is limited to once every 24 hours to prevent Cloudflare quota depletion. Next full resync available in ~${cooldownRemainingHours}h. (Smart Delta Sync is always unlimited).`,
                  });
                  return;
                }
                setForceFullSync(!forceFullSync);
              }}
              title={
                !canFullResync
                  ? `Daily limit active. Available again in ~${cooldownRemainingHours}h`
                  : 'Toggle between fast incremental delta sync and full archive verification'
              }
            >
              <span className="pv-toggle-label">
                {forceFullSync
                  ? 'Full Scan ON'
                  : !canFullResync
                  ? `Cooldown (~${cooldownRemainingHours}h)`
                  : 'Force Full Resync'}
              </span>
              <div className={`pv-switch ${forceFullSync ? 'on' : ''} ${!canFullResync && !forceFullSync ? 'locked' : ''}`}>
                <div className="pv-switch-thumb" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Action Command Deck (Push vs Pull - Dual Chamber) */}
      <div className="pv-command-deck">
        {/* Command Pod A: Send to Vault (Push) */}
        <div className="pv-double-bezel cyan-accent">
          <div className="pv-inner-core pv-command-core">
            <div>
              <div className="pv-command-header">
                <div className="pv-orb-icon cyan">
                  <UploadCloud size={24} />
                </div>
                <div className="pv-command-title-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="pv-eyebrow">Upload</span>
                  </div>
                  <h3>Send to Vault (Upload)</h3>
                  <p>
                    {forceFullSync
                      ? 'Exhaustively re-evaluates all local records and updates your cloud vault archive.'
                      : 'Uploads only new expeditions, combats, debris harvests, discoveries, and spied radar deltas.'}
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

              {/* Button-in-Button Push CTA */}
              <button
                type="button"
                onClick={handleSendToVault}
                disabled={isSending || isFetching}
                className="pv-btn-pill primary-cyan"
              >
                <div className="pv-btn-icon-capsule">
                  {isSending ? <RefreshCw size={15} className="pv-spin" /> : <UploadCloud size={16} />}
                </div>
                <span>{isSending ? 'Uploading Data...' : (forceFullSync ? 'Full Upload' : 'Send to Vault')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Command Pod B: Fetch from Vault (Pull) */}
        <div className="pv-double-bezel emerald-accent">
          <div className="pv-inner-core pv-command-core">
            <div>
              <div className="pv-command-header">
                <div className="pv-orb-icon emerald">
                  <DownloadCloud size={24} />
                </div>
                <div className="pv-command-title-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="pv-eyebrow emerald">Download</span>
                  </div>
                  <h3>Fetch from Vault (Download)</h3>
                  <p>
                    {forceFullSync
                      ? 'Downloads and verifies your entire cloud archive, restoring any missing history.'
                      : 'Downloads newly saved vault data to this device since your last sync without re-fetching existing history.'}
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

              {/* Button-in-Button Pull CTA */}
              <button
                type="button"
                onClick={handleFetchFromVault}
                disabled={isSending || isFetching}
                className="pv-btn-pill primary-emerald"
              >
                <div className="pv-btn-icon-capsule">
                  {isFetching ? <RefreshCw size={15} className="pv-spin" /> : <DownloadCloud size={16} />}
                </div>
                <span>{isFetching ? 'Downloading...' : 'Fetch from Vault'}</span>
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
                Storage &amp; Privacy
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
              • <strong style={{ color: '#e2e8f0' }}>Lightweight Sync:</strong> Only essential event records and numbers are synced, keeping sync fast and compact.<br />
              • <strong style={{ color: '#e2e8f0' }}>Device Settings:</strong> UI settings and custom sandbox setups stay on your local device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverwatchPersonalVault;
