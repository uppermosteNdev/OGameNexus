/*
 * OGame Request Guard 1.0.0 — the only way a tolerated OGame tool may make network requests.
 *
 * DO NOT MODIFY THIS FILE. Tolerated tools ship it byte-identical, as its own file: listed in the manifest's
 * content_scripts, or by @require in a userscript. Its SHA-256 is published by the OGame Origin ToolDev team;
 * a copy that does not match is a breach of toleration, whatever changed.
 *
 * Load order is not guaranteed, so a tool never reads the guard directly. It queues a callback, which runs
 * when the guard is there, whichever loaded first:
 *     (globalThis.OGameRequestGuardReady ??= []).push((G) => { const guard = G.create({ ... }); });
 *
 * Rules it enforces:
 *   - Requests to the game's own server go through guard.fetch(trigger, url, init), only to endpoints the tool
 *     declared, and only with a trigger: OGameRequestGuard.PAGE_LOAD in the first seconds after the page loaded, or
 *     a real user-input event (click, key, pointer, touch) while it is being handled. An event kept for later is
 *     refused. Code that awaits something first takes guard.ticket(event) while the event is being handled and
 *     passes the ticket instead: it is valid for ten seconds. Each click allows one request per declared
 *     endpoint, whether made directly or with its ticket. A timer has no trigger, so it cannot request.
 *   - An endpoint declared with series: n allows up to n requests per click instead of one, for a batching
 *     feature ToolDev granted as an exception. Requests of a series are at least 100 ms apart; the first comes
 *     within the ticket's ten seconds, each later one within ten seconds of the one before, or the rest lapses.
 *   - The game's public API (paths under /api/) goes through guard.fetchApi(url, init): declared paths, GET or
 *     HEAD, no trigger, from a page or a background, and never with the session's cookies. Universe servers, and
 *     the lobby's /api/servers.
 *   - Each request of a series is logged with console.debug, for a reviewer watching the console.
 *   - No request carries cp, in the query or the body: it changes the player's active planet, a state change
 *     no tool may make. Read the way PHP reads names, like page/component/action.
 *   - Requests elsewhere go through guard.fetchExternal(url, init), only to declared https origins.
 *   - Other game requests are refused outside a page (background, service worker): there is no player action there.
 *
 * What is sent is what was checked: the guard parses the query and the body itself, checks the parameters, and
 * sends a request rebuilt from them. Every built-in it uses is captured when it loads, so code running later
 * in the same world cannot change what it sees.
 *
 * Requests the game's own page functions make (e.g. fleet dispatch) do not pass through here; tool rules
 * still require those functions to be called only from a user event handler.
 *
 * Userscripts must run in their manager's sandbox (a @grant other than none). In the page's own world, any
 * script that ran earlier can replace the built-ins this guard relies on.
 */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const root = globalThis;

  // Loaded twice in one world (two userscripts with @grant none share the page's world): the first one stays.
  if (Object.prototype.hasOwnProperty.call(root, 'OGameRequestGuard')) {
    if (root.OGameRequestGuard?.version !== VERSION) {
      root.console?.warn?.(`[OGameRequestGuard] ${VERSION} not loaded: ${root.OGameRequestGuard?.version} is already present`);
    }
    return;
  }

  // --- Built-ins, captured now: code that runs after the guard cannot replace what the guard uses ---------
  const apply = Reflect.apply;
  const describe = Object.getOwnPropertyDescriptor;
  const protoOf = Object.getPrototypeOf;
  const freeze = Object.freeze;
  const defineProperty = Object.defineProperty;
  const hasOwn = Object.hasOwn;
  const createObject = Object.create;
  /** Appends as an own data property: an index setter on Array.prototype is never consulted. */
  const push = (list, value) => {
    defineProperty(list, list.length, { value, writable: true, enumerable: true, configurable: true });
  };
  /** The fetch options passed through from the caller, when they are the caller's own. */
  const PASSED_THROUGH = ['credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity', 'keepalive', 'signal', 'mode', 'priority'];
  const getterOf = (proto, name) => describe(proto, name)?.get;

  const S = String.prototype;
  const charCodeAt = S.charCodeAt;
  const sliceString = S.slice;
  const indexOfString = S.indexOf;
  const toLowerCase = S.toLowerCase;
  const toUpperCase = S.toUpperCase;
  const encode = root.encodeURIComponent;
  const decode = root.decodeURIComponent;
  const toStr = root.String;

  const Map_ = Map;
  const MapGet = Map.prototype.get;
  const MapSet = Map.prototype.set;
  const WeakMapGet = WeakMap.prototype.get;
  const WeakMapSet = WeakMap.prototype.set;
  const SetHas = Set.prototype.has;
  const SetAdd = Set.prototype.add;

  const nativeFetch = root.fetch;
  const consoleDebug = root.console?.debug;
  const consoleObject = root.console;
  const round = Math.round;
  const now = root.performance.now.bind(root.performance);
  const URL_ = root.URL;
  const urlOrigin = getterOf(URL_.prototype, 'origin');
  const urlPathname = getterOf(URL_.prototype, 'pathname');
  const urlSearch = getterOf(URL_.prototype, 'search');
  const urlHref = getterOf(URL_.prototype, 'href');
  const urlHostname = getterOf(URL_.prototype, 'hostname');
  const endsWith = S.endsWith;

  const URLSearchParams_ = root.URLSearchParams;
  const URLSearchParamsProto = URLSearchParams_.prototype;
  const uspToString = URLSearchParamsProto.toString;
  const FormData_ = root.FormData;
  const FormDataProto = FormData_?.prototype;
  const fdEntries = FormDataProto?.entries;
  const fdAppend = FormDataProto?.append;
  const fdIteratorNext = FormData_ ? protoOf(apply(fdEntries, new FormData_(), [])).next : undefined;
  const Headers_ = root.Headers;
  const headersGet = Headers_.prototype.get;
  const headersSet = Headers_.prototype.set;
  const headersDelete = Headers_.prototype.delete;

  const probe = new root.Event('ogame-request-guard');
  const isTrustedGetter = getterOf(probe, 'isTrusted') ?? getterOf(root.Event.prototype, 'isTrusted');
  const eventTypeGetter = getterOf(root.Event.prototype, 'type') ?? getterOf(probe, 'type');
  const eventPhaseGetter = getterOf(root.Event.prototype, 'eventPhase') ?? getterOf(probe, 'eventPhase');

  // A web page, not an extension's own page: a Firefox background is a page with a DOM, at moz-extension://.
  const onPage =
    typeof root.document !== 'undefined' &&
    typeof root.location?.origin === 'string' &&
    (root.location.protocol === 'https:' || root.location.protocol === 'http:');
  const loadedAt = now();

  // --- Limits ------------------------------------------------------------------------------------------
  /** Room for a storage read and the tool's start-up, short enough that a timer gains next to nothing. */
  const PAGE_LOAD_WINDOW_MS = 3_000;
  const TICKET_MS = 10_000;
  /** A declared series: the least time between two of its requests, and the most before the rest lapses. */
  const SERIES_GAP_MS = 100;
  const SERIES_LAPSE_MS = 10_000;
  /** The game's public API: answers without a session. */
  const API_PREFIX = '/api/';
  /** The lobby: of its /api/, only the server list is allowed. */
  const LOBBY_HOST = 'lobby.ogame.gameforge.com';
  const LOBBY_API = '/api/servers';
  /** A universe server, s<number>-<community>: not the lobby, whose /api/ is not all public. */
  const isUniverseHost = (hostname) => {
    if (!apply(endsWith, hostname, ['.ogame.gameforge.com']) || code(hostname, 0) !== 115) return false;
    const label = slice(hostname, 1, hostname.length - 20);
    const dash = indexOf(label, '-');
    if (dash < 1 || dash === label.length - 1) return false;
    for (let i = 0; i < label.length; i += 1) {
      const c = code(label, i);
      const ok = i < dash ? c >= 48 && c <= 57 : i === dash || (c >= 97 && c <= 122);
      if (!ok) return false;
    }
    return true;
  };
  /** PHP stops reading after max_input_vars (1000 by default); stay far below, so it reads every parameter. */
  const MAX_PARAMETERS = 100;
  /** Events only a person causes. Not load, focus, input or submit: a script can make the browser fire those. */
  const USER_INPUT = new Set([
    'click', 'dblclick', 'auxclick', 'contextmenu',
    'mousedown', 'mouseup', 'pointerdown', 'pointerup',
    'touchstart', 'touchend', 'keydown', 'keyup',
  ]);

  // --- State, one per world, shared by every guard created in it ---------------------------------------
  const PAGE_LOAD = Symbol('OGameRequestGuard.PAGE_LOAD');
  const tools = new Set();
  /** Spent per endpoint key, so a second create() under another name buys nothing. */
  const spentOnLoad = new Set();
  /** Event → Map(endpoint key → { count, last }): how many requests it made and when the last one went. */
  const spentOnEvent = new WeakMap();
  /** Ticket → { event, expires }. A ticket spends its event's budget, so it adds no request of its own. */
  const tickets = new WeakMap();

  class OGameRequestGuardError extends Error {
    constructor(tool, message) {
      super(`[OGameRequestGuard] ${tool}: ${message}`);
      this.name = 'OGameRequestGuardError';
    }
  }

  // --- Strings, through captured methods ----------------------------------------------------------------
  const slice = (s, from, to) => apply(sliceString, s, [from, to]);
  const indexOf = (s, part, from = 0) => apply(indexOfString, s, [part, from]);
  const code = (s, i) => apply(charCodeAt, s, [i]);
  const lower = (s) => apply(toLowerCase, s, []);
  const upper = (s) => apply(toUpperCase, s, []);
  const isRouting = (name) => name === 'page' || name === 'component' || name === 'action';
  const isApiPath = (path) => indexOf(path, API_PREFIX) === 0;
  /** cp=<planet id> switches the session's active planet: never sent by a tool. */
  const isPlanetSwitch = (name) => name === 'cp';
  const CP_REFUSED = 'cp changes the player\'s active planet; a tool never sends it';

  /** Spaces and tabs off both ends. */
  function trim(s) {
    let start = 0;
    let end = s.length;
    while (start < end && (code(s, start) === 32 || code(s, start) === 9)) start += 1;
    while (end > start && (code(s, end - 1) === 32 || code(s, end - 1) === 9)) end -= 1;
    return slice(s, start, end);
  }

  /**
   * The name PHP files a parameter under: cut at a NUL, leading spaces dropped, cut at the first '[',
   * spaces and dots turned into '_'. URLSearchParams does none of this.
   */
  function phpName(name) {
    const nul = indexOf(name, '\0');
    if (nul >= 0) name = slice(name, 0, nul);
    let start = 0;
    while (start < name.length && code(name, start) === 32) start += 1;
    name = slice(name, start);
    const bracket = indexOf(name, '[');
    if (bracket >= 0) name = slice(name, 0, bracket);
    let out = '';
    for (let i = 0; i < name.length; i += 1) {
      const c = code(name, i);
      out += c === 32 || c === 46 ? '_' : slice(name, i, i + 1);
    }
    return out;
  }

  /** '+' is a space in a form; then percent-decoding. Undecodable input returns null, to be refused. */
  function formDecode(s) {
    let spaced = '';
    for (let i = 0; i < s.length; i += 1) spaced += code(s, i) === 43 ? ' ' : slice(s, i, i + 1);
    try {
      return decode(spaced);
    } catch {
      return null;
    }
  }

  /** A form-encoded string as [name, value] pairs, or null if any part cannot be decoded. */
  function parseForm(s) {
    const pairs = [];
    let at = 0;
    while (at <= s.length) {
      let end = indexOf(s, '&', at);
      if (end < 0) end = s.length;
      const piece = slice(s, at, end);
      if (piece.length > 0) {
        const eq = indexOf(piece, '=');
        const name = formDecode(eq < 0 ? piece : slice(piece, 0, eq));
        const value = formDecode(eq < 0 ? '' : slice(piece, eq + 1));
        if (name === null || value === null) return null;
        push(pairs, [name, value]);
      }
      at = end + 1;
    }
    return pairs;
  }

  /** Pairs back into a form-encoded string: what is sent is exactly what was checked. */
  function serialiseForm(pairs) {
    let out = '';
    for (let i = 0; i < pairs.length; i += 1) {
      out += `${i === 0 ? '' : '&'}${encode(pairs[i][0])}=${encode(pairs[i][1])}`;
    }
    return out;
  }

  /**
   * The routing parameters as PHP will read them, as [page, component, action] with null for an absent one,
   * or null when the pairs could be read differently: too many for PHP to read them all, or a name PHP would
   * file under page, component or action not written plainly or repeated (PHP keeps the last of a repeated name).
   * Kept in local variables: an object's missing property could be answered by Object.prototype.
   */
  function routingOf(pairs) {
    if (pairs.length > MAX_PARAMETERS) return null;
    let page = null;
    let component = null;
    let action = null;
    for (let i = 0; i < pairs.length; i += 1) {
      const name = pairs[i][0];
      const filed = phpName(name);
      if (!isRouting(filed)) continue;
      if (name !== filed) return null;
      const value = pairs[i][1];
      if (filed === 'page') {
        if (page !== null) return null;
        page = value;
      } else if (filed === 'component') {
        if (component !== null) return null;
        component = value;
      } else {
        if (action !== null) return null;
        action = value;
      }
    }
    return [page, component, action];
  }

  // --- Events --------------------------------------------------------------------------------------------

  /** Reads an Event accessor through the browser's own getter: anything not a real event reads undefined. */
  function readEvent(getter, event) {
    try {
      return apply(getter, event, []);
    } catch {
      return undefined;
    }
  }

  function isTrustedUserInput(event) {
    return readEvent(isTrustedGetter, event) === true && apply(SetHas, USER_INPUT, [readEvent(eventTypeGetter, event)]);
  }

  // --- Declarations ----------------------------------------------------------------------------------------

  function text(value, what, tool) {
    if (typeof value !== 'string' || trim(value) === '') throw new OGameRequestGuardError(tool, `${what} must be a non-empty string`);
    return value;
  }

  function gameEntry(spec, tool) {
    const reason = text(spec?.reason, 'every endpoint needs a reason', tool);
    const method = upper(toStr(spec.method ?? 'GET'));
    let series = 1;
    if (spec.series !== undefined) {
      series = spec.series;
      if (typeof series !== 'number' || series !== (series | 0) || series < 1) {
        throw new OGameRequestGuardError(tool, 'series must be a whole number of requests per click, at least 1');
      }
    }
    if (spec.path !== undefined) {
      const path = text(spec.path, 'path', tool);
      if (code(path, 0) !== 47 || indexOf(path, '?') >= 0) throw new OGameRequestGuardError(tool, `path ${path} must be a bare path`);
      // Plain characters only: the server decodes %xx and folds // and dot segments, which an exact match does not.
      for (let i = 0; i < path.length; i += 1) {
        const c = code(path, i);
        const plain = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 46 || c === 47 || c === 95;
        if (!plain) throw new OGameRequestGuardError(tool, `path ${path} may hold only letters, digits, '-', '_', '.' and '/'`);
      }
      if (indexOf(path, '//') >= 0 || indexOf(path, '/.') >= 0) throw new OGameRequestGuardError(tool, `path ${path} may not hold '//' or a segment starting with '.'`);
      // Anything under /game reaches the game's router, which as a bare path would match every page, component and
      // action (/game/ is served by index.php too): those are declared by page, component and action only.
      if (indexOf(lower(path), '/game') === 0) {
        throw new OGameRequestGuardError(tool, `${path} is the game's router: declare page, component and action instead of a path`);
      }
      const api = isApiPath(path);
      if (api && method !== 'GET' && method !== 'HEAD') throw new OGameRequestGuardError(tool, `${path} is the public API: GET or HEAD only`);
      if (api && spec.series !== undefined) throw new OGameRequestGuardError(tool, `${path} is the public API: it takes no trigger, so no series`);
      return freeze({ key: `${method} ${path}`, method, path, api, series, routed: false, page: null, component: null, action: null, reason });
    }
    const page = text(spec.page, 'page', tool);
    const component = text(spec.component, 'component', tool);
    const action = spec.action === undefined || spec.action === null ? null : text(spec.action, 'action', tool);
    return freeze({ key: `${method} ${page}/${component}/${action ?? '-'}`, method, path: '/game/index.php', api: false, series, routed: true, page, component, action, reason });
  }

  function externalOrigin(spec, tool) {
    text(spec?.reason, 'every external origin needs a reason', tool);
    const origin = text(spec.origin, 'origin', tool);
    const url = new URL_(origin);
    if (indexOf(origin, 'https://') !== 0 || apply(urlOrigin, url, []) !== origin) {
      throw new OGameRequestGuardError(tool, `origin ${origin} must be an https origin, without a path`);
    }
    return origin;
  }

  /** A declaration's list, read by index: no array method the tool could have replaced. */
  function each(list, convert, tool) {
    const out = [];
    if (list === undefined) return freeze(out);
    for (let i = 0; i < list.length; i += 1) push(out, convert(list[i], tool));
    return freeze(out);
  }

  function matches(entry, pathname, routing, method) {
    if (entry.method !== method || entry.path !== pathname) return false;
    if (!entry.routed) return true;
    return routing[0] === entry.page && routing[1] === entry.component && routing[2] === entry.action;
  }

  // --- The guard -------------------------------------------------------------------------------------------

  function create(declaration) {
    const tool = text(declaration?.tool, 'tool', 'unnamed tool');
    if (apply(SetHas, tools, [tool])) throw new OGameRequestGuardError(tool, 'create() may be called once per tool');
    const game = each(declaration.game, gameEntry, tool);
    const external = each(declaration.external, externalOrigin, tool);
    apply(SetAdd, tools, [tool]);

    function requireHandledInput(event) {
      if (!isTrustedUserInput(event)) {
        throw new OGameRequestGuardError(tool, 'the trigger must be OGameRequestGuard.PAGE_LOAD, a ticket, or a real user-input event');
      }
      // eventPhase is NONE (0) once the dispatch is over: the event was kept and used later, e.g. by a timer.
      if (readEvent(eventPhaseGetter, event) === 0) {
        throw new OGameRequestGuardError(tool, 'the event must be used while it is being handled; take a ticket() before any await');
      }
    }

    /** A ticket for code that awaits before requesting: taken while the event is handled, valid TICKET_MS. */
    function ticket(event) {
      requireHandledInput(event);
      const issued = freeze({});
      apply(WeakMapSet, tickets, [issued, freeze({ event, expires: now() + TICKET_MS })]);
      return issued;
    }

    function spend(trigger, entry) {
      if (trigger === PAGE_LOAD) {
        if (now() - loadedAt > PAGE_LOAD_WINDOW_MS) {
          throw new OGameRequestGuardError(tool, `PAGE_LOAD is only valid for ${PAGE_LOAD_WINDOW_MS / 1000} s after the page loaded`);
        }
        if (apply(SetHas, spentOnLoad, [entry.key])) throw new OGameRequestGuardError(tool, `${entry.key} was already requested on this page load`);
        apply(SetAdd, spentOnLoad, [entry.key]);
        return;
      }
      let event = trigger;
      const held = typeof trigger === 'object' && trigger !== null ? apply(WeakMapGet, tickets, [trigger]) : undefined;
      if (held) event = held.event;
      else requireHandledInput(trigger);
      let spent = apply(WeakMapGet, spentOnEvent, [event]);
      if (!spent) {
        spent = new Map_();
        apply(WeakMapSet, spentOnEvent, [event, spent]);
      }
      const t = now();
      const record = apply(MapGet, spent, [entry.key]);
      if (record === undefined) {
        if (held && t > held.expires) throw new OGameRequestGuardError(tool, `the ticket is older than ${TICKET_MS / 1000} s`);
        apply(MapSet, spent, [entry.key, { count: 1, last: t }]);
        if (entry.series > 1) seriesLog(entry, 1, null);
        return;
      }
      // A later request on the same event: only within a declared series, spaced, and while it keeps going.
      if (record.count >= entry.series) {
        throw new OGameRequestGuardError(
          tool,
          entry.series === 1
            ? `${entry.key} was already requested for this event`
            : `${entry.key} allows a series of ${entry.series} requests per event, all of them used`,
        );
      }
      if (t - record.last < SERIES_GAP_MS) throw new OGameRequestGuardError(tool, `requests in a series must be at least ${SERIES_GAP_MS} ms apart`);
      if (t - record.last > SERIES_LAPSE_MS) {
        throw new OGameRequestGuardError(tool, `the series lapsed: more than ${SERIES_LAPSE_MS / 1000} s since its last request`);
      }
      const gap = t - record.last;
      record.count += 1;
      record.last = t;
      seriesLog(entry, record.count, gap);
    }

    /** One line per request of a series, at debug level: a reviewer sees how fast and how long it runs. */
    function seriesLog(entry, count, gap) {
      if (typeof consoleDebug !== 'function') return;
      const after = gap === null ? 'first' : `${round(gap)} ms after the previous`;
      try {
        apply(consoleDebug, consoleObject, [`[OGameRequestGuard] ${tool}: ${entry.key}, series ${count}/${entry.series}, ${after}`]);
      } catch {
        // A console that throws changes nothing about the request.
      }
    }

    /**
     * The body to send and the Content-Type it needs, rebuilt from what was checked; or a reason to refuse.
     * Fails closed: no body, a plain string, URLSearchParams or FormData, and only their own classes.
     */
    function prepareBody(body, callerType) {
      if (body === undefined || body === null) return { problem: null, body: undefined, type: null };
      let pairs;
      if (typeof body === 'string') {
        const type = lower(trim(slice(callerType, 0, indexOf(callerType, ';') < 0 ? callerType.length : indexOf(callerType, ';'))));
        if (type !== '' && type !== 'application/x-www-form-urlencoded') return { problem: `a string body may only be sent as a form, not as ${type}`, body: undefined, type: null };
        pairs = parseForm(body);
      } else if (protoOf(body) === URLSearchParamsProto) {
        if (callerType !== '') return { problem: 'let the guard set the Content-Type of URLSearchParams and FormData', body: undefined, type: null };
        pairs = parseForm(apply(uspToString, body, []));
      } else if (FormData_ && protoOf(body) === FormDataProto) {
        if (callerType !== '') return { problem: 'let the guard set the Content-Type of URLSearchParams and FormData', body: undefined, type: null };
        const fresh = new FormData_();
        const iterator = apply(fdEntries, body, []);
        let count = 0;
        for (let step = apply(fdIteratorNext, iterator, []); !step.done; step = apply(fdIteratorNext, iterator, [])) {
          const name = step.value[0];
          if (isRouting(phpName(name))) return { problem: 'page, component and action belong in the URL, never in the body', body: undefined, type: null };
          if (isPlanetSwitch(phpName(name))) return { problem: CP_REFUSED, body: undefined, type: null };
          count += 1;
          if (count > MAX_PARAMETERS) return { problem: `more than ${MAX_PARAMETERS} body parameters`, body: undefined, type: null };
          apply(fdAppend, fresh, [name, step.value[1]]);
        }
        return { problem: null, body: fresh, type: null };
      } else {
        return { problem: 'the body must be a string, URLSearchParams or FormData', body: undefined, type: null };
      }
      if (pairs === null) return { problem: 'the body cannot be decoded as a form', body: undefined, type: null };
      if (pairs.length > MAX_PARAMETERS) return { problem: `more than ${MAX_PARAMETERS} body parameters`, body: undefined, type: null };
      for (let i = 0; i < pairs.length; i += 1) {
        if (isRouting(phpName(pairs[i][0]))) return { problem: 'page, component and action belong in the URL, never in the body', body: undefined, type: null };
        if (isPlanetSwitch(phpName(pairs[i][0]))) return { problem: CP_REFUSED, body: undefined, type: null };
      }
      return { problem: null, body: serialiseForm(pairs), type: 'application/x-www-form-urlencoded;charset=UTF-8' };
    }

    function fetchGame(trigger, input, init = {}) {
      if (!onPage) throw new OGameRequestGuardError(tool, 'game requests are only allowed from a game page, never from a background; the public API (/api/) goes through fetchApi()');
      const url = new URL_(toStr(input), root.location.href);
      const origin = apply(urlOrigin, url, []);
      if (origin !== root.location.origin) {
        throw new OGameRequestGuardError(tool, `${origin} is not this game server; use fetchExternal()`);
      }
      const pathname = apply(urlPathname, url, []);
      if (isApiPath(pathname)) throw new OGameRequestGuardError(tool, 'the public API goes through fetchApi(): no trigger, and no session');
      const search = apply(urlSearch, url, []);
      const queryPairs = parseForm(slice(search, 1));
      if (queryPairs === null) throw new OGameRequestGuardError(tool, 'the query cannot be decoded');

      // Read once into a copy: a getter on init could answer differently the second time.
      const checked = { ...init };
      const own = (field) => (hasOwn(checked, field) ? checked[field] : undefined);
      const method = upper(toStr(own('method') ?? 'GET'));
      const headers = new Headers_(own('headers'));
      const callerType = apply(headersGet, headers, ['content-type']) ?? '';
      const prepared = prepareBody(own('body'), callerType);
      if (prepared.problem) throw new OGameRequestGuardError(tool, prepared.problem);

      for (let i = 0; i < queryPairs.length; i += 1) {
        if (isPlanetSwitch(phpName(queryPairs[i][0]))) throw new OGameRequestGuardError(tool, CP_REFUSED);
      }
      const routing = routingOf(queryPairs);
      let entry = null;
      for (let i = 0; routing && i < game.length; i += 1) {
        if (matches(game[i], pathname, routing, method)) {
          entry = game[i];
          break;
        }
      }
      if (!entry) throw new OGameRequestGuardError(tool, `not declared: ${method} ${pathname}${search}`);
      spend(trigger, entry);

      // Sent: the checked origin, path and parameters, rebuilt; the checked body; the guard's Content-Type.
      const query = serialiseForm(queryPairs);
      apply(headersDelete, headers, ['content-type']);
      if (prepared.type) apply(headersSet, headers, ['content-type', prepared.type]);
      // A fresh options object with no prototype: every field fetch reads is one the guard put there.
      const sent = createObject(null);
      for (let i = 0; i < PASSED_THROUGH.length; i += 1) {
        const field = PASSED_THROUGH[i];
        if (hasOwn(checked, field)) defineProperty(sent, field, { value: checked[field], enumerable: true });
      }
      defineProperty(sent, 'method', { value: method, enumerable: true });
      defineProperty(sent, 'headers', { value: headers, enumerable: true });
      if (prepared.body !== undefined) defineProperty(sent, 'body', { value: prepared.body, enumerable: true });
      return apply(nativeFetch, root, [`${origin}${pathname}${query === '' ? '' : `?${query}`}`, sent]);
    }

    /** The game's public API: a declared /api/ path on any game server, no trigger, credentials omitted. */
    function fetchApi(input, init = {}) {
      const url = onPage ? new URL_(toStr(input), root.location.href) : new URL_(toStr(input));
      const origin = apply(urlOrigin, url, []);
      const hostname = apply(urlHostname, url, []);
      const pathname = apply(urlPathname, url, []);
      const lobby = hostname === LOBBY_HOST;
      if (origin !== `https://${hostname}` || !(isUniverseHost(hostname) || lobby)) {
        throw new OGameRequestGuardError(tool, `${origin} is not a universe server`);
      }
      if (lobby && pathname !== LOBBY_API) throw new OGameRequestGuardError(tool, `of the lobby's API, only ${LOBBY_API} is allowed`);
      if (!isApiPath(pathname)) throw new OGameRequestGuardError(tool, `fetchApi() is only for paths under ${API_PREFIX}; use fetch()`);
      const checked = { ...init };
      const own = (field) => (hasOwn(checked, field) ? checked[field] : undefined);
      const method = upper(toStr(own('method') ?? 'GET'));
      if (own('body') !== undefined && own('body') !== null) throw new OGameRequestGuardError(tool, 'the public API takes no body');
      let entry = null;
      for (let i = 0; i < game.length; i += 1) {
        if (game[i].api && game[i].method === method && game[i].path === pathname) {
          entry = game[i];
          break;
        }
      }
      if (!entry) throw new OGameRequestGuardError(tool, `not declared: ${method} ${pathname}`);
      const sent = createObject(null);
      for (let i = 0; i < PASSED_THROUGH.length; i += 1) {
        const field = PASSED_THROUGH[i];
        if (field !== 'credentials' && hasOwn(checked, field)) defineProperty(sent, field, { value: checked[field], enumerable: true });
      }
      defineProperty(sent, 'method', { value: method, enumerable: true });
      // No caller headers: the public API needs none, and an Authorization header would make it something else.
      if (own('headers') !== undefined) throw new OGameRequestGuardError(tool, 'the public API takes no headers');
      // Public: it answers without a session, so none is sent.
      defineProperty(sent, 'credentials', { value: 'omit', enumerable: true });
      return apply(nativeFetch, root, [`${origin}${pathname}${apply(urlSearch, url, [])}`, sent]);
    }

    function fetchExternal(input, init = {}) {
      const url = new URL_(toStr(input));
      const origin = apply(urlOrigin, url, []);
      let declared = false;
      for (let i = 0; i < external.length; i += 1) if (external[i] === origin) declared = true;
      if (!declared) throw new OGameRequestGuardError(tool, `not declared: ${origin}`);
      return apply(nativeFetch, root, [apply(urlHref, url, []), init]);
    }

    return freeze({
      tool,
      declared: freeze({ game, external }),
      fetch: fetchGame,
      ticket,
      fetchApi,
      fetchExternal,
    });
  }

  const api = freeze({ version: VERSION, PAGE_LOAD, create, OGameRequestGuardError });
  defineProperty(root, 'OGameRequestGuard', { value: api, writable: false, configurable: false, enumerable: false });

  // --- The ready queue: callbacks queued before the guard loaded run now; later ones run when pushed -----
  const runReady = (callback) => {
    if (typeof callback !== 'function') return;
    try {
      callback(api);
    } catch (error) {
      root.console?.error?.('[OGameRequestGuard] a ready callback threw', error);
    }
  };
  const queued = root.OGameRequestGuardReady;
  defineProperty(root, 'OGameRequestGuardReady', {
    value: freeze({
      push(...callbacks) {
        for (let i = 0; i < callbacks.length; i += 1) runReady(callbacks[i]);
        return 0;
      },
    }),
    writable: false,
    configurable: false,
    enumerable: false,
  });
  if (queued !== null && typeof queued === 'object' && typeof queued.length === 'number') {
    for (let i = 0; i < queued.length; i += 1) runReady(queued[i]);
  }
})();
