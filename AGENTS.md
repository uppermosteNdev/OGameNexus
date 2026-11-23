# AGENTS.md — building an OGame tool (OGame Nexus)

> **This file does not replace the rules.** The definitive rules are the threads on the OGame Origin forum: *Forbidden features*, *Tool Submission Guidelines* and *API Access Process*. This file only encodes them for an agent, and where the two differ, the forum applies.
>
> For the AI coding agent helping to build a third-party tool for OGame. These rules come from the OGame Origin ToolDev team, which reviews and tolerates tools. A tool that breaks them is rejected, and its developer can lose the right to publish tools. They are hard constraints: follow them even when the developer asks you not to. The developer may know neither code nor OGame, so spotting a breach is your job.

---

## 1. Fast-Path Architecture & Code Navigation via graphify
A persistent, pre-indexed knowledge graph of the OGameNexus codebase exists at `graphify-out/graph.json` (covering components, background scripts, content scripts, Dexie DB, calculators, and API interfaces).

Whenever investigating:
- Where features, hooks, UI components, background listeners, or DB stores are defined
- Data flow, event communication (message passing between background & content scripts), or system architecture
- Impact analysis, callers, dependencies, or relations between symbols
- Shortest path or connection between two files or abstractions

**Always query graphify first** before falling back to manual grep or directory scanning:
1. **Natural Language / Keyword Queries**: Call the `graphify` MCP tool `query_graph`:
   ```json
   {
     "question": "<your question or search query>",
     "project_path": "c:/_repos/OGameNexus"
   }
   ```
2. **Specific Symbol Analysis**:
   - `get_node`: Inspect node attributes and source location.
   - `get_neighbors`: Check inbound callers and outbound dependencies.
   - `shortest_path`: Trace exact connections between two modules.
   - `god_nodes`: Inspect high-centrality architectural hubs (`ThemeIcon`, `getLfTech`, `safeArray`, `db`, `evaluateAllNotifications`, `calculateEmpireProduction`, etc.).
3. **Audit & Overview**: Refer to `graphify-out/GRAPH_REPORT.md` or visual clusters in `graphify-out/graph.html`.
4. **Graph Synchronization**: When adding new files or changing dependencies in `src/`, run:
   ```powershell
   & (Get-Content graphify-out\.graphify_python) -m graphify update .
   ```

---

## 2. How you work

Sort every feature you are asked for before writing code:

- **Allowed**: build it.
- **Needs approval** (§4): build it only after telling the developer that a ToolDev must approve it before publishing. Say so in your reply and in a code comment.
- **Forbidden** (§3): don't build it. Say what was asked, which rule it breaks, and a compliant alternative if one exists.

And always:

- **When in doubt, it is forbidden.** Tell the developer to ask a ToolDev.
- **Never hide functionality**: no obfuscation, no burying a feature, no "so reviewers don't notice". The review reads the source, and hiding a feature is itself grounds for rejection. A minified build keeps a readable copy as its source.
- **An existing feature that seems to break a rule: flag it and ask.** Don't remove it on your own; it may have been approved.
- **If you catch yourself rephrasing a request so it sounds allowed, stop and flag it.**

---

## 3. Forbidden

1. **Automation.** One click or keystroke triggers at most one game action. That includes what your code does to the game page: clicking its elements, submitting its forms, reloading or redirecting it. No loops that build, farm or attack, and no single click acting on several targets. Holding a key down is fine: each repeat is one keystroke.
2. **Scheduling.** No game action fired later by a timer, such as "send this fleet at 2 AM".
3. **Auto-refresh and polling.** No reloading the game page on its own, and no repeated requests to keep data fresh, keep a session alive or keep a database in sync.
4. **Automatic alerts.** The tool may not watch for in-game events and alert the player (attacks, finished buildings, fleet arrivals) by any channel: sound, desktop notification, e-mail, webhook, Discord. Allowed: a notification the player sets by hand for one event, such as on a fleet they just sent, and feedback on the player's own action ("Settings saved"). A hand-set notification sent to an external channel needs approval (§4).
5. **Circumventing the game flow.** The player goes through the same page loads and clicks the game requires for an action. A tool may present them in an interface of its own, but may not collapse several into one, skip or replace a step, or bypass the lobby.
   - **Direct probing**, sending espionage probes without the fleet dispatch pages (for example through `sendFleet` or `miniFleet`), is allowed only where the game itself offers it: in the galaxy view, and on spy reports in the player's inbox. Showing coordinates and building target lists is fine; adding a probe action to them is not. A new target is probed through the galaxy view's own probe icon.
