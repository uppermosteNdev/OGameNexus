// ============================================================================
// NEXUS OVERWATCH — MY EMPIRE DATA SHARING DECK (HIGH-END AGENCY DESIGN)
// Archetype: Ethereal Glass / Double-Bezel Hardware Avionics
// Granular Privacy Controls for 8 Categories & Master Alliance Consent
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Cpu,
  Layers,
  FlaskConical,
  Rocket,
  Award,
  Sparkles,
  Network
} from 'lucide-react';
import { db, Planet } from '../../db';
import './OverwatchMyEmpire.css';

export interface EmpireSharingSettings {
  acknowledged: boolean;
  mines: boolean;
  facilities: boolean;
  research: boolean;
  lifeformBuildings: boolean;
  lifeformBonuses: boolean;
  lifeformResearchSetups: boolean;
  fleet: boolean;
  defence: boolean;
}

export const DEFAULT_EMPIRE_SHARING_SETTINGS: EmpireSharingSettings = {
  acknowledged: false, // Default disabled until player explicitly configures & enables it
  mines: true,
  facilities: true,
  research: true,
  lifeformBuildings: true,
  lifeformBonuses: true,
  lifeformResearchSetups: true,
  fleet: true,
  defence: true,
};

interface OverwatchMyEmpireProps {
  config: any;
  saveConfig: (newConfig: any) => void;
  effectiveAccount: any;
  effectivePermissions: any;
  isAdmin: boolean;
  apiUrl: string;
}

interface CategoryCardDef {
  key: keyof Omit<EmpireSharingSettings, 'acknowledged'>;
  title: string;
  tag: string;
  description: string;
  bgIconUrl: string;
  lucideIcon: React.ReactNode;
}

const SHARING_CATEGORIES: CategoryCardDef[] = [
  {
    key: 'mines',
    title: 'Mines',
    tag: 'Economy & Energy',
    description: 'Metal, Crystal, and Deuterium mine levels, energy balance, and daily production totals.',
    bgIconUrl: '/icons/resources/metal_mine_large.jpg',
    lucideIcon: <Layers size={18} style={{ color: '#00f2ff' }} />,
  },
  {
    key: 'facilities',
    title: 'Facilities',
    tag: 'Colony Industry',
    description: 'Robotics, Shipyard, Research Lab, Nanite, Terraformer, Space Dock, Lunar Base, Phalanx & Jump Gate.',
    bgIconUrl: '/icons/facilities/nanite_factory_large.jpg',
    lucideIcon: <Cpu size={18} style={{ color: '#38bdf8' }} />,
  },
  {
    key: 'research',
    title: 'Research',
    tag: 'Technology Matrix',
    description: '16 core research levels (Astrophysics, Plasma, Hyperspace, Weapons, Shields, Armor, etc.) and research points.',
    bgIconUrl: '/icons/research/computer-tech-research-large.jpg',
    lucideIcon: <FlaskConical size={18} style={{ color: '#a78bfa' }} />,
  },
  {
    key: 'lifeformBuildings',
    title: 'Lifeform Buildings',
    tag: 'Colony Biospheres',
    description: 'Residential sectors, bio-sanctuaries, advanced biotech labs, and lifeform population complexes.',
    bgIconUrl: '/icons/lifeforms/quantum-computer-centre.png',
    lucideIcon: <Sparkles size={18} style={{ color: '#4ade80' }} />,
  },
  {
    key: 'lifeformBonuses',
    title: 'Lifeform Bonuses',
    tag: 'Species Multipliers',
    description: 'Active production boosters, fleet speed modifiers, research discounts, and species progression levels.',
    bgIconUrl: '/icons/lifeforms/lifeform-bonuses.png',
    lucideIcon: <Award size={18} style={{ color: '#fbbf24' }} />,
  },
  {
    key: 'lifeformResearchSetups',
    title: 'Lifeform Research Setups',
    tag: 'Tech Tree Layout',
    description: 'Individual 18-slot technology choices, tier distributions, and research levels across all colonies.',
    bgIconUrl: '/icons/lifeforms/lifeform-setups.png',
    lucideIcon: <Network size={18} style={{ color: '#ec4899' }} />,
  },
  {
    key: 'fleet',
    title: 'Fleet',
    tag: 'Warships & Logistics',
    description: 'Combat ships, civilian transports, espionage probes, Recyclers, Battlecruisers, and Deathstars.',
    bgIconUrl: '/icons/ships/battlecruiser-large.jpg',
    lucideIcon: <Rocket size={18} style={{ color: '#f43f5e' }} />,
  },
  {
    key: 'defence',
    title: 'Defence',
    tag: 'Fortifications',
    description: 'Planetary rocket launchers, laser turrets, gauss cannons, plasma batteries, and planetary shield domes.',
    bgIconUrl: '/icons/ships/large-shield-dome-large.jpg',
    lucideIcon: <ShieldCheck size={18} style={{ color: '#2dd4bf' }} />,
  },
];

