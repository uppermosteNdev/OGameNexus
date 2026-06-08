function isExtensionStillValid() {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
}

export interface ScrapedEspionage {
    messageId: string;
    playerId: string;
    playerName: string;
    planetId: string;
    coords: string;
    timestamp: number;
    metal: number;
    crystal: number;
    deuterium: number;
    playerStatus: string[];
    hashcode: string;
    lootPercentage?: number;
    metalStorageLevel?: number;
    crystalStorageLevel?: number;
    deuteriumStorageLevel?: number;
    hasTraderClass?: boolean;
}

function extractStorageAndAllianceDetails(msg: Element, msgContainer: Element | null) {
    const hiddenBuildings = msg.getAttribute('data-raw-hiddenbuildings');
    const buildingsRaw = msg.getAttribute('data-raw-buildings');
    
    let metalStorageLevel: number | undefined;
    let crystalStorageLevel: number | undefined;
    let deuteriumStorageLevel: number | undefined;
    
    if (buildingsRaw && !hiddenBuildings) {
        try {
            const buildings = JSON.parse(buildingsRaw);
            if (buildings['22'] !== undefined) metalStorageLevel = parseInt(buildings['22'], 10);
            if (buildings['23'] !== undefined) crystalStorageLevel = parseInt(buildings['23'], 10);
            if (buildings['24'] !== undefined) deuteriumStorageLevel = parseInt(buildings['24'], 10);
        } catch (e) {
            console.error("OGame Nexus: Error parsing data-raw-buildings JSON", e);
        }
    }

    const allianceClassRaw = msg.getAttribute('data-raw-allianceclass');
    let hasTraderClass = false;
    if (allianceClassRaw) {
        try {
            const allianceClass = JSON.parse(allianceClassRaw);
            if (allianceClass.icon === 'trader' || allianceClass.id === 3) {
                hasTraderClass = true;
            }
        } catch (e) {
            if (allianceClassRaw.includes('trader') || allianceClassRaw.includes('3')) {
                hasTraderClass = true;
            }
        }
    } else {
        const filtersAllianceClass = msgContainer?.getAttribute('data-messages-filters-allianceclass');
        if (filtersAllianceClass) {
            try {
                const allianceClass = JSON.parse(filtersAllianceClass);
                if (allianceClass.icon === 'trader' || allianceClass.id === 3) {
                    hasTraderClass = true;
                }
            } catch (e) {}
        }
    }

    return { metalStorageLevel, crystalStorageLevel, deuteriumStorageLevel, hasTraderClass };
}

