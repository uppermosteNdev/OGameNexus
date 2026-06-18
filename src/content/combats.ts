
import { flyToNexusButton } from './effects';

function isExtensionStillValid() {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
}

export function formatExactNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
}

export function formatNumber(num: number): string {
    const n = num || 0;
    const d = 2;
    if (n >= 1000000000000) return (n / 1000000000000).toFixed(d) + 'T';
    if (n >= 1000000000) return (n / 1000000000).toFixed(d) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(d) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(d) + 'K';
    return Math.round(n).toString();
}

export function scrapeCombatMessages() {
    const combatMessages = document.querySelectorAll('div.rawMessageData[data-raw-messagetype="25"]:not([data-og-nexus-processed="true"])');
    const results = [];

    for (const msg of combatMessages) {
        const messageId = msg.closest('.msg')?.getAttribute('data-msg-id');
        if (!messageId) continue;

        const timestamp = msg.getAttribute('data-raw-timestamp');
        const coordsRaw = msg.getAttribute('data-raw-coords');
        const resultRaw = msg.getAttribute('data-raw-result');
        const fleetsRaw = msg.getAttribute('data-raw-fleets');

        if (timestamp && coordsRaw && resultRaw) {
            try {
                const result = JSON.parse(resultRaw);
                const coords = coordsRaw.replace(/[\[\]]/g, '');

                // Extract Loot
                const loot: any = { metal: 0, crystal: 0, deuterium: 0, food: 0 };
                if (result.loot && Array.isArray(result.loot.resources)) {
                    result.loot.resources.forEach((r: any) => {
                        if (loot.hasOwnProperty(r.resource)) {
                            loot[r.resource] = r.amount;
                        }
                    });
                }

                // Extract Debris
                const debris: any = { metal: 0, crystal: 0, deuterium: 0 };
                if (result.debris && Array.isArray(result.debris.resources)) {
                    result.debris.resources.forEach((r: any) => {
                        if (debris.hasOwnProperty(r.resource)) {
                            debris[r.resource] = r.total;
                        }
                    });
                }

                // Extract Losses
                let attackerLosses = 0;
                let defenderLosses = 0;
                if (Array.isArray(result.totalValueOfUnitsLost)) {
                    result.totalValueOfUnitsLost.forEach((l: any) => {
                        if (l.side === 'attacker') attackerLosses = l.value;
                        else if (l.side === 'defender') defenderLosses = l.value;
                    });
                }

                // Check for ACS
                let isAcs = false;
                try {
                    const fleets = JSON.parse(fleetsRaw || '[]');
                    // If multiple participants on either side, it's ACS (or at least looks like it)
                    if (Array.isArray(fleets) && fleets.length > 2) {
                        isAcs = true;
                    }
                } catch (e) { }

                // Identify expedition and names
                const isExpedition = coords.trim().endsWith(':16');
                const attackers = Array.isArray(result.attackers) ? result.attackers : [];
                const defenders = Array.isArray(result.defenders) ? result.defenders : [];
                
                // Usually take the first name as primary
                let attackerName = attackers[0]?.name || 'Unknown';
                let defenderName = defenders[0]?.name || 'Unknown';

                // FALLBACK: Parse from message head if metadata is missing names
                if (attackerName === 'Unknown' || (defenderName === 'Unknown' && !isExpedition)) {
                    // Try multiple possible header selectors
                    const msgContainer = msg.closest('.msg');
                    const header = msgContainer?.querySelector('.msg_title, .msg_head, .msgHead, .msgHeadInternal, .msg_title_text');
                    const headText = header?.textContent || '';
                    
                    const parenMatch = headText.match(/\((.*?)\)/);
                    if (parenMatch) {
                        const content = parenMatch[1];
                        const parts = content.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            // Split by first colon to handle names that might contain colons
                            const aContent = parts[0];
                            const dContent = parts[1];
                            
                            const aColonIdx = aContent.indexOf(':');
                            const dColonIdx = dContent.indexOf(':');
                            
                            if (attackerName === 'Unknown' && aColonIdx !== -1) {
                                attackerName = aContent.substring(aColonIdx + 1).trim();
                            }
                            if (defenderName === 'Unknown' && dColonIdx !== -1) {
                                defenderName = dContent.substring(dColonIdx + 1).trim();
                            }
                        }
                    }
                }

                // FALLBACK 2: Parse from message body if still Unknown
                if (attackerName === 'Unknown' || defenderName === 'Unknown' || defenderName === 'Expedition Hostile' || (isExpedition && (defenderName === 'Pirates' || defenderName === 'Aliens'))) {
                    const msgContainer = msg.closest('.msg');
                    const bodyText = msgContainer?.querySelector('.msgContent, .msg_content')?.textContent || '';
                    
                    if (bodyText) {
                        // Regex to find "Attacker: (Name)" or "Defender: (Name)"
                        // We support multiple languages by looking for the colon and parentheses pattern
                        // Examples: "Attacker: (Aliens)", "Defender: (Vendetta)", "Angreifer: (Discovery)"
                        const aMatch = bodyText.match(/(?:Attacker|Angreifer|Attaquant|Attaccante|Agresor|Atacante):\s*\((.*?)\)/i);
                        const dMatch = bodyText.match(/(?:Defender|Verteidiger|Défenseur|Difensore|Defensor):\s*\((.*?)\)/i);
                        
                        if (attackerName === 'Unknown' && aMatch) attackerName = aMatch[1].trim();
                        
                        // For Defender, if it's already "Pirates" or "Aliens" from the header, we might want to keep the body's name if it's more specific
                        if ((defenderName === 'Unknown' || defenderName === 'Expedition Hostile' || defenderName === 'Pirates' || defenderName === 'Aliens') && dMatch) {
                            defenderName = dMatch[1].trim();
                        }
                    }
                }

                results.push({
                    messageId,
                    timestamp: parseInt(timestamp),
                    coords,
                    winner: result.winner || 'none',
                    loot,
                    debris,
                    attackerLosses,
                    defenderLosses,
                    attackerName,
                    defenderName,
                    honor: result.honor?.attacker || 0,
                    moonChance: result.moonCreation?.chance || 0,
                    isAcs,
                    isExpedition,
                    tracked: false,
                    rawFleets: JSON.parse(fleetsRaw || '[]'),
                    rawResult: result
                });

                // Mark as processed
                msg.setAttribute('data-og-nexus-processed', 'true');
            } catch (e) {
                console.error('OGame Nexus: Failed to parse combat report JSON', e);
            }
        }
    }

    return results;
}

