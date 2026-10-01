// ============================================================================
// NEXUS OVERWATCH — TACTICAL COMMAND DECK (DESIGN-TASTE-FRONTEND V2)
// Design Read: Mission-critical tactical intelligence deck for OGame alliance leaders
// Dials: VARIANCE: 7 | MOTION: 5 | DENSITY: 6
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Key,
  Shield,
  ShieldCheck,
  Radio,
  Crosshair,
  Clock,
  Lock,
  CheckCircle2,
  XCircle,
  Copy,
  Share2,
  ArrowRight,
  Sparkles,
  User,
  Info,
  FlaskConical,
  RotateCcw,
  PlusCircle,
  LogIn,
  ChevronDown,
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Filter,
  Check,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ThemeIcon } from '../components/ThemeIcon';
import { getOverwatchApiUrl, checkOverwatchHealth, DEFAULT_OVERWATCH_API_URL, validateAllianceGlyph } from '../../utils/overwatchApi';
import { isOverwatchTester, OVERWATCH_ENFORCE_TESTING_GATE, OVERWATCH_TESTER_PASSKEY, syncOverwatchTesterStatusWithCloudflare } from '../../config/overwatchTestingConfig';
import OverwatchEmpire from './OverwatchEmpire';
import OverwatchMyEmpire, { EmpireSharingSettings, DEFAULT_EMPIRE_SHARING_SETTINGS } from './OverwatchMyEmpire';
import OverwatchPersonalVault from './OverwatchPersonalVault';
import OverwatchInactiveScout from './OverwatchInactiveScout';
import OverwatchActivityHeatmap from './OverwatchActivityHeatmap';
import { getStoredVaultKey } from '../../utils/personalVaultClient';
import { cleanUniverseId } from '../../utils/universe';
import './Overwatch.css';

interface DetectedAlliance {
  exists: boolean;
  isFounder?: boolean;
  role?: 'admin' | 'member';
  allianceId?: string;
  allianceName?: string;
  allianceTag?: string;
  ogameAllianceId?: string;
  universeId?: string;
  adminPlayerId?: string;
  adminPlayerName?: string;
  memberCount?: number;
  glyphCode?: string;
  expiresAt?: number;
}

interface AllianceConfig {
  allianceId: string | null;
  ogameAllianceId: string | null;
  glyphCode: string | null;
  authToken: string | null;
  allianceName: string | null;
  allianceTag: string | null;
  universeId: string | null;
  role: 'admin' | 'member' | 'visitor' | null;
  subscriptionExpiresAt: number | null;
  customApiUrl?: string;
  empireSharing?: EmpireSharingSettings;
  permissions: {
    shareSpy: boolean;
    shareGalaxy: boolean;
    shareLocks: boolean;
    shareEmpire?: boolean;
  };
}

export type OverwatchRole = 'admin' | 'member' | 'visitor';

export interface RolePermissions {
  viewGalaxyScrapes: boolean;
  contributeGalaxyScrapes: boolean;
  viewSpyVault: boolean;
  uploadSpyReports: boolean;
  viewHeatmaps: boolean;
  claimRaidLocks: boolean;
  inviteMembers: boolean;
  viewEmpire?: boolean;
  shareEmpire?: boolean;
}

export interface JoinRequestItem {
  requestId: string;
  playerId: string;
  playerName: string;
  allianceTag: string;
  allianceName: string;
  universeId: string;
  createdAt: number;
  suggestedRole: 'member' | 'visitor';
  assignedRole?: 'member' | 'visitor';
  status: 'pending' | 'approved' | 'denied';
}