export function scrapeEspionageMessages(): ScrapedEspionage[] {
    // Select all rawMessageData divs where the hashcode starts with "sr-" (Spy Report)
    const espionageMessages = document.querySelectorAll('div.rawMessageData[data-raw-hashcode^="sr-"]:not([data-og-nexus-processed="true"])');
    const results: ScrapedEspionage[] = [];

    for (const msg of espionageMessages) {
        const msgContainer = msg.closest('.msg');
        const messageId = msgContainer?.getAttribute('data-msg-id');
        if (!messageId) continue;

        // Only track planets (planet type 1), skip moons (planet type 3)
        const targetPlanetType = msg.getAttribute('data-raw-targetplanettype');
        if (targetPlanetType !== '1') {
            msg.setAttribute('data-og-nexus-processed', 'true');
            continue;
        }

        const timestampRaw = msg.getAttribute('data-raw-timestamp');
        const coordsRaw = msg.getAttribute('data-raw-coordinates') || msg.getAttribute('data-raw-coords');
        const playerName = msg.getAttribute('data-raw-playername');
        const playerId = msg.getAttribute('data-raw-targetplayerid');
        const planetId = msg.getAttribute('data-raw-targetplanetid');
        const playerStatusRaw = msg.getAttribute('data-raw-playerstatus');
        const hashcode = msg.getAttribute('data-raw-hashcode');

        const metal = parseInt(msg.getAttribute('data-raw-metal') || '0', 10);
        const crystal = parseInt(msg.getAttribute('data-raw-crystal') || '0', 10);
        const deuterium = parseInt(msg.getAttribute('data-raw-deuterium') || '0', 10);
        
        // Extract loot percentage from msgContainer's 'data-messages-filters-loot' (e.g. "75%") or fallback to 'data-raw-loot'
        let lootPercentage = 50;
        const filtersLootAttr = msgContainer?.getAttribute('data-messages-filters-loot');
        if (filtersLootAttr) {
            const parsed = parseInt(filtersLootAttr.replace('%', ''), 10);
            if (!isNaN(parsed)) {
                lootPercentage = parsed;
            }
        } else {
            const rawLoot = msg.getAttribute('data-raw-loot');
            if (rawLoot) {
                const parsed = parseInt(rawLoot, 10);
                if (!isNaN(parsed)) {
                    lootPercentage = parsed;
                }
            }
        }

        if (timestampRaw && coordsRaw && playerId && planetId && hashcode) {
            const coords = coordsRaw.replace(/[\[\]]/g, '');
            let playerStatus: string[] = [];
            try {
                if (playerStatusRaw) {
                    playerStatus = JSON.parse(playerStatusRaw);
                }
            } catch (e) {
                // If it's a string representation but not valid JSON array
                if (playerStatusRaw && typeof playerStatusRaw === 'string') {
                    playerStatus = playerStatusRaw.replace(/[\[\]"']/g, '').split(',').map(s => s.trim()).filter(Boolean);
                }
            }

            // Only track inactive and longinactive players
            const isInactive = playerStatus.includes('inactive') || playerStatus.includes('longinactive');
            if (isInactive) {
                const details = extractStorageAndAllianceDetails(msg, msgContainer || null);
                results.push({
                    messageId,
                    playerId,
                    playerName: playerName || 'Unknown',
                    planetId,
                    coords,
                    timestamp: parseInt(timestampRaw, 10),
                    metal,
                    crystal,
                    deuterium,
                    playerStatus,
                    hashcode,
                    lootPercentage,
                    ...details
                });
            }

            // Mark as processed so we don't scrape it again in subsequent observer cycles
            msg.setAttribute('data-og-nexus-processed', 'true');
        }
    }

    return results;
}

const processedRawMessageIds = new Set<string>();

export async function trackEspionageReports(playerId: string) {
    if (!isExtensionStillValid()) return;

    const espionageData = scrapeEspionageMessages();
    if (espionageData.length === 0) return;

    updateScrapedSpyCount(espionageData.length);

    chrome.runtime.sendMessage({
        type: "TRACK_ESPIONAGE",
        data: { espionageReports: espionageData, playerId }
    }, (response) => {
        if (response?.success) {
            response.data.forEach((report: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${report.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    updateEspionageVisuals(msgElement, report);
                }
            });
            triggerSiteTooltips();
        }
    });
}

export function scrapeRawEspionageHTML(htmls: string[]): ScrapedEspionage[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmls.join(''), 'text/html');
    const espionageMessages = doc.querySelectorAll('div.rawMessageData[data-raw-hashcode^="sr-"]');
    const results: ScrapedEspionage[] = [];

    for (const msg of espionageMessages) {
        const msgContainer = msg.closest('.msg');
        const messageId = msgContainer?.getAttribute('data-msg-id');
        if (!messageId) continue;

        // Only track planets (planet type 1), skip moons (planet type 3)
        const targetPlanetType = msg.getAttribute('data-raw-targetplanettype');
        if (targetPlanetType !== '1') {
            continue;
        }

        const timestampRaw = msg.getAttribute('data-raw-timestamp');
        const coordsRaw = msg.getAttribute('data-raw-coordinates') || msg.getAttribute('data-raw-coords');
        const playerName = msg.getAttribute('data-raw-playername');
        const playerId = msg.getAttribute('data-raw-targetplayerid');
        const planetId = msg.getAttribute('data-raw-targetplanetid');
        const playerStatusRaw = msg.getAttribute('data-raw-playerstatus');
        const hashcode = msg.getAttribute('data-raw-hashcode');

        const metal = parseInt(msg.getAttribute('data-raw-metal') || '0', 10);
        const crystal = parseInt(msg.getAttribute('data-raw-crystal') || '0', 10);
        const deuterium = parseInt(msg.getAttribute('data-raw-deuterium') || '0', 10);
        
        // Extract loot percentage from msgContainer's 'data-messages-filters-loot' (e.g. "75%") or fallback to 'data-raw-loot'
        let lootPercentage = 50;
        const filtersLootAttr = msgContainer?.getAttribute('data-messages-filters-loot');
        if (filtersLootAttr) {
            const parsed = parseInt(filtersLootAttr.replace('%', ''), 10);
            if (!isNaN(parsed)) {
                lootPercentage = parsed;
            }
        } else {
            const rawLoot = msg.getAttribute('data-raw-loot');
            if (rawLoot) {
                const parsed = parseInt(rawLoot, 10);
                if (!isNaN(parsed)) {
                    lootPercentage = parsed;
                }
            }
        }

        if (timestampRaw && coordsRaw && playerId && planetId && hashcode) {
            const coords = coordsRaw.replace(/[\[\]]/g, '');
            let playerStatus: string[] = [];
            try {
                if (playerStatusRaw) {
                    playerStatus = JSON.parse(playerStatusRaw);
                }
            } catch (e) {
                // If it's a string representation but not valid JSON array
                if (playerStatusRaw && typeof playerStatusRaw === 'string') {
                    playerStatus = playerStatusRaw.replace(/[\[\]"']/g, '').split(',').map(s => s.trim()).filter(Boolean);
                }
            }

            // Only track inactive and longinactive players
            const isInactive = playerStatus.includes('inactive') || playerStatus.includes('longinactive');
            if (isInactive) {
                const details = extractStorageAndAllianceDetails(msg, msgContainer || null);
                results.push({
                    messageId,
                    playerId,
                    playerName: playerName || 'Unknown',
                    planetId,
                    coords,
                    timestamp: parseInt(timestampRaw, 10),
                    metal,
                    crystal,
                    deuterium,
                    playerStatus,
                    hashcode,
                    lootPercentage,
                    ...details
                });
            }
        }
    }

    return results;
}

export async function trackRawEspionageReports(playerId: string, htmls: string[]) {
    if (!isExtensionStillValid()) return;

    const espionageData = scrapeRawEspionageHTML(htmls);
    if (espionageData.length === 0) return;

    updateScrapedSpyCount(espionageData.length);

    // Filter out reports we've already parsed in this session
    const unprocessedReports = espionageData.filter(report => !processedRawMessageIds.has(report.messageId));
    if (unprocessedReports.length === 0) return;

    // Mark as processed immediately to prevent duplicate sends
    unprocessedReports.forEach(report => processedRawMessageIds.add(report.messageId));

    chrome.runtime.sendMessage({
        type: "TRACK_ESPIONAGE",
        data: { espionageReports: unprocessedReports, playerId }
    }, (response) => {
        if (response?.success) {
            response.data.forEach((report: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${report.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    updateEspionageVisuals(msgElement, report);
                }
            });
            triggerSiteTooltips();
        }
    });
}

export function updateEspionageVisuals(msgElement: HTMLElement, report: any) {
    if (!isExtensionStillValid()) return;

    // Add tracked checkmark icon in footer actions if not already present
    const footerActions = msgElement.querySelector('message-footer-actions') || msgElement.querySelector('.msg_actions');
    if (footerActions && !footerActions.querySelector('.og-nexus-tracked-btn')) {
        const trackedWrapper = document.createElement('gradient-button');
        trackedWrapper.setAttribute('sq28', '');

        const trackedBtn = document.createElement('button');
        trackedBtn.className = 'custom_btn nexus-tooltip og-nexus-tracked-btn';
        trackedBtn.setAttribute('data-nexus-tooltip', 'OGame Nexus: Espionage Tracked');

        trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#22c55e" stroke-width="1.5" />
                <path d="M6 10 L9 13 L14 7" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;

        trackedWrapper.appendChild(trackedBtn);
        footerActions.appendChild(trackedWrapper);
    }
}

function triggerSiteTooltips() {
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
}

export function updateScrapedSpyCount(count: number) {
    const container = document.getElementById('og-nexus-scraping-status');
    const badge = document.getElementById('og-nexus-spy-count-badge');
    if (container && badge) {
        badge.innerText = count.toString();
        container.style.display = 'flex';
        // Give it a brief, beautiful highlight effect
        container.style.transition = 'all 0.3s ease';
        container.style.textShadow = '0 0 8px #22d3ee';
        setTimeout(() => {
            container.style.textShadow = 'none';
        }, 1000);
    }
}

