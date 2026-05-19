// This script runs in the "MAIN" world, meaning it has access to the page's global variables like 'initOverlays'
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