export const OverwatchMyEmpire: React.FC<OverwatchMyEmpireProps> = ({
  config,
  saveConfig,
  effectiveAccount,
  effectivePermissions,
  isAdmin,
  apiUrl,
}) => {
  // Read local Dexie account and colony data
  const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
  const activePlayerId = effectiveAccount?.playerId || activeAccount?.playerId;

  // Sharing settings state initialized from config or defaults (default disabled until configured)
  const [sharingSettings, setSharingSettings] = useState<EmpireSharingSettings>(() => {
    const rawSharing = config?.empireSharing;
    if (rawSharing && typeof rawSharing.acknowledged === 'boolean') {
      return {
        ...DEFAULT_EMPIRE_SHARING_SETTINGS,
        ...rawSharing,
        acknowledged: rawSharing.acknowledged === true,
      };
    }
    return {
      ...DEFAULT_EMPIRE_SHARING_SETTINGS,
      acknowledged: false,
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronize state if parent config changes externally or activePlayerId switches
  useEffect(() => {
    const rawSharing = config?.empireSharing;
    if (rawSharing && typeof rawSharing.acknowledged === 'boolean') {
      setSharingSettings({
        ...DEFAULT_EMPIRE_SHARING_SETTINGS,
        ...rawSharing,
        acknowledged: rawSharing.acknowledged === true,
      });
    } else {
      setSharingSettings({
        ...DEFAULT_EMPIRE_SHARING_SETTINGS,
        acknowledged: false,
      });
    }
  }, [config?.empireSharing, activePlayerId]);

  // Persist sharing settings to config and chrome.storage
  const updateSharingSettings = (newSettings: EmpireSharingSettings) => {
    setSharingSettings(newSettings);

    const updatedConfig = {
      ...config,
      empireSharing: newSettings,
      permissions: {
        ...(config.permissions || {}),
        shareEmpire: newSettings.acknowledged === true,
      },
    };

    saveConfig(updatedConfig);

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({
        nexus_overwatch_empire_sharing: newSettings,
      });
    }
  };

  // Trigger automatic background sync when settings are modified
  const triggerEmpireSync = async () => {
    if (!activePlayerId) return;

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({
          type: 'OVERWATCH_FORCE_SYNC_EMPIRE',
          action: 'OVERWATCH_FORCE_SYNC_EMPIRE',
          playerId: activePlayerId,
        });

        if (res?.success) {
          setSyncFeedback({
            type: 'success',
            message: '✓ Empire updated & shared with Overwatch Empire under current rules.',
          });
        } else {
          setSyncFeedback({
            type: res?.reason === 'unauthorized_or_disabled' ? 'error' : 'success',
            message: res?.reason === 'unauthorized_or_disabled'
              ? 'Sharing currently paused. Enable master switch to broadcast.'
              : '✓ Synced with Overwatch server.',
          });
        }
      } else {
        setSyncFeedback({
          type: 'success',
          message: '✓ Settings saved locally.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch sync.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleToggleCategory = (category: keyof Omit<EmpireSharingSettings, 'acknowledged'>) => {
    const updated: EmpireSharingSettings = {
      ...sharingSettings,
      [category]: !sharingSettings[category],
    };
    updateSharingSettings(updated);

    // Auto-sync immediately if broadcasting is active
    if (sharingSettings.acknowledged && activePlayerId) {
      setTimeout(() => triggerEmpireSync(), 50);
    }
  };

  const handleToggleMasterAcknowledgement = () => {
    const nextAck = !sharingSettings.acknowledged;
    const updated: EmpireSharingSettings = {
      ...sharingSettings,
      acknowledged: nextAck,
    };
    updateSharingSettings(updated);

    // Auto-sync begins immediately as soon as broadcast pill is enabled!
    if (nextAck && activePlayerId) {
      setTimeout(() => triggerEmpireSync(), 50);
    }
  };

  // Count of active categories
  const activeCategoryCount = useMemo(() => {
    let count = 0;
    SHARING_CATEGORIES.forEach(cat => {
      if (sharingSettings[cat.key]) count++;
    });
    return count;
  }, [sharingSettings]);

  const isMasterActive = sharingSettings.acknowledged;
  const allianceTag = effectiveAccount?.allianceTag || config?.allianceTag || 'Alliance';

  return (
    <div className="ow-my-empire-root">
      {/* ----------------------------------------------------------------------
          HEADER & META STRIP
          ---------------------------------------------------------------------- */}
      <div className="ow-my-empire-header">
        <div className="ow-my-empire-header-info">
          <div className="ow-eyebrow" style={{ color: '#00f2ff' }}>
            ALLIANCE EMPIRE // DATA SHARING DECK
          </div>
          <div className="ow-my-empire-title-row">
            <h2 className="ow-my-empire-title">My Empire Privacy &amp; Sharing</h2>
            <div className={`ow-my-empire-stat-pill ${isMasterActive ? 'active' : 'paused'}`}>
              <span className="ow-status-dot" style={{ background: isMasterActive ? '#00f2ff' : '#f87171' }}></span>
              <span>{isMasterActive ? `${activeCategoryCount} of 8 Categories Shared` : 'Sharing Withdrawn'}</span>
            </div>
          </div>
          <p className="ow-my-empire-subtitle">
            Select exactly which aspects of your empire are shared with the <strong>[{allianceTag}]</strong> Overwatch Empire.
            Alliance members with verified viewing permissions will only see what you explicitly enable below.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          4x2 CATEGORY GRID (DOUBLE-BEZEL HARDWARE AVIONICS)
          ---------------------------------------------------------------------- */}
      <div className="ow-my-empire-grid">
        {SHARING_CATEGORIES.map(category => {
          const isCategoryEnabled = sharingSettings[category.key];
          const isEffectivelyShared = isMasterActive && isCategoryEnabled;

          return (
            <div
              key={category.key}
              className={`ow-my-empire-card-shell ${isEffectivelyShared ? 'active' : ''} ${!isMasterActive ? 'disabled' : ''}`}
            >
              <div className="ow-my-empire-card-inner">
                {/* Full-Card Thematic Game Icon Background (Responds to Active Pill State) */}
                <img
                  src={category.bgIconUrl}
                  alt=""
                  className={`ow-my-empire-card-bg-art ${isCategoryEnabled ? 'active' : 'inactive'}`}
                  draggable={false}
                />
                <div className="ow-my-empire-card-overlay" />

                {/* Top Row: Identity & Tactile Pill Switch */}
                <div className="ow-my-empire-card-top">
                  <div className="ow-my-empire-card-identity">
                    <div className="ow-my-empire-card-icon-box">
                      {category.lucideIcon}
                    </div>
                    <div className="ow-my-empire-card-headings">
                      <h4 className="ow-my-empire-card-title">{category.title}</h4>
                      <span className="ow-my-empire-card-tag">{category.tag}</span>
                    </div>
                  </div>

                  {/* Tactile Hardware Pill Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isCategoryEnabled}
                    className={`ow-pill-switch-btn ${isCategoryEnabled ? 'active' : ''}`}
                    onClick={() => handleToggleCategory(category.key)}
                    title={`Toggle ${category.title} sharing`}
                  >
                    <div className="ow-pill-switch-thumb" />
                  </button>
                </div>

                {/* Body: Clean Description */}
                <div className="ow-my-empire-card-body">
                  <p className="ow-my-empire-card-desc">{category.description}</p>
                </div>

                {/* Footer: Status Badge */}
                <div className="ow-my-empire-card-footer">
                  <span className={`ow-my-empire-status-label ${isEffectivelyShared ? 'shared' : 'withheld'}`}>
                    {isEffectivelyShared ? '● Shared with Alliance' : '○ Private / Withheld'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {isCategoryEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------------
          CENTERED ACKNOWLEDGEMENT SECTION (DOUBLE-BEZEL CONSENT & WITHDRAWAL DECK)
          ---------------------------------------------------------------------- */}
      <div className="ow-acknowledgement-wrapper">
        <div className={`ow-acknowledgement-shell ${!isMasterActive ? 'withdrawn' : ''}`}>
          <div className="ow-acknowledgement-inner">
            {/* Header Badge */}
            <div className="ow-acknowledgement-badge">
              {isMasterActive ? (
                <>
                  <ShieldCheck size={14} />
                  <span>CONSENT &amp; BROADCAST PROTOCOL ACTIVE</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} />
                  <span>ALLIANCE BROADCAST CURRENTLY PAUSED</span>
                </>
              )}
            </div>

            <h3 className="ow-acknowledgement-title">
              Overwatch Empire Sharing Consent
            </h3>

            {/* Master Centered Pill Switch */}
            <div className="ow-master-switch-container">
              <span className={`ow-master-switch-label ${isMasterActive ? 'active' : 'paused'}`}>
                {isMasterActive ? 'Broadcasting to Alliance' : 'Sharing Withdrawn'}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isMasterActive}
                className={`ow-master-switch-btn ${isMasterActive ? 'active' : ''}`}
                onClick={handleToggleMasterAcknowledgement}
                title="Toggle master acknowledgement of sharing with alliance"
              >
                <div className="ow-master-switch-thumb" />
              </button>
            </div>

            {/* Legal Consent & Instant Withdrawal Text */}
            <div className="ow-acknowledgement-legal-box">
              <div className="ow-acknowledgement-legal-main">
                I acknowledge that what I have selected above will be shared with the entire{' '}
                <strong>[{allianceTag}]</strong> Overwatch Empire.
              </div>
              <div className="ow-acknowledgement-legal-sub">
                (accessible only to alliance members with verified view permissions)
              </div>
              <div className="ow-acknowledgement-legal-withdraw">
                <em>At any time, I can withdraw from sharing any or all of it with immediate effect.</em>
              </div>
            </div>

            {/* Discreet Live Activity & Feedback Indicator (No manual button needed) */}
            {(isSyncing || syncFeedback) && (
              <div className="ow-acknowledgement-status-strip">
                {isSyncing && (
                  <div className="ow-sync-indicator">
                    <RefreshCw size={13} className="ow-spinning" />
                    <span>Syncing empire data with Overwatch...</span>
                  </div>
                )}
                {syncFeedback && !isSyncing && (
                  <div className={`ow-sync-feedback ${syncFeedback.type}`}>
                    {syncFeedback.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverwatchMyEmpire;