export async function trackCombatReports(playerId: string) {
    if (!isExtensionStillValid()) return;

    const combatData = scrapeCombatMessages();
    if (combatData.length === 0) return;

    chrome.runtime.sendMessage({
        type: "TRACK_COMBATS",
        data: { combats: combatData, playerId }
    }, (response) => {
        if (response?.success) {
            response.data.forEach((combat: any) => {
                const msgElement = document.querySelector(`.msg[data-msg-id="${combat.messageId}"]`) as HTMLElement;
                if (msgElement) {
                    updateCombatVisuals(msgElement, combat);

                    if (combat.isNew) {
                        setTimeout(() => {
                            const icons: string[] = [];
                            // Animation with combat icon and resource icons
                            icons.push(chrome.runtime.getURL('icons/misc/expedition-ships-icon-medium.png'));
                            if (combat.loot?.metal > 0 || combat.debris?.metal > 0) icons.push(chrome.runtime.getURL('icons/resources/metal-icon-medium.jpg'));
                            if (combat.loot?.crystal > 0 || combat.debris?.crystal > 0) icons.push(chrome.runtime.getURL('icons/resources/crystal-icon-medium.jpg'));

                            flyToNexusButton(msgElement, icons);
                        }, 100);
                    }
                }
            });
            if (response.newCount && response.newCount > 0) {
                newCombatsCount += response.newCount;
                injectTodayCombatSummaryCard(playerId, true);
            }
            triggerSiteTooltips();
        }
    });
}

