/**
 * Centralized in-memory cache for global settings in the content script context.
 * Eliminates asynchronous storage roundtrips (await chrome.storage.local.get)
 * during fast UI rendering loops.
 */

let cachedRemoveOGLightDuplicates = true;
let isInitialized = false;

export function isRemoveOGLightDuplicatesEnabled(): boolean {
    return cachedRemoveOGLightDuplicates;
}

export function syncOGLightAttributeToDOM(enabled: boolean) {
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-nexus-clean-oglight', String(enabled));
        // Also dispatch to MAIN world pageContext.ts
        window.dispatchEvent(new CustomEvent('ogame-nexus-settings-updated', {
            detail: { removeOGLightDuplicates: enabled }
        }));
    }
}

export function initContentSettings() {
    if (isInitialized) return;
    isInitialized = true;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // Initial load
        chrome.storage.local.get(['globalSettings'], (res) => {
            if (res?.globalSettings?.removeOGLightDuplicates !== undefined) {
                cachedRemoveOGLightDuplicates = res.globalSettings.removeOGLightDuplicates;
            }
            syncOGLightAttributeToDOM(cachedRemoveOGLightDuplicates);
        });

        // Listen for live setting changes
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.globalSettings) {
                const newSettings = changes.globalSettings.newValue;
                if (newSettings && newSettings.removeOGLightDuplicates !== undefined) {
                    cachedRemoveOGLightDuplicates = newSettings.removeOGLightDuplicates;
                    syncOGLightAttributeToDOM(cachedRemoveOGLightDuplicates);
                }
            }
        });
    } else {
        syncOGLightAttributeToDOM(cachedRemoveOGLightDuplicates);
    }
}
