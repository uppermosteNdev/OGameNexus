import { ImportExportInfo } from '../../db';

export async function getStoredImportExportInfo(): Promise<ImportExportInfo | null> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const cached = await chrome.storage.local.get('nexus_import_export_info');
      if (cached && cached.nexus_import_export_info) {
        return cached.nexus_import_export_info as ImportExportInfo;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function saveImportExportInfo(info: ImportExportInfo, playerId?: string): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local) {
      await chrome.storage.local.set({ 'nexus_import_export_info': info });
    }
    if (playerId && typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "UPDATE_IMPORT_EXPORT_INFO", playerId, info }, () => {
        if (chrome.runtime?.lastError) {
          // Silent catch
        }
      });
    }
  } catch (e: any) {
    if (!e?.message?.includes('Extension context invalidated')) {
      console.warn('OGame Nexus: Error saving Import/Export info', e);
    }
  }
}

/**
 * Passively scrapes the Import/Export panel when the user visits the Trader page
 */
export function scrapeImportExportDom(doc: Document | HTMLElement = document, playerId?: string): ImportExportInfo | null {
  const container = doc.querySelector('#trader_importexport, .import_export, #importexport');
  if (!container) return null;

  try {
    const isBought = !!container.querySelector('.bought, .item_bought, .disabled');
    const hasItem = !!container.querySelector('.take_item, .got_item');
    const priceEl = container.querySelector('.price, .costs, .cost_wrapper');
    let price: number | undefined;
    if (priceEl) {
      const text = priceEl.textContent?.replace(/[,.]/g, '').trim() || '';
      const parsed = parseInt(text, 10);
      if (!isNaN(parsed)) price = parsed;
    }

    const nameEl = container.querySelector('.item_name, .title, h4');
    const name = nameEl?.textContent?.trim() || undefined;

    const info: ImportExportInfo = {
      name,
      hasBought: isBought,
      gotItem: hasItem,
      price,
      lastUpdated: Date.now()
    };

    saveImportExportInfo(info, playerId);
    return info;
  } catch (err) {
    console.warn('OGame Nexus: Error scraping Import/Export panel', err);
    return null;
  }
}

export function initImportExportListener(): void {
  window.addEventListener('ogame-nexus-ajax-importexport-loaded', (e: any) => {
    const raw = e?.detail?.response;
    if (!raw) return;

    try {
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const data = JSON.parse(trimmed);
        const info: ImportExportInfo = {
          name: data.name || undefined,
          rarity: data.rarity || undefined,
          itemText: data.itemText || undefined,
          bargainText: data.bargainText || undefined,
          hasBought: data.hasBought === 'true' || data.hasBought === true,
          gotItem: data.gotItem === 'true' || data.gotItem === true,
          offersLeft: data.offersLeft !== undefined ? Number(data.offersLeft) : undefined,
          price: data.price !== undefined ? Number(data.price) : undefined,
          newAjaxToken: data.newAjaxToken || undefined,
          lastUpdated: Date.now()
        };
        saveImportExportInfo(info);
      }
    } catch (err) {
      // ignore
    }
  });
}
