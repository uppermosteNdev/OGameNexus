/**
 * OGame Nexus Network Guard Client
 *
 * Implements strict compliance with OGame Origin network guidelines via OGame Request Guard 1.0.0.
 * All game requests (/game/), public API calls (/api/), and third-party external origins
 * must route through this client.
 */

// Central declaration of all endpoints required by OGame Nexus
const NEXUS_GUARD_DECLARATION: OGameRequestGuard.Declaration = {
  tool: 'OGame Nexus',
  game: [
    // 1. Account & Empire data snapshots
    {
      page: 'componentOnly',
      component: 'externaldataexport',
      action: 'accountInfo',
      reason: 'Account state, empire snapshot, and tech tree data on page load or user refresh'
    },
    {
      page: 'componentOnly',
      component: 'externaldataexport',
      action: 'speciesBonuses',
      reason: 'Lifeform experience and species bonuses overview on page load'
    },
    {
      page: 'componentOnly',
      component: 'externaldataexport',
      action: 'importExportInfo',
      reason: 'Daily import/export item status on page load'
    },

    // 2. Inventory
    {
      page: 'ingame',
      component: 'shop',
      action: 'inventoryGet',
      method: 'POST',
      reason: 'Player inventory items and boosters on page load'
    },

    // 3. Queues & Fleets
    {
      page: 'ajax',
      component: 'productionqueue',
      action: null,
      reason: 'Active construction, research, and shipyard queues on page load'
    },
    {
      page: 'componentOnly',
      component: 'eventList',
      action: null,
      reason: 'Fleet movements and mission tracking on page load'
    },

    // 4. Fallback endpoints for older game versions
    {
      page: 'ajax',
      component: 'lfbonuses',
      action: null,
      reason: 'Fallback lifeform experience data on page load'
    },
    {
      page: 'ingame',
      component: 'lfbonuses',
      action: null,
      method: 'POST',
      reason: 'Fallback lifeform experience data on page load'
    },
    {
      page: 'ingame',
      component: 'empire',
      action: null,
      reason: 'Empire view to enrich fleet and defense counts when Commander is active'
    },
    {
      page: 'ajax',
      component: 'empire',
      action: null,
      reason: 'Empire view fallback to enrich fleet and defense counts when Commander is active'
    },

    // 5. Public XML API
    {
      path: '/api/serverData.xml',
      reason: 'Universe settings from public API'
    },
    {
      path: '/api/players.xml',
      reason: 'Player directory from public API'
    },
    {
      path: '/api/highscore.xml',
      reason: 'Universe rankings and highscores from public API'
    },
    {
      path: '/api/universes.xml',
      reason: 'Server universe list from public API'
    },
    {
      path: '/api/servers',
      reason: 'Lobby server directory from public API'
    }
  ],
  external: [
    {
      origin: 'https://ogapi.faw-kes.de',
      reason: 'Community API proxy for parsing combat and espionage reports'
    },
    {
      origin: 'https://nexus-sync-worker.nexus-overwatch.workers.dev',
      reason: 'Nexus Overwatch alliance synchronization worker'
    },
    {
      origin: 'https://accounts.google.com',
      reason: 'Google Drive backup authentication'
    },
    {
      origin: 'https://www.googleapis.com',
      reason: 'Google Drive storage operations'
    },
    {
      origin: 'https://oauth2.googleapis.com',
      reason: 'Google OAuth token management'
    }
  ]
};

let guardInstance: OGameRequestGuard.Guard | null = null;
let pageLoadSymbol: typeof OGameRequestGuard.PAGE_LOAD | null = null;
let guardPromise: Promise<OGameRequestGuard.Guard> | null = null;

/**
 * Initializes and retrieves the singleton Guard instance.
 * Automatically handles out-of-order script loading via OGameRequestGuardReady.
 */
