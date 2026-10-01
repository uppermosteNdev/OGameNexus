// This script runs in the "MAIN" world, meaning it has access to the page's global variables like 'initOverlays'

// Initialize OGLight suppression attribute as early as possible in the MAIN world
try {
    const cachedCleanOGLight = localStorage.getItem('og_nexus_clean_oglight');
    const shouldClean = cachedCleanOGLight !== 'false';
    if (document.documentElement) {
        document.documentElement.setAttribute('data-nexus-clean-oglight', String(shouldClean));
    }
} catch (e) {}

// Listen for updates from content script
window.addEventListener('ogame-nexus-settings-updated', (e: any) => {
    try {
        const removeOGLight = e.detail?.removeOGLightDuplicates !== false;
        localStorage.setItem('og_nexus_clean_oglight', String(removeOGLight));
        if (document.documentElement) {
            document.documentElement.setAttribute('data-nexus-clean-oglight', String(removeOGLight));
        }
    } catch (err) {}
});

function getActiveSubtabId(msgMgr?: any): string {
    const activeSubtabEl = document.querySelector('div.innerTabItem.active[data-subtab-id]');
    if (activeSubtabEl) {
        const id = activeSubtabEl.getAttribute('data-subtab-id');
        if (id) return id;
    }
    const container = document.querySelector('#messagescomponent, #messagecontainercomponent') as HTMLElement | null;
    if (container && container.dataset.tab) {
        return container.dataset.tab;
    }
    if (msgMgr && msgMgr.tabID) {
        return String(msgMgr.tabID);
    }
    const htmlSubtab = document.documentElement?.getAttribute('data-nexus-active-subtab');
    if (htmlSubtab) {
        return htmlSubtab;
    }
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab) return tab;
    } catch (e) {}
    return '';
}

function updateActiveSubtabAttr(subtab?: string | null) {
    try {
        if (!document.documentElement) return;
        const target = subtab || getActiveSubtabId();
        if (target) {
            document.documentElement.setAttribute('data-nexus-active-subtab', target);
        }
    } catch (e) {}
}

// Initial active subtab detection
updateActiveSubtabAttr();

// Sync active subtab when switching tabs via user click
document.addEventListener('click', (e) => {
    const tabEl = (e.target as HTMLElement)?.closest('div.innerTabItem, div.singleTab');
    if (tabEl) {
        const subtabId = tabEl.getAttribute('data-subtab-id') || tabEl.getAttribute('data-category-id');
        if (subtabId) {
            updateActiveSubtabAttr(subtabId);
        }
    }
}, true);

function shouldSuppressOGLightCards(): boolean {
    try {
        return document.documentElement.getAttribute('data-nexus-clean-oglight') !== 'false';
    } catch {
        return true;
    }
}

function patchMessageManager(msgMgr: any) {
    if (!msgMgr || msgMgr.__nexusPatched) return;
    msgMgr.__nexusPatched = true;

    const origSummarize = msgMgr.summarize;
    if (typeof origSummarize === 'function') {
        msgMgr.summarize = function(message: any) {
            if (shouldSuppressOGLightCards()) {
                const activeSubtab = getActiveSubtabId(msgMgr);
                const isCombatTab = activeSubtab === '21';
                const isExpeditionTab = activeSubtab === '22';

                // Strictly enforce suppression ONLY for Combat Reports (21) and Expeditions (22) tabs!
                // All other tabs (Unions/Transport 23, Other 24, Espionage 20, etc.) must NEVER be suppressed!
                if (isCombatTab || isExpeditionTab) {
                    const type = Number(message?.globalTypeID);
                    const shouldSuppress = (isCombatTab && (type === 25 || type === 48 || type === 54)) ||
                                           (isExpeditionTab && (type === 41 || type === 61));

                    if (shouldSuppress) {
                        const dom = document.querySelector(`[data-msg-id="${message?.id}"]`);
                        if (dom) {
                            const content = dom.querySelector('.msgContent');
                            if (content) content.classList.remove('ogl_hidden');
                            dom.querySelectorAll('.ogl_battle').forEach(el => el.remove());
                        }
                        return; // Skip OGLight visual creation entirely on Combat & Expedition tabs
                    }
                }
            }
            return origSummarize.apply(this, arguments);
        };
    }
}

