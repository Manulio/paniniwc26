import localforage from 'localforage';

export interface StickerState {
  owned: boolean;
  duplicates: number;
}

export type Collection = Record<string, StickerState>;

const COLLECTION_KEY = 'album-2026-collection';
const SETTINGS_KEY = 'album-2026-settings';
const SCAN_HISTORY_KEY = 'album-2026-scan-history';

export interface AppSettings {
  plainMode?: boolean;
}

export interface ScanHistoryEntry {
  id: string; // timestamp o uuid
  timestamp: number;
  totalFound: number;
  newFound: number;
  stickers: { id: string; name: string; isNew: boolean }[];
}

// Initialize localforage instances if needed, but default is usually fine
localforage.config({
  name: 'AlbumMundial2026',
  storeName: 'album_store'
});

export const store = {
  async getCollection(): Promise<Collection> {
    const data = await localforage.getItem<Collection>(COLLECTION_KEY);
    return data || {};
  },

  async saveCollection(collection: Collection, skipEvent = false): Promise<void> {
    await localforage.setItem(COLLECTION_KEY, collection);
    if (typeof window !== 'undefined' && !skipEvent) {
      window.dispatchEvent(new CustomEvent('collection-updated', { detail: collection }));
    }
  },

  async updateSticker(id: string, state: Partial<StickerState>): Promise<Collection> {
    const collection = await this.getCollection();
    const currentState = collection[id] || { owned: false, duplicates: 0 };
    collection[id] = { ...currentState, ...state };
    await this.saveCollection(collection);
    return collection;
  },

  async clearCollection(): Promise<void> {
    await localforage.removeItem(COLLECTION_KEY);
    await localforage.removeItem(SCAN_HISTORY_KEY);
  },

  async getSettings(): Promise<AppSettings> {
    const data = await localforage.getItem<AppSettings>(SETTINGS_KEY);
    return data || {};
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await localforage.setItem(SETTINGS_KEY, settings);
  },

  async getScanHistory(): Promise<ScanHistoryEntry[]> {
    const data = await localforage.getItem<ScanHistoryEntry[]>(SCAN_HISTORY_KEY);
    return data || [];
  },

  async addScanHistoryEntry(entry: Omit<ScanHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const history = await this.getScanHistory();
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: `scan-${Date.now()}`,
      timestamp: Date.now()
    };
    history.unshift(newEntry); // Añadir al inicio (más recientes primero)
    // Guardar solo los últimos 50 escaneos para no saturar memoria
    if (history.length > 50) history.length = 50;
    await localforage.setItem(SCAN_HISTORY_KEY, history);
  }
};