export function updateCombatVisuals(msgElement: HTMLElement, combat: any) {
    if (!isExtensionStillValid()) return;

    // 1. Add tracked icon in footer
    const footerActions = msgElement.querySelector('message-footer-actions') || msgElement.querySelector('.msg_actions');
    if (footerActions && !footerActions.querySelector('.og-nexus-tracked-btn')) {
        const trackedWrapper = document.createElement('gradient-button');
        trackedWrapper.setAttribute('sq28', '');

        const trackedBtn = document.createElement('button');
        trackedBtn.className = 'custom_btn nexus-tooltip og-nexus-tracked-btn';
        trackedBtn.setAttribute('data-nexus-tooltip', 'OGame Nexus: Message Tracked');

        trackedBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="margin: 4px;">
                <circle cx="10" cy="10" r="9" fill="none" stroke="#9ca3af" stroke-width="1.5" />
                <path d="M6 10 L9 13 L14 7" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;

        trackedWrapper.appendChild(trackedBtn);
        footerActions.appendChild(trackedWrapper);
    }

    // 2. Add debris summary pill
    if (combat.debris && !msgElement.querySelector('.og-nexus-combat-debris-summary')) {
        const container = document.createElement('div');
        container.className = 'og-nexus-combat-debris-summary og-nexus-result-container';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 8px 0;
            gap: 6px;
            position: relative;
            z-index: 1;
        `;

        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'nexus-tooltip rarity-pill-common';
        layoutWrapper.setAttribute('data-nexus-tooltip', `Created Debris: ${formatExactNumber(combat.debris.metal)} Metal, ${formatExactNumber(combat.debris.crystal)} Crystal`);
        layoutWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background-color: rgba(10, 15, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            padding: 4px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            cursor: default;
        `;

        const addResourceItem = (resName: string, resAmount: number, iconUrl: string, color: string) => {
            const isZero = resAmount === 0;
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: ${isZero ? 0.6 : 1};
                filter: ${isZero ? 'grayscale(0.8)' : 'none'};
            `;

            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 20px;
                height: 20px;
                background-image: url('${chrome.runtime.getURL(iconUrl)}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            `;

            const amountLabel = document.createElement('div');
            amountLabel.textContent = formatNumber(resAmount);
            amountLabel.style.cssText = `
                font-size: 12px;
                font-weight: bold;
                font-family: 'Verdana', sans-serif;
                color: ${isZero ? '#9ca3af' : color};
            `;

            item.appendChild(icon);
            item.appendChild(amountLabel);
            layoutWrapper.appendChild(item);
        };

        addResourceItem('metal', combat.debris.metal, 'icons/resources/metal-icon-medium.jpg', '#E6953C');
        addResourceItem('crystal', combat.debris.crystal, 'icons/resources/crystal-icon-medium.jpg', '#4CAEE6');

        container.appendChild(layoutWrapper);

        const head = msgElement.querySelector('.msgHead');
        if (head && head.nextSibling) {
            msgElement.insertBefore(container, head.nextSibling);
        } else {
            msgElement.appendChild(container);
        }
    }
}

function triggerSiteTooltips() {
    window.dispatchEvent(new CustomEvent('ogame-nexus-trigger-tooltips'));
}

export function formatCompactNumber(num: number): string {
    return formatNumber(num);
}

function animateValue(obj: HTMLElement, start: number, end: number, duration: number) {
    if (start === end) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeProgress * (end - start) + start);
        obj.textContent = formatCompactNumber(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = formatCompactNumber(end);
        }
    };
    window.requestAnimationFrame(step);
}

let newCombatsCount = 0;