function patchOGL(ogl: any) {
    if (!ogl || typeof ogl !== 'object') return;
    if (ogl._message) {
        patchMessageManager(ogl._message);
    }
    
    // Also intercept future assignment of _message
    let _msg = ogl._message;
    try {
        Object.defineProperty(ogl, '_message', {
            configurable: true,
            enumerable: true,
            get() { return _msg; },
            set(val) {
                _msg = val;
                patchMessageManager(val);
            }
        });
    } catch (e) {}
}

try {
    let currentOgl = (window as any).ogl;
    if (currentOgl) {
        patchOGL(currentOgl);
    }
    Object.defineProperty(window, 'ogl', {
        configurable: true,
        enumerable: true,
        get() { return currentOgl; },
        set(val) {
            currentOgl = val;
            patchOGL(val);
        }
    });
} catch (e) {}

const oglPatchInterval = setInterval(() => {
    const ogl = (window as any).ogl;
    if (ogl && ogl._message) {
        if (!ogl._message.__nexusPatched) {
            patchOGL(ogl);
        }
    }
}, 50);
setTimeout(() => clearInterval(oglPatchInterval), 15000);

let overlaysTimeout: any = null;
window.addEventListener('ogame-nexus-trigger-tooltips', () => {
    try {
        if (overlaysTimeout) clearTimeout(overlaysTimeout);
        overlaysTimeout = setTimeout(() => {
            // @ts-ignore
            if (typeof initOverlays === 'function') {
                // @ts-ignore
                initOverlays();
            }
        }, 50);
    } catch (e) {
        console.warn('OGame Nexus: Error triggering tooltips in page context', e);
    }
});

window.addEventListener('ogame-nexus-request-raw-messages', () => {
    try {
        // Double-check we are on Page 1 before interrogating window.ogame.messages.content.
        // window.ogame.messages.content contains all messages for the section, so on page 2+
        // it must never be read or re-processed.
        const currentSpan = document.querySelector('.messagePaginator .currentPage .current, .messagePaginator .current, .currentPage .current');
        if (currentSpan) {
            const pageText = currentSpan.textContent?.trim();
            if (pageText && pageText !== '1') {
                return;
            }
        }
        const prevBtn = document.querySelector('.messagePaginator .previousPage button, .messagePaginator button.previous, .messagePaginator .firstPage button, .messagePaginator button.first') as HTMLButtonElement | null;
        if (prevBtn && !prevBtn.hasAttribute('disabled') && !prevBtn.disabled && !prevBtn.classList.contains('disabled')) {
            return;
        }

        // @ts-ignore
        const messages = window.ogame?.messages?.content;
        if (Array.isArray(messages)) {
            window.dispatchEvent(new CustomEvent('ogame-nexus-response-raw-messages', {
                detail: { content: messages }
            }));
        }
    } catch (e) {
        console.warn('OGame Nexus: Error retrieving raw messages in page context', e);
    }
});

