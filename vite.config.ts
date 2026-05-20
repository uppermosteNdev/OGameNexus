import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

const target = process.env.TARGET || "chrome";

function generateManifest(targetBrowser: string) {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  
  const baseManifest = {
    ...manifest,
    name: "OGame Nexus",
    description: pkg.description || manifest.description,
    version: pkg.version,
  };

  if (targetBrowser === "firefox") {
    // 1. Convert service_worker to scripts array for Firefox compatibility in MV3
    if (baseManifest.background && baseManifest.background.service_worker) {
      const sw = baseManifest.background.service_worker;
      delete baseManifest.background.service_worker;
      baseManifest.background.scripts = [sw];
    }
    
    // 2. Remove Chrome-only oauth2 key
    delete baseManifest.oauth2;
    
    // 3. Add browser_specific_settings for Firefox Gecko engine
    baseManifest.browser_specific_settings = {
      gecko: {
        id: "og-nexus-extension@ogamenexus.org",
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    };
  }

  return baseManifest;
}

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    webExtension({
      manifest: () => generateManifest(target),
      browser: target,
      watchFilePaths: ["package.json"],
      additionalInputs: ["dashboard.html"],
    }),
  ],
  build: {
    minify: false,
    outDir: `dist-${target}`,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
