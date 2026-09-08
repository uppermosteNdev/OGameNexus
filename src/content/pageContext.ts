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
                const type = Number(message?.globalTypeID);
                // Suppress duplicate visual cards for:
                // 41 (Expeditions), 61 (Lifeform Discoveries), 25, 48, 54 (Combats / Raids)
                if (type === 41 || type === 61 || type === 25 || type === 48 || type === 54) {
                    const dom = document.querySelector(`[data-msg-id="${message?.id}"]`);
                    if (dom) {
                        const content = dom.querySelector('.msgContent');
                        if (content) content.classList.remove('ogl_hidden');
                        dom.querySelectorAll('.ogl_battle').forEach(el => el.remove());
                    }
                    return; // Skip OGLight visual creation entirely, statify() will still run!
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

window.addEventListener('ogame-nexus-trigger-tooltips', () => {
    try {
        // @ts-ignore
        if (typeof initOverlays === 'function') {
            // @ts-ignore
            initOverlays();
        }
    } catch (e) {
        console.warn('OGame Nexus: Error triggering tooltips in page context', e);
    }
});

window.addEventListener('ogame-nexus-request-raw-messages', () => {
    try {
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
                    // If it's not a trash tab / delete operation
                    if (!data.includes('showTrash=true') && !url.includes('showTrash=true')) {
                        window.dispatchEvent(new CustomEvent('ogame-nexus-ajax-messages-loaded'));
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
