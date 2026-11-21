import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDb';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

interface SyncBatchResponse {
  synced_count: number;
  acks: Array<{
    client_event_id: string;
    validation_hash: string;
    status: 'created' | 'already_synced';
    integrity_verified: boolean;
  }>;
  server_timestamp: string;
}

export function useOfflineSync() {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const isOnline = browserOnline && !simulatedOffline;

  const pendingItems = useLiveQuery(() => db.sync_queue.toArray(), [], []);
  const pendingCount = pendingItems.length;

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (simulatedOffline) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setBrowserOnline(false);
      return;
    }

    const items = await db.sync_queue.toArray();
    if (items.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: items.map((item) => ({
            client_event_id: item.clientEventId,
            candidate_id: item.candidateId,
            candidate_name: item.candidateName,
            community: item.community,
            primary_language: item.primaryLanguage,
            course_id: item.courseId,
            course_title: item.courseTitle,
            skill_tag: item.skillTag,
            badge_name: item.badgeName,
            score: item.score,
            max_score: item.maxScore,
            passed: item.passed,
            duration_seconds: item.durationSeconds ?? 0,
            attempts: item.attempts ?? 1,
            validation_hash: item.validationHash,
            completed_at: item.completedAt,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al sincronizar`);
      }

      const data = (await response.json()) as SyncBatchResponse;
      const ackHashes = new Set(data.acks.map((ack) => ack.validation_hash));

      await db.transaction('rw', db.sync_queue, db.progress, async () => {
        for (const item of items) {
          if (item.id !== undefined && ackHashes.has(item.validationHash)) {
            await db.sync_queue.delete(item.id);
          }
        }
        const matchingProgress = await db.progress
          .where('validationHash')
          .anyOf(Array.from(ackHashes))
          .toArray();
        for (const prog of matchingProgress) {
          if (prog.id !== undefined) {
            await db.progress.update(prog.id, {
              syncStatus: 'synced',
              syncedAt: data.server_timestamp,
            });
          }
        }
      });

      setLastSyncAt(data.server_timestamp);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red durante sincronización';
      setLastError(message);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [simulatedOffline]);

  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      if (!simulatedOffline) {
        void syncNow();
      }
    };
    const handleOffline = () => {
      setBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOnline && pendingCount > 0) {
      void syncNow();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, pendingCount, simulatedOffline, syncNow]);

  const toggleSimulatedOffline = useCallback(() => {
    setSimulatedOffline((prev) => !prev);
  }, []);

  return {
    isOnline,
    browserOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    lastError,
    syncNow,
  };
}