export const DEFAULT_PERMISSIONS_MATRIX: Record<'member' | 'visitor', RolePermissions> = {
  member: {
    viewGalaxyScrapes: true,
    contributeGalaxyScrapes: true,
    viewSpyVault: true,
    uploadSpyReports: true,
    viewHeatmaps: true,
    claimRaidLocks: true,
    inviteMembers: false,
    viewEmpire: true,
    shareEmpire: true,
  },
  visitor: {
    viewGalaxyScrapes: true,
    contributeGalaxyScrapes: true,
    viewSpyVault: false,
    uploadSpyReports: false,
    viewHeatmaps: false,
    claimRaidLocks: false,
    inviteMembers: false,
    viewEmpire: false,
    shareEmpire: false,
  },
};

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
    shareEmpire: false,
  },
  empireSharing: {
    ...DEFAULT_EMPIRE_SHARING_SETTINGS,
    acknowledged: false,
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


function formatTimeAgo(timestamp?: number | null, fallbackTimestamp?: number | null): string {
  const time = timestamp || fallbackTimestamp;
  if (!time) return '—';
  const ageSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (ageSec < 60) return 'Just now';
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}

export interface ParsedPlayerStatus {
  isVacation: boolean;
  isLongInactive: boolean;
  isShortInactive: boolean;
  isNoob: boolean;
  isOutlaw: boolean;
  isBanned: boolean;
  isActive: boolean;
}

export function parsePlayerStatus(rawStatus?: string | null): ParsedPlayerStatus {
  if (!rawStatus) {
    return { isVacation: false, isLongInactive: false, isShortInactive: false, isNoob: false, isOutlaw: false, isBanned: false, isActive: true };
  }
  const clean = rawStatus.trim();
  const lower = clean.toLowerCase();

  if (lower === 'active' || lower === 'normal' || lower === '') {
    return { isVacation: false, isLongInactive: false, isShortInactive: false, isNoob: false, isOutlaw: false, isBanned: false, isActive: true };
  }

  // Vacation: discrete letter 'v'/'V' or explicit word "vacation"
  const isVacation = /(^|[^a-zA-Z])v([^a-zA-Z]|$)/i.test(clean) || lower.includes('vacation');

  // Long Inactive (28d+): capital 'I' as discrete token or word "long"/"28"
  const isLongInactive = /(^|[^a-zA-Z])I([^a-zA-Z]|$)/.test(clean) || lower.includes('long') || lower.includes('28');

  // Short Inactive (7d+): lowercase 'i' as discrete token or word "inactive" (when not long)
  const isShortInactive = !isLongInactive && (/(^|[^a-zA-Z])i([^a-zA-Z]|$)/.test(clean) || lower.includes('inactive'));

  // Newbie: discrete letter 'n'/'N' or word "noob"/"newbie"
  const isNoob = /(^|[^a-zA-Z])n([^a-zA-Z]|$)/i.test(clean) || lower.includes('noob') || lower.includes('newbie');

  // Outlaw: discrete letter 'o'/'O' or word "outlaw"
  const isOutlaw = /(^|[^a-zA-Z])o([^a-zA-Z]|$)/i.test(clean) || lower.includes('outlaw');

  // Banned: discrete letter 'b'/'B' or word "banned"
  const isBanned = /(^|[^a-zA-Z])b([^a-zA-Z]|$)/i.test(clean) || lower.includes('banned');

  const isActive = !isVacation && !isLongInactive && !isShortInactive && !isNoob && !isOutlaw && !isBanned;

  return { isVacation, isLongInactive, isShortInactive, isNoob, isOutlaw, isBanned, isActive };
}

export function formatStatus(s?: string | null): string {
  const parsed = parsePlayerStatus(s);
  if (parsed.isActive) return 'Active';

  const tagCodes: string[] = [];
  const descList: string[] = [];

  if (parsed.isBanned) { tagCodes.push('b'); descList.push('Banned'); }
  if (parsed.isVacation) { tagCodes.push('v'); descList.push('Vacation'); }
  if (parsed.isLongInactive) { tagCodes.push('I'); descList.push('Long Inactive (28d+)'); }
  else if (parsed.isShortInactive) { tagCodes.push('i'); descList.push('Inactive (7d+)'); }
  if (parsed.isNoob) { tagCodes.push('n'); descList.push('Newbie'); }
  if (parsed.isOutlaw) { tagCodes.push('o'); descList.push('Outlaw'); }

  if (tagCodes.length === 0) return 'Active';
  return `(${tagCodes.join(', ')}) ${descList.join(' + ')}`;
}

export function getStatusTag(rawStatus?: string | null): string {
  const parsed = parsePlayerStatus(rawStatus);
  if (parsed.isActive) return '';

  const tags: string[] = [];
  if (parsed.isVacation) tags.push('v');
  if (parsed.isLongInactive) tags.push('I');
  else if (parsed.isShortInactive) tags.push('i');
  if (parsed.isNoob) tags.push('n');
  if (parsed.isOutlaw) tags.push('o');
  if (parsed.isBanned) tags.push('b');

  if (tags.length === 0) return '';
  return ` (${tags.join(', ')})`;
}

export function getPlayerStatusColor(rawStatus?: string | null): string {
  const parsed = parsePlayerStatus(rawStatus);
  if (parsed.isActive) return '#ffffff';

  // 1. Vacation (v) -> Teal
  if (parsed.isVacation) {
    return '#00f2ff';
  }

  // 2. Noob (n) -> Green
  if (parsed.isNoob) {
    return '#4ade80';
  }

  // 3. Outlaw (o) -> Amber
  if (parsed.isOutlaw) {
    return '#fbbf24';
  }

  // 4. Banned (b) -> Red
  if (parsed.isBanned) {
    return '#f87171';
  }

  // 5. Long Inactive (I) -> Dark Gray
  if (parsed.isLongInactive) {
    return '#64748b';
  }

  // 6. Small Inactive (i) -> Light Gray
  if (parsed.isShortInactive) {
    return '#cbd5e1';
  }

  // 7. Normal Active -> White
  return '#ffffff';
}

const IntelDetailsCell: React.FC<{ evt: any; onJumpCoords?: (g: number, s: number, slot?: number) => void }> = ({ evt, onJumpCoords }) => {
  let oldState: any = null;
  let newState: any = null;

  try {
    if (typeof evt.old_state_json === 'string') oldState = JSON.parse(evt.old_state_json);
    else oldState = evt.old_state_json;
  } catch (e) { }

  try {
    if (typeof evt.new_state_json === 'string') newState = JSON.parse(evt.new_state_json);
    else newState = evt.new_state_json;
  } catch (e) { }

  let briefText = 'State altered';
  let beforeText: string | null = null;
  let afterText: string | null = null;

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
    case 'abandoned': {
      const isDestroyedPlanet =
        (newState?.planetName || newState?.planet_name || '').toLowerCase().includes('destroy') ||
        (newState?.slot && !newState?.playerId && !newState?.playerName);
      const hadMoonBefore = oldState?.has_moon === 1 || oldState?.hasMoon === 1;
      const moonSizeVal = oldState?.moon_size || oldState?.moonSize || 8000;
      const formerOwner = oldState?.player_name || evt.player_name || (oldState?.player_id ? `Player #${oldState.player_id}` : 'Player');
      const formerPlanet = oldState?.planet_name || oldState?.planetName || 'Colony';
      const formerAlly = oldState?.alliance_tag ? ` [${oldState.alliance_tag}]` : '';

      briefText = isDestroyedPlanet
        ? `Left planet (Destroyed Planet${hadMoonBefore ? ' & Moon' : ''})`
        : `Planet abandoned by ${formerOwner}`;
      beforeText = `Planet "${formerPlanet}" (${formerOwner}${formerAlly})${hadMoonBefore ? ` + Moon (${moonSizeVal.toLocaleString()} km)` : ''}`;
      afterText = isDestroyedPlanet
        ? `Destroyed Planet${hadMoonBefore ? ' (Moon Destroyed)' : ''} [Cleanup pending]`
        : 'Uncolonized Slot';
      break;
    }
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
        <span className="ow-intel-brief-text">{briefText}</span>
        <span className="ow-intel-info-icon">i</span>
      </div>

      <div className="ow-intel-popover">
        <div className="ow-intel-popover-header">
          <span className="ow-intel-popover-title">Delta Transition Details</span>
          {onJumpCoords ? (
            <button
              type="button"
              className="ow-intel-popover-coords clickable"
              title={`Jump to [${evt.galaxy}:${evt.system}:${evt.slot}] in Universe Map`}
              onClick={(e) => {
                e.stopPropagation();
                onJumpCoords(evt.galaxy, evt.system, evt.slot);
              }}
            >
              [{evt.galaxy}:{evt.system}:{evt.slot}]
            </button>
          ) : (
            <span className="ow-intel-popover-coords">[{evt.galaxy}:{evt.system}:{evt.slot}]</span>
          )}
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

const IntelDetectorCell: React.FC<{ detectedBy?: string | null }> = ({ detectedBy }) => {
  const raw = (detectedBy || '').trim();
  const isGameforge = !raw || raw.toLowerCase().includes('gameforge') || raw.toLowerCase().includes('xml');

  let displayName = raw;
  if (!displayName) {
    displayName = 'Gameforge Sync';
  }

  return (
    <div
      className={`ow-detector-badge ${isGameforge ? 'gameforge' : 'member'}`}
      title={isGameforge ? 'Automated Gameforge Server Sync' : `Live system scan by alliance member ${displayName}`}
    >
      {isGameforge ? (
        <Globe size={11} className="ow-detector-icon" />
      ) : (
        <User size={11} className="ow-detector-icon" />
      )}
      <span className="ow-detector-text">{displayName}</span>
    </div>
  );
};

const IntelPlayerCell: React.FC<{ evt: any }> = ({ evt }) => {
  let oldState: any = null;
  let newState: any = null;

  try {
    if (typeof evt.old_state_json === 'string') oldState = JSON.parse(evt.old_state_json);
    else oldState = evt.old_state_json;
  } catch (e) { }

  try {
    if (typeof evt.new_state_json === 'string') newState = JSON.parse(evt.new_state_json);
    else newState = evt.new_state_json;
  } catch (e) { }

  const isBadName = (n?: string | null) => !n || n === 'null' || n === 'undefined' || n.trim() === '' || n.trim().toLowerCase() === 'unknown';
  const resolvedPlayerName = !isBadName(evt.player_name) ? evt.player_name : null;
  const defaultName = resolvedPlayerName || (evt.player_id ? `Player #${evt.player_id}` : 'Former Colonist');
  const cleanName = (n: string) => n.replace(/\s*\([viInob, ]+\)$/i, '').trim();

  // Case 1: Status Changed event OR Player Renamed event -> Two names with arrow
  if (evt.event_type === 'status_changed' || evt.event_type === 'player_renamed') {
    const isRename = evt.event_type === 'player_renamed';

    // Status resolution
    const oldStatus =
      oldState?.playerStatus ||
      oldState?.player_status ||
      (isRename ? evt.current_player_status : null) ||
      'active';
    const newStatus =
      newState?.playerStatus ||
      newState?.player_status ||
      evt.current_player_status ||
      'active';

    // Name resolution
    const rawOldName =
      (!isBadName(oldState?.playerName) ? oldState.playerName : null) ||
      (!isBadName(oldState?.player_name) ? oldState.player_name : null) ||
      (isRename ? 'Former Colonist' : defaultName);
    const rawNewName =
      (!isBadName(newState?.playerName) ? newState.playerName : null) ||
      (!isBadName(newState?.player_name) ? newState.player_name : null) ||
      resolvedPlayerName ||
      defaultName;

    const baseOldName = cleanName(rawOldName);
    const baseNewName = cleanName(rawNewName);

    const oldTag = getStatusTag(oldStatus);
    const newTag = getStatusTag(newStatus);

    const oldDisplay = `${baseOldName}${oldTag}`;
    const newDisplay = `${baseNewName}${newTag}`;

    const oldColor = getPlayerStatusColor(oldStatus);
    const newColor = getPlayerStatusColor(newStatus);

    const titleText = isRename
      ? `Player renamed: ${oldDisplay} ➜ ${newDisplay}`
      : `${defaultName}: ${formatStatus(oldStatus)} ➜ ${formatStatus(newStatus)}`;

    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
        title={titleText}
      >
        <strong style={{ color: oldColor, transition: 'color 0.2s ease' }}>{oldDisplay}</strong>
        <span style={{ color: '#00f2ff', opacity: 0.8, fontSize: '11px' }}>➜</span>
        <strong style={{ color: newColor, transition: 'color 0.2s ease' }}>{newDisplay}</strong>
      </div>
    );
  }

  // Case 2: All other events -> Single name with current colored status and tag
  const currentStatus =
    evt.current_player_status ||
    newState?.playerStatus ||
    newState?.player_status ||
    oldState?.playerStatus ||
    oldState?.player_status ||
    null;

  const baseName = cleanName(defaultName);
  const tag = getStatusTag(currentStatus);
  const displayName = `${baseName}${tag}`;
  const playerColor = getPlayerStatusColor(currentStatus);

  return (
    <strong
      style={{ color: playerColor, transition: 'color 0.2s ease' }}
      title={currentStatus ? `Status: ${formatStatus(currentStatus)}` : 'Active'}
    >
      {displayName}
    </strong>
  );
};

export interface FeedEventTypeOption {
  id: string;
  label: string;
  tagClass: 'blue' | 'green' | 'amber' | 'purple' | 'cyan' | 'red' | 'pink';
  color: string;
}

export const UNIVERSE_FEED_EVENT_TYPES: FeedEventTypeOption[] = [
  { id: 'status_changed', label: 'Status Changed', tagClass: 'blue', color: '#60a5fa' },
  { id: 'colonized', label: 'Colonized', tagClass: 'green', color: '#4ade80' },
  { id: 'abandoned', label: 'Left Planet', tagClass: 'amber', color: '#fbbf24' },
  { id: 'moon_spawned', label: 'Moon Spawned', tagClass: 'cyan', color: '#00f2ff' },
  { id: 'moon_destroyed', label: 'Moon Destroyed', tagClass: 'red', color: '#f87171' },
  { id: 'player_renamed', label: 'Player Renamed', tagClass: 'pink', color: '#f472b6' },
];

const ALL_EVENT_TYPE_IDS = UNIVERSE_FEED_EVENT_TYPES.map(t => t.id);

interface DiscordShareButtonProps {
  glyphCode?: string | null;
  allianceTag?: string | null;
  allianceName?: string | null;
}

const DiscordShareButton: React.FC<DiscordShareButtonProps> = ({ glyphCode, allianceTag, allianceName }) => {
  const [copied, setCopied] = useState(false);

  const discordIconUrl = typeof chrome !== 'undefined' && chrome?.runtime?.getURL
    ? chrome.runtime.getURL('icons/overwatch/discord-white-icon.svg')
    : '/icons/overwatch/discord-white-icon.svg';

  const handleCopy = () => {
    if (!glyphCode) return;
    const text = `🛰️ **Nexus Overwatch Active for [${allianceTag || 'Alliance'}]**\nConnect in OGame Nexus Dashboard > Overwatch:\n🔑 **Alliance Glyph:** \`${glyphCode}\``;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="ow-discord-wrapper">
      <button
        type="button"
        className={`ow-btn-discord ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        aria-label="Share Alliance Glyph to Discord"
      >
        <img src={discordIconUrl} alt="Discord" className="ow-discord-icon-img" />
        {copied ? (
          <span className="ow-discord-copied-text">Copied ✓</span>
        ) : null}
      </button>

      {/* Styled Hover Overlay Popover */}
      <div className="ow-discord-popover" role="tooltip">
        <div className="ow-popover-header">
          <div className="ow-popover-title">
            <img src={discordIconUrl} alt="" style={{ width: 14, height: 14 }} />
            <span>Discord Dispatch</span>
          </div>
          <span className={`ow-popover-badge ${copied ? 'copied' : ''}`}>
            {copied ? 'Copied to Clipboard ✓' : 'Click to Copy'}
          </span>
        </div>

        <div className="ow-popover-body">
          Clicking copies an automated squad recruitment broadcast with your <strong>Alliance Glyph Key</strong> to the clipboard.
        </div>

        <div className="ow-popover-steps">
          <div className="ow-popover-step">
            <span className="ow-popover-step-num">1</span>
            <span>Click Discord icon to copy dispatch announcement.</span>
          </div>
          <div className="ow-popover-step">
            <span className="ow-popover-step-num">2</span>
            <span>Paste snippet into your squad's Discord channel.</span>
          </div>
          <div className="ow-popover-step">
            <span className="ow-popover-step-num">3</span>
            <span>Squadmates paste this Glyph in <em>Nexus Overwatch</em> to join live Overwatch.</span>
          </div>
        </div>

        <div className={`ow-popover-footer ${copied ? 'copied' : ''}`}>
          {copied ? (
            <span><strong>✓ Ready to paste into Discord!</strong></span>
          ) : (
            <span>⚡ <strong>Click icon</strong> to copy dispatch snippet</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Overwatch: React.FC<OverwatchProps> = ({ onSelect }) => {
  const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
  const ownPlanets = useLiveQuery(() => db.planets.toArray()) || [];

  // Closed Testing Whitelist & Passkey State
  const [, setTesterSyncTick] = useState(0);
  const [isCheckingRemoteTester, setIsCheckingRemoteTester] = useState(false);
  const [passkeyUnlocked, setPasskeyUnlocked] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexus_overwatch_tester_unlocked');
    } catch {
      return null;
    }
  });
  const [testerPasskeyInput, setTesterPasskeyInput] = useState('');
  const [testerPasskeyError, setTesterPasskeyError] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setPasskeyUnlocked(localStorage.getItem('nexus_overwatch_tester_unlocked'));
      } catch { }
      setTesterSyncTick(t => t + 1);
    };
    window.addEventListener('nexus_overwatch_tester_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nexus_overwatch_tester_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (activeAccount?.playerId) {
      syncOverwatchTesterStatusWithCloudflare(activeAccount.playerId, activeAccount.universe);
    }
  }, [activeAccount?.playerId, activeAccount?.universe]);

  const isTester = isOverwatchTester(activeAccount, passkeyUnlocked);

  const handleUnlockTesterPasskey = (e: React.FormEvent) => {
    e.preventDefault();
    setTesterPasskeyError(null);
    const entered = testerPasskeyInput.trim();
    if (!entered) return;
    if (entered.toUpperCase() === OVERWATCH_TESTER_PASSKEY.toUpperCase()) {
      try {
        localStorage.setItem('nexus_overwatch_tester_unlocked', entered.toUpperCase());
      } catch { }
      setPasskeyUnlocked(entered.toUpperCase());
      setTesterPasskeyInput('');
      window.dispatchEvent(new Event('nexus_overwatch_tester_updated'));
    } else {
      setTesterPasskeyError('Invalid passkey. Request access credentials from your Alliance Commander.');
    }
  };

  const [config, setConfig] = useState<AllianceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  type TacticalPillar = 'intel' | 'cartography' | 'empire' | 'command' | 'setup' | 'vault' | 'tools';
  const [activeTab, setActiveTab] = useState<'intel' | 'map' | 'empire' | 'my-empire' | 'spy-vault' | 'heatmap' | 'access' | 'settings' | 'features' | 'personal-vault' | 'inactive-scout'>('intel');
  const [activePillar, setActivePillar] = useState<TacticalPillar>('intel');
  const [resolvedApiUrl, setResolvedApiUrl] = useState<string>(DEFAULT_OVERWATCH_API_URL);

  useEffect(() => {
    getOverwatchApiUrl().then(url => setResolvedApiUrl(url));
  }, [config.customApiUrl]);

  // Fallback redirect if spy-vault is active while disabled
  useEffect(() => {
    if ((activeTab as string) === 'spy-vault') {
      setActiveTab('intel');
    }
  }, [activeTab]);

  // Permissions Matrix & Access Control state
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<'member' | 'visitor', RolePermissions>>(DEFAULT_PERMISSIONS_MATRIX);
  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [activeRoster, setActiveRoster] = useState<Array<{ playerId: string; playerName: string; role: 'admin' | 'member' | 'visitor'; tag?: string; joinedAt: number }>>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsSaveSuccess, setPermissionsSaveSuccess] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Universe Map Navigation
  const [selectedGalaxy, setSelectedGalaxy] = useState(5);
  const [selectedSystem, setSelectedSystem] = useState(27);
  const [systemInputStr, setSystemInputStr] = useState('27');
  const [debouncedSystem, setDebouncedSystem] = useState(27);
  const [systemSlots, setSystemSlots] = useState<any[]>([]);
  const [isLoadingSystem, setIsLoadingSystem] = useState(false);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);

  // Synchronize input text with selectedSystem when changed from slider or step buttons
  useEffect(() => {
    setSystemInputStr(String(selectedSystem));
  }, [selectedSystem]);

  // Debounce slider updates to eliminate jitter while dragging
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSystem(selectedSystem);
    }, 100);
    return () => clearTimeout(handler);
  }, [selectedSystem]);

  // Primary dynamic tab state ('overwatch' | 'create' | 'join' | 'features')
  const [primaryTab, setPrimaryTab] = useState<'overwatch' | 'create' | 'join' | 'features'>('overwatch');
  const [detectedAlliance, setDetectedAlliance] = useState<DetectedAlliance | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showCustomJoin, setShowCustomJoin] = useState(false);

  // Join form state
  const [joinGlyph, setJoinGlyph] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Deploy form state
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [copied, setCopied] = useState(false);

  // Real applicant clearance state
  const [applicantClearance, setApplicantClearance] = useState<'idle' | 'pending' | 'approved' | 'denied'>('idle');
  const [pendingAllianceInfo, setPendingAllianceInfo] = useState<{ allianceName?: string; allianceTag?: string } | null>(null);

  const effectiveAccount = activeAccount;
  const effectivePlayerStatus = 'Active';
  const effectiveConfig = config;
  const displayRoster = activeRoster;
  const effectiveApplicantClearance = applicantClearance;

  const userRole = (effectiveConfig.role || 'member') as 'admin' | 'member' | 'visitor';
  const isAdmin = userRole === 'admin';
  const effectivePermissions: RolePermissions = useMemo(() => {
    if (isAdmin) {
      return {
        viewGalaxyScrapes: true,
        contributeGalaxyScrapes: true,
        viewSpyVault: true,
        uploadSpyReports: true,
        viewHeatmaps: true,
        claimRaidLocks: true,
        inviteMembers: true,
        viewEmpire: true,
        shareEmpire: true,
      };
    }
    const roleKey = (userRole === 'visitor' ? 'visitor' : 'member') as 'member' | 'visitor';
    return permissionsMatrix[roleKey] || DEFAULT_PERMISSIONS_MATRIX[roleKey];
  }, [isAdmin, userRole, permissionsMatrix]);

  // If a non-admin is currently on the admin-only 'access' tab, fallback to 'intel'
  useEffect(() => {
    if (!isAdmin && activeTab === 'access') {
      setActiveTab('intel');
    }
  }, [isAdmin, activeTab]);

  const activeProfileInfo = useMemo(() => {
    const role = (config.role || 'member').toUpperCase();
    const color = role === 'ADMIN' ? '#fbbf24' : role === 'VISITOR' ? '#a78bfa' : '#00f2ff';
    return {
      name: activeAccount?.playerName || 'Commander',
      role,
      color,
    };
  }, [activeAccount?.playerName, config.role]);

  const activeUniverse = cleanUniverseId(effectiveAccount?.universe || 's267-en');
  const activeUniverseName = effectiveAccount?.universeName && effectiveAccount.universeName !== 'unknown'
    ? effectiveAccount.universeName
    : activeUniverse;

  const activeAllyTag = effectiveAccount?.allianceTag || '';
  const activeAllyName = effectiveAccount?.allianceName || activeAllyTag;
  const activeAllyId = effectiveAccount?.allianceId || '500078';

  const isJoined = Boolean(effectiveConfig.allianceId);
  const overwatchTabName = useMemo(() => {
    const name = effectiveConfig.allianceName || effectiveConfig.allianceTag || activeAllyName || 'Alliance';
    return `${name} Overwatch`;
  }, [effectiveConfig.allianceName, effectiveConfig.allianceTag, activeAllyName]);

  const activePrimaryTab = useMemo<'overwatch' | 'create' | 'join' | 'features'>(() => {
    if (primaryTab === 'features') return 'features';
    if (primaryTab === 'create') return 'create';
    if (primaryTab === 'join') return 'join';
    if (isJoined || activeTab === 'personal-vault' || activeTab === 'inactive-scout') return 'overwatch';
    return 'join';
  }, [primaryTab, isJoined, activeTab]);

  // Synchronize activePillar whenever activeTab or primaryTab changes
  useEffect(() => {
    if (primaryTab === 'create' || primaryTab === 'join') {
      setActivePillar('setup');
    } else if (activeTab === 'personal-vault') {
      setActivePillar('vault');
    } else if (activeTab === 'intel' || activeTab === 'map' || activeTab === 'heatmap' || activeTab === 'spy-vault' || activeTab === 'inactive-scout') {
      setActivePillar('intel');
    } else if (activeTab === 'empire' || activeTab === 'my-empire') {
      setActivePillar('empire');
    } else if (activeTab === 'access' || activeTab === 'settings' || activeTab === 'features') {
      setActivePillar('command');
    }
  }, [activeTab, primaryTab]);

  const handlePillarClick = (pillar: TacticalPillar) => {
    setActivePillar(pillar);
    if (pillar === 'setup') {
      if (primaryTab !== 'create' && primaryTab !== 'join') {
        setPrimaryTab(isJoined ? 'join' : 'create');
      }
    } else if (pillar === 'vault') {
      setPrimaryTab('overwatch');
      setActiveTab('personal-vault');
    } else {
      setPrimaryTab('overwatch');
      if (pillar === 'intel') {
        if (activeTab !== 'intel' && activeTab !== 'map' && activeTab !== 'heatmap' && activeTab !== 'inactive-scout') {
          setActiveTab('intel');
        }
      } else if (pillar === 'cartography') {
        setActiveTab('map');
      } else if (pillar === 'empire') {
        setActiveTab('empire');
      } else if (pillar === 'command') {
        if (isAdmin && activeTab !== 'access' && activeTab !== 'settings' && activeTab !== 'features') {
          setActiveTab('access');
        } else if (!isAdmin && activeTab !== 'settings' && activeTab !== 'features') {
          setActiveTab('settings');
        }
      }
    }
  };

  // Sync default display name from in-game alliance name
  useEffect(() => {
    if (activeAllyName && !createDisplayName) {
      setCreateDisplayName(activeAllyName);
    }
  }, [activeAllyName]);

  // Detect active alliance network on Cloudflare Edge
  const detectAllianceNetwork = useCallback(async () => {
    if (!activeUniverse) return;
    setIsDetecting(true);
    try {
      const apiUrl = await getOverwatchApiUrl();
      const params = new URLSearchParams({
        universeId: activeUniverse,
        ogameAllianceId: activeAllyId || '',
        allianceTag: activeAllyTag || '',
        playerId: effectiveAccount?.playerId || '',
      });
      const res = await fetch(`${apiUrl}/api/v1/alliances/detect?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDetectedAlliance(data);
      }
    } catch (err) {
      console.warn('Failed to detect alliance network:', err);
    } finally {
      setIsDetecting(false);
    }
  }, [effectiveAccount?.playerId, activeUniverse, activeAllyId, activeAllyTag]);

  useEffect(() => {
    if (!effectiveConfig.allianceId && activeUniverse) {
      detectAllianceNetwork();
    }
  }, [effectiveConfig.allianceId, activeUniverse, detectAllianceNetwork]);

  const [events, setEvents] = useState<any[]>([]);
  const [eventsPage, setEventsPage] = useState<number>(1);
  const [eventsPageSize, setEventsPageSize] = useState<number>(25);
  const [eventsTotal, setEventsTotal] = useState<number>(0);
  const [eventsTotalPages, setEventsTotalPages] = useState<number>(1);
  const [eventsUnseenCount, setEventsUnseenCount] = useState<number>(0);

  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_overwatch_feed_event_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id: string) => ALL_EVENT_TYPE_IDS.includes(id));
          if (valid.length !== parsed.length) {
            try {
              localStorage.setItem('nexus_overwatch_feed_event_filters', JSON.stringify(valid));
            } catch (e) { }
          }
          return valid;
        }
      }
    } catch (e) { }
    return ALL_EVENT_TYPE_IDS;
  });

  const handleToggleEventType = useCallback((typeId: string) => {
    setSelectedEventTypes(prev => {
      const next = prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId];
      try {
        localStorage.setItem('nexus_overwatch_feed_event_filters', JSON.stringify(next));
      } catch (e) { }
      return next;
    });
    setEventsPage(1);
    setEventsUnseenCount(0);
  }, []);

  const handleSelectAllEventTypes = useCallback(() => {
    setSelectedEventTypes(ALL_EVENT_TYPE_IDS);
    try {
      localStorage.setItem('nexus_overwatch_feed_event_filters', JSON.stringify(ALL_EVENT_TYPE_IDS));
    } catch (e) { }
    setEventsPage(1);
    setEventsUnseenCount(0);
  }, []);

  const handleClearAllEventTypes = useCallback(() => {
    setSelectedEventTypes([]);
    try {
      localStorage.setItem('nexus_overwatch_feed_event_filters', JSON.stringify([]));
    } catch (e) { }
    setEventsPage(1);
    setEventsUnseenCount(0);
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedEventTypes.length === 0) return [];
    if (selectedEventTypes.length === ALL_EVENT_TYPE_IDS.length) return events;
    return events.filter(e => selectedEventTypes.includes(e.event_type));
  }, [events, selectedEventTypes]);
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
    universeXmlTimestamp?: number | null;
    nextUniverseXmlAt?: number | null;
    playersXmlTimestamp?: number | null;
    nextPlayersXmlAt?: number | null;
  } | null>(null);

  // Heatmap Player Autocomplete & Activity States
  const [heatmapPlayerQuery, setHeatmapPlayerQuery] = useState<string>('Target Player');
  const [playerSuggestions, setPlayerSuggestions] = useState<
    Array<{
      playerId: string;
      playerName: string;
      playerStatus?: string | null;
      allianceTag?: string | null;
    }>
  >([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [selectedHeatmapPlayer, setSelectedHeatmapPlayer] = useState<{
    playerId: string;
    playerName: string;
    playerStatus?: string | null;
    allianceTag?: string | null;
    serverHeatmap?: any[];
  }>({
    playerId: '',
    playerName: 'Target Player',
    playerStatus: null,
    allianceTag: 'VIPER',
    serverHeatmap: [],
  });

  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowPlayerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchPlayers = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 3) {
        setPlayerSuggestions([]);
        setShowPlayerSuggestions(false);
        return;
      }

      setIsSearchingPlayers(true);
      const qLower = q.toLowerCase();

      // 1. Gather local players (events, Dexie spiedPlanets)
      const localMatches: Array<{
        playerId: string;
        playerName: string;
        playerStatus?: string | null;
        allianceTag?: string | null;
      }> = [];

      if (events && Array.isArray(events)) {
        events.forEach((ev: any) => {
          if (ev.playerName && ev.playerName.toLowerCase().includes(qLower)) {
            localMatches.push({
              playerId: String(ev.playerId || ''),
              playerName: ev.playerName,
              playerStatus: ev.playerStatus || null,
              allianceTag: ev.allianceTag || null,
            });
          }
        });
      }

      try {
        if (db?.spiedPlanets) {
          const spied = await db.spiedPlanets.toArray();
          spied.forEach((sp: any) => {
            if (sp.playerName && sp.playerName.toLowerCase().includes(qLower)) {
              localMatches.push({
                playerId: String(sp.playerId || ''),
                playerName: sp.playerName,
                playerStatus: sp.playerStatus || null,
                allianceTag: sp.allianceTag || null,
              });
            }
          });
        }
      } catch {
        // Ignore Dexie access error if unseeded
      }

      // 2. Fetch from Cloudflare Edge API
      let apiMatches: any[] = [];
      try {
        const apiUrl = await getOverwatchApiUrl();
        const headers: Record<string, string> = {};
        if (effectiveConfig.authToken) {
          headers['Authorization'] = `Bearer ${effectiveConfig.authToken}`;
        }
        const res = await fetch(
          `${apiUrl}/api/v1/players/search?universeId=${encodeURIComponent(activeUniverse)}&q=${encodeURIComponent(q)}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.players)) {
            apiMatches = data.players;
          }
        }
      } catch (err) {
        console.warn('Overwatch player search API offline or unavailable:', err);
      }

      // 3. Deduplicate by lower-case playerName
      const seen = new Set<string>();
      const combined: Array<{
        playerId: string;
        playerName: string;
        playerStatus?: string | null;
        allianceTag?: string | null;
      }> = [];

      apiMatches.forEach(p => {
        const lower = p.playerName.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          combined.push(p);
        }
      });

      localMatches.forEach(p => {
        const lower = p.playerName.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          combined.push(p);
        }
      });

      setPlayerSuggestions(combined);
      setShowPlayerSuggestions(true);
      setFocusedSuggestionIndex(-1);
      setIsSearchingPlayers(false);
    },
    [activeUniverse, effectiveConfig.authToken, events]
  );

  const handleHeatmapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeatmapPlayerQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPlayers(val);
      }, 150);
    } else {
      setPlayerSuggestions([]);
      setShowPlayerSuggestions(false);
    }
  };

  const highlightPlayerMatch = (name: string, query: string) => {
    if (!query || !query.trim()) return <span>{name}</span>;
    const trimmed = query.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const splitRegex = new RegExp(`(${escaped})`, 'gi');
    const matchRegex = new RegExp(`^${escaped}$`, 'i');
    const parts = name.split(splitRegex);
    return (
      <span>
        {parts.map((part, index) =>
          matchRegex.test(part) ? (
            <strong key={index} className="ow-autocomplete-match">
              {part}
            </strong>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  const analyzePlayerActivity = useCallback(
    async (nameOrId: string, specificPlayerId?: string) => {
      if (!nameOrId || !nameOrId.trim()) return;
      setIsLoadingHeatmap(true);
      setShowPlayerSuggestions(false);

      try {
        const apiUrl = await getOverwatchApiUrl();
        const headers: Record<string, string> = {};
        if (effectiveConfig.authToken) {
          headers['Authorization'] = `Bearer ${effectiveConfig.authToken}`;
        }
        const targetId = specificPlayerId || nameOrId.trim();
        const res = await fetch(
          `${apiUrl}/api/v1/players/${encodeURIComponent(targetId)}/activity?universeId=${encodeURIComponent(activeUniverse)}&name=${encodeURIComponent(nameOrId.trim())}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            setSelectedHeatmapPlayer({
              playerId: data.playerId,
              playerName: data.playerName || nameOrId,
              playerStatus: data.playerStatus,
              allianceTag: data.allianceTag,
              serverHeatmap: data.heatmap || [],
            });
            setHeatmapPlayerQuery(data.playerName || nameOrId);
            setIsLoadingHeatmap(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Overwatch player activity fetch failed:', err);
      }

      setSelectedHeatmapPlayer({
        playerId: specificPlayerId || '99201',
        playerName: nameOrId,
        playerStatus: null,
        allianceTag: null,
        serverHeatmap: [],
      });
      setHeatmapPlayerQuery(nameOrId);
      setIsLoadingHeatmap(false);
    },
    [activeUniverse, effectiveConfig.authToken]
  );

  const selectPlayerSuggestion = (player: {
    playerId: string;
    playerName: string;
    playerStatus?: string | null;
    allianceTag?: string | null;
  }) => {
    setHeatmapPlayerQuery(player.playerName);
    setShowPlayerSuggestions(false);
    setSelectedHeatmapPlayer(player);
    analyzePlayerActivity(player.playerName, player.playerId);
  };

  const handleHeatmapInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showPlayerSuggestions && playerSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev < playerSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev > 0 ? prev - 1 : playerSuggestions.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < playerSuggestions.length) {
          const sel = playerSuggestions[focusedSuggestionIndex];
          selectPlayerSuggestion(sel);
        } else {
          analyzePlayerActivity(heatmapPlayerQuery);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowPlayerSuggestions(false);
        return;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      analyzePlayerActivity(heatmapPlayerQuery);
    }
  };

  // Live Edge connection states
  const [edgeStatus, setEdgeStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [edgeLatency, setEdgeLatency] = useState<number | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [activeApiUrl, setActiveApiUrl] = useState<string>(DEFAULT_OVERWATCH_API_URL);
  const [systemFetchError, setSystemFetchError] = useState<string | null>(null);

  const pingOverwatchEdge = useCallback(async (urlOverride?: string) => {
    setEdgeStatus('checking');
    const url = urlOverride || (await getOverwatchApiUrl());
    setActiveApiUrl(url);
    const health = await checkOverwatchHealth(url);
    if (health.online) {
      setEdgeStatus('online');
      setEdgeLatency(health.latencyMs);
      setEdgeError(null);
    } else {
      setEdgeStatus('offline');
      setEdgeLatency(null);
      setEdgeError(health.error || 'Network unreachable');
    }
    return health.online;
  }, []);

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
    pingOverwatchEdge();
  }, [pingOverwatchEdge]);

  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchLiveEvents = useCallback(async (targetPage = eventsPage, targetSize = eventsPageSize) => {
    if (selectedEventTypes.length === 0) {
      setEvents([]);
      setEventsTotal(0);
      setEventsTotalPages(1);
      setEventsUnseenCount(0);
      setIsLoadingEvents(false);
      return;
    }

    setIsLoadingEvents(true);
    const apiUrl = await getOverwatchApiUrl();
    setActiveApiUrl(apiUrl);
    const headers: Record<string, string> = {};
    if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

    const typesParam = selectedEventTypes.length < ALL_EVENT_TYPE_IDS.length
      ? `&types=${encodeURIComponent(selectedEventTypes.join(','))}`
      : '';

    fetch(`${apiUrl}/api/v1/galaxy/events?universeId=${activeUniverse}&page=${targetPage}&limit=${targetSize}${typesParam}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.events)) {
          setEvents(data.events);
          if (data.pagination) {
            setEventsTotal(data.pagination.total);
            setEventsTotalPages(data.pagination.totalPages);
          }
          if (targetPage === 1) {
            setEventsUnseenCount(0);
          }
          setEdgeStatus('online');
        }
      })
      .catch(() => { })
      .finally(() => setIsLoadingEvents(false));
  }, [config.authToken, activeUniverse, eventsPage, eventsPageSize, selectedEventTypes]);

  useEffect(() => {
    fetchLiveEvents(eventsPage, eventsPageSize);
  }, [eventsPage, eventsPageSize, activeUniverse, selectedEventTypes]);

  // Fetch universe status and live events
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      const apiUrl = await getOverwatchApiUrl();
      if (isCancelled) return;
      setActiveApiUrl(apiUrl);

      // 1. Fetch Universe Stats
      fetch(`${apiUrl}/api/v1/universe/${activeUniverse}/status`)
        .then(res => res.json())
        .then(data => {
          if (isCancelled) return;
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
              universeXmlTimestamp: data.universeXmlTimestamp,
              nextUniverseXmlAt: data.nextUniverseXmlAt,
              playersXmlTimestamp: data.playersXmlTimestamp,
              nextPlayersXmlAt: data.nextPlayersXmlAt,
            });
            setEdgeStatus('online');
            setEdgeError(null);
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          setEdgeStatus('offline');
          setEdgeError(err?.message || 'Connection refused');
        });

      // 2. Fetch Live Galaxy Events
      fetchLiveEvents(eventsPage, eventsPageSize);
    })();

    // 3. Setup real-time polling interval for live galaxy events (15s)
    // Only auto-poll if user is on page 1 (Live Feed); otherwise pause so user's history doesn't shift
    const eventInterval = setInterval(() => {
      if (!isCancelled && !document.hidden && activeTab === 'intel') {
        if (selectedEventTypes.length === 0) return;
        if (eventsPage === 1) {
          fetchLiveEvents(1, eventsPageSize);
        } else {
          getOverwatchApiUrl().then(apiUrl => {
            const headers: Record<string, string> = {};
            if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;
            const typesParam = selectedEventTypes.length < ALL_EVENT_TYPE_IDS.length
              ? `&types=${encodeURIComponent(selectedEventTypes.join(','))}`
              : '';
            fetch(`${apiUrl}/api/v1/galaxy/events?universeId=${activeUniverse}&page=1&limit=1${typesParam}`, { headers })
              .then(r => r.json())
              .then(d => {
                if (d && d.pagination && d.pagination.total > eventsTotal) {
                  setEventsUnseenCount(d.pagination.total - eventsTotal);
                }
              })
              .catch(() => { });
          });
        }
      }
    }, 15000);

    return () => {
      isCancelled = true;
      clearInterval(eventInterval);
    };
  }, [config.authToken, activeUniverse, activeTab, fetchLiveEvents, eventsPage, eventsPageSize, eventsTotal, selectedEventTypes]);

  // Fetch pending clearance requests, roster, and permissions
  useEffect(() => {
    if (!config.allianceId || !config.authToken) return;
    let isCancelled = false;
    (async () => {
      try {
        const apiUrl = await getOverwatchApiUrl();
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${config.authToken}`,
        };

        // 1. Fetch pending requests (admin only)
        if (config.role === 'admin') {
          fetch(`${apiUrl}/api/v1/alliances/requests?allianceId=${config.allianceId}`, { headers })
            .then(res => res.json())
            .then(data => {
              if (!isCancelled && data && data.success && Array.isArray(data.requests)) {
                setPendingRequests(data.requests);
              }
            })
            .catch(() => { });
        }

        // 2. Fetch roster (admin and members)
        fetch(`${apiUrl}/api/v1/alliances/roster?allianceId=${config.allianceId}`, { headers })
          .then(res => res.json())
          .then(data => {
            if (!isCancelled && data && data.success && Array.isArray(data.roster)) {
              const normalizedRoster = data.roster.map((m: any) => ({
                playerId: String(m.playerId || m.player_id || ''),
                playerName: m.playerName || m.player_name || (m.role === 'admin' ? (detectedAlliance?.adminPlayerName || activeAccount?.playerName || 'Founder') : 'Squadmate'),
                role: (m.role || 'member') as 'admin' | 'member' | 'visitor',
                tag: m.tag || m.alliance_tag || effectiveConfig.allianceTag,
                joinedAt: m.joinedAt || m.joined_at || m.lastSyncAt || m.last_sync_at || Date.now(),
              }));
              setActiveRoster(normalizedRoster);
            }
          })
          .catch(() => { });

        // 3. Fetch permissions matrix
        fetch(`${apiUrl}/api/v1/alliances/permissions?allianceId=${config.allianceId}`, { headers })
          .then(res => res.json())
          .then(data => {
            if (!isCancelled && data && data.success && data.permissions) {
              setPermissionsMatrix(data.permissions);
            }
          })
          .catch(() => { });
      } catch (err) {
        console.warn('Failed to load access controls:', err);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [config.allianceId, config.role, config.authToken, effectiveConfig.allianceTag, detectedAlliance?.adminPlayerName, activeAccount?.playerName]);

  // Handle system change with debouncing to prevent spamming
  const handleSystemChange = (g: number, s: number) => {
    setSelectedGalaxy(g);
    setSelectedSystem(s);
  };

  const handleGalaxyChange = (g: number) => {
    setSelectedGalaxy(g);
  };

  // Fetch system data from Edge Cloudflare Worker API with 4s timeout
  const fetchSystemData = useCallback(async (g: number, s: number) => {
    setIsLoadingSystem(true);
    setSystemFetchError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const apiUrl = await getOverwatchApiUrl();
      setActiveApiUrl(apiUrl);
      const headers: Record<string, string> = {};
      if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

      const res = await fetch(`${apiUrl}/api/v1/galaxy/system?universeId=${activeUniverse}&galaxy=${g}&system=${s}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data && data.success && Array.isArray(data.slots)) {
        setSystemSlots(data.slots);
        setEdgeStatus('online');
        setEdgeError(null);
      } else {
        throw new Error(data?.error || 'Invalid slot payload');
      }
    } catch (err: any) {
      const errMsg = err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Connection refused');
      setSystemFetchError(errMsg);
      setEdgeStatus('offline');
      setEdgeError(errMsg);
    } finally {
      setIsLoadingSystem(false);
    }
  }, [config.authToken, activeUniverse]);

  const handleJumpToCoordinates = useCallback((galaxy: number | string, system: number | string, slot?: number | string) => {
    const validG = parseInt(String(galaxy), 10);
    const validS = parseInt(String(system), 10);
    const validSlot = slot ? parseInt(String(slot), 10) : null;

    if (!isNaN(validG) && validG >= 1) {
      setSelectedGalaxy(validG);
    }
    if (!isNaN(validS) && validS >= 1) {
      setSelectedSystem(validS);
      setDebouncedSystem(validS);
      setSystemInputStr(String(validS));
      if (!isNaN(validG) && validG >= 1) {
        fetchSystemData(validG, validS);
      }
    }
    if (validSlot && !isNaN(validSlot)) {
      setHighlightedSlot(validSlot);
      setTimeout(() => {
        setHighlightedSlot(null);
      }, 4500);
    }
    setPrimaryTab('overwatch');
    setActiveTab('map');
    setActivePillar('intel');
  }, [fetchSystemData]);

  // Fetch Universe System Slots for Map Tab (with auto-polling)
  useEffect(() => {
    if (activeTab === 'map') {
      fetchSystemData(selectedGalaxy, debouncedSystem);

      const mapInterval = setInterval(() => {
        if (!document.hidden) {
          fetchSystemData(selectedGalaxy, debouncedSystem);
        }
      }, 30000);

      return () => clearInterval(mapInterval);
    }
  }, [activeTab, selectedGalaxy, debouncedSystem, fetchSystemData]);

  const [isResyncingXML, setIsResyncingXML] = useState(false);
  const [isOverwritingXML, setIsOverwritingXML] = useState(false);
  const [resyncSuccessMsg, setResyncSuccessMsg] = useState<string | null>(null);

  // Format remaining time until next Gameforge dump
  const getRemainingTimeStr = (targetMs?: number | null) => {
    if (!targetMs) return null;
    const diffSec = Math.floor((targetMs - Date.now()) / 1000);
    if (diffSec <= 0) return 'Ready now';
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const handleResyncUniverseXML = async (force: boolean = false, isDebugOverwrite: boolean = false) => {
    if (isResyncingXML || isOverwritingXML) return;
    if (isDebugOverwrite) {
      setIsOverwritingXML(true);
    } else {
      setIsResyncingXML(true);
    }
    setResyncSuccessMsg(null);
    const apiUrl = await getOverwatchApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/v1/universe/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universeId: activeUniverse, force: force || isDebugOverwrite, overwrite: isDebugOverwrite }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (data.cached) {
          setResyncSuccessMsg(
            `ℹ Cache active: ${data.message || 'Gameforge universe.xml updates weekly on-demand.'}`
          );
        } else if (data.stats) {
          const eventsStr = data.stats.eventsCount !== undefined ? `, ${data.stats.eventsCount} delta events` : '';
          setResyncSuccessMsg(
            `✓ ${isDebugOverwrite ? 'Overwritten' : 'Updated'} (${data.stats.planetsCount.toLocaleString()} planets, ${data.stats.moonsCount.toLocaleString()} moons${eventsStr})`
          );
        } else {
          setResyncSuccessMsg(`✓ Universe sync completed`);
        }
        // Refresh current system view
        fetchSystemData(selectedGalaxy, selectedSystem);
        // Refresh live feed
        fetchLiveEvents();
        // Refresh universe status
        fetch(`${apiUrl}/api/v1/universe/${activeUniverse}/status`)
          .then(r => r.json())
          .then(st => {
            if (st && st.success) {
              setUniverseStats({
                totalPlanets: st.totalPlanets,
                totalMoons: st.totalMoons,
                isSeeded: st.isSeeded,
                serverName: st.serverName,
                galaxies: st.galaxies,
                systems: st.systems,
                speed: st.speed,
                speedFleet: st.speedFleet,
                debrisFactor: st.debrisFactor,
                universeXmlTimestamp: st.universeXmlTimestamp,
                nextUniverseXmlAt: st.nextUniverseXmlAt,
                playersXmlTimestamp: st.playersXmlTimestamp,
                nextPlayersXmlAt: st.nextPlayersXmlAt,
              });
            }
          })
          .catch(() => { });
        setTimeout(() => {
          setResyncSuccessMsg(null);
        }, 8000);
      } else {
        setEdgeStatus('offline');
        setEdgeError(data?.error || 'Failed to seed universe');
      }
    } catch (err: any) {
      setEdgeStatus('offline');
      setEdgeError(err?.message || 'Sync failed');
    } finally {
      setIsResyncingXML(false);
      setIsOverwritingXML(false);
    }
  };

  const handleRefreshSystem = () => {
    fetchSystemData(selectedGalaxy, selectedSystem);
  };

  // Auto-sync universe XML silently in the background as soon as fresh Gameforge dump is ready
  useEffect(() => {
    if (universeStats?.nextUniverseXmlAt && Date.now() >= universeStats.nextUniverseXmlAt && !isResyncingXML && !isOverwritingXML) {
      handleResyncUniverseXML(false, false);
    }
  }, [universeStats?.nextUniverseXmlAt]);

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

  // 0. Resume Founder Action (1-Click)
  const handleResumeFounder = async () => {
    const allyId = detectedAlliance?.allianceId;
    if (!allyId) return;
    setIsReconnecting(true);
    setJoinError(null);
    try {
      const apiUrl = await getOverwatchApiUrl();
      const pId = String(activeAccount?.playerId || '');
      const vaultKey = await getStoredVaultKey(activeUniverse, pId).catch(() => '');
      const res = await fetch(`${apiUrl}/api/v1/alliances/reconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}),
          ...(vaultKey ? { 'X-Nexus-Vault-Key': vaultKey } : {}),
        },
        body: JSON.stringify({
          universeId: activeUniverse,
          allianceId: allyId,
          playerId: pId,
          playerName: activeAccount?.playerName || 'Commander',
          vaultKey: vaultKey || undefined,
          glyphCode: config.glyphCode || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated: AllianceConfig = {
          ...config,
          allianceId: data.allianceId,
          ogameAllianceId: detectedAlliance?.ogameAllianceId || activeAllyId,
          allianceName: data.allianceName,
          allianceTag: data.allianceTag,
          universeId: data.universeId || activeUniverse,
          glyphCode: data.glyphCode,
          authToken: data.authToken,
          role: 'admin',
          subscriptionExpiresAt: data.expiresAt,
        };
        saveConfig(updated);
      } else {
        setJoinError(data.error || 'Failed to resume commander session.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Network error while reconnecting.');
    } finally {
      setIsReconnecting(false);
    }
  };

  // 1. Join Action (Member)
  const handleJoin = async () => {
    const cleanGlyph = joinGlyph.trim().toUpperCase();

    if (!cleanGlyph) {
      setJoinError('Please enter an Alliance Invite Glyph.');
      return;
    }

    // 1. Validate Glyph format and Crockford-32 checksum
    if (!validateAllianceGlyph(cleanGlyph)) {
      setJoinError('Invalid or malformed Alliance Invite Glyph. Expected NXOW-XXXX-XXXX-XXXX-XXXX with valid checksum.');
      return;
    }

    if (isJoined) {
      setJoinError('You are already connected to an active Overwatch grid. Disconnect before connecting to a different one.');
      return;
    }

    if (detectedAlliance?.exists && (detectedAlliance.isFounder || detectedAlliance.adminPlayerId === effectiveAccount?.playerId)) {
      if (cleanGlyph !== detectedAlliance.glyphCode) {
        setJoinError('You have already created an active Overwatch grid for your alliance. You cannot connect to another network while your own grid is active.');
        return;
      }
    }

    setIsJoining(true);
    setJoinError(null);

    // Call Cloudflare Edge Backend API
    try {
      const apiUrl = await getOverwatchApiUrl();
      const res = await fetch(`${apiUrl}/api/v1/auth/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glyphCode: cleanGlyph,
          playerId: activeAccount?.playerId || '100002',
          playerName: activeAccount?.playerName || 'Commander',
          applicantUniverseId: activeAccount?.universe || activeUniverse,
          permissions: config.permissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinError(data.error || 'Connection refused. Check Glyph key.');
        setIsJoining(false);
        return;
      }

      if (data.status === 'pending') {
        setApplicantClearance('pending');
        setPendingAllianceInfo({
          allianceName: data.allianceName,
          allianceTag: data.allianceTag,
        });
        setStatusNotice(data.message || 'Join request transmitted to Commander. Awaiting clearance.');
        setIsJoining(false);
        return;
      }

      const assignedRole = data.role || (detectedAlliance?.isFounder ? 'admin' : 'member');
      const updated: AllianceConfig = {
        ...config,
        allianceId: data.allianceId,
        ogameAllianceId: activeAllyId,
        allianceName: data.allianceName,
        allianceTag: data.allianceTag,
        universeId: data.universeId || activeUniverse,
        glyphCode: cleanGlyph,
        authToken: data.authToken,
        role: assignedRole,
      };
      saveConfig(updated);
      setApplicantClearance('approved');
      setIsJoining(false);
    } catch (err: any) {
      setJoinError(err?.message || 'Connection refused. Could not connect to Overwatch server.');
      setIsJoining(false);
    }
  };

  // 2. Deploy Action (Admin)
  const handleCreate = async () => {
    if (isJoined) {
      setCreateError('You are already part of an active Overwatch grid. Disconnect before creating a new one.');
      return;
    }

    if (detectedAlliance?.exists && (detectedAlliance.isFounder || detectedAlliance.adminPlayerId === effectiveAccount?.playerId)) {
      setCreateError('You have already created the Overwatch grid for this alliance. Please connect in Join Overwatch.');
      return;
    }

    if (!createDisplayName) {
      setCreateError('Specify an alliance display name.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const apiUrl = await getOverwatchApiUrl();
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
        setPrimaryTab('overwatch');
        setActivePillar('intel');
        setActiveTab('intel');
      } else if (res.status === 409) {
        // Auto-reconnect if already created by this founder
        await handleResumeFounder();
      } else {
        setCreateError(data.error || 'Failed to provision alliance partition.');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to connect to Overwatch Cloudflare backend.');
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

  const handleDisconnect = () => {
    setPrimaryTab('join');
    setApplicantClearance('idle');
    setPendingAllianceInfo(null);
    saveConfig({ ...DEFAULT_CONFIG, universeId: activeUniverse });
  };

  const handleApproveRequest = async (req: JoinRequestItem, assignedRoleOverride?: 'member' | 'visitor') => {
    const roleToAssign = assignedRoleOverride || req.assignedRole || req.suggestedRole || 'member';
    setPendingRequests(prev => prev.filter(r => r.requestId !== req.requestId));
    setActiveRoster(prev => [
      ...prev.filter(m => m.playerId !== req.playerId),
      {
        playerId: req.playerId,
        playerName: req.playerName,
        role: roleToAssign,
        tag: req.allianceTag,
        joinedAt: Date.now(),
      },
    ]);

    if (config.allianceId && req.requestId) {
      try {
        const apiUrl = await getOverwatchApiUrl();
        await fetch(`${apiUrl}/api/v1/alliances/requests/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}),
          },
          body: JSON.stringify({
            allianceId: config.allianceId,
            playerId: req.playerId,
            requestId: req.requestId,
            assignedRole: roleToAssign,
            adminPlayerId: String(activeAccount?.playerId || ''),
          }),
        });
      } catch (err) {
        console.warn('Failed to approve request on edge:', err);
      }
    }
  };

  const handleDenyRequest = async (req: JoinRequestItem) => {
    setPendingRequests(prev => prev.filter(r => r.requestId !== req.requestId));

    if (config.allianceId && req.requestId) {
      try {
        const apiUrl = await getOverwatchApiUrl();
        await fetch(`${apiUrl}/api/v1/alliances/requests/deny`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}),
          },
          body: JSON.stringify({
            allianceId: config.allianceId,
            playerId: req.playerId,
            requestId: req.requestId,
            adminPlayerId: String(activeAccount?.playerId || ''),
          }),
        });
      } catch (err) {
        console.warn('Failed to deny request on edge:', err);
      }
    }
  };

  const handleChangeMemberRole = (playerId: string, newRole: 'member' | 'visitor') => {
    setActiveRoster(prev => prev.map(m => (m.playerId === playerId || (m as any).player_id === playerId) ? { ...m, role: newRole } : m));
  };

  const handleKickMember = (playerId: string) => {
    setActiveRoster(prev => prev.filter(m => m.playerId !== playerId && (m as any).player_id !== playerId));
  };

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    setPermissionsSaveSuccess(false);
    try {
      if (config.allianceId) {
        const apiUrl = await getOverwatchApiUrl();
        await fetch(`${apiUrl}/api/v1/alliances/permissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}),
          },
          body: JSON.stringify({
            allianceId: config.allianceId,
            permissions: permissionsMatrix,
          }),
        });
      }
      setPermissionsSaveSuccess(true);
      setTimeout(() => setPermissionsSaveSuccess(false), 2500);
    } catch {
      setPermissionsSaveSuccess(true);
      setTimeout(() => setPermissionsSaveSuccess(false), 2500);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const updatePerm = (role: 'member' | 'visitor', key: keyof RolePermissions, val: boolean) => {
    setPermissionsMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: val,
      },
    }));
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    setStatusNotice(null);
    try {
      const apiUrl = await getOverwatchApiUrl();
      const pId = activeAccount?.playerId || '';
      const cleanGlyph = joinGlyph.trim().toUpperCase();
      const res = await fetch(`${apiUrl}/api/v1/auth/status?playerId=${encodeURIComponent(pId)}&universeId=${encodeURIComponent(activeUniverse)}&glyph=${encodeURIComponent(cleanGlyph)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'approved' && data.allianceId) {
          const updated: AllianceConfig = {
            ...config,
            allianceId: data.allianceId,
            allianceName: data.allianceName,
            allianceTag: data.allianceTag,
            role: data.role || 'member',
            authToken: data.authToken || config.authToken,
          };
          saveConfig(updated);
          setApplicantClearance('approved');
        } else if (data.status === 'denied') {
          setApplicantClearance('denied');
          setStatusNotice('Access request was declined by the alliance commander.');
        } else if (data.status === 'pending') {
          setApplicantClearance('pending');
          if (data.allianceName || data.allianceTag) {
            setPendingAllianceInfo({
              allianceName: data.allianceName,
              allianceTag: data.allianceTag,
            });
          }
          setStatusNotice('Access request is still awaiting commander authorization.');
        }
      }
    } catch {
      setStatusNotice('Offline mode. Waiting for commander approval.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCancelRequest = () => {
    setStatusNotice(null);
    setApplicantClearance('idle');
    setPendingAllianceInfo(null);
    setJoinGlyph('');
  };

  const renderFeaturesDossier = () => (
    <motion.section
      className="ow-module ow-features-dossier"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={EASE_TRANSITION}
    >
      <div className="ow-card-header-area">
        <div className="ow-eyebrow">OVERVIEW // FEATURES &amp; PRIVACY</div>
        <h2 className="ow-section-title">Nexus Overwatch Features</h2>
        <p className="ow-section-desc">
          Shared galaxy mapping, espionage reports, activity tracking, and empire overviews for your alliance in real time.
        </p>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="ow-features-pillars-grid">
        {/* Pillar 1 */}
        <div className="ow-pillar-card">
          <div className="ow-pillar-header">
            <div className="ow-pillar-icon-box">
              <Radio size={22} />
            </div>
            <div>
              <span className="ow-pillar-kicker">GALAXY MAPPING</span>
              <h3 className="ow-pillar-title">Shared Universe Intel</h3>
            </div>
          </div>
          <p className="ow-pillar-desc">
            Automated universe mapping without manual scouting. When alliance members view a solar system in OGame, slot details are synced to the shared alliance database.
          </p>
          <ul className="ow-pillar-benefits">
            <li><CheckCircle2 size={13} /> Real-time tracking of colonies, moons, and debris fields</li>
            <li><CheckCircle2 size={13} /> Status alerts: abandoned planets, destroyed moons, and player changes</li>
            <li><CheckCircle2 size={13} /> Fast updates across all connected teammates</li>
          </ul>
        </div>

        {/* Pillar 2 */}
        <div className="ow-pillar-card">
          <div className="ow-pillar-header">
            <div className="ow-pillar-icon-box">
              <Crosshair size={22} />
            </div>
            <div>
              <span className="ow-pillar-kicker">ESPIONAGE</span>
              <h3 className="ow-pillar-title">Shared Spy Reports</h3>
            </div>
          </div>
          <p className="ow-pillar-desc">
            Spy reports scanned by alliance members can be shared automatically, avoiding duplicate probes and manual copy-pasting to Discord.
          </p>
          <ul className="ow-pillar-benefits">
            <li><CheckCircle2 size={13} /> Searchable by player, coordinates, fleet size, or loot resources</li>
            <li><CheckCircle2 size={13} /> Prevents redundant spy probes and saves Deuterium</li>
            <li><CheckCircle2 size={13} /> Quick access to target defense levels and fleet composition</li>
          </ul>
        </div>

        {/* Pillar 3 */}
        <div className="ow-pillar-card">
          <div className="ow-pillar-header">
            <div className="ow-pillar-icon-box">
              <Clock size={22} />
            </div>
            <div>
              <span className="ow-pillar-kicker">ACTIVITY</span>
              <h3 className="ow-pillar-title">Activity Heatmap</h3>
            </div>
          </div>
          <p className="ow-pillar-desc">
            Aggregates activity markers (<code>*</code>, <code>15m</code>, etc.) over time to identify target online habits and offline hours.
          </p>
          <ul className="ow-pillar-benefits">
            <li><CheckCircle2 size={13} /> 24-hour activity distribution for scanned targets</li>
            <li><CheckCircle2 size={13} /> Identifies likely sleep and offline hours to help plan attacks</li>
            <li><CheckCircle2 size={13} /> Combines scans from all alliance members for better coverage</li>
          </ul>
        </div>

        {/* Pillar 4 */}
        <div className="ow-pillar-card">
          <div className="ow-pillar-header">
            <div className="ow-pillar-icon-box">
              <Lock size={22} />
            </div>
            <div>
              <span className="ow-pillar-kicker">COORDINATION</span>
              <h3 className="ow-pillar-title">Target Raid Locks</h3>
            </div>
          </div>
          <p className="ow-pillar-desc">
            Claim attack targets with real-time countdown timers so teammates do not attack the same target or waste fleet fuel.
          </p>
          <ul className="ow-pillar-benefits">
            <li><CheckCircle2 size={13} /> 15-minute attack lock visible on the map and galaxy view</li>
            <li><CheckCircle2 size={13} /> Prevents duplicate fleet launches and target overlap</li>
            <li><CheckCircle2 size={13} /> Automatically unlocks when the fleet lands or when released</li>
          </ul>
        </div>
      </div>

      {/* Security & Privacy Blueprint */}
      <div className="ow-privacy-banner">
        <div className="ow-privacy-icon-box">
          <ShieldCheck size={26} />
        </div>
        <div className="ow-privacy-content">
          <h4 className="ow-privacy-title">Privacy &amp; Gameforge Rules</h4>
          <p className="ow-privacy-desc">
            Nexus Overwatch complies with Gameforge rules through passive data collection:
          </p>
          <div className="ow-privacy-grid">
            <div className="ow-privacy-item">
              <CheckCircle2 size={14} className="ow-accent-icon" />
              <div>
                <strong>Passive Scanning</strong>
                <p>No bots, automation, or simulated clicks. Only reads galaxy and report pages you normally browse.</p>
              </div>
            </div>
            <div className="ow-privacy-item">
              <CheckCircle2 size={14} className="ow-accent-icon" />
              <div>
                <strong>Private Fleet Safety</strong>
                <p>Your own private fleet movements, internal resources, and home coordinates are not broadcast.</p>
              </div>
            </div>
            <div className="ow-privacy-item">
              <CheckCircle2 size={14} className="ow-accent-icon" />
              <div>
                <strong>Secure Database</strong>
                <p>Alliance data is stored securely on Cloudflare D1 with token authentication.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Quick Action CTAs */}
      <div className="ow-features-cta-bar">
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 700 }}>Ready to get started?</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
            {isJoined ? 'Return to your active Overwatch dashboard.' : 'Join an existing alliance with an invite key or create a new one.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {isJoined ? (
            <button
              type="button"
              className="ow-btn-primary"
              onClick={() => {
                setPrimaryTab('overwatch');
                setActiveTab('intel');
              }}
            >
              <Shield size={14} style={{ marginRight: 6 }} />
              <span>Return to {overwatchTabName}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ow-btn-primary"
                onClick={() => {
                  setPrimaryTab('join');
                  setShowCustomJoin(false);
                }}
              >
                <LogIn size={14} style={{ marginRight: 6 }} />
                <span>Join Overwatch</span>
              </button>
              <button
                type="button"
                className="ow-btn-ghost"
                onClick={() => setPrimaryTab('create')}
              >
                <PlusCircle size={14} style={{ marginRight: 6 }} />
                <span>Create Overwatch</span>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );

  if (loading) {
    return (
      <div className="ow-root" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ow-telemetry-pill active-edge">
          <span className="ow-status-dot"></span>
          <span>Loading Overwatch...</span>
        </div>
      </div>
    );
  }

  // --- CLOSED TESTING GATE FOR NON-WHITELISTED PLAYERS ---
  if (!isTester) {
    return (
      <motion.div
        className="ow-root ow-testing-locked-root"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
      >
        <div className="ow-backlight" style={{ background: 'radial-gradient(ellipse at 50% 25%, rgba(245, 158, 11, 0.14) 0%, rgba(6, 11, 20, 0) 70%)' }} />

        <div className="ow-testing-locked-container">
          <div className="ow-testing-locked-header-badge">
            <span className="ow-in-testing-pill">
              <span className="ow-status-dot testing-amber-dot" />
              <span>ALPHA EVALUATION &bull; CLOSED TESTING</span>
            </span>
          </div>

          <div className="ow-testing-locked-card">
            <div className="ow-testing-lock-icon-box">
              <div className="ow-testing-radar-ping" />
              <Lock size={32} className="ow-testing-lock-icon" />
            </div>

            <h1 className="ow-testing-locked-title">Nexus Overwatch</h1>
            <div className="ow-testing-locked-subtitle">
              Live Tactical Universe Grid &bull; Closed Testing Phase
            </div>

            <p className="ow-testing-locked-desc">
              Nexus Overwatch is currently undergoing closed alpha testing with select Alliance Leaders and Flight Commanders. 
              Real-time universe telemetry, shared galaxy reconnaissance, and cross-empire telemetry are currently restricted.
            </p>

            <div className="ow-testing-pilot-dossier">
              <div className="ow-dossier-row">
                <span className="ow-dossier-label">DETECTED PILOT:</span>
                <span className="ow-dossier-val font-mono">{activeAccount?.playerName || 'Unknown Commander'}</span>
              </div>
              <div className="ow-dossier-row">
                <span className="ow-dossier-label">PLAYER ID:</span>
                <span className="ow-dossier-val font-mono">#{activeAccount?.playerId || '—'}</span>
              </div>
              <div className="ow-dossier-row">
                <span className="ow-dossier-label">UNIVERSE:</span>
                <span className="ow-dossier-val font-mono">{activeAccount?.universe || 'Active Uni'}</span>
              </div>
              <div className="ow-dossier-row">
                <span className="ow-dossier-label">CLEARANCE STATUS:</span>
                <span className="ow-dossier-status restricted font-mono">
                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                  NOT IN TESTER WHITELIST
                </span>
              </div>
            </div>

            <div className="ow-testing-passkey-box">
              <div className="ow-passkey-header">
                <Key size={14} className="ow-passkey-icon" />
                <span>Tester Override Passkey</span>
              </div>
              <p className="ow-passkey-hint">
                If your Alliance Commander gave you a closed testing authorization key, enter it below to unlock immediate access:
              </p>

              <form onSubmit={handleUnlockTesterPasskey} className="ow-passkey-form">
                <input
                  type="password"
                  placeholder="Enter Tester Passkey..."
                  value={testerPasskeyInput}
                  onChange={(e) => setTesterPasskeyInput(e.target.value)}
                  className="ow-passkey-input"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="submit"
                  className="ow-btn-primary ow-passkey-submit-btn"
                  disabled={!testerPasskeyInput.trim()}
                >
                  <ShieldCheck size={14} style={{ marginRight: 6 }} />
                  <span>Authorize</span>
                </button>
              </form>

              {testerPasskeyError && (
                <div className="ow-passkey-error">
                  <XCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{testerPasskeyError}</span>
                </div>
              )}
            </div>

            <div className="ow-testing-actions-row">
              <button
                type="button"
                className="ow-btn-ghost"
                disabled={isCheckingRemoteTester}
                onClick={async () => {
                  setIsCheckingRemoteTester(true);
                  await syncOverwatchTesterStatusWithCloudflare(activeAccount?.playerId, activeAccount?.universe);
                  setIsCheckingRemoteTester(false);
                }}
              >
                <RefreshCw size={13} className={isCheckingRemoteTester ? 'ow-spin' : ''} style={{ marginRight: 6 }} />
                <span>{isCheckingRemoteTester ? 'Checking Cloudflare...' : 'Check Cloudflare Clearance'}</span>
              </button>
              {onSelect && (
                <button
                  type="button"
                  className="ow-btn-ghost"
                  onClick={() => onSelect('overview')}
                >
                  <span>Return to Empire 360</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
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

      {/* 1. TOP UNIFIED COMMAND BRIDGE */}
      <section className="ow-command-bridge">
        <div className="ow-bridge-brand-cluster">
          <div className="ow-brand-icon-box">
            <ThemeIcon name="radar" size={24} />
          </div>
          <div className="ow-bridge-brand-info">
            <div className="ow-bridge-eyebrow-row">
              <span className="ow-eyebrow">
                {isJoined ? 'ALLIANCE OVERWATCH' : 'ALLIANCE OVERWATCH'}
              </span>
            </div>
            <div className="ow-bridge-title-row">
              <h1 className="ow-bridge-title">
                {isJoined ? (
                  <>
                    <span className="ow-bridge-tag-highlight">[{effectiveConfig.allianceTag}]</span>
                    <span>{effectiveConfig.allianceName}</span>
                  </>
                ) : (
                  <span>NEXUS OVERWATCH</span>
                )}
              </h1>
            </div>
            <div className="ow-bridge-meta-row">
              <div className="ow-identity-pill" title={`Active Universe: ${activeUniverseName}`}>
                <span className="ow-pill-label">Universe:</span>
                <strong className="ow-pill-value" style={{ color: '#00f2ff' }}>{activeUniverseName}</strong>
              </div>

              {OVERWATCH_ENFORCE_TESTING_GATE && (
                <div className="ow-identity-pill ow-pill-testing-active" title="Nexus closed testing build active">
                  <span className="ow-status-dot testing-amber-dot" />
                  <span className="ow-pill-label">Build:</span>
                  <strong className="ow-pill-value" style={{ color: '#fbbf24' }}>TESTING</strong>
                </div>
              )}

              {isJoined && (
                <>
                  <div className="ow-identity-pill player" title="Active Player">
                    <User size={12} className="ow-pill-icon" />
                    <span className="ow-pill-label">Player:</span>
                    <strong className="ow-pill-value">{effectiveAccount?.playerName || 'Player'}</strong>
                  </div>

                  <div
                    className="ow-identity-pill status-active"
                    title="In-Game Player Status: Active"
                  >
                    <span className="ow-status-dot-active" />
                    <span className="ow-pill-label">Status:</span>
                    <strong className="ow-pill-value">{effectivePlayerStatus}</strong>
                  </div>

                  <div
                    className={`ow-identity-pill role-${effectiveConfig.role || 'member'}`}
                    title={
                      effectiveConfig.role === 'admin'
                        ? 'Role: Admin (Full Access)'
                        : effectiveConfig.role === 'visitor'
                          ? 'Role: Visitor (Restricted Access)'
                          : 'Role: Member'
                    }
                  >
                    <Shield
                      size={11}
                      className="ow-pill-icon"
                      style={{
                        color: effectiveConfig.role === 'admin' ? '#fbbf24' : effectiveConfig.role === 'visitor' ? '#a78bfa' : '#00f2ff',
                      }}
                    />
                    <span className="ow-pill-label">Role:</span>
                    <strong className="ow-pill-value">
                      {effectiveConfig.role === 'admin' ? 'ADMIN' : effectiveConfig.role === 'visitor' ? 'VISITOR' : 'MEMBER'}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="ow-bridge-controls-cluster">
          {/* Latency Telemetry Pill */}
          {edgeStatus === 'online' ? (
            <div className="ow-telemetry-pill active-edge" title={`Connected to Overwatch Server (${activeApiUrl})`}>
              <span className="ow-status-dot"></span>
              <span>{edgeLatency ? `${edgeLatency}ms` : 'Online'}</span>
            </div>
          ) : edgeStatus === 'checking' ? (
            <div className="ow-telemetry-pill connecting" title="Checking server connection...">
              <span className="ow-status-dot connecting"></span>
              <span>Checking...</span>
            </div>
          ) : (
            <button
              type="button"
              className="ow-telemetry-pill offline"
              onClick={() => {
                pingOverwatchEdge();
                if (activeTab === 'map') fetchSystemData(selectedGalaxy, debouncedSystem);
              }}
              style={{ cursor: 'pointer' }}
              title={`Server offline (${edgeError || 'Unreachable'}). Click to reconnect.`}
            >
              <span className="ow-status-dot offline"></span>
              <span>Offline</span>
              <RefreshCw size={11} className={isLoadingSystem ? 'ow-spinning' : ''} style={{ marginLeft: 3 }} />
            </button>
          )}

          {/* Tactical Invite Actions if Joined */}
          {isJoined && effectivePermissions.inviteMembers && (
            <>
              <div className="ow-glyph-chip">
                <span>{effectiveConfig.glyphCode}</span>
                <button className="ow-btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={copyGlyph}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <DiscordShareButton
                glyphCode={effectiveConfig.glyphCode}
                allianceTag={effectiveConfig.allianceTag}
                allianceName={effectiveConfig.allianceName}
              />
            </>
          )}

          {/* Disconnect Button if Joined */}
          {isJoined && (
            <button className="ow-btn-ghost danger" onClick={handleDisconnect} title="Disconnect from Overwatch alliance">
              Disconnect
            </button>
          )}
        </div>
      </section>

      {/* 2. TACTICAL 2-COLUMN WORKSPACE: VERTICAL FLOATING DOCK (LEFT) + VIEWPORT (RIGHT) */}
      <div className="ow-tactical-workspace">
        {/* LEFT COLUMN: VERTICAL FLOATING NAVIGATION DOCK */}
        <aside className="ow-sidebar-column">
          <nav className="ow-vertical-nav-dock" aria-label="Overwatch Navigation Dock">
            {/* Dock Header */}
            <div className="ow-dock-header">
              <div className="ow-dock-header-title">
                <span className="ow-status-dot" style={{ width: 6, height: 6, background: '#00f2ff', boxShadow: '0 0 8px #00f2ff' }} />
                <span>NEXUS OVERWATCH</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                {isJoined ? (effectiveConfig.allianceTag ? `[${effectiveConfig.allianceTag}]` : 'LIVE') : 'IDLE'}
              </div>
            </div>

            {/* Pillar Groups & Submenus */}
            <div className="ow-dock-sections">
              {isJoined ? (
                <>
                  {/* Pillar 1: Overwatch Setup (At top) */}
                  <div className={`ow-dock-section ${activePillar === 'setup' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('setup')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon" style={{ color: '#00f2ff' }}>
                          <PlusCircle size={13} />
                        </div>
                        <span>Overwatch Setup</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'setup' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activePrimaryTab === 'create' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('create');
                          setActivePillar('setup');
                        }}
                      >
                        {activePrimaryTab === 'create' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <PlusCircle size={13} />
                          <span className="ow-dock-item-label">Create Overwatch</span>
                        </div>
                        <span className="ow-dock-tag" style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)' }}>ACTIVE</span>
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activePrimaryTab === 'join' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('join');
                          setShowCustomJoin(false);
                          setActivePillar('setup');
                        }}
                      >
                        {activePrimaryTab === 'join' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <LogIn size={13} />
                          <span className="ow-dock-item-label">Join Overwatch</span>
                        </div>
                        <span className="ow-dock-tag" style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)' }}>LINKED</span>
                      </button>
                    </div>
                  </div>

                  {/* Pillar 2: Universe Intel */}
                  <div className={`ow-dock-section ${activePillar === 'intel' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('intel')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon">
                          <ThemeIcon name="radar" size={13} />
                        </div>
                        <span>Universe Intel</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'intel' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'intel' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('intel');
                          setActivePillar('intel');
                        }}
                      >
                        {activeTab === 'intel' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="radar" size={13} />
                          <span className="ow-dock-item-label">Live Universe Feed</span>
                        </div>
                        {effectivePermissions.viewGalaxyScrapes ? (
                          <span className="ow-dock-tag live">LIVE</span>
                        ) : (
                          <Lock size={12} style={{ color: '#ef4444' }} />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'map' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('map');
                          setActivePillar('intel');
                        }}
                      >
                        {activeTab === 'map' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="strategy" size={13} />
                          <span className="ow-dock-item-label">Universe Map</span>
                        </div>
                        {effectivePermissions.viewGalaxyScrapes ? (
                          <span className="ow-dock-tag coords">G{selectedGalaxy}:{debouncedSystem}</span>
                        ) : (
                          <Lock size={12} style={{ color: '#ef4444' }} />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'heatmap' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('heatmap');
                          setActivePillar('intel');
                        }}
                      >
                        {activeTab === 'heatmap' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="stopwatch" size={13} />
                          <span className="ow-dock-item-label">Activity Heatmap</span>
                        </div>
                        {!effectivePermissions.viewHeatmaps && (
                          <Lock size={12} style={{ color: '#ef4444' }} />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'inactive-scout' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('inactive-scout');
                          setActivePillar('intel');
                        }}
                      >
                        {activeTab === 'inactive-scout' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <Crosshair size={13} style={{ color: '#eab308' }} />
                          <span className="ow-dock-item-label">Raid Radar Scout</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Pillar 3: Alliance Empire */}
                  <div className={`ow-dock-section ${activePillar === 'empire' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('empire')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon">
                          <ThemeIcon name="city-buildings" size={13} />
                        </div>
                        <span>Alliance Empire</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'empire' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'my-empire' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('my-empire');
                          setActivePillar('empire');
                        }}
                      >
                        {activeTab === 'my-empire' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="strategy" size={13} />
                          <span className="ow-dock-item-label">My Empire</span>
                        </div>
                        <span className="ow-dock-tag" style={{
                          background: effectiveConfig?.permissions?.shareEmpire === true && effectiveConfig?.empireSharing?.acknowledged === true ? 'rgba(0, 242, 255, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: effectiveConfig?.permissions?.shareEmpire === true && effectiveConfig?.empireSharing?.acknowledged === true ? '#00f2ff' : '#ef4444'
                        }}>
                          {effectiveConfig?.permissions?.shareEmpire === true && effectiveConfig?.empireSharing?.acknowledged === true ? 'SHARING' : 'OFF'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'empire' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('empire');
                          setActivePillar('empire');
                        }}
                      >
                        {activeTab === 'empire' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="city-buildings" size={13} />
                          <span className="ow-dock-item-label">Overwatch Empire</span>
                        </div>
                        {effectivePermissions.viewEmpire === false ? (
                          <Lock size={12} style={{ color: '#ef4444' }} />
                        ) : (
                          <span className="ow-dock-tag coords">EMPIRE</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pillar: Personal Vault */}
                  <div className={`ow-dock-section ${activePillar === 'vault' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('vault')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon" style={{ color: '#00f2ff' }}>
                          <Shield size={13} />
                        </div>
                        <span>Personal Vault</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'vault' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'personal-vault' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('personal-vault');
                          setActivePillar('vault');
                        }}
                      >
                        {activeTab === 'personal-vault' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="circuit" size={13} />
                          <span className="ow-dock-item-label">Cross-Device Sync</span>
                        </div>
                        <span className="ow-dock-tag coords">CLOUD</span>
                      </button>
                    </div>
                  </div>

                  {/* Pillar 4: Settings & Access */}
                  <div className={`ow-dock-section ${activePillar === 'command' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('command')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon">
                          <ShieldCheck size={13} style={{ color: effectiveConfig.role === 'admin' ? '#fbbf24' : '#00f2ff' }} />
                        </div>
                        <span>Settings &amp; Access</span>
                      </div>
                      {pendingRequests.length > 0 ? (
                        <span className="ow-dock-tag pending">{pendingRequests.length}</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {activePillar === 'command' ? '▼' : '▸'}
                        </span>
                      )}
                    </div>

                    <div className="ow-dock-submenu">
                      {effectiveConfig.role === 'admin' && (
                        <button
                          type="button"
                          className={`ow-dock-nav-item ${activeTab === 'access' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                          onClick={() => {
                            setPrimaryTab('overwatch');
                            setActiveTab('access');
                            setActivePillar('command');
                          }}
                        >
                          {activeTab === 'access' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                          <div className="ow-dock-item-left">
                            <ShieldCheck size={13} style={{ color: '#fbbf24' }} />
                            <span className="ow-dock-item-label">Members &amp; Access</span>
                          </div>
                          {pendingRequests.length > 0 && (
                            <span className="ow-dock-tag pending">{pendingRequests.length}</span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'settings' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('settings');
                          setActivePillar('command');
                        }}
                      >
                        {activeTab === 'settings' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="settings" size={13} />
                          <span className="ow-dock-item-label">Privacy &amp; Sharing</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'features' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('features');
                          setActivePillar('command');
                        }}
                      >
                        {activeTab === 'features' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <Radio size={13} />
                          <span className="ow-dock-item-label">Features &amp; Help</span>
                        </div>
                        <span className="ow-dock-tag" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>HELP</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Unjoined State: Overwatch Setup */}
                  <div className={`ow-dock-section ${activePillar === 'setup' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('setup')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon" style={{ color: '#00f2ff' }}>
                          <PlusCircle size={13} />
                        </div>
                        <span>Overwatch Setup</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'setup' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activePrimaryTab === 'create' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('create');
                          setActivePillar('setup');
                        }}
                      >
                        {activePrimaryTab === 'create' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <PlusCircle size={13} />
                          <span className="ow-dock-item-label">Create Overwatch</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activePrimaryTab === 'join' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('join');
                          setShowCustomJoin(false);
                          setActivePillar('setup');
                        }}
                      >
                        {activePrimaryTab === 'join' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <LogIn size={13} />
                          <span className="ow-dock-item-label">Join Overwatch</span>
                        </div>
                        {effectiveApplicantClearance === 'pending' && (
                          <span className="ow-dock-tag pending">PENDING</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pillar: Personal Vault (Unjoined mode) */}
                  <div className={`ow-dock-section ${activePillar === 'vault' ? 'active-pillar' : ''}`}>
                    <div
                      className="ow-dock-pillar-title"
                      onClick={() => handlePillarClick('vault')}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon" style={{ color: '#00f2ff' }}>
                          <Shield size={13} />
                        </div>
                        <span>Personal Tools & Vault</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {activePillar === 'vault' ? '▼' : '▸'}
                      </span>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'personal-vault' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('personal-vault');
                          setActivePillar('vault');
                        }}
                      >
                        {activeTab === 'personal-vault' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <ThemeIcon name="circuit" size={13} />
                          <span className="ow-dock-item-label">Cross-Device Sync</span>
                        </div>
                        <span className="ow-dock-tag coords">CLOUD</span>
                      </button>

                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activeTab === 'inactive-scout' && activePrimaryTab === 'overwatch' ? 'active' : ''}`}
                        onClick={() => {
                          setPrimaryTab('overwatch');
                          setActiveTab('inactive-scout');
                          setActivePillar('vault');
                        }}
                      >
                        {activeTab === 'inactive-scout' && activePrimaryTab === 'overwatch' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <Crosshair size={13} style={{ color: '#eab308' }} />
                          <span className="ow-dock-item-label">Raid Radar Scout</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="ow-dock-section">
                    <div className="ow-dock-pillar-title">
                      <div className="ow-dock-pillar-left">
                        <div className="ow-dock-pillar-icon">
                          <Radio size={13} />
                        </div>
                        <span>Information</span>
                      </div>
                    </div>

                    <div className="ow-dock-submenu">
                      <button
                        type="button"
                        className={`ow-dock-nav-item ${activePrimaryTab === 'features' ? 'active' : ''}`}
                        onClick={() => setPrimaryTab('features')}
                      >
                        {activePrimaryTab === 'features' && <span className="ow-dock-indicator-bar" />}
                        <div className="ow-dock-item-left">
                          <Radio size={13} />
                          <span className="ow-dock-item-label">Features &amp; Guide</span>
                        </div>
                        <span className="ow-dock-tag" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>GUIDE</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dock Footer Status Strip */}
            <div className="ow-dock-footer">
              <div className="ow-dock-footer-item">
                <span>SERVER</span>
                <span className="ow-dock-footer-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="ow-status-dot"
                    style={{
                      width: 6,
                      height: 6,
                      background: isJoined ? (edgeStatus === 'online' ? '#22c55e' : '#ef4444') : '#94a3b8',
                      boxShadow: isJoined && edgeStatus === 'online' ? '0 0 6px #22c55e' : 'none',
                    }}
                  />
                  {isJoined ? (edgeStatus === 'online' ? (edgeLatency ? `${edgeLatency}ms` : 'ONLINE') : 'OFFLINE') : 'READY'}
                </span>
              </div>
              <div className="ow-dock-footer-item">
                <span>ROLE</span>
                <span className="ow-dock-footer-val" style={{ color: effectiveConfig.role === 'admin' ? '#fbbf24' : '#00f2ff' }}>
                  {isJoined ? (effectiveConfig.role === 'admin' ? 'ADMIN' : effectiveConfig.role === 'visitor' ? 'VISITOR' : 'MEMBER') : 'NOT CONNECTED'}
                </span>
              </div>
            </div>
          </nav>
        </aside>

        {/* RIGHT COLUMN: MAIN VIEWPORT */}
        <main className="ow-main-viewport">

          {/* 3. ACTIVE VIEW CONTENT */}
          {activePrimaryTab === 'features' ? (
            <div className="ow-onboarding-container">
              {renderFeaturesDossier()}
            </div>
          ) : activePrimaryTab === 'create' ? (
            <div className="ow-onboarding-container">
              {isJoined ? (
                /* BLOCKED: Player is already connected to an Overwatch grid */
                <motion.section
                  className="ow-module ow-onboarding-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={EASE_TRANSITION}
                >
                  <div className="ow-card-header-area">
                    <div className="ow-eyebrow" style={{ color: '#fbbf24' }}>NETWORK SETUP // LIMIT REACHED</div>
                    <h2 className="ow-section-title">
                      {effectiveConfig.role === 'admin'
                        ? `Overwatch Network Already Active for [${effectiveConfig.allianceTag || activeAllyTag}]`
                        : `Already Connected to [${effectiveConfig.allianceTag || activeAllyTag}]`}
                    </h2>
                    <p className="ow-section-desc">
                      {effectiveConfig.role === 'admin'
                        ? `You created and are managing the Overwatch alliance for [${effectiveConfig.allianceTag || activeAllyTag}] ${effectiveConfig.allianceName || activeAllyName}. You cannot create multiple alliances at the same time.`
                        : `You are already part of the [${effectiveConfig.allianceTag || activeAllyTag}] Overwatch alliance. Players who are already in an Overwatch alliance cannot create another.`}
                    </p>
                  </div>

                  <div className="ow-specs-grid">
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Active Alliance</div>
                      <div className="ow-spec-val" style={{ color: '#00f2ff' }}>
                        [{effectiveConfig.allianceTag || activeAllyTag}] {effectiveConfig.allianceName || activeAllyName}
                      </div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Your Role</div>
                      <div className="ow-spec-val" style={{ color: effectiveConfig.role === 'admin' ? '#fbbf24' : '#38bdf8' }}>
                        {effectiveConfig.role === 'admin' ? 'ADMIN (FOUNDER)' : effectiveConfig.role === 'visitor' ? 'VISITOR' : 'MEMBER'}
                      </div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Universe</div>
                      <div className="ow-spec-val" style={{ color: '#94a3b8' }}>{activeUniverseName}</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Status</div>
                      <div className="ow-spec-val" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ow-status-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                        <span>CONNECTED</span>
                      </div>
                    </div>
                  </div>

                  <div className="ow-cipher-box" style={{ background: 'rgba(251, 191, 36, 0.04)', borderColor: 'rgba(251, 191, 36, 0.25)', marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                      🔒 <strong>Single Alliance Limit:</strong> Players cannot operate or create multiple Overwatch Alliances concurrently.
                    </p>
                    {effectiveConfig.glyphCode && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Invite Glyph:</span>
                        <span className="ow-glyph-display" style={{ padding: '4px 12px', fontSize: '12px' }}>
                          {effectiveConfig.glyphCode}
                        </span>
                        <button
                          type="button"
                          className="ow-btn-ghost"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={copyGlyph}
                        >
                          <Copy size={12} style={{ marginRight: 5 }} />
                          <span>{copied ? 'Copied ✓' : 'Copy Glyph'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="ow-card-actions-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="ow-btn-primary"
                      onClick={() => {
                        setPrimaryTab('overwatch');
                        setActivePillar('intel');
                        setActiveTab('intel');
                      }}
                    >
                      <Shield size={14} style={{ marginRight: 8 }} />
                      <span>Open Overwatch Dashboard</span>
                    </button>
                    <button
                      type="button"
                      className="ow-btn-ghost danger"
                      onClick={handleDisconnect}
                    >
                      Disconnect from Alliance
                    </button>
                  </div>

                  <div className="ow-onboarding-footer-links">
                    <span>Want to learn more about features?</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => {
                        setPrimaryTab('overwatch');
                        setActiveTab('features');
                        setActivePillar('command');
                      }}
                    >
                      View Features Guide ➜
                    </button>
                  </div>
                </motion.section>
              ) : (detectedAlliance?.exists && (detectedAlliance.isFounder || detectedAlliance.adminPlayerId === effectiveAccount?.playerId)) ? (
                /* BLOCKED: Founder who already created a grid for this alliance */
                <motion.section
                  className="ow-module ow-onboarding-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={EASE_TRANSITION}
                >
                  <div className="ow-card-header-area">
                    <div className="ow-eyebrow" style={{ color: '#4ade80' }}>ALLIANCE SETUP // ALREADY CREATED</div>
                    <h2 className="ow-section-title">Overwatch Alliance Already Created for [{detectedAlliance.allianceTag}]</h2>
                    <p className="ow-section-desc">
                      You have already created the Overwatch alliance for <strong>[{detectedAlliance.allianceTag}] {detectedAlliance.allianceName}</strong>. You cannot create a second network for the same alliance.
                    </p>
                  </div>

                  <div className="ow-specs-grid">
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Alliance</div>
                      <div className="ow-spec-val">[{detectedAlliance.allianceTag}] {detectedAlliance.allianceName}</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Your Role</div>
                      <div className="ow-spec-val" style={{ color: '#fbbf24' }}>ADMIN (FOUNDER)</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Universe</div>
                      <div className="ow-spec-val" style={{ color: '#94a3b8' }}>{activeUniverseName}</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Status</div>
                      <div className="ow-spec-val" style={{ color: '#4ade80' }}>ACTIVE</div>
                    </div>
                  </div>

                  {detectedAlliance.glyphCode && (
                    <div className="ow-cipher-box" style={{ borderColor: 'rgba(0, 242, 255, 0.3)', background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.04) 0%, rgba(4, 7, 18, 0.95) 100%)', marginBottom: 20 }}>
                      <div className="ow-cipher-label-row">
                        <span className="ow-cipher-label">Alliance Invite Glyph (Share with your alliance)</span>
                        <span className="ow-cipher-label" style={{ color: '#4ade80' }}>Invite Glyph</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div className="ow-glyph-display">{detectedAlliance.glyphCode}</div>
                        <button
                          type="button"
                          className="ow-btn-ghost"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                          onClick={() => {
                            if (detectedAlliance.glyphCode) {
                              navigator.clipboard.writeText(detectedAlliance.glyphCode);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                        >
                          <Copy size={13} style={{ marginRight: 6 }} />
                          <span>{copied ? 'Copied ✓' : 'Copy Glyph'}</span>
                        </button>
                        <DiscordShareButton
                          glyphCode={detectedAlliance.glyphCode}
                          allianceTag={detectedAlliance.allianceTag}
                          allianceName={detectedAlliance.allianceName}
                        />
                      </div>
                    </div>
                  )}

                  <div className="ow-card-actions-row">
                    <button
                      type="button"
                      className="ow-btn-primary"
                      style={{ fontSize: '14px', padding: '14px 28px' }}
                      onClick={handleResumeFounder}
                      disabled={isReconnecting}
                    >
                      <Shield size={16} style={{ marginRight: 8 }} />
                      <span>{isReconnecting ? 'Connecting...' : 'Open Overwatch Dashboard'}</span>
                    </button>
                  </div>

                  <div className="ow-onboarding-footer-links">
                    <span>Looking to join an existing alliance?</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => setPrimaryTab('join')}
                    >
                      Go to Join Overwatch ➜
                    </button>
                    <span className="ow-divider">•</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => setPrimaryTab('features')}
                    >
                      View Features Guide ➜
                    </button>
                  </div>
                </motion.section>
              ) : (
                /* Sub-View: DEPLOY NEW GRID (CREATE OVERWATCH) */
                <motion.section
                  className="ow-module ow-onboarding-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={EASE_TRANSITION}
                >
                  <div className="ow-card-header-area">
                    <div className="ow-eyebrow">ALLIANCE SETUP // CREATE ALLIANCE</div>
                    <h2 className="ow-section-title">Create Overwatch Alliance for [{activeAllyTag || 'Alliance'}]</h2>
                    <p className="ow-section-desc">
                      Set up a shared Overwatch network for <strong>{activeAllyName || 'your alliance'}</strong> in universe {activeUniverseName}.
                    </p>
                  </div>

                  {detectedAlliance?.exists && (
                    <div className="ow-cipher-box" style={{ background: 'rgba(0, 242, 255, 0.04)', borderColor: 'rgba(0, 242, 255, 0.2)', marginBottom: 20 }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                        ℹ️ <strong>Alliance Overwatch Already Exists:</strong> <strong>{detectedAlliance.adminPlayerName || 'Admin'}</strong> has already created an Overwatch alliance for <strong>[{detectedAlliance.allianceTag}] {detectedAlliance.allianceName}</strong>. You can switch to the <strong>Join Overwatch</strong> tab to connect to it, or create a separate one below.
                      </p>
                    </div>
                  )}

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

                  <div style={{ marginBottom: 16 }}>
                    <div className="ow-spec-kicker" style={{ marginBottom: 6 }}>Custom Display Name</div>
                    <input
                      type="text"
                      className="ow-text-field"
                      placeholder="e.g. LazyOldPeople Fleet Command"
                      value={createDisplayName}
                      onChange={(e) => {
                        setCreateDisplayName(e.target.value);
                        if (createError) setCreateError(null);
                      }}
                    />
                    <div className="ow-input-hint">
                      The display name shown in your Overwatch dashboard and shared Discord messages.
                    </div>
                  </div>

                  <div className="ow-provision-steps">
                    <div className="ow-step-item">
                      <div className="ow-step-num">1</div>
                      <div className="ow-step-text">
                        <strong>Shared Alliance Database</strong>
                        <p>Stores shared spy reports, galaxy data, and member activity.</p>
                      </div>
                    </div>
                    <div className="ow-step-item">
                      <div className="ow-step-num">2</div>
                      <div className="ow-step-text">
                        <strong>Admin Rights</strong>
                        <p>Lets you manage member invites, permissions, and settings.</p>
                      </div>
                    </div>
                    <div className="ow-step-item">
                      <div className="ow-step-num">3</div>
                      <div className="ow-step-text">
                        <strong>Invite Glyph &amp; Discord Share</strong>
                        <p>Generates an invite glyph and Discord message to share with alliance members.</p>
                      </div>
                    </div>
                  </div>

                  <div className="ow-license-strip">
                    <span className="ow-license-text">Beta Access</span>
                    <span className="ow-license-badge">FREE</span>
                  </div>

                  {createError && (
                    <div className="ow-error-badge" style={{ marginBottom: 16 }}>
                      <AlertTriangle size={14} />
                      <span>{createError}</span>
                    </div>
                  )}

                  <div className="ow-card-actions-row">
                    <button
                      className="ow-btn-primary"
                      onClick={handleCreate}
                      disabled={isCreating || !createDisplayName.trim()}
                    >
                      {isCreating ? 'Creating Alliance...' : `Create Alliance for [${activeAllyTag || 'Alliance'}]`}
                    </button>
                  </div>

                  <div className="ow-onboarding-footer-links">
                    <span>Want to join an existing alliance?</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => {
                        setPrimaryTab('join');
                        setShowCustomJoin(false);
                      }}
                    >
                      Go to Join Overwatch ➜
                    </button>
                    <span className="ow-divider">•</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => setPrimaryTab('features')}
                    >
                      View Features Guide ➜
                    </button>
                  </div>
                </motion.section>
              )}
            </div>
          ) : activePrimaryTab === 'join' ? (
            <div className="ow-onboarding-container">
              {isJoined ? (
                /* BLOCKED: Already connected to an Overwatch Grid */
                <motion.section
                  className="ow-module ow-onboarding-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={EASE_TRANSITION}
                >
                  <div className="ow-card-header-area">
                    <div className="ow-eyebrow" style={{ color: '#00f2ff' }}>ALLIANCE SETUP // ALREADY CONNECTED</div>
                    <h2 className="ow-section-title">Already Connected to [{effectiveConfig.allianceTag || activeAllyTag}] Overwatch</h2>
                    <p className="ow-section-desc">
                      You are currently connected to <strong>[{effectiveConfig.allianceTag || activeAllyTag}] {effectiveConfig.allianceName || activeAllyName}</strong> in universe {activeUniverseName}. You cannot join another alliance while currently connected to one.
                    </p>
                  </div>

                  <div className="ow-specs-grid">
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Current Alliance</div>
                      <div className="ow-spec-val" style={{ color: '#00f2ff' }}>[{effectiveConfig.allianceTag || activeAllyTag}] {effectiveConfig.allianceName || activeAllyName}</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Your Role</div>
                      <div className="ow-spec-val" style={{ color: effectiveConfig.role === 'admin' ? '#fbbf24' : '#38bdf8' }}>
                        {effectiveConfig.role === 'admin' ? 'ADMIN' : effectiveConfig.role === 'visitor' ? 'VISITOR' : 'MEMBER'}
                      </div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Universe</div>
                      <div className="ow-spec-val" style={{ color: '#94a3b8' }}>{activeUniverseName}</div>
                    </div>
                    <div className="ow-spec-cell">
                      <div className="ow-spec-kicker">Status</div>
                      <div className="ow-spec-val" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ow-status-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                        <span>CONNECTED</span>
                      </div>
                    </div>
                  </div>

                  <div className="ow-cipher-box" style={{ background: 'rgba(0, 242, 255, 0.04)', borderColor: 'rgba(0, 242, 255, 0.2)', marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                      ℹ️ <strong>Want to join a different alliance?</strong> Disconnect from your current alliance first. Then enter an invite glyph to join.
                    </p>
                  </div>

                  <div className="ow-card-actions-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="ow-btn-primary"
                      onClick={() => {
                        setPrimaryTab('overwatch');
                        setActivePillar('intel');
                        setActiveTab('intel');
                      }}
                    >
                      <Shield size={14} style={{ marginRight: 8 }} />
                      <span>Open Overwatch Dashboard</span>
                    </button>
                    <button
                      type="button"
                      className="ow-btn-ghost danger"
                      onClick={handleDisconnect}
                    >
                      Disconnect from Alliance
                    </button>
                  </div>

                  <div className="ow-onboarding-footer-links">
                    <span>Want to learn more about features?</span>
                    <button
                      type="button"
                      className="ow-link-btn"
                      onClick={() => {
                        setPrimaryTab('overwatch');
                        setActiveTab('features');
                        setActivePillar('command');
                      }}
                    >
                      View Features Guide ➜
                    </button>
                  </div>
                </motion.section>
              ) : (
                /* Sub-View: JOIN OVERWATCH TAB */
                effectiveApplicantClearance === 'pending' ? (
                  <motion.section
                    className="ow-module ow-onboarding-card ow-pending-screen"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={EASE_TRANSITION}
                  >
                    <div className="ow-radar-beacon">
                      <div className="ow-radar-wave" />
                      <div className="ow-radar-wave" style={{ animationDelay: '1s' }} />
                      <Radio size={36} style={{ color: '#fbbf24', position: 'relative', zIndex: 2 }} />
                    </div>

                    <div className="ow-card-header-area" style={{ textAlign: 'center' }}>
                      <div className="ow-eyebrow" style={{ color: '#fbbf24' }}>
                        MEMBERSHIP // REQUEST PENDING
                      </div>
                      <h2 className="ow-section-title">Join Request Sent</h2>
                      <p className="ow-section-desc">
                        Your request to join has been sent. It is now waiting for review and approval from an alliance admin.
                      </p>
                    </div>

                    <div className="ow-pending-summary">
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Alliance</div>
                        <div className="ow-spec-val" style={{ color: '#00f2ff' }}>
                          [{pendingAllianceInfo?.allianceTag || detectedAlliance?.allianceTag || config.allianceTag || activeAllyTag || 'ALLIANCE'}] {pendingAllianceInfo?.allianceName || detectedAlliance?.allianceName || config.allianceName || activeAllyName || 'Alliance'}
                        </div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Your In-Game Name</div>
                        <div className="ow-spec-val" style={{ color: '#fff' }}>{effectiveAccount?.playerName || 'Applicant'}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Universe</div>
                        <div className="ow-spec-val" style={{ color: '#94a3b8' }}>{activeUniverseName}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Status</div>
                        <div className="ow-spec-val" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="ow-status-dot" style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                          <span>WAITING FOR APPROVAL</span>
                        </div>
                      </div>
                    </div>

                    <div className="ow-cipher-box" style={{ background: 'rgba(251, 191, 36, 0.04)', borderColor: 'rgba(251, 191, 36, 0.2)', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                        💡 <strong>Admin Approval:</strong> An alliance admin will assign your role (<strong>Member</strong> or <strong>Visitor</strong>) and approve your request.
                      </p>
                    </div>

                    <div className="ow-card-actions-row" style={{ justifyContent: 'center', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="ow-btn-primary"
                          onClick={handleCheckStatus}
                          disabled={isCheckingStatus}
                          style={{ minWidth: 180 }}
                        >
                          <RefreshCw size={14} className={isCheckingStatus ? 'ow-spinning' : ''} style={{ marginRight: 8 }} />
                          <span>{isCheckingStatus ? 'Checking Status...' : 'Check Status Now'}</span>
                        </button>
                        <button
                          type="button"
                          className="ow-btn-ghost danger"
                          onClick={handleCancelRequest}
                        >
                          Cancel Request
                        </button>
                      </div>
                      {statusNotice && (
                        <div style={{ fontSize: '12px', color: '#fbbf24', textAlign: 'center', marginTop: 4 }}>
                          {statusNotice}
                        </div>
                      )}
                    </div>
                  </motion.section>
                ) : effectiveApplicantClearance === 'denied' ? (
                  <motion.section
                    className="ow-module ow-onboarding-card"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={EASE_TRANSITION}
                    style={{ textAlign: 'center', padding: '40px 32px' }}
                  >
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <AlertTriangle size={32} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="ow-eyebrow" style={{ color: '#ef4444' }}>MEMBERSHIP // REQUEST DECLINED</div>
                    <h2 className="ow-section-title">Join Request Declined</h2>
                    <p className="ow-section-desc" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
                      The alliance admin has declined your request to join.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="ow-btn-primary"
                        onClick={handleCancelRequest}
                      >
                        Return to Join Screen
                      </button>
                    </div>
                  </motion.section>
                ) : isDetecting && !detectedAlliance ? (
                  <motion.section
                    className="ow-module ow-onboarding-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px', flexDirection: 'column', gap: 16 }}
                  >
                    <RefreshCw size={28} className="ow-spinning" style={{ color: '#00f2ff' }} />
                    <div style={{ fontSize: '15px', color: '#fff', fontWeight: 700 }}>
                      Checking Overwatch for [{activeAllyTag || 'Alliance'}]...
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Searching universe {activeUniverseName}...
                    </div>
                  </motion.section>
                ) : showCustomJoin || (!detectedAlliance?.exists) ? (
                  <motion.section
                    className="ow-module ow-onboarding-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={EASE_TRANSITION}
                  >
                    <div className="ow-card-header-area">
                      <div className="ow-eyebrow">JOIN ALLIANCE // ENTER INVITE GLYPH</div>
                      <h2 className="ow-section-title">Join with Invite Glyph</h2>
                      <p className="ow-section-desc">
                        Join an alliance using an invite glyph provided by an alliance admin.
                      </p>
                    </div>

                    <div className="ow-cipher-box">
                      <div className="ow-cipher-label-row">
                        <span className="ow-cipher-label">Alliance Invite Glyph</span>
                        <span className="ow-cipher-label" style={{ color: '#00f2ff' }}>Glyph</span>
                      </div>
                      <input
                        type="text"
                        className="ow-cipher-input"
                        placeholder="NXOW-XXXX-XXXX-XXXX-XXXX"
                        value={joinGlyph}
                        onChange={(e) => {
                          setJoinGlyph(e.target.value);
                          if (joinError) setJoinError(null);
                        }}
                        autoFocus
                      />
                      <div className="ow-input-hint">
                        Enter the invite glyph provided by an admin of the alliance you want to join.
                      </div>
                      {joinError && (
                        <div className="ow-error-badge">
                          <AlertTriangle size={14} />
                          <span>{joinError}</span>
                        </div>
                      )}
                    </div>

                    <div className="ow-card-actions-row">
                      <button
                        className="ow-btn-primary"
                        onClick={handleJoin}
                        disabled={isJoining || !joinGlyph.trim()}
                      >
                        {isJoining ? 'Connecting to Alliance...' : 'Join Alliance'}
                      </button>
                    </div>

                    <div className="ow-onboarding-footer-links">
                      {detectedAlliance?.exists && (
                        <>
                          <button
                            type="button"
                            className="ow-link-btn"
                            onClick={() => setShowCustomJoin(false)}
                          >
                            ◀ Back to [{activeAllyTag || 'Alliance'}] Join
                          </button>
                          <span className="ow-divider">•</span>
                        </>
                      )}
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setPrimaryTab('create')}
                      >
                        Create Alliance Overwatch ➜
                      </button>
                      <span className="ow-divider">•</span>
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setPrimaryTab('features')}
                      >
                        View Features Guide ➜
                      </button>
                    </div>
                  </motion.section>
                ) : detectedAlliance?.exists && detectedAlliance?.isFounder ? (
                  <motion.section
                    className="ow-module ow-onboarding-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={EASE_TRANSITION}
                  >
                    <div className="ow-card-header-area">
                      <div className="ow-eyebrow" style={{ color: '#4ade80' }}>ALLIANCE OVERWATCH ACTIVE // FOUNDER</div>
                      <h2 className="ow-section-title">Welcome back, {activeAccount?.playerName || 'Leader'}</h2>
                      <p className="ow-section-desc">
                        Your Overwatch alliance for <strong>[{detectedAlliance.allianceTag}] {detectedAlliance.allianceName}</strong> is active and ready.
                      </p>
                    </div>

                    {/* Network Status Grid */}
                    <div className="ow-specs-grid">
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">In-Game Alliance</div>
                        <div className="ow-spec-val">[{detectedAlliance.allianceTag}] {detectedAlliance.allianceName}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Your Role</div>
                        <div className="ow-spec-val" style={{ color: '#f59e0b' }}>ADMIN</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Universe</div>
                        <div className="ow-spec-val" style={{ color: '#94a3b8' }}>{activeUniverseName}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Members</div>
                        <div className="ow-spec-val" style={{ color: '#4ade80' }}>{detectedAlliance.memberCount || 1} Active</div>
                      </div>
                    </div>

                    {/* Founder Glyph Box */}
                    <div className="ow-cipher-box" style={{ borderColor: 'rgba(0, 242, 255, 0.3)', background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.04) 0%, rgba(4, 7, 18, 0.95) 100%)' }}>
                      <div className="ow-cipher-label-row">
                        <span className="ow-cipher-label">Alliance Invite Glyph (Share with your alliance)</span>
                        <span className="ow-cipher-label" style={{ color: '#4ade80' }}>Invite Glyph</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div className="ow-glyph-display">
                          {detectedAlliance.glyphCode}
                        </div>
                        <button
                          type="button"
                          className="ow-btn-ghost"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                          onClick={() => {
                            if (detectedAlliance.glyphCode) {
                              navigator.clipboard.writeText(detectedAlliance.glyphCode);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                        >
                          <Copy size={13} style={{ marginRight: 6 }} />
                          <span>{copied ? 'Copied ✓' : 'Copy Glyph'}</span>
                        </button>
                        <DiscordShareButton
                          glyphCode={detectedAlliance.glyphCode}
                          allianceTag={detectedAlliance.allianceTag}
                          allianceName={detectedAlliance.allianceName}
                        />
                      </div>
                      <div className="ow-input-hint" style={{ marginTop: 10 }}>
                        Members of [{detectedAlliance.allianceTag}] use this glyph to connect their extension to your shared alliance Overwatch.
                      </div>
                    </div>

                    {joinError && (
                      <div className="ow-error-badge" style={{ marginBottom: 16 }}>
                        <AlertTriangle size={14} />
                        <span>{joinError}</span>
                      </div>
                    )}

                    <div className="ow-card-actions-row">
                      <button
                        className="ow-btn-primary"
                        style={{ fontSize: '14px', padding: '14px 28px' }}
                        onClick={handleResumeFounder}
                        disabled={isReconnecting}
                      >
                        <Shield size={16} style={{ marginRight: 8 }} />
                        <span>{isReconnecting ? 'Connecting...' : 'Open Overwatch Dashboard'}</span>
                      </button>
                    </div>

                    <div className="ow-onboarding-footer-links">
                      <span>Want to learn more about features or permissions?</span>
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setPrimaryTab('features')}
                      >
                        View Features Guide ➜
                      </button>
                    </div>
                  </motion.section>
                ) : (
                  /* Sub-View: SQUADMATE JOIN */
                  <motion.section
                    className="ow-module ow-onboarding-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={EASE_TRANSITION}
                  >
                    <div className="ow-card-header-area">
                      <div className="ow-eyebrow" style={{ color: '#00f2ff' }}>ALLIANCE OVERWATCH // READY TO JOIN</div>
                      <h2 className="ow-section-title">Join [{detectedAlliance?.allianceTag || activeAllyTag}] {detectedAlliance?.allianceName || activeAllyName}</h2>
                      <p className="ow-section-desc">
                        <strong>{detectedAlliance?.adminPlayerName || 'Your alliance leader'}</strong> has created an Overwatch alliance for your team in universe {activeUniverseName}.
                      </p>
                    </div>

                    <div className="ow-specs-grid">
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Alliance</div>
                        <div className="ow-spec-val">[{detectedAlliance?.allianceTag || activeAllyTag}] {detectedAlliance?.allianceName || activeAllyName}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Alliance Admin</div>
                        <div className="ow-spec-val" style={{ color: '#f59e0b' }}>{detectedAlliance?.adminPlayerName || 'Alliance Commander'}</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Status</div>
                        <div className="ow-spec-val" style={{ color: '#4ade80' }}>ACTIVE</div>
                      </div>
                      <div className="ow-spec-cell">
                        <div className="ow-spec-kicker">Default Role</div>
                        <div className="ow-spec-val" style={{ color: '#38bdf8' }}>MEMBER</div>
                      </div>
                    </div>

                    <div className="ow-cipher-box">
                      <div className="ow-cipher-label-row">
                        <span className="ow-cipher-label">Alliance Invite Glyph</span>
                        <span className="ow-cipher-label" style={{ color: '#00f2ff' }}>Glyph</span>
                      </div>
                      <input
                        type="text"
                        className="ow-cipher-input"
                        placeholder="NXOW-XXXX-XXXX-XXXX-XXXX"
                        value={joinGlyph}
                        onChange={(e) => {
                          setJoinGlyph(e.target.value);
                          if (joinError) setJoinError(null);
                        }}
                        autoFocus
                      />
                      <div className="ow-input-hint">
                        Enter the invite glyph provided by {detectedAlliance?.adminPlayerName || 'your alliance admin'}.
                      </div>
                      {joinError && (
                        <div className="ow-error-badge">
                          <AlertTriangle size={14} />
                          <span>{joinError}</span>
                        </div>
                      )}
                    </div>

                    {/* Capabilities Grid */}
                    <div className="ow-capabilities-preview">
                      <div className="ow-preview-label">SHARED FEATURES</div>
                      <div className="ow-capabilities-grid">
                        <div className="ow-cap-item">
                          <Radio size={18} className="ow-cap-icon" />
                          <div>
                            <strong>Live Galaxy Mapping</strong>
                            <p>Automatically updates galaxy view as teammates browse</p>
                          </div>
                        </div>
                        <div className="ow-cap-item">
                          <Crosshair size={18} className="ow-cap-icon" />
                          <div>
                            <strong>Shared Spy Reports</strong>
                            <p>Fleet and defense scans accessible to everyone</p>
                          </div>
                        </div>
                        <div className="ow-cap-item">
                          <Clock size={18} className="ow-cap-icon" />
                          <div>
                            <strong>Activity Heatmap</strong>
                            <p>Tracks enemy activity patterns to find offline times</p>
                          </div>
                        </div>
                        <div className="ow-cap-item">
                          <Lock size={18} className="ow-cap-icon" />
                          <div>
                            <strong>Target Raid Locks</strong>
                            <p>Claim targets with timers to avoid fleet collisions</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ow-card-actions-row">
                      <button
                        className="ow-btn-primary"
                        onClick={handleJoin}
                        disabled={isJoining || !joinGlyph.trim()}
                      >
                        {isJoining ? 'Joining Alliance...' : `Join [${detectedAlliance?.allianceTag || activeAllyTag}]`}
                      </button>
                    </div>

                    <div className="ow-onboarding-footer-links">
                      <span>Joining a different alliance?</span>
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setShowCustomJoin(true)}
                      >
                        Join with Custom Invite Glyph ➜
                      </button>
                      <span className="ow-divider">•</span>
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setPrimaryTab('create')}
                      >
                        Create Alliance Overwatch ➜
                      </button>
                      <span className="ow-divider">•</span>
                      <button
                        type="button"
                        className="ow-link-btn"
                        onClick={() => setPrimaryTab('features')}
                      >
                        View Features Guide ➜
                      </button>
                    </div>
                  </motion.section>
                )
              )}
            </div>
          ) : (
            /* 4. CONNECTED STATE */
            <>
              {/* Tab: Overwatch Empire */}
              {activeTab === 'empire' && (
                effectivePermissions.viewEmpire === false ? (
                  <section className="ow-module ow-classified-lock">
                    <div className="ow-lock-icon-box">
                      <Lock size={32} />
                    </div>
                    <div className="ow-eyebrow" style={{ color: '#ef4444' }}>RESTRICTED ACCESS // PERMISSION REQUIRED</div>
                    <h3 className="ow-lock-title">Alliance Empire Locked</h3>
                    <p className="ow-lock-desc">
                      Your role (<strong>{userRole === 'visitor' ? 'Visitor' : 'Member'}</strong>) does not have permission to view alliance fleet and economy data. Contact {detectedAlliance?.adminPlayerName || 'an admin'} to request access.
                    </p>
                  </section>
                ) : (
                  <section className="ow-module" style={{ padding: '24px 28px' }}>
                    <OverwatchEmpire
                      config={effectiveConfig}
                      effectiveAccount={effectiveAccount}
                      effectivePermissions={effectivePermissions}
                      isAdmin={isAdmin}
                      apiUrl={resolvedApiUrl}
                    />
                  </section>
                )
              )}

              {/* Tab: My Empire (Data Sharing Deck) */}
              {activeTab === 'my-empire' && (
                <section className="ow-module" style={{ padding: '24px 28px' }}>
                  <OverwatchMyEmpire
                    config={effectiveConfig}
                    saveConfig={saveConfig}
                    effectiveAccount={effectiveAccount}
                    effectivePermissions={effectivePermissions}
                    isAdmin={isAdmin}
                    apiUrl={resolvedApiUrl}
                  />
                </section>
              )}

              {/* Tab 2: Universe Map */}
              {activeTab === 'map' && (
                !effectivePermissions.viewGalaxyScrapes ? (
                  <section className="ow-module ow-classified-lock">
                    <div className="ow-lock-icon-box">
                      <Lock size={32} />
                    </div>
                    <div className="ow-eyebrow" style={{ color: '#ef4444' }}>RESTRICTED ACCESS // PERMISSION REQUIRED</div>
                    <h3 className="ow-lock-title">Universe Map Locked</h3>
                    <p className="ow-lock-desc">
                      Your role (<strong>{userRole === 'visitor' ? 'Visitor' : 'Member'}</strong>) does not have permission to view the universe map. Contact {detectedAlliance?.adminPlayerName || 'an admin'} to update your permissions.
                    </p>
                  </section>
                ) : (
                  <section className="ow-module" style={{ padding: '20px 24px' }}>
                    <div className="ow-map-header-grid">
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Universe Map</h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                          View galaxy and system positions across the universe ({universeStats?.totalPlanets?.toLocaleString() || '3,173'} locations).
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {resyncSuccessMsg && (
                          <span style={{ fontSize: '12px', color: resyncSuccessMsg.startsWith('✓') ? '#4ade80' : '#38bdf8', fontWeight: 700, maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.25 }}>
                            {resyncSuccessMsg}
                          </span>
                        )}
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
                              value={systemInputStr}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setSystemInputStr(raw);
                                const trimmed = raw.trim();
                                if (!trimmed) return;
                                const val = parseInt(trimmed, 10);
                                if (!isNaN(val)) {
                                  const maxSys = universeStats?.systems || 499;
                                  if (val >= 1 && val <= maxSys) {
                                    setSelectedSystem(val);
                                  } else if (val > maxSys) {
                                    setSelectedSystem(maxSys);
                                    setSystemInputStr(String(maxSys));
                                  }
                                }
                              }}
                              onBlur={() => {
                                const trimmed = systemInputStr.trim();
                                const maxSys = universeStats?.systems || 499;
                                if (!trimmed) {
                                  setSystemInputStr(String(selectedSystem));
                                } else {
                                  const val = parseInt(trimmed, 10);
                                  const clamped = isNaN(val) ? selectedSystem : Math.min(maxSys, Math.max(1, val));
                                  setSelectedSystem(clamped);
                                  setSystemInputStr(String(clamped));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
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

                    {/* Tactical Offline Warning Banner */}
                    {edgeStatus === 'offline' && systemSlots.length === 0 && (
                      <div className="ow-offline-card">
                        <div className="ow-offline-icon-glow">
                          <WifiOff size={24} color="#ef4444" />
                        </div>
                        <div className="ow-offline-body">
                          <h4 className="ow-offline-title">OVERWATCH SERVER OFFLINE</h4>
                          <p className="ow-offline-desc">
                            Cannot connect to Overwatch server at <code className="ow-code-pill">{activeApiUrl}</code>.
                            {systemFetchError ? ` (${systemFetchError}).` : ''} Galaxy map updates and shared sync are paused.
                          </p>
                          <div className="ow-offline-actions">
                            <button
                              type="button"
                              className="ow-btn-reconnect"
                              onClick={() => {
                                pingOverwatchEdge();
                                fetchSystemData(selectedGalaxy, debouncedSystem);
                              }}
                              disabled={isLoadingSystem}
                            >
                              <RefreshCw size={13} className={isLoadingSystem ? 'ow-spinning' : ''} />
                              <span>{isLoadingSystem ? 'Connecting...' : 'Retry Connection'}</span>
                            </button>
                            <span className="ow-offline-tip">
                              Tip: Make sure the server worker is running or deploy to Cloudflare.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cached Data Alert when connection dropped but slots exist */}
                    {edgeStatus === 'offline' && systemSlots.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: 16 }}>
                        <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12.5px', color: '#f87171' }}>
                          Viewing cached system data. Connection to <code className="ow-code-pill">{activeApiUrl}</code> is offline.
                        </span>
                        <button
                          type="button"
                          className="ow-btn-reconnect"
                          style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '11px' }}
                          onClick={() => { pingOverwatchEdge(); fetchSystemData(selectedGalaxy, debouncedSystem); }}
                          disabled={isLoadingSystem}
                        >
                          <RefreshCw size={11} className={isLoadingSystem ? 'ow-spinning' : ''} />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}

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

                            const isHighlighted = highlightedSlot === slotNum;

                            return (
                              <tr key={slotNum} className={`ow-table-row ${isColonized ? 'colonized' : 'uncolonized'} ${isHighlighted ? 'ow-slot-highlight-pulse' : ''}`}>
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
                                    (slot.moon_destroyed === 1 || (slot.planet_name || '').toLowerCase().includes('destroy')) ? (
                                      <span className="ow-tag red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span>💥</span>
                                        <span>{slot.moon_size ? `${slot.moon_size.toLocaleString()} km (Destroyed)` : 'Destroyed Moon'}</span>
                                      </span>
                                    ) : (
                                      <span className="ow-tag green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <span>🌙</span>
                                        <span>{slot.moon_size ? `${slot.moon_size.toLocaleString()} km` : 'Moon'}</span>
                                      </span>
                                    )
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
                                  ) : (slot.planet_name || '').toLowerCase().includes('destroy') ? (
                                    <span style={{ color: '#f87171', fontStyle: 'italic', fontSize: '12px', fontWeight: 600 }}>
                                      Abandoned (Pending Wipe)
                                    </span>
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
                )
              )}

              {/* Tab 1: Live Universe Feed */}
              {activeTab === 'intel' && (
                !effectivePermissions.viewGalaxyScrapes ? (
                  <section className="ow-module ow-classified-lock">
                    <div className="ow-lock-icon-box">
                      <Lock size={32} />
                    </div>
                    <div className="ow-eyebrow" style={{ color: '#ef4444' }}>RESTRICTED ACCESS // PERMISSION REQUIRED</div>
                    <h3 className="ow-lock-title">Live Universe Feed Locked</h3>
                    <p className="ow-lock-desc">
                      Your role (<strong>{userRole === 'visitor' ? 'Visitor' : 'Member'}</strong>) does not have permission to view real-time galaxy updates. Contact {detectedAlliance?.adminPlayerName || 'an admin'} to update your permissions.
                    </p>
                  </section>
                ) : (
                  <section className="ow-module" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Live Universe Feed</h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                          Live updates appear below as Overwatch members browse systems or new data is being synced from server.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          className="ow-refresh-btn"
                          title="Refresh Live Universe Feed"
                          onClick={() => fetchLiveEvents(eventsPage, eventsPageSize)}
                          disabled={isLoadingEvents}
                        >
                          <RefreshCw className={isLoadingEvents ? 'ow-spinning' : ''} size={15} />
                        </button>
                        {eventsPage > 1 ? (
                          <button
                            className="ow-telemetry-pill paused"
                            onClick={() => {
                              setEventsPage(1);
                              setEventsUnseenCount(0);
                            }}
                            title="Live stream paused while browsing historical logs. Click to jump to live feed."
                          >
                            <span className="ow-status-dot paused"></span>
                            <span>Live Paused (P{eventsPage}) • Jump to Live</span>
                            {eventsUnseenCount > 0 && (
                              <span className="ow-unseen-badge">+{eventsUnseenCount}</span>
                            )}
                          </button>
                        ) : (
                          <div className="ow-telemetry-pill active-edge">
                            <span className="ow-status-dot"></span>
                            <span>Live</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Type Checked Filters */}
                    <div className="ow-feed-filter-deck">
                      <div className="ow-feed-filter-header-left">
                        <div className="ow-feed-filter-title">
                          <Filter size={13} className="ow-feed-filter-icon" />
                          <span>EVENT FILTERS</span>
                        </div>

                        <div className="ow-feed-filter-chips">
                          {UNIVERSE_FEED_EVENT_TYPES.map((type) => {
                            const isChecked = selectedEventTypes.includes(type.id);
                            return (
                              <label
                                key={type.id}
                                className={`ow-event-filter-chip ${type.tagClass} ${isChecked ? 'active' : 'inactive'}`}
                                title={`${isChecked ? 'Uncheck' : 'Check'} to ${isChecked ? 'hide' : 'show'} ${type.label} events`}
                              >
                                <input
                                  type="checkbox"
                                  className="ow-event-filter-hidden-input"
                                  checked={isChecked}
                                  onChange={() => handleToggleEventType(type.id)}
                                />
                                <span className={`ow-filter-checkbox-box ${isChecked ? 'checked' : ''}`}>
                                  {isChecked && <Check size={10} strokeWidth={3.5} />}
                                </span>
                                <span className={`ow-filter-color-dot ${type.tagClass}`}></span>
                                <span className="ow-event-filter-label">{type.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="ow-feed-filter-actions">
                        <span className="ow-feed-filter-count">
                          {selectedEventTypes.length} / {UNIVERSE_FEED_EVENT_TYPES.length} active
                        </span>
                        <div className="ow-feed-filter-btn-group">
                          <button
                            type="button"
                            className={`ow-filter-action-btn ${selectedEventTypes.length === UNIVERSE_FEED_EVENT_TYPES.length ? 'active' : ''}`}
                            onClick={handleSelectAllEventTypes}
                            title="Check all event types"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            className={`ow-filter-action-btn ${selectedEventTypes.length === 0 ? 'active' : ''}`}
                            onClick={handleClearAllEventTypes}
                            title="Uncheck all event types"
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedEventTypes.length === 0 ? (
                      <div className="ow-feed-empty-filter-state">
                        <div className="ow-empty-filter-icon-box">
                          <Filter size={26} />
                        </div>
                        <div className="ow-empty-filter-title">All Event Filters Unchecked</div>
                        <p className="ow-empty-filter-desc">
                          Check one or more event types above to stream live universe intel.
                        </p>
                        <button
                          type="button"
                          className="ow-empty-filter-btn"
                          onClick={handleSelectAllEventTypes}
                        >
                          <Check size={13} strokeWidth={2.6} />
                          <span>Select All Event Types</span>
                        </button>
                      </div>
                    ) : filteredEvents.length > 0 ? (
                      <>
                        <table className="ow-table" style={{ tableLayout: 'auto' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '85px' }}>Time</th>
                              <th style={{ width: '135px' }}>Detected By</th>
                              <th style={{ width: '105px' }}>Coordinates</th>
                              <th style={{ width: '145px' }}>Event</th>
                              <th style={{ minWidth: '180px' }}>Player</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEvents.map((evt) => {
                              const ageSec = Math.max(0, Math.floor((Date.now() - evt.detected_at) / 1000));
                              let ageStr = 'Just now';
                              if (ageSec > 3600) ageStr = `${Math.floor(ageSec / 3600)}h ago`;
                              else if (ageSec > 60) ageStr = `${Math.floor(ageSec / 60)}m ago`;

                              let tagClass = 'blue';
                              switch (evt.event_type) {
                                case 'colonized':
                                  tagClass = 'green';
                                  break;
                                case 'status_changed':
                                  tagClass = 'blue';
                                  break;
                                case 'moon_spawned':
                                  tagClass = 'cyan';
                                  break;
                                case 'moon_destroyed':
                                  tagClass = 'red';
                                  break;
                                case 'abandoned':
                                  tagClass = 'amber';
                                  break;
                                case 'relocated':
                                  tagClass = 'purple';
                                  break;
                                case 'player_renamed':
                                  tagClass = 'pink';
                                  break;
                                default:
                                  tagClass = 'blue';
                              }

                              let eventLabel = evt.event_type === 'abandoned' ? 'LEFT PLANET' : evt.event_type.replace(/_/g, ' ').toUpperCase();

                              return (
                                <tr key={evt.event_id}>
                                  <td>{ageStr}</td>
                                  <td>
                                    <IntelDetectorCell detectedBy={evt.detected_by} />
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="ow-coord-link-btn"
                                      title={`Jump to [${evt.galaxy}:${evt.system}] in Universe Map`}
                                      onClick={() => handleJumpToCoordinates(evt.galaxy, evt.system, evt.slot)}
                                    >
                                      <strong className="ow-coord-text">[{evt.galaxy}:{evt.system}:{evt.slot}]</strong>
                                    </button>
                                  </td>
                                  <td><span className={`ow-tag ${tagClass}`}>{eventLabel}</span></td>
                                  <td>
                                    <IntelPlayerCell evt={evt} />
                                  </td>
                                  <td className="ow-intel-cell">
                                    <IntelDetailsCell evt={evt} onJumpCoords={handleJumpToCoordinates} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Tactical Cursor Pagination Deck */}
                        <div className="ow-feed-pagination">
                          <div className="ow-feed-pagination-left">
                            <span className="ow-feed-range-text">
                              Showing <strong>{eventsTotal === 0 ? 0 : ((eventsPage - 1) * eventsPageSize) + 1}–{Math.min(eventsPage * eventsPageSize, eventsTotal)}</strong> of <strong>{eventsTotal.toLocaleString()}</strong> events
                            </span>
                          </div>

                          <div className="ow-feed-pagination-center">
                            <div className="ow-page-size-picker">
                              <span className="ow-page-size-label">PER PAGE</span>
                              {[25, 50, 100].map(sz => (
                                <button
                                  key={sz}
                                  className={`ow-page-size-btn ${eventsPageSize === sz ? 'active' : ''}`}
                                  onClick={() => {
                                    setEventsPageSize(sz);
                                    setEventsPage(1);
                                  }}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="ow-feed-pagination-right">
                            <button
                              className="ow-page-btn"
                              disabled={eventsPage <= 1 || isLoadingEvents}
                              onClick={() => {
                                setEventsPage(1);
                                setEventsUnseenCount(0);
                              }}
                              title="Jump to latest live events"
                            >
                              <ChevronsLeft size={13} />
                              <span>Latest</span>
                            </button>
                            <button
                              className="ow-page-btn"
                              disabled={eventsPage <= 1 || isLoadingEvents}
                              onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                              title="Previous page (Newer events)"
                            >
                              <ChevronLeft size={13} />
                              <span>Newer</span>
                            </button>
                            <span className="ow-page-indicator">
                              Page <strong>{eventsPage}</strong> / {eventsTotalPages || 1}
                            </span>
                            <button
                              className="ow-page-btn"
                              disabled={eventsPage >= eventsTotalPages || isLoadingEvents}
                              onClick={() => setEventsPage(p => Math.min(eventsTotalPages, p + 1))}
                              title="Next page (Older events)"
                            >
                              <span>Older</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '36px 20px', textAlign: 'center', background: '#040712', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ color: '#00f2ff', fontSize: '14px', fontWeight: 700, marginBottom: 6 }}>
                          🛰️ No Events Found for Selected Filters
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '12.5px', margin: 0, maxWidth: 540, marginInline: 'auto', lineHeight: 1.5 }}>
                          No recent events match the active filters ({selectedEventTypes.map(id => UNIVERSE_FEED_EVENT_TYPES.find(t => t.id === id)?.label || id).join(', ')}).
                          As members scan systems or Gameforge synchronizes, matching events will appear here.
                        </p>
                        <button
                          type="button"
                          className="ow-empty-filter-btn"
                          style={{ marginTop: 14 }}
                          onClick={handleSelectAllEventTypes}
                        >
                          <Check size={13} strokeWidth={2.6} />
                          <span>Reset to All Event Types</span>
                        </button>
                      </div>
                    )}
                  </section>
                )
              )}

              {/* Tab 2: Shared Spy Vault (Disabled for now) */}
              {/*
          {activeTab === 'spy-vault' && (
            !effectivePermissions.viewSpyVault ? (
              <section className="ow-module ow-classified-lock">
                <div className="ow-lock-icon-box">
                  <Lock size={32} />
                </div>
                <div className="ow-eyebrow" style={{ color: '#ef4444' }}>CLASSIFIED RECON // RESTRICTED ACCESS</div>
                <h3 className="ow-lock-title">Espionage Vault Locked</h3>
                <p className="ow-lock-desc">
                  Your clearance tier (<strong>{userRole === 'visitor' ? 'Visitor' : 'Member'}</strong>) does not have authorization to view the alliance espionage archive. Request elevated clearance from Commander {detectedAlliance?.adminPlayerName || 'an admin'} to unlock this intel.
                </p>
              </section>
            ) : (
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
            )
          )}
          */}

              {/* Tab 3: Activity Heatmap */}
              {activeTab === 'heatmap' && (
                !effectivePermissions.viewHeatmaps ? (
                  <section className="ow-module ow-classified-lock">
                    <div className="ow-lock-icon-box">
                      <Lock size={32} />
                    </div>
                    <div className="ow-eyebrow" style={{ color: '#ef4444' }}>RESTRICTED ACCESS // PERMISSION REQUIRED</div>
                    <h3 className="ow-lock-title">Activity Heatmap Locked</h3>
                    <p className="ow-lock-desc">
                      Your role (<strong>{userRole === 'visitor' ? 'Visitor' : 'Member'}</strong>) does not have permission to view player activity heatmaps. Contact {detectedAlliance?.adminPlayerName || 'an admin'} to update your permissions.
                    </p>
                  </section>
                ) : (
                  <OverwatchActivityHeatmap
                    effectiveConfig={effectiveConfig}
                    activeUniverse={activeUniverse}
                    activeUniverseName={activeUniverseName}
                    ownPlanets={ownPlanets}
                    events={events}
                  />
                )
              )}

              {/* Tab 4: Squad & Access Control (Admin only) */}
              {activeTab === 'access' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* 1. Pending Clearances Queue */}
                  <section className="ow-module" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div className="ow-eyebrow" style={{ color: '#fbbf24' }}>JOIN REQUESTS // PENDING APPROVAL</div>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                          Pending Join Requests
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          Review players requesting to join [{effectiveConfig.allianceTag}]. Select a role and approve or deny.
                        </p>
                      </div>
                      <div className="ow-telemetry-pill" style={{ borderColor: pendingRequests.length > 0 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)' }}>
                        <span>Queue: <strong>{pendingRequests.length} Pending</strong></span>
                      </div>
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div style={{ padding: '32px 20px', textAlign: 'center', background: '#040712', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <CheckCircle2 size={28} style={{ color: '#4ade80', margin: '0 auto 10px' }} />
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>
                          No Pending Requests
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '12.5px', margin: 0 }}>
                          There are no pending join requests. When a player submits your alliance invite glyph, their request will appear here for review.
                        </p>
                      </div>
                    ) : (
                      <div className="ow-access-grid">
                        {pendingRequests.map((req) => {
                          const isSameAlliance = req.allianceTag === effectiveConfig.allianceTag;
                          return (
                            <div key={req.requestId} className="ow-request-card">
                              <div className="ow-request-header">
                                <div>
                                  <span className="ow-request-name">👤 {req.playerName}</span>
                                  <span className="ow-request-tag">[{req.allianceTag || 'NO-TAG'}]</span>
                                </div>
                                <span
                                  className="ow-request-tag"
                                  style={{
                                    color: isSameAlliance ? '#4ade80' : '#a78bfa',
                                    borderColor: isSameAlliance ? 'rgba(74,222,128,0.3)' : 'rgba(167,139,250,0.3)',
                                  }}
                                >
                                  {isSameAlliance ? 'Same Alliance' : 'External Alliance'}
                                </span>
                              </div>

                              <div className="ow-request-meta">
                                <div className="ow-request-meta-item">
                                  <span>Universe:</span>
                                  <strong>{req.universeId}</strong>
                                </div>
                                <div className="ow-request-meta-item">
                                  <span>Alliance:</span>
                                  <strong>{req.allianceName}</strong>
                                </div>
                                <div className="ow-request-meta-item">
                                  <span>Requested:</span>
                                  <strong>Just now</strong>
                                </div>
                              </div>

                              <div style={{ margin: '14px 0 8px 0' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Assign Role:
                                </label>
                                <select
                                  className="ow-role-select"
                                  value={req.assignedRole || req.suggestedRole}
                                  onChange={(e) => {
                                    const newRole = e.target.value as 'member' | 'visitor';
                                    setPendingRequests(prev => prev.map(r => r.requestId === req.requestId ? { ...r, assignedRole: newRole } : r));
                                  }}
                                >
                                  <option value="member">Member (Full Access)</option>
                                  <option value="visitor">Visitor (Limited Access)</option>
                                </select>
                              </div>

                              <div className="ow-request-actions">
                                <button
                                  type="button"
                                  className="ow-btn-approve"
                                  onClick={() => handleApproveRequest(req, req.assignedRole || req.suggestedRole)}
                                >
                                  <CheckCircle2 size={13} style={{ marginRight: 6 }} />
                                  <span>Approve Request</span>
                                </button>
                                <button
                                  type="button"
                                  className="ow-btn-deny"
                                  onClick={() => handleDenyRequest(req)}
                                >
                                  <XCircle size={13} style={{ marginRight: 6 }} />
                                  <span>Deny</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* 2. Role Permissions Matrix */}
                  <section className="ow-module" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div className="ow-eyebrow" style={{ color: '#00f2ff' }}>ROLES &amp; PERMISSIONS</div>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                          Role Permissions
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          Configure feature permissions for Member and Visitor roles. Admins always have full access.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ow-btn-primary"
                        onClick={handleSavePermissions}
                        disabled={isSavingPermissions}
                        style={{ padding: '8px 18px', fontSize: '12.5px' }}
                      >
                        {isSavingPermissions ? (
                          <>
                            <RefreshCw size={13} className="ow-spinning" style={{ marginRight: 6 }} />
                            <span>Saving...</span>
                          </>
                        ) : permissionsSaveSuccess ? (
                          <>
                            <CheckCircle2 size={13} style={{ color: '#4ade80', marginRight: 6 }} />
                            <span>Saved ✓</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={13} style={{ marginRight: 6 }} />
                            <span>Save Permissions</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="ow-permissions-table">
                        <thead>
                          <tr>
                            <th style={{ width: '45%' }}>Feature / Permission</th>
                            <th style={{ width: '18%', textAlign: 'center' }}>
                              <span style={{ color: '#fbbf24', fontWeight: 700 }}>ADMIN</span>
                            </th>
                            <th style={{ width: '18%', textAlign: 'center' }}>
                              <span style={{ color: '#00f2ff', fontWeight: 700 }}>MEMBER</span>
                            </th>
                            <th style={{ width: '19%', textAlign: 'center' }}>
                              <span style={{ color: '#a78bfa', fontWeight: 700 }}>VISITOR</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <strong>View Live Universe Feed</strong>
                              <p>Access real-time sector updates, colonized slots, and debris fields</p>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="ow-perm-lock-icon" title="Admin always has full access">✓ (Locked)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.member.viewGalaxyScrapes}
                                onChange={(e) => updatePerm('member', 'viewGalaxyScrapes', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.visitor.viewGalaxyScrapes}
                                onChange={(e) => updatePerm('visitor', 'viewGalaxyScrapes', e.target.checked)}
                              />
                            </td>
                          </tr>

                          <tr>
                            <td>
                              <strong>Contribute Galaxy Scans</strong>
                              <p>Share solar systems you browse in OGame with the alliance</p>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="ow-perm-lock-icon">✓ (Locked)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.member.contributeGalaxyScrapes}
                                onChange={(e) => updatePerm('member', 'contributeGalaxyScrapes', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.visitor.contributeGalaxyScrapes}
                                onChange={(e) => updatePerm('visitor', 'contributeGalaxyScrapes', e.target.checked)}
                              />
                            </td>
                          </tr>

                          {/* Shared Spy Vault permissions (Disabled for now) */}
                          {/*
                      <tr>
                        <td>
                          <strong>View Shared Espionage Vault</strong>
                          <p>Access spy reports probed by squadmates, enemy fleet counts, and defense levels</p>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="ow-perm-lock-icon">✓ (Locked)</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="ow-perm-checkbox"
                            checked={permissionsMatrix.member.viewSpyVault}
                            onChange={(e) => updatePerm('member', 'viewSpyVault', e.target.checked)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="ow-perm-checkbox"
                            checked={permissionsMatrix.visitor.viewSpyVault}
                            onChange={(e) => updatePerm('visitor', 'viewSpyVault', e.target.checked)}
                          />
                        </td>
                      </tr>

                      <tr>
                        <td>
                          <strong>Upload Espionage Reports</strong>
                          <p>Allow extension to sync scanned spy probes directly into the vault</p>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="ow-perm-lock-icon">✓ (Locked)</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="ow-perm-checkbox"
                            checked={permissionsMatrix.member.uploadSpyReports}
                            onChange={(e) => updatePerm('member', 'uploadSpyReports', e.target.checked)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="ow-perm-checkbox"
                            checked={permissionsMatrix.visitor.uploadSpyReports}
                            onChange={(e) => updatePerm('visitor', 'uploadSpyReports', e.target.checked)}
                          />
                        </td>
                      </tr>
                      */}

                          <tr>
                            <td>
                              <strong>Activity Heatmap</strong>
                              <p>View player online/offline activity patterns and estimated sleep schedules</p>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="ow-perm-lock-icon">✓ (Locked)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.member.viewHeatmaps}
                                onChange={(e) => updatePerm('member', 'viewHeatmaps', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.visitor.viewHeatmaps}
                                onChange={(e) => updatePerm('visitor', 'viewHeatmaps', e.target.checked)}
                              />
                            </td>
                          </tr>

                          <tr>
                            <td>
                              <strong>Target Raid Locks</strong>
                              <p>Lock attack targets with timers to avoid fleet collisions</p>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="ow-perm-lock-icon">✓ (Locked)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.member.claimRaidLocks}
                                onChange={(e) => updatePerm('member', 'claimRaidLocks', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.visitor.claimRaidLocks}
                                onChange={(e) => updatePerm('visitor', 'claimRaidLocks', e.target.checked)}
                              />
                            </td>
                          </tr>

                          <tr>
                            <td>
                              <strong>Invite Members</strong>
                              <p>Permission to share alliance invite glyphs with other players</p>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="ow-perm-lock-icon">✓ (Locked)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.member.inviteMembers}
                                onChange={(e) => updatePerm('member', 'inviteMembers', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="ow-perm-checkbox"
                                checked={permissionsMatrix.visitor.inviteMembers}
                                onChange={(e) => updatePerm('visitor', 'inviteMembers', e.target.checked)}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* 3. Active Squad Roster */}
                  <section className="ow-module" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <div className="ow-eyebrow" style={{ color: '#4ade80' }}>MEMBERS &amp; ACCESS // ROSTER</div>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                          Connected Members &amp; Visitors ({displayRoster.length})
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          Connected players in your [{effectiveConfig.allianceTag}] alliance Overwatch.
                        </p>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="ow-table">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Alliance Tag</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Manage Role</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRoster.map((m: any) => {
                            const isAdmin = m.role === 'admin';
                            const memberId = String(m.playerId || m.player_id || '');
                            const memberName = m.playerName || m.player_name || (isAdmin ? (detectedAlliance?.adminPlayerName || activeAccount?.playerName || 'Founder') : 'Squadmate');
                            return (
                              <tr key={memberId || memberName}>
                                <td>
                                  <strong style={{ color: '#fff' }}>{memberName}</strong>
                                  {isAdmin && <span style={{ color: '#fbbf24', marginLeft: 6, fontSize: '11px' }}>(Admin)</span>}
                                </td>
                                <td>
                                  <span style={{ color: '#00f2ff', fontFamily: 'monospace' }}>[{m.tag || effectiveConfig.allianceTag}]</span>
                                </td>
                                <td>
                                  <span className={`ow-identity-pill role-${m.role}`} style={{ display: 'inline-flex', padding: '3px 10px' }}>
                                    <Shield
                                      size={10}
                                      className="ow-pill-icon"
                                      style={{
                                        color: m.role === 'admin' ? '#fbbf24' : m.role === 'visitor' ? '#a78bfa' : '#00f2ff',
                                      }}
                                    />
                                    <strong className="ow-pill-value" style={{ textTransform: 'uppercase' }}>{m.role}</strong>
                                  </span>
                                </td>
                                <td>
                                  <span style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                                    <span className="ow-status-dot" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                                    <span>Connected</span>
                                  </span>
                                </td>
                                <td>
                                  {isAdmin ? (
                                    <span style={{ color: '#64748b', fontSize: '12px' }}>Admin (Owner)</span>
                                  ) : (
                                    <select
                                      className="ow-role-select"
                                      style={{ padding: '4px 8px', fontSize: '12px' }}
                                      value={m.role}
                                      onChange={(e) => handleChangeMemberRole(memberId, e.target.value as 'member' | 'visitor')}
                                    >
                                      <option value="member">Member</option>
                                      <option value="visitor">Visitor</option>
                                    </select>
                                  )}
                                </td>
                                <td>
                                  {isAdmin ? (
                                    <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="ow-btn-ghost danger"
                                      style={{ padding: '4px 10px', fontSize: '11px' }}
                                      onClick={() => handleKickMember(memberId)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {/* Tab 5: Privacy Settings */}
              {activeTab === 'settings' && (
                <section className="ow-module">
                  <h2 className="ow-section-title">Privacy &amp; Sharing Settings</h2>
                  <p className="ow-section-desc">
                    Choose what data your extension shares with your alliance.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: effectivePermissions.uploadSpyReports ? 'pointer' : 'not-allowed', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', opacity: effectivePermissions.uploadSpyReports ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={config.permissions.shareSpy && effectivePermissions.uploadSpyReports}
                        disabled={!effectivePermissions.uploadSpyReports}
                        onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareSpy: e.target.checked } })}
                      />
                      <span style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#fff' }}>Share Spy Reports</strong>: Automatically share scanned enemy fleets, defenses, and resources with your alliance.
                        {!effectivePermissions.uploadSpyReports && (
                          <span style={{ marginLeft: 8, color: '#ef4444', fontSize: '11.5px', fontWeight: 600 }}>[Disabled by Admin]</span>
                        )}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: effectivePermissions.contributeGalaxyScrapes ? 'pointer' : 'not-allowed', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', opacity: effectivePermissions.contributeGalaxyScrapes ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={config.permissions.shareGalaxy && effectivePermissions.contributeGalaxyScrapes}
                        disabled={!effectivePermissions.contributeGalaxyScrapes}
                        onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareGalaxy: e.target.checked } })}
                      />
                      <span style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#fff' }}>Share Galaxy Scans</strong>: Automatically share solar systems and activity as you browse the galaxy view.
                        {!effectivePermissions.contributeGalaxyScrapes && (
                          <span style={{ marginLeft: 8, color: '#ef4444', fontSize: '11.5px', fontWeight: 600 }}>[Disabled by Admin]</span>
                        )}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: effectivePermissions.claimRaidLocks ? 'pointer' : 'not-allowed', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', opacity: effectivePermissions.claimRaidLocks ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={config.permissions.shareLocks && effectivePermissions.claimRaidLocks}
                        disabled={!effectivePermissions.claimRaidLocks}
                        onChange={(e) => saveConfig({ ...config, permissions: { ...config.permissions, shareLocks: e.target.checked } })}
                      />
                      <span style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#fff' }}>Target Raid Locks</strong>: Prevent duplicate attacks on the same targets.
                        {!effectivePermissions.claimRaidLocks && (
                          <span style={{ marginLeft: 8, color: '#ef4444', fontSize: '11.5px', fontWeight: 600 }}>[Disabled by Admin]</span>
                        )}
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: effectivePermissions.shareEmpire !== false ? 'pointer' : 'not-allowed', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', opacity: effectivePermissions.shareEmpire !== false ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={effectiveConfig.permissions?.shareEmpire === true && effectivePermissions.shareEmpire !== false}
                        disabled={effectivePermissions.shareEmpire === false}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          saveConfig({
                            ...effectiveConfig,
                            permissions: { ...effectiveConfig.permissions, shareEmpire: isEnabled },
                            empireSharing: {
                              ...(effectiveConfig.empireSharing || DEFAULT_EMPIRE_SHARING_SETTINGS),
                              acknowledged: isEnabled,
                            },
                          });
                        }}
                      />
                      <span style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#fff' }}>Share Empire Overview</strong>: Share your mine levels, fleet size, lifeforms, and research with your alliance.
                        {effectivePermissions.shareEmpire === false && (
                          <span style={{ marginLeft: 8, color: '#ef4444', fontSize: '11.5px', fontWeight: 600 }}>[Disabled by Admin]</span>
                        )}
                      </span>
                    </label>
                  </div>

                  {/* Overwatch Edge Endpoint Config */}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 700 }}>Overwatch Server API</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#94a3b8' }}>
                      Cloudflare Worker API address used to sync data with your alliance.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={config.customApiUrl || ''}
                        placeholder={`Default: ${DEFAULT_OVERWATCH_API_URL}`}
                        onChange={(e) => saveConfig({ ...config, customApiUrl: e.target.value.trim() || undefined })}
                        style={{ flex: 1, minWidth: 260, padding: '9px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}
                      />
                      <button
                        type="button"
                        className="ow-btn-reconnect"
                        onClick={() => pingOverwatchEdge(config.customApiUrl || DEFAULT_OVERWATCH_API_URL)}
                        disabled={edgeStatus === 'checking'}
                      >
                        <RefreshCw size={13} className={edgeStatus === 'checking' ? 'ow-spinning' : ''} />
                        <span>Test Connection</span>
                      </button>
                      <div className={`ow-telemetry-pill ${edgeStatus === 'online' ? 'active-edge' : edgeStatus === 'checking' ? 'connecting' : 'offline'}`}>
                        <span className={`ow-status-dot ${edgeStatus === 'online' ? '' : edgeStatus}`}></span>
                        <span>{edgeStatus === 'online' ? `Online (${edgeLatency}ms)` : edgeStatus === 'checking' ? 'Testing...' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Tab: Features & Specifications */}
              {activeTab === 'features' && (
                <div className="ow-onboarding-container">
                  {renderFeaturesDossier()}
                </div>
              )}

              {/* Tab: Personal Vault */}
              {activeTab === 'personal-vault' && (
                <OverwatchPersonalVault
                  universeId={activeUniverse || activeAccount?.universe || 's267-en'}
                  playerId={activeAccount?.playerId || ''}
                  playerName={activeAccount?.playerName || 'Commander'}
                  onNavigateTab={(tab) => {
                    if (onSelect) onSelect(tab);
                  }}
                />
              )}

              {/* Tab: Raid Radar Scout */}
              {activeTab === 'inactive-scout' && (
                <OverwatchInactiveScout
                  universeId={activeUniverse || activeAccount?.universe || 's267-en'}
                  playerId={activeAccount?.playerId || ''}
                  playerName={activeAccount?.playerName || 'Commander'}
                  galaxiesCount={activeAccount?.galaxies || universeStats?.galaxies}
                  onJumpToCoordinates={(g, s, slot) => {
                    setSelectedGalaxy(Number(g));
                    setSelectedSystem(Number(s));
                    setSystemInputStr(String(s));
                    setDebouncedSystem(Number(s));
                    if (slot) setHighlightedSlot(Number(slot));
                    setPrimaryTab('overwatch');
                    setActiveTab('map');
                    setActivePillar('intel');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </motion.div>
  );
};

export default Overwatch;