export async function getGuard(): Promise<OGameRequestGuard.Guard> {
  if (guardInstance) {
    return guardInstance;
  }
  // Fast path: Guard already present on globalThis (via content script or background static import)
  const gSync = (globalThis as any).OGameRequestGuard;
  if (gSync && typeof gSync.create === 'function') {
    pageLoadSymbol = gSync.PAGE_LOAD;
    guardInstance = gSync.create(NEXUS_GUARD_DECLARATION);
    return guardInstance!;
  }
  if (guardPromise) {
    return guardPromise;
  }

  guardPromise = (async () => {
    // If running in background/service worker where the guard script isn't loaded via manifest content_scripts
    if (typeof (globalThis as any).OGameRequestGuard === 'undefined') {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          const guardUrl = chrome.runtime.getURL('ogame-request-guard.js');
          await import(/* @vite-ignore */ guardUrl);
        }
      } catch (e) {
        try {
          const rootGuardPath = '/ogame-request-guard.js';
          await import(/* @vite-ignore */ rootGuardPath);
        } catch (e2) {
          console.debug('[Nexus NetworkGuard] Dynamic import fallback skipped:', e, e2);
        }
      }
    }

    return new Promise<OGameRequestGuard.Guard>((resolve, reject) => {
      const g = (globalThis as any).OGameRequestGuard;
      if (g && typeof g.create === 'function') {
        pageLoadSymbol = g.PAGE_LOAD;
        guardInstance = g.create(NEXUS_GUARD_DECLARATION);
        resolve(guardInstance!);
        return;
      }

      // Safeguard against permanently hanging promises if guard script fails to load
      const timeout = setTimeout(() => {
        reject(new Error('[Nexus NetworkGuard] Guard initialization timed out after 3000ms'));
      }, 3000);

      const readyQueue = ((globalThis as any).OGameRequestGuardReady ??= []);
      readyQueue.push((G: typeof OGameRequestGuard) => {
        clearTimeout(timeout);
        try {
          pageLoadSymbol = G.PAGE_LOAD;
          guardInstance = G.create(NEXUS_GUARD_DECLARATION);
          resolve(guardInstance!);
        } catch (err) {
          reject(err);
        }
      });
    });
  })().catch(err => {
    guardPromise = null;
    throw err;
  });

  return guardPromise;
}

/**
 * Checks whether the current execution is within the safe start-up window for PAGE_LOAD.
 * The guard strictly enforces now() - loadedAt <= 3000ms. We use 2200ms for a robust margin
 * so in-flight async operations do not breach the 3.0s deadline.
 */
export function isPageLoadValid(): boolean {
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
    return false;
  }
  return performance.now() < 2200;
}

/**
 * Fetches an in-game (/game/) endpoint within the 3.0s PAGE_LOAD window.
 */
export async function fetchGameOnLoad(url: string | URL, init?: RequestInit): Promise<Response> {
  const guard = await getGuard();
  const trigger = pageLoadSymbol || (globalThis as any).OGameRequestGuard?.PAGE_LOAD;
  return guard.fetch(trigger, url, init);
}

/**
 * Fetches an in-game (/game/) endpoint from a verified user interaction event or ticket.
 */
export async function fetchGameOnUserAction(
  trigger: Event | OGameRequestGuard.Ticket,
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const guard = await getGuard();
  return guard.fetch(trigger, url, init);
}

/**
 * Creates a 10-second ticket from a user input event.
 * MUST be called synchronously before any `await`.
 */
export function createTicket(event: Event): OGameRequestGuard.Ticket {
  if (!guardInstance) {
    const g = (globalThis as any).OGameRequestGuard;
    if (g && typeof g.create === 'function') {
      pageLoadSymbol = g.PAGE_LOAD;
      guardInstance = g.create(NEXUS_GUARD_DECLARATION);
    } else {
      throw new Error('[Nexus NetworkGuard] Guard is not yet ready to issue ticket.');
    }
  }
  return guardInstance!.ticket(event);
}

/**
 * Fetches public game XML files (/api/) without session cookies or headers.
 */
export async function fetchPublicApi(url: string | URL, init?: RequestInit): Promise<Response> {
  const guard = await getGuard();
  return guard.fetchApi(url, init);
}

/**
 * Fetches declared external HTTPS backends (Overwatch, Google, Fawkes).
 */
export async function fetchExternal(url: string | URL, init?: RequestInit): Promise<Response> {
  const guard = await getGuard();
  return guard.fetchExternal(url, init);
}