function updateCombatBadgeState(wrapper: HTMLElement) {
    const card = wrapper.querySelector('.og-nexus-combat-summary-card') as HTMLElement;
    if (!card) return;

    let badge = card.querySelector('.og-nexus-new-combat-badge') as HTMLElement;
    if (newCombatsCount > 0) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'og-nexus-new-combat-badge nexus-tooltip';
            card.appendChild(badge);
        }
        badge.textContent = `${newCombatsCount} New`;
        badge.setAttribute('data-nexus-tooltip', `${newCombatsCount} new combat reports tracked`);
    } else {
        if (badge) {
            badge.remove();
        }
    }
}

function updateCombatCardClickability(wrapper: HTMLElement) {
    const card = wrapper.querySelector('.og-nexus-combat-summary-card') as HTMLElement;
    if (!card) return;

    if (newCombatsCount > 0) {
        card.classList.add('clickable');
        card.style.cursor = 'pointer';
    } else {
        card.classList.remove('clickable');
        card.style.cursor = 'default';
    }
}

export async function injectTodayCombatSummaryCard(playerId: string, forceLoad: boolean = false) {
    if (!isExtensionStillValid()) return;

    let existingWrapper = document.querySelector('.og-nexus-combat-summary-wrapper') as HTMLElement;

    const isCombatsTabActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="21"]');

    if (existingWrapper) {
        existingWrapper.style.display = isCombatsTabActive ? 'flex' : 'none';
        updateCombatBadgeState(existingWrapper);
        updateCombatCardClickability(existingWrapper);
        if (!isCombatsTabActive) return;
        if (!forceLoad) return;
    } else {
        if (!isCombatsTabActive) return;
    }

    chrome.runtime.sendMessage({
        type: "GET_TODAY_COMBAT_STATS",
        data: { playerId }
    }, (response) => {
        if (!isExtensionStillValid() || !response?.success) return;

        const paginator = document.querySelector('.messagePaginator');
        if (!paginator) return;

        const allWrappers = document.querySelectorAll('.og-nexus-combat-summary-wrapper');
        existingWrapper = null as any;

        allWrappers.forEach((el, idx) => {
            if (idx === 0 && el.nextElementSibling === paginator) {
                existingWrapper = el as HTMLElement;
            } else {
                el.remove();
            }
        });

        const totals = response.totals;

        if (existingWrapper) {
            const currentIsActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="21"]');
            existingWrapper.style.display = currentIsActive ? 'flex' : 'none';
            updateCombatBadgeState(existingWrapper);
            updateCombatCardClickability(existingWrapper);

            const valDivs = existingWrapper.querySelectorAll('.og-nexus-value');
            if (valDivs.length >= 5) {
                const newValues = [
                    totals.metal || 0,
                    totals.crystal || 0,
                    totals.deuterium || 0,
                    totals.damageDealt || 0,
                    totals.debrisGenerated || 0
                ];

                let anyChanged = false;
                valDivs.forEach((div, i) => {
                    const startVal = parseInt(div.getAttribute('data-value') || '0');
                    const endVal = newValues[i];
                    if (startVal !== endVal) {
                        anyChanged = true;
                        div.setAttribute('data-value', endVal.toString());
                        animateValue(div as HTMLElement, startVal, endVal, 1000);
                    }
                });

                if (anyChanged) {
                    const mainIcon = existingWrapper.querySelector('.og-nexus-main-combat-icon') as HTMLElement;
                    const pill = existingWrapper.querySelector('.og-nexus-combat-summary-card') as HTMLElement;
                    if (mainIcon && pill) {
                        const shadowColor = 'rgba(239, 68, 68, 0.6)';
                        const scale = 1.35;
                        const cardGlow = '0 8px 32px rgba(239, 68, 68, 0.3)';

                        mainIcon.style.transform = `scale(${scale}) rotate(15deg)`;
                        mainIcon.style.filter = `drop-shadow(0 0 15px ${shadowColor})`;
                        pill.style.boxShadow = cardGlow;

                        setTimeout(() => {
                            mainIcon.style.transform = 'scale(1) rotate(0deg)';
                            mainIcon.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.2))';
                            pill.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
                        }, 1300);
                    }
                }
            }
            return;
        }

        const currentIsActive = !!document.querySelector('div.innerTabItem.active[data-subtab-id="21"]');

        const wrapper = document.createElement('div');
        wrapper.className = 'og-nexus-combat-summary-wrapper';
        wrapper.style.cssText = `
            display: ${currentIsActive ? 'flex' : 'none'};
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin: 12px 0;
            position: relative;
            z-index: 10;
        `;

        const pillRow = document.createElement('div');
        pillRow.className = 'og-nexus-pill-row';
        pillRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            gap: 16px;
        `;
        wrapper.appendChild(pillRow);

        const card = document.createElement('div');
        card.className = 'og-nexus-combat-summary-card';
        card.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 24px;
            background: linear-gradient(135deg, rgba(20, 26, 32, 0.85) 0%, rgba(10, 15, 20, 0.92) 100%);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-family: 'Segoe UI', 'Roboto', 'Inter', system-ui, sans-serif;
            position: relative;
            overflow: visible;
            box-sizing: border-box;
            width: auto;
        `;

        const mainIcon = document.createElement('img');
        mainIcon.className = 'og-nexus-main-combat-icon';
        mainIcon.src = chrome.runtime.getURL('icons/misc/expedition-ships-icon-medium.png');
        mainIcon.style.cssText = `
            width: 38px;
            height: 38px;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2));
            transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 2;
        `;
        pillRow.appendChild(mainIcon);

        const statsRow = document.createElement('div');
        statsRow.className = 'og-nexus-stats-row';
        statsRow.style.cssText = `display: flex; align-items: center; gap: 24px; z-index: 1;`;

        const resConfigs = [
            { val: totals.metal || 0, color: '#E6953C', icon: 'icons/resources/metal-icon-medium.jpg', label: 'Metal' },
            { val: totals.crystal || 0, color: '#4CAEE6', icon: 'icons/resources/crystal-icon-medium.jpg', label: 'Crystal' },
            { val: totals.deuterium || 0, color: '#43D159', icon: 'icons/resources/deuterium-icon-medium.jpg', label: 'Deuterium' },
            { val: totals.damageDealt || 0, color: '#ef4444', icon: 'icons/research/weapons-tech-research-large.jpg', label: 'Damage Dealt' },
            { val: totals.debrisGenerated || 0, color: '#6ee7b7', icon: 'icons/ships/recycler-large.jpg', label: 'Debris Generated' }
        ];

        resConfigs.forEach(res => {
            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; gap: 8px;`;

            const icon = document.createElement('img');
            icon.src = chrome.runtime.getURL(res.icon);
            icon.style.cssText = `width: 20px; height: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4);`;

            const value = document.createElement('div');
            value.className = 'og-nexus-value';
            value.setAttribute('data-value', res.val.toString());
            value.textContent = formatCompactNumber(res.val);
            value.style.cssText = `font-size: 15px; font-weight: 700; color: ${res.color}; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; letter-spacing: 0.3px; min-width: 45px; text-align: left;`;

            item.className = 'nexus-tooltip';
            item.setAttribute('data-nexus-tooltip', `${res.val.toLocaleString()} ${res.label}`);
            item.appendChild(icon);
            item.appendChild(value);
            statsRow.appendChild(item);
        });

        card.appendChild(statsRow);
        pillRow.appendChild(card);
        paginator.parentNode?.insertBefore(wrapper, paginator);

        updateCombatBadgeState(wrapper);
        updateCombatCardClickability(wrapper);

        card.addEventListener('click', () => {
            if (newCombatsCount > 0) {
                newCombatsCount = 0;
                updateCombatBadgeState(wrapper);
                updateCombatCardClickability(wrapper);
            }
        });

        triggerSiteTooltips();
    });
}