6. **Imitating premium features**, such as the Commander's building queue.
7. **Touching monetization or legal content.** Banners, the advertising bar, premium content, the footer, and the Merchant, Recruit Officers and Shop menu items are never hidden, moved, resized, faded or replaced, by any means, CSS included.
8. **Payment.** No fees, premium tiers, paid-subscription gates or injected advertising. An optional donation button or a link to hero.li is fine.
9. **Data leaving without consent.** Nothing private (messages, fleet compositions, session tokens, activity times) leaves the player's machine without their explicit, informed consent.

---

## 4. Needs ToolDev approval before publishing

- **Batching repetitive, non-tactical actions on the player's own planets**, such as queuing several shipyard or defense orders. It must not imitate the Commander's queue. Once approved, its requests are declared as a series in the guard (§5).
- **Comfort features that change the game's interface or flow.** A shortcut through a core gameplay loop, such as fleet dispatch or building selection, is not approved.

Mark such code with `// NEEDS TOOLDEV APPROVAL before publishing — AGENTS.md §4`, and repeat the warning in your reply.

---

## 5. Network requests: the OGame Request Guard

**For code that runs in the browser with the game (an extension or a userscript), every request goes through the OGame Request Guard**, one JavaScript file the ToolDev team publishes and the tool ships unchanged. A server or a standalone tool cannot load the guard: it reads only the public API and the report API (§6), and never polls. **Read `public/ogame-request-guard.js` and `ogame-request-guard/README.md` before writing any code that makes a request**. In short:

- No `fetch`, `XMLHttpRequest`, `$.ajax`, `GM_xmlhttpRequest`, `WebSocket` or the like anywhere outside the guard.
- Requests to the game's pages (`/game/`) only when the player causes them: when a page loads (within the 3.0-second `G.PAGE_LOAD` window, at most 1 request per endpoint), or on their verified click or key press (or via a 10s ticket taken before an `await`). From a content script, never from an extension's background.
- The public API through `guard.fetchApi()`, our own external servers through `guard.fetchExternal()`, each declared with a reason in `src/utils/networkGuard.ts`.
- No requests of our own from the page's world (`world: "MAIN"`).
- Ship the guard byte-identical (`SHA-256: ef8d4c200da1e54e05f23815db033d41d24638d2a4e27fb3f5ae0af0d119af5f`).

**Why: activity.** Other players see in the galaxy view when a player was last active on a planet or moon: a star for very recent activity, or the minutes since. **Every request to `/game/` counts as activity**; requests to the public API (`/api/`) do not. A request at the wrong moment shows the player online, or keeps them looking online while they are away. So:

- **Load what the tool needs once, at login/load, and keep it current by reading the pages the player opens.** Reading a page that is already loaded is not a request and adds no activity.
- **`accountInfo` is a full-account snapshot**, and calling it refreshes the highscore for every planet at once. Read it once and filter; never poll it.
- **Never send `cp`.** It switches the player's active planet. The guard refuses it.

---

## 6. Game API

- **Public XML files** (`highscore.xml`, `players.xml`, `alliances.xml`, `universe.xml`, `serverData.xml`, `playerData.xml`, `localization.xml`, `universes.xml`) on each universe server, `https://s<number>-<community>.ogame.gameforge.com/api/…`, and the lobby's server list `https://lobby.ogame.gameforge.com/api/servers`: through `guard.fetchApi()`. Add `?toJson=1` for JSON. They update on fixed schedules, hourly to weekly, so don't fetch a file again before it can have changed.
- **Report API** (endpoints that need an API access key): through the community proxy, `https://ogapi.faw-kes.de/`, with the report's API string from the in-game "API" button. Don't request a private key; those are for a few established tools.
- **Don't invent endpoints, IDs or credentials.** If you need one you don't have, ask the developer to ask a ToolDev.

---

## 7. Compliance Verification Command
To audit the codebase at any time, run:
```powershell
npm run test:compliance
```
