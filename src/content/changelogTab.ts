// ==========================================================================
// OGame Nexus - In-Game Changelog & Support Tab inside Messages / News Feed
// ==========================================================================

export interface ChangelogItem {
  type: 'Feature' | 'Bugfix' | 'Data' | 'Polishing' | 'External';
  text: string;
}

export interface ChangelogVersion {
  version: string;
  items: ChangelogItem[];
}

export const NEXUS_CHANGELOGS: ChangelogVersion[] = [
  {
    version: 'v1.2.3',
    items: [
      { type: 'Feature', text: 'Instant Multi-Page Message Scanning: Opening Expeditions or Combat Reports tabs automatically imports and saves all pending reports across all pages in 1 background shot without needing to click through pagination.' },
      { type: 'Bugfix', text: 'Full Moon Background Synchronization: Background and manual sync now correctly synchronizes all moons (resources, fleets, defenses, lunar base, phalanx, jump gate, and active items) directly alongside planets.' },
      { type: 'Feature', text: 'Nexus Overseer Mouse Wheel Navigation: Scroll directly over the Overseer bar or click the animated mouse scroll indicator to cycle forward and backward through all empire alerts.' },
      { type: 'Feature', text: 'Integrated In-Game OGNexus Changelog & Support Tab inside Messages.' },
      { type: 'Polishing', text: 'Empire Daily Yield Calculation Formula: Added interactive info breakdown tooltip next to Empire Daily Yield in Overview.' },
      { type: 'Polishing', text: 'Dynamic Rolling Yield for < 7 Days: Fixed daily average yield divisor to calculate accurately on newly tracked or freshly imported accounts.' },
      { type: 'Polishing', text: 'Synchronized Amortization ROI recommendations and conversion rates between Dashboard and Nexus Overseer.' },
      { type: 'Bugfix', text: 'Fixed cross-account speedup item inventory leakage across multi-account tabs.' },
      { type: 'Bugfix', text: 'Crawlers & Production Calculations: Fixed scraping, saving, and calculation of production percentages (Metal/Crystal/Deuterium Mines, Fusion Reactor, Solar Satellites, and Crawlers overload up to 150%) across the Nexus Terminal Production tab and Amortization Engine.' },
      { type: 'Bugfix', text: "Expedition & Today's Bounty Tracking: Fixed race condition where concurrent multi-page background scans and active tab message scraping caused newly tracked expeditions/discoveries to duplicate counts, and added full Trader, delay/speedup, item, and combat breakdown into the expanded Direct Bounty view." },
      { type: 'Polishing', text: 'Added live countdown ticking badges for ongoing planetary and research queues in Amortization Dashboard.' }
    ]
  }
];

export function injectChangelogTab(): void {
  const mainTabs = document.querySelector('.mainTabs') as HTMLElement | null;
  if (!mainTabs) return;

  const existingTab = mainTabs.querySelector('.nexus_boardMessageTab');
  if (existingTab) return;

  // IMPORTANT: Do NOT include 'singleTab' class here so OGame's jQuery AJAX interceptor doesn't hijack the click!
  const div = document.createElement('div');
  div.className = 'ogl_boardMessageTab nexus_boardMessageTab';

  let iconUrl = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      iconUrl = chrome.runtime.getURL('icons/nexus.png');
    }
  } catch (e) { }

  div.innerHTML = `
    <div class="tabImage">
      ${iconUrl ? `<img src="${iconUrl}" class="nexus-main-tab-img" alt="OGNexus" />` : `<div class="nexus-main-tab-fallback">🌌</div>`}
    </div>
    <div class="tabLabel">OGNexus</div>
    <div class="newMessagesCount nexus_hidden">new</div>
  `;

  // Attach click listener
  div.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wrapper = document.querySelector('#messagewrapper, #messages') as HTMLElement | null;
    if (!wrapper) return;

    wrapper.innerText = '';
    const inner = document.createElement('div');
    inner.id = 'nexusBoardTab';
    wrapper.appendChild(inner);

    const messageComponent = document.querySelector('#messagescomponent, #messagecontainercomponent .messageContent') as HTMLElement | null;
    if (messageComponent) {
      messageComponent.dataset.tab = '0';
    }

    document.querySelectorAll('.mainTabs .marker').forEach(el => el.classList.remove('marker'));
    div.classList.add('marker');

    renderNexusChangelogAndDonations(inner);
  });

  mainTabs.appendChild(div);

  // When any regular OGame tab is clicked, remove our active marker
  const otherTabs = mainTabs.querySelectorAll('.singleTab');
  otherTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      div.classList.remove('marker');
    });
  });
}

