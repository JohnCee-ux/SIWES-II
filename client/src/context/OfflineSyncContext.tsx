import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OfflineDB } from '../db/indexedDB.js';
import { IOfflineScan } from '../../../shared/types.js';
import { api, getDeviceId } from '../api/apiClient.js';
import { audioFeedback } from '../utils/audioFeedback.js';

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingCount: number;
  syncedCount: number;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  queueOfflineScan: (
    eventId: string,
    ticketCodeOrToken: string,
    source?: 'camera' | 'manual'
  ) => Promise<IOfflineScan>;
  syncNow: (eventId: string) => Promise<{ processed: number; succeeded: number; failed: number }>;
  refreshCounts: (eventId?: string) => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const refreshCounts = useCallback(async (eventId?: string) => {
    try {
      const counts = await OfflineDB.getCounts(eventId);
      setPendingCount(counts.pending);
      setSyncedCount(counts.synced);
    } catch (err) {
      console.error('Failed to refresh queue counts:', err);
    }
  }, []);

  const syncNow = useCallback(
    async (eventId: string): Promise<{ processed: number; succeeded: number; failed: number }> => {
      if (isSyncing || !isOnline) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      setIsSyncing(true);
      setLastSyncMessage('Syncing queued scans...');

      try {
        const pendingScans = await OfflineDB.getPendingScans(eventId);
        if (pendingScans.length === 0) {
          setIsSyncing(false);
          setLastSyncMessage(null);
          return { processed: 0, succeeded: 0, failed: 0 };
        }

        // Mark as syncing in IndexedDB
        for (const scan of pendingScans) {
          await OfflineDB.updateScanStatus(scan.scanId, 'syncing');
        }

        const deviceId = getDeviceId();
        const payload = {
          eventId,
          deviceId,
          scans: pendingScans.map((s) => ({
            scanId: s.scanId,
            ticketCodeOrToken: s.ticketCodeOrToken,
            timestamp: s.timestamp,
            source: s.source,
          })),
        };

        const response = await api.syncOfflineScans(payload);

        let succeeded = 0;
        let failed = 0;

        for (const result of response.results) {
          if (result.status === 'VALID' || result.status === 'DUPLICATE') {
            await OfflineDB.updateScanStatus(result.scanId, 'synced', undefined, result.status);
            succeeded++;
          } else if (result.status === 'INVALID') {
            await OfflineDB.updateScanStatus(result.scanId, 'synced', result.message, 'INVALID');
            succeeded++;
          } else {
            await OfflineDB.updateScanStatus(result.scanId, 'failed', result.error || result.message);
            failed++;
          }
        }

        await refreshCounts(eventId);

        const msg = failed > 0 ? `${succeeded} scans synced, ${failed} failed` : `${succeeded} scans synced successfully`;
        setLastSyncMessage(msg);
        setTimeout(() => setLastSyncMessage(null), 5000);

        return { processed: response.results.length, succeeded, failed };
      } catch (err: any) {
        console.error('Offline sync failed:', err);
        setLastSyncMessage(`Sync error: ${err.message}`);
        setTimeout(() => setLastSyncMessage(null), 6000);
        return { processed: 0, succeeded: 0, failed: 0 };
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, isSyncing, refreshCounts]
  );

  const queueOfflineScan = useCallback(
    async (eventId: string, ticketCodeOrToken: string, source: 'camera' | 'manual' = 'camera'): Promise<IOfflineScan> => {
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newScan: IOfflineScan = {
        scanId,
        eventId,
        ticketCodeOrToken: ticketCodeOrToken.trim(),
        timestamp: new Date().toISOString(),
        deviceId: getDeviceId(),
        syncStatus: 'pending',
        attemptCount: 0,
        source,
        resultStatus: 'QUEUED',
      };

      await OfflineDB.addScan(newScan);
      audioFeedback.playQueued();
      await refreshCounts(eventId);

      return newScan;
    },
    [refreshCounts]
  );

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncMessage('Back online. Sync ready.');
      setTimeout(() => setLastSyncMessage(null), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastSyncMessage('Offline - scans will be saved locally and synced.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        pendingCount,
        syncedCount,
        isSyncing,
        lastSyncMessage,
        queueOfflineScan,
        syncNow,
        refreshCounts,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = (): OfflineSyncContextType => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
