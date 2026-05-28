// Firebase sync — Phase 2 feature
// Requires FEATURE_FIREBASE_SYNC setting to be enabled via a license key
import { useState } from 'react';

export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const sync = async () => {
    const enabled = await window.ledgr.getSetting('FEATURE_FIREBASE_SYNC');
    if (enabled !== 'true') return;
    setSyncing(true);
    setError(null);
    try {
      // Sync logic will be added in Phase 2
      setLastSync(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, lastSync, error, sync };
}
