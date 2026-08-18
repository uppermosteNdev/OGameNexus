import { AssistantNotification, AssistantCategory } from './types';
import {
  snoozeNotification,
  unsnoozeNotification,
  getAssistantSettings,
  saveAssistantSettings,
  evaluateAllNotifications,
  formatFriendlyRuleName
} from './rulesEngine';
import { getStoredFleetMovements } from '../fleetMovement';

type TabId = 'critical' | 'reminder' | 'logistics' | 'intel' | 'settings';

export function renderAssistantIcon(icon?: string): string {
  if (!icon) return '✨';
  if (icon.startsWith('<')) return icon;
  if (icon.includes('/') || icon.includes('.png') || icon.includes('.jpg') || icon.includes('.webp') || icon.includes('.svg')) {
    let src = icon;
    if (!icon.startsWith('http') && !icon.startsWith('chrome-extension://') && !icon.startsWith('/')) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.getURL) {
          src = chrome.runtime.getURL(icon);
        }
      } catch (e) {
        src = icon;
      }
    }
    return `<img src="${src}" class="nexus-assistant-icon-img" alt="" />`;
  }
  return icon;
}

export async function openAssistantModal(
  notifications: AssistantNotification[],
  playerId: string,
  onUpdateCallback?: () => void,
  initialTab?: TabId
): Promise<void> {
  const existingModal = document.querySelector('#og-nexus-assistant-modal-overlay');
  if (existingModal) {
    existingModal.remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'og-nexus-assistant-modal-overlay';
  overlay.className = 'nexus-modal-overlay';

  let currentTab: TabId = initialTab || 'critical';
  let activeNotifications = notifications;
  let settings = await getAssistantSettings();
  const fleetMovements = await getStoredFleetMovements();

  const renderModalContent = () => {
    const criticalNotes = activeNotifications.filter(n => n.category === 'critical');
    const reminderNotes = activeNotifications.filter(n => n.category === 'reminder');
    const logisticsNotes = activeNotifications.filter(n => n.category === 'logistics');
    const intelNotes = activeNotifications.filter(n => n.category === 'intel' || n.category === 'growth');
    const snoozedEntries = Object.entries(settings.snoozedRules);

    overlay.innerHTML = `
      <div class="nexus-assistant-modal">
        <!-- Header -->
        <div class="nexus-modal-header">
          <div class="nexus-modal-title-group">
            <div class="nexus-overseer-badge">
              <span class="nexus-pulse-dot ${criticalNotes.length > 0 ? 'pulse-danger' : (reminderNotes.length > 0 ? 'pulse-warning' : (logisticsNotes.length > 0 ? 'pulse-warning' : 'pulse-normal'))}"></span>
              <span class="nexus-overseer-emblem">OVERSEER</span>
            </div>
            <div>
              <div class="nexus-modal-heading-row">
                <h2 class="nexus-modal-title">Nexus Overseer Terminal</h2>
                <span class="nexus-telemetry-badge">${activeNotifications.length === 0 ? 'STATUS: NOMINAL' : `NOTIFICATIONS: ${activeNotifications.length}`}</span>
              </div>
              <p class="nexus-modal-subtitle">Tactical empire diagnostics, security threat monitoring, and automated logistics intelligence.</p>
            </div>
          </div>
          <div class="nexus-modal-header-actions">
            <button class="nexus-modal-refresh-btn" title="Re-scan empire status">↻ Re-scan</button>
            <button class="nexus-modal-close-btn" title="Close Overseer Terminal" aria-label="Close">✕</button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="nexus-modal-tabs">
          <button class="nexus-modal-tab ${currentTab === 'critical' ? 'active' : ''}" data-tab="critical">
            <span class="tab-icon">🚨</span> Warnings <span class="tab-badge ${criticalNotes.length > 0 ? 'badge-danger' : ''}">${criticalNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'reminder' ? 'active' : ''}" data-tab="reminder">
            <span class="tab-icon">🔔</span> Reminders <span class="tab-badge ${reminderNotes.length > 0 ? 'badge-reminder' : ''}">${reminderNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'logistics' ? 'active' : ''}" data-tab="logistics">
            <span class="tab-icon">⏳</span> Logistics <span class="tab-badge ${logisticsNotes.length > 0 ? 'badge-warning' : ''}">${logisticsNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'intel' ? 'active' : ''}" data-tab="intel">
            <span class="tab-icon">📦</span> Intel <span class="tab-badge">${intelNotes.length}</span>
          </button>
          <button class="nexus-modal-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
            <span class="tab-icon">⚙️</span> Overseer Rules <span class="tab-badge">${snoozedEntries.length}</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="nexus-modal-body">
          ${renderTabBody(currentTab, { criticalNotes, reminderNotes, logisticsNotes, intelNotes, snoozedEntries })}
        </div>
      </div>
    `;

    attachModalEvents();
  };

  const renderTabBody = (
    tab: TabId,
    data: {
      criticalNotes: AssistantNotification[];
      reminderNotes: AssistantNotification[];
      logisticsNotes: AssistantNotification[];
      intelNotes: AssistantNotification[];
      snoozedEntries: [string, any][];
    }
  ) => {
    let currentList: AssistantNotification[] = [];
    if (tab === 'critical') currentList = data.criticalNotes;
    else if (tab === 'reminder') currentList = data.reminderNotes;
    else if (tab === 'logistics') currentList = data.logisticsNotes;
    else if (tab === 'intel') currentList = data.intelNotes;

    if (tab === 'settings') {
      return `
        <div class="nexus-settings-view">
          <div class="nexus-settings-section">
            <div class="section-header">
              <span class="section-icon">🛡️</span>
              <h3>Overseer Master Control</h3>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Enable Nexus Overseer Bar</label>
                <p class="setting-desc">Display the live production, research, fleet, and anomaly Overseer bar directly on the Overview page.</p>
              </div>
              <div class="nexus-switch-wrapper">
                <label class="nexus-switch" style="position: relative; display: inline-block; width: 44px; height: 22px; cursor: pointer;">
                  <input type="checkbox" id="setting-overseer-enabled" ${settings.enabled !== false ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" />
                  <span class="nexus-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${settings.enabled !== false ? '#38bdf8' : '#334155'}; transition: .3s; border-radius: 22px; box-shadow: ${settings.enabled !== false ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none'};">
                    <span style="position: absolute; height: 16px; width: 16px; left: ${settings.enabled !== false ? '24px' : '4px'}; bottom: 3px; background-color: #0f172a; transition: .3s; border-radius: 50%;"></span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class="nexus-settings-section">
            <div class="section-header">
              <span class="section-icon">⚙️</span>
              <h3>Overseer Detection Thresholds</h3>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Storage Overflow Alert Window</label>
                <p class="setting-desc">Trigger early warning when a storage tank will overflow within this time.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-storage-overflow-hours" value="${(settings.thresholds.storageOverflowHours ?? 3).toLocaleString('en-US')}" />
                <span class="input-unit">hours</span>
              </div>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Fleet Save Risk Threshold</label>
                <p class="setting-desc">Trigger reminder when stationary fleet/resource value exceeds this MSU value.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-fleet-save-msu" value="${(settings.thresholds.minFleetSaveMsu ?? 1000000).toLocaleString('en-US')}" />
                <span class="input-unit">MSU</span>
              </div>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Debris Field Opportunity Threshold</label>
                <p class="setting-desc">Trigger opportunity alert when a scanned galaxy debris field exceeds this MSU value.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-min-debris-msu" value="${(settings.thresholds.minDebrisMsu ?? 1000000).toLocaleString('en-US')}" />
                <span class="input-unit">MSU</span>
              </div>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Artifacts Warning Threshold</label>
                <p class="setting-desc">Trigger almost-full warning when collected Lifeform Artifacts reach this number before the 3,600 cap.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-artifacts-threshold" value="${(settings.thresholds.artifactsWarningThreshold ?? 3000).toLocaleString('en-US')}" />
                <span class="input-unit">/ 3600</span>
              </div>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Officer Expiry Alert Window</label>
                <p class="setting-desc">Trigger warning when active Commander/Officers will expire within this time.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-officer-expiry-hours" value="${(settings.thresholds.officerExpiryHours ?? 12).toLocaleString('en-US')}" />
                <span class="input-unit">hours</span>
              </div>
            </div>
            <div class="nexus-settings-row">
              <div>
                <label class="setting-title">Expedition Depletion Warning Rate</label>
                <p class="setting-desc">Trigger warning when non-pristine expeditions in past 4h exceed this percentage.</p>
              </div>
              <div class="nexus-input-group">
                <input type="text" inputmode="numeric" id="setting-expo-depletion-pct" value="${(settings.thresholds.maxExpoDepletionPct ?? 10).toLocaleString('en-US')}" />
                <span class="input-unit">%</span>
              </div>
            </div>
            <div class="settings-actions">
              <button id="save-thresholds-btn" class="nexus-btn-save-settings">Save Thresholds</button>
            </div>
          </div>

          <div class="nexus-settings-section">
            <div class="section-header">
              <span class="section-icon">🔇</span>
              <h3>Muted & Snoozed Overseer Rules (${data.snoozedEntries.length})</h3>
            </div>
            ${data.snoozedEntries.length === 0 ? `
              <p class="nexus-empty-text">No rules currently muted. All Overseer telemetry feeds active.</p>
            ` : `
              <div class="nexus-snoozed-list">
                ${data.snoozedEntries.map(([ruleId, record]) => {
                  const friendly = formatFriendlyRuleName(ruleId, record);
                  const timeText = record.type === 'forever'
                    ? 'Muted Permanently'
                    : `Muted until ${new Date(record.untilTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  return `
                    <div class="nexus-snoozed-item">
                      <div class="snooze-info">
                        <div class="snooze-title-row">
                          <span class="snooze-icon">${renderAssistantIcon(friendly.icon)}</span>
                          <span class="nexus-snooze-title">${friendly.title}</span>
                          ${friendly.coords ? `
                            <div class="nexus-snoozed-planet-badge">
                              ${friendly.planetImgUrl ? `<img src="${friendly.planetImgUrl}" class="nexus-snoozed-planet-thumb" alt="" />` : `<span class="planet-emoji">🪐</span>`}
                              <span>${friendly.planetName ? `${friendly.planetName} ` : ''}[${friendly.coords}]</span>
                            </div>
                          ` : ''}
                        </div>
                        <span class="nexus-snooze-type">${timeText}</span>
                      </div>
                      <button class="nexus-btn-unsnooze" data-unsnooze-id="${ruleId}">Restore Rule</button>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    }

    if (currentList.length === 0) {
      return `
        <div class="nexus-modal-empty-state">
          <div class="empty-icon">🛡️</div>
          <h3>Perimeter Secure</h3>
          <p>No active anomalies or warnings detected in this sector. All telemetry is nominal.</p>
        </div>
      `;
    }

    return `
      <div class="nexus-cards-grid">
        ${currentList.map(note => {
          const isDeepSpace = (note.coords && (note.coords.endsWith(':16') || note.coords.includes(':16]'))) 
            || note.badgeText === 'EXPEDITION' 
            || note.badgeText === 'EXPEDITIONS' 
            || note.badgeText === 'DEPLETION'
            || note.ruleId?.includes('expedition') 
            || note.planetName === 'Deep Space';
          const defaultLabel = isDeepSpace ? 'Deep Space' : 'Planet';
          const planetEmoji = isDeepSpace ? '🌌' : '🪐';
          const planetLabel = note.planetName && note.planetName !== 'Planet' ? note.planetName : defaultLabel;

          const coordsHtml = note.coords
            ? `
              <div class="card-planet-pill">
                ${note.planetImgUrl ? `<img src="${note.planetImgUrl}" class="nexus-card-planet-thumb" alt="" />` : `<span class="planet-emoji">${planetEmoji}</span>`}
                <span class="nexus-card-planet-name">${planetLabel}</span>
                <span class="nexus-card-planet-coords">[${note.coords}]</span>
              </div>
            `
            : '';

          return `
            <div class="nexus-notification-card severity-${note.severity}">
              <div class="card-inner-shell">
                <div class="card-header">
                  <div class="card-title-wrap">
                    <span class="card-icon${note.iconTooltip ? ' nexus-tooltip' : ''}" ${note.iconTooltip ? `data-nexus-tooltip="${note.iconTooltip.replace(/"/g, '&quot;')}"` : ''}>${renderAssistantIcon(note.icon)}</span>
                    <span class="card-badge badge-${note.severity}">${note.badgeText || 'ALERT'}</span>
                    <h4 class="card-title">${note.title}</h4>
                  </div>
                  ${coordsHtml}
                </div>

                <div class="card-body">
                  <p class="card-message">${note.message}</p>
                </div>

                <div class="card-footer">
                  <div class="card-snooze-actions">
                    <button class="nexus-card-btn-snooze" data-snooze-id="${note.id}" data-snooze-type="until" title="Mute this specific alert for 24 hours">Snooze 24h</button>
                    <button class="nexus-card-btn-snooze" data-snooze-id="${note.id}" data-snooze-type="forever" title="Never show this specific alert again">Mute Forever</button>
                  </div>

                  ${note.actionUrl ? `
                    <a href="${note.actionUrl}" class="nexus-card-action-btn" target="_self">
                      <span>${note.actionLabel || 'Inspect'}</span>
                      <span class="nexus-action-chevron">↗</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  const attachModalEvents = () => {
    // Close button & outside click
    overlay.querySelector('.nexus-modal-close-btn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Refresh / Re-scan button
    overlay.querySelector('.nexus-modal-refresh-btn')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('.nexus-modal-refresh-btn') as HTMLElement | null;
      if (btn) btn.style.opacity = '0.5';
      activeNotifications = await evaluateAllNotifications(playerId);
      settings = await getAssistantSettings();
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });

    // Action buttons (e.g. Open Nexus Terminal)
    overlay.querySelectorAll('.nexus-card-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const href = btn.getAttribute('href');
        if (href === '#open-nexus-terminal' || href?.includes('nexusTab=')) {
          e.preventDefault();
          overlay.remove();
          const terminalBtn = document.querySelector('#og-nexus-icon-modal-btn') as HTMLElement | null;
          if (terminalBtn) {
            terminalBtn.click();
          }
        }
      });
    });

    overlay.querySelectorAll('.nexus-modal-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        currentTab = tabBtn.getAttribute('data-tab') as TabId;
        renderModalContent();
      });
    });

    // Snooze buttons
    overlay.querySelectorAll('.nexus-card-btn-snooze').forEach(snoozeBtn => {
      snoozeBtn.addEventListener('click', async () => {
        const id = snoozeBtn.getAttribute('data-snooze-id');
        const type = (snoozeBtn.getAttribute('data-snooze-type') || 'until') as 'forever' | 'until';
        if (id) {
          const targetNote = activeNotifications.find(n => n.id === id);
          await snoozeNotification(targetNote || id, type, 24);
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Unsnooze buttons in settings
    overlay.querySelectorAll('.nexus-btn-unsnooze').forEach(unsnoozeBtn => {
      unsnoozeBtn.addEventListener('click', async () => {
        const id = unsnoozeBtn.getAttribute('data-unsnooze-id');
        if (id) {
          await unsnoozeNotification(id);
          activeNotifications = await evaluateAllNotifications(playerId);
          settings = await getAssistantSettings();
          renderModalContent();
          if (onUpdateCallback) onUpdateCallback();
        }
      });
    });

    // Input comma formatting on numeric fields
    overlay.querySelectorAll<HTMLInputElement>('.nexus-input-group input').forEach(input => {
      input.addEventListener('input', () => {
        const clean = input.value.replace(/[^0-9]/g, '');
        if (clean) {
          const num = parseInt(clean, 10);
          if (!isNaN(num)) {
            input.value = num.toLocaleString('en-US');
          }
        } else {
          input.value = '';
        }
      });
    });

    // Overseer Master Enable Toggle
    overlay.querySelector('#setting-overseer-enabled')?.addEventListener('change', async (e) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      settings.enabled = isChecked;
      await saveAssistantSettings(settings);
      
      const barEl = document.querySelector('#og-nexus-assistant-bar');
      if (!isChecked && barEl) {
        barEl.remove();
      }
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });

    // Save Thresholds button
    overlay.querySelector('#save-thresholds-btn')?.addEventListener('click', async () => {
      const enabledCheckbox = overlay.querySelector('#setting-overseer-enabled') as HTMLInputElement | null;
      if (enabledCheckbox) {
        settings.enabled = enabledCheckbox.checked;
        const barEl = document.querySelector('#og-nexus-assistant-bar');
        if (!settings.enabled && barEl) {
          barEl.remove();
        }
      }

      const storageInput = overlay.querySelector('#setting-storage-overflow-hours') as HTMLInputElement | null;
      const fleetInput = overlay.querySelector('#setting-fleet-save-msu') as HTMLInputElement | null;
      const debrisInput = overlay.querySelector('#setting-min-debris-msu') as HTMLInputElement | null;
      const artifactsInput = overlay.querySelector('#setting-artifacts-threshold') as HTMLInputElement | null;
      const officerInput = overlay.querySelector('#setting-officer-expiry-hours') as HTMLInputElement | null;
      const depletionInput = overlay.querySelector('#setting-expo-depletion-pct') as HTMLInputElement | null;

      const parseNum = (input: HTMLInputElement | null, fallback: number) => {
        if (!input) return fallback;
        const clean = input.value.replace(/[^0-9]/g, '');
        const num = parseInt(clean, 10);
        return isNaN(num) ? fallback : num;
      };

      settings.thresholds.storageOverflowHours = parseNum(storageInput, 3);
      settings.thresholds.minFleetSaveMsu = parseNum(fleetInput, 1000000);
      settings.thresholds.minDebrisMsu = parseNum(debrisInput, 1000000);
      settings.thresholds.artifactsWarningThreshold = parseNum(artifactsInput, 3000);
      settings.thresholds.officerExpiryHours = parseNum(officerInput, 12);
      settings.thresholds.maxExpoDepletionPct = parseNum(depletionInput, 10);

      await saveAssistantSettings(settings);
      activeNotifications = await evaluateAllNotifications(playerId);
      renderModalContent();
      if (onUpdateCallback) onUpdateCallback();
    });
  };

  document.body.appendChild(overlay);
  renderModalContent();
}
