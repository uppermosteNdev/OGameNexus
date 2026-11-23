// Types for OGame Request Guard 1.0.0 (ogame-request-guard.js). The guard itself ships as its own unbundled file;
// tools written in TypeScript reference these types and read the guard from globalThis.

declare namespace OGameRequestGuard {
  /**
   * A request to the game's own server, declared with the reason it is needed. A path under /api/ is the public
   * API, requested with fetchApi(): GET or HEAD only, no series. `series` allows that many requests per click
   * instead of one, for a batching feature ToolDev granted as an exception.
   */
  type GameEndpoint =
    | { page: string; component: string; action?: string | null; method?: string; series?: number; reason: string }
    | { path: string; method?: string; series?: number; reason: string };

  interface ExternalOrigin {
    /** An https origin without a path, e.g. "https://example.org". */
    origin: string;
    reason: string;
  }

  interface Declaration {
    tool: string;
    game?: readonly GameEndpoint[];
    external?: readonly ExternalOrigin[];
  }

  /** Carries a click past an await: taken with guard.ticket(event) while the event is handled, valid 10 s. */
  interface Ticket {
    readonly __ticket: unique symbol;
  }

  /** OGameRequestGuard.PAGE_LOAD, the user-input event being handled, or a ticket taken from one. */
  type Trigger = typeof PAGE_LOAD | Event | Ticket;

  interface Guard {
    readonly tool: string;
    readonly declared: { readonly game: readonly unknown[]; readonly external: readonly string[] };
    /** One request per declared endpoint per trigger, or its series. Throws OGameRequestGuardError when refused. */
    fetch(trigger: Trigger, url: string | URL, init?: RequestInit): Promise<Response>;
    /** The public API (a declared path under /api/), from a page or a background: no trigger, no cookies. */
    fetchApi(url: string | URL, init?: RequestInit): Promise<Response>;
    /** Call while the event is being handled, before any await; pass the ticket to fetch() afterwards. */
    ticket(event: Event): Ticket;
    fetchExternal(url: string | URL, init?: RequestInit): Promise<Response>;
  }

  const version: string;
  const PAGE_LOAD: unique symbol;
  function create(declaration: Declaration): Guard;
  class OGameRequestGuardError extends Error {}
}

/**
 * The ready queue. Load order is not guaranteed, so a tool queues its start-up here and never reads
 * OGameRequestGuard directly:
 *   (globalThis.OGameRequestGuardReady ??= []).push((G) => { const guard = G.create({ ... }); });
 * Callbacks queued before the guard loaded run when it loads; later ones run when pushed.
 */
declare var OGameRequestGuardReady:
  | { push(...callbacks: ((G: typeof OGameRequestGuard) => void)[]): number }
  | ((G: typeof OGameRequestGuard) => void)[]
  | undefined;

declare module '/ogame-request-guard.js' {
  const content: any;
  export default content;
}
