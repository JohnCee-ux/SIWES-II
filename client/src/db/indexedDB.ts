import { IOfflineScan } from '../../../shared/types.js';

const DB_NAME = 'GateKeeperOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_scans';

export class OfflineDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  public static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'scanId' });
            store.createIndex('eventId', 'eventId', { unique: false });
            store.createIndex('syncStatus', 'syncStatus', { unique: false });
            store.createIndex('event_syncStatus', ['eventId', 'syncStatus'], { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
          console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
          reject((event.target as IDBOpenDBRequest).error);
        };
      });
    }
    return this.dbPromise;
  }

  public static async addScan(scan: IOfflineScan): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(scan);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public static async getPendingScans(eventId?: string): Promise<IOfflineScan[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: IOfflineScan[] = req.result || [];
        const pending = all.filter(
          (s) =>
            (s.syncStatus === 'pending' || s.syncStatus === 'failed' || s.syncStatus === 'syncing') &&
            (!eventId || s.eventId === eventId)
        );
        pending.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(pending);
      };

      req.onerror = () => reject(req.error);
    });
  }

  public static async getAllScans(eventId?: string): Promise<IOfflineScan[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: IOfflineScan[] = req.result || [];
        const filtered = eventId ? all.filter((s) => s.eventId === eventId) : all;
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(filtered);
      };

      req.onerror = () => reject(req.error);
    });
  }

  public static async updateScanStatus(
    scanId: string,
    status: 'pending' | 'syncing' | 'synced' | 'failed',
    lastError?: string,
    resultStatus?: 'VALID' | 'DUPLICATE' | 'INVALID'
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(scanId);

      getReq.onsuccess = () => {
        const item: IOfflineScan = getReq.result;
        if (item) {
          item.syncStatus = status;
          item.lastAttemptAt = new Date().toISOString();
          item.attemptCount = (item.attemptCount || 0) + 1;
          if (lastError) item.lastError = lastError;
          if (resultStatus) item.resultStatus = resultStatus;
          store.put(item);
        }
        resolve();
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  public static async clearSyncedScans(eventId?: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items: IOfflineScan[] = req.result || [];
        items.forEach((item) => {
          if (item.syncStatus === 'synced' && (!eventId || item.eventId === eventId)) {
            store.delete(item.scanId);
          }
        });
        resolve();
      };

      req.onerror = () => reject(req.error);
    });
  }

  public static async getCounts(eventId?: string): Promise<{ pending: number; synced: number }> {
    const scans = await this.getAllScans(eventId);
    const pending = scans.filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed' || s.syncStatus === 'syncing').length;
    const synced = scans.filter((s) => s.syncStatus === 'synced').length;
    return { pending, synced };
  }
}