window.addEventListener('ogame-nexus-navigate-galaxy', (e: any) => {
    try {
        const { galaxy, system } = e.detail || {};
        // @ts-ignore
        if (typeof canGalaxyGo === 'function') {
            // @ts-ignore
            canGalaxyGo(galaxy, system);
        } else {
            const galaxyInput = document.getElementById('galaxy_input') as HTMLInputElement | null;
            const systemInput = document.getElementById('system_input') as HTMLInputElement | null;
            if (galaxyInput && systemInput) {
                galaxyInput.value = String(galaxy);
                systemInput.value = String(system);
                
                galaxyInput.dispatchEvent(new Event('change', { bubbles: true }));
                systemInput.dispatchEvent(new Event('change', { bubbles: true }));
                galaxyInput.dispatchEvent(new Event('input', { bubbles: true }));
                systemInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                const parent = galaxyInput.parentElement || document;
                const goBtn = parent.querySelector('.btn_blue, input[type="button"], button') as HTMLElement | null;
                if (goBtn) {
                    goBtn.click();
                }
            }
        }
    } catch (err) {
        console.warn('OGame Nexus: Error navigating galaxy in page context', err);
    }
});

// Hook jQuery AJAX requests to detect message list loads
function hookJQueryAjax() {
    // @ts-ignore
    if (typeof $ === 'function' && $.fn && typeof $(document).on === 'function') {
        // @ts-ignore
        $(document).on("ajaxSuccess", (event, xhr, settings) => {
            if (settings) {
                const url = typeof settings.url === 'string' ? settings.url : '';
                let data = '';
                if (typeof settings.data === 'string') {
                    data = settings.data;
                } else if (settings.data && typeof settings.data === 'object') {
                    try {
                        // @ts-ignore
                        if (typeof $ === 'function' && $.param) {
                            // @ts-ignore
                            data = $.param(settings.data);
                        } else {
                            data = JSON.stringify(settings.data);
                        }
                    } catch (e) {
                        try {
                            data = Object.keys(settings.data).map(k => `${k}=${(settings.data as any)[k]}`).join('&');
                        } catch (e2) {}
                    }
                }
                if (url.includes('action=getMessagesList') || data.includes('action=getMessagesList')) {
                    let subtab: string | null = null;
                    try {
                        const params = new URLSearchParams(typeof data === 'string' && data ? data : (typeof url === 'string' && url.includes('?') ? url.split('?')[1] : ''));
                        subtab = params.get('tab') || params.get('subtabId');
                    } catch (e) {}
                    if (subtab) {
                        updateActiveSubtabAttr(subtab);
                    } else {
                        setTimeout(updateActiveSubtabAttr, 10);
                    }

                    // If it's not a trash tab / delete operation
                    if (!data.includes('showTrash=true') && !url.includes('showTrash=true')) {
                        let page: number | undefined = undefined;
                        try {
                            const params = new URLSearchParams(typeof data === 'string' && data ? data : (typeof url === 'string' && url.includes('?') ? url.split('?')[1] : ''));
                            const p = params.get('pagination') || params.get('page') || params.get('curPage');
                            if (p) page = parseInt(p, 10);
                        } catch (e) {}
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-messages-loaded', {
                            detail: { page }
                        }));
                    }
                }

                // Intercept Fleet Event List & Fleet Dispatches
                if (url.includes('component=eventlist') || url.includes('component=eventList') || data.includes('component=eventlist') || data.includes('component=eventList')) {
                    try {
                        const rawText = xhr?.responseText || '';
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', {
                            detail: { html: rawText }
                        }));
                    } catch (e) {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', { detail: { html: null } }));
                    }
                } else if (url.includes('action=miniFleet') || url.includes('action=recallFleet') || url.includes('action=sendFleet')) {
                    // Fleet dispatched or recalled - trigger event refresh
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-eventlist-loaded', { detail: { html: null } }));
                    }, 500);
                }

                // Intercept Trader Import/Export operations
                if (url.includes('traderImportExport') || url.includes('importExport') || data.includes('traderImportExport') || data.includes('importExport') || url.includes('action=takeItem') || url.includes('action=buyItem')) {
                    try {
                        const rawText = xhr?.responseText || '';
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-importexport-loaded', {
                            detail: { response: rawText }
                        }));
                    } catch (e) {}
                }
            }
        });
    } else {
        setTimeout(hookJQueryAjax, 50);
    }
}
hookJQueryAjax();
