(function() {
  "use strict";
  window.addEventListener("ogame-nexus-trigger-tooltips", () => {
    try {
      if (typeof initOverlays === "function") {
        initOverlays();
      }
    } catch (e) {
      console.warn("OGame Nexus: Error triggering tooltips in page context", e);
    }
  });
})();