function renderNexusChangelogAndDonations(inner: HTMLElement): void {
  let changelogsHtml = '';

  NEXUS_CHANGELOGS.forEach((release, index) => {
    const itemsHtml = release.items.map(item => {
      let tagColor = '#38bdf8'; // Polishing default
      if (item.type === 'Feature') tagColor = '#c084fc';
      else if (item.type === 'Bugfix') tagColor = '#fbbf24';
      else if (item.type === 'Data') tagColor = '#34d399';
      else if (item.type === 'External') tagColor = '#2dd4bf';

      return `
        <div style="margin-bottom: 6px; line-height: 1.55;">
          <span style="color: ${tagColor}; font-weight: 700;">[${item.type}]</span>
          <span style="color: #cbd5e1; margin-left: 5px;">${item.text}</span>
        </div>
      `;
    }).join('');

    changelogsHtml += `
      <div class="nexus_changelog_entry" style="margin-bottom: 24px;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 14px 0;">Changelog ${release.version}</h1>
        ${itemsHtml}
      </div>
      ${index < NEXUS_CHANGELOGS.length - 1 ? `<hr style="background: #282d34; border: none; height: 1px; margin: 30px 0;" />` : ''}
    `;
  });

  const donationsHtml = `
    <hr style="background: #282d34; border: none; height: 2px; margin: 40px 0;" />
    <div class="nexus_donations_card" style="border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; background: rgba(10, 15, 26, 0.95); overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.8);">
      <div style="background: linear-gradient(90deg, #182332, #0d141e); padding: 8px 12px; text-align: center; border-bottom: 1px solid rgba(56, 189, 248, 0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);">
        <h3 style="margin: 0; color: #38bdf8; font-size: 13px; font-weight: 700; text-transform: capitalize; letter-spacing: 0.5px;">Donations</h3>
      </div>
      <div style="padding: 16px 20px; font-size: 12px; line-height: 1.65; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 10px 0;">There are two ways to support the development of this extension:</p>
        <p style="margin: 0 0 10px 0;">Using the donation link here : <a href="https://ko-fi.com/W0M821KSSE" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">Buy me a coffee &lt;3</a></p>
        <p style="margin: 0 0 4px 0;">Using the official Gameforge affiliation link (only works when starting a new universe)</p>
        <div style="margin: 4px 0 0 0; padding-left: 0;">
          <div style="margin-bottom: 3px;">1. Go here : <a href="https://hero.li/OGame-Vendetta" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">https://hero.li/OGame-Vendetta</a></div>
          <div style="margin-bottom: 3px;">2. Click on the &quot;play button&quot; and login with your Gameforge Account to it</div>
          <div style="margin-bottom: 3px;">3. Your lobby is now connected to OGame Nexus for the next <span style="color: #f97316; font-weight: 700;">24h</span>, then, starting a <span style="text-decoration: underline;">new universe</span> will link it to the OGame Nexus affiliate programme for the next <span style="color: #f97316; font-weight: 700;">12 months</span></div>
        </div>
        <p style="margin: 8px 0 16px 0; color: #94a3b8; font-size: 11.5px;">For this period, each time you purchase Darkmatter on this universe, a portion goes to support OGame Nexus development (while keeping the exact same price and DM amount for you)</p>
        <p style="margin: 0; font-weight: 600; color: #cbd5e1;">Thank you !</p>
      </div>
    </div>
  `;

  inner.innerHTML = `
    <div class="msg ogl_feedMessage" style="color: #b1b1b2; background: #101419; padding: 35px 25px; line-height: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
      ${changelogsHtml}
      ${donationsHtml}
    </div>
  `;
}
