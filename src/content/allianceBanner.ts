// ============================================================================
// OGame Nexus — In-Game Alliance Overwatch Banner
// Injected on the Alliance Page (page=ingame&component=alliance)
// ============================================================================

export function initAllianceOverwatchBanner() {
  const allianceEl = document.querySelector('#alliance, #inhalt');
  const allianceWrapper = document.querySelector('.alliance_wrapper');
  if (!allianceEl || !allianceWrapper) return;

  // Prevent duplicate banners
  if (document.getElementById('og-nexus-alliance-overwatch-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'og-nexus-alliance-overwatch-banner';
  banner.className = 'og-nexus-overwatch-banner';

  banner.innerHTML = `
    <div class="og-nexus-banner-glow"></div>
    <div class="og-nexus-banner-content">
      <div class="og-nexus-banner-left">
        <div class="og-nexus-banner-icon-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
            <circle cx="12" cy="12" r="3" fill="#00f2ff" fill-opacity="0.3"></circle>
          </svg>
        </div>
        <div class="og-nexus-banner-text">
          <div class="og-nexus-banner-title">
            <span>NEXUS OVERWATCH</span>
            <span class="og-nexus-banner-badge">TACTICAL ALLIANCE RADAR</span>
          </div>
          <p class="og-nexus-banner-subtitle">
            Equip your alliance with shared live espionage, universe change tracking, and 24/7 enemy sleep heatmaps.
          </p>
        </div>
      </div>
      <div class="og-nexus-banner-actions">
        <button id="og-nexus-open-overwatch-btn" class="og-nexus-banner-btn primary">
          <span>Open Overwatch Deck</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Insert immediately above .alliance_wrapper
  allianceWrapper.parentNode?.insertBefore(banner, allianceWrapper);

  // Wire button click to open dashboard with overwatch view
  const openBtn = document.getElementById('og-nexus-open-overwatch-btn');
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD", view: "overwatch" });
        }
      } catch (err) {
        console.warn("OGame Nexus: Error opening dashboard:", err);
      }
    });
  }
}
