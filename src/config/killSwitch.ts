/**
 * Master Kill-Switch for OGame Nexus.
 *
 * When IS_EXTENSION_DISABLED is true:
 * - In-game content scripts immediately halt (zero DOM modification, zero network requests).
 * - Background service worker clears all alarms, registers no in-game listeners or timers, and makes zero network requests.
 * - If the player opens dashboard.html, an informative deactivation screen is displayed explaining that
 *   the extension is currently deactivated pursuant to Gameforge directives, while assuring them
 *   that their local data is safe and will be available again once tolerated status is regained.
 *
 * To re-enable the extension in version 1.3.2+, simply set this flag back to false.
 */
export const IS_EXTENSION_DISABLED = true;
