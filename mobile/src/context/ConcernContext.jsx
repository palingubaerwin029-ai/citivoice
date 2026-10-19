import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ToastAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConcernService } from '../services/concernService';
import { SocketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';

const OFFLINE_QUEUE_KEY = 'cv_offline_concerns_queue';

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
  const [cityStats, setCityStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    urgent: 0,
  });
  const [myStats, setMyStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    urgent: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOffline } = useNetwork();
  const { user } = useAuth();

  const getOptimisticOfflineItems = async () => {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = queueStr ? JSON.parse(queueStr) : [];
      return queue.map(q => ({
        ...q,
        id: 'offline-' + q._offlineId,
        status: 'Pending Sync',
        created_at: q._queuedAt,
        comments_count: 0,
        isOfflineQueued: true,
      }));
    } catch {
      return [];
    }
  };

  const loadFeed = async (page = 1, limit = 10, refresh = false) => {
    if (!user?.id) return null;
    if (page === 1 && refresh) setLoading(true);
    try {
      const res = await ConcernService.getUserConcerns(user.id, { page, limit });
      if (res && res.data) {
        let finalData = res.data;
        if (page === 1 && refresh) {
          const offlineItems = await getOptimisticOfflineItems();
          finalData = [...offlineItems, ...finalData];
        }
        setConcerns(prev => refresh ? finalData : [...prev, ...res.data]);
      }
      return res;
    } catch (err) {
      console.log('Failed to load concerns', err);
      // If offline or network failed on first load, try to at least show offline queue
      if (page === 1 && refresh) {
        const offlineItems = await getOptimisticOfflineItems();
        setConcerns(offlineItems);
      }
      return null;
    } finally {
      if (page === 1 && refresh) setLoading(false);
    }
  };

  const loadMyConcerns = async (page = 1, limit = 10, refresh = false) => {
    if (!user?.id) return null;
    try {
      const res = await ConcernService.getUserConcerns(user.id, { page, limit });
      if (res && res.data) {
        let finalData = res.data;
        if (page === 1 && refresh) {
          const offlineItems = await getOptimisticOfflineItems();
          finalData = [...offlineItems, ...finalData];
        }
        setMyConcerns(prev => refresh ? finalData : [...prev, ...res.data]);
      }
      return res;
    } catch (err) {
      console.log('Failed to load my concerns', err);
      if (page === 1 && refresh) {
        const offlineItems = await getOptimisticOfflineItems();
        setMyConcerns(offlineItems);
      }
      return null;
    }
  };

  const loadMapData = async () => {
    try {
      return await ConcernService.getMapConcerns();
    } catch (err) {
      console.log('Failed to load map data', err);
      return [];
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return null;
    try {
      const res = await ConcernService.getStats();
      if (res) {
        if (res.city) {
          setCityStats({
            total: Number(res.city.total || 0),
            pending: Number(res.city.pending || 0),
            inProgress: Number(res.city.inProgress || 0),
            resolved: Number(res.city.resolved || 0),
            rejected: Number(res.city.rejected || 0),
            urgent: Number(res.city.urgent || 0),
          });
        }
        if (res.mine) {
          setMyStats({
            total: Number(res.mine.total || 0),
            pending: Number(res.mine.pending || 0),
            inProgress: Number(res.mine.inProgress || 0),
            resolved: Number(res.mine.resolved || 0),
            rejected: Number(res.mine.rejected || 0),
            urgent: Number(res.mine.urgent || 0),
          });
        }
      }
      return res;
    } catch (err) {
      console.log('Failed to fetch concern stats', err);
      return null;
    }
  };

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setConcerns([]);
      setMyConcerns([]);
      setCityStats({ total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, urgent: 0 });
      setMyStats({ total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, urgent: 0 });
      setLoading(false);
      return;
    }
    loadFeed(1, 10, true);
    loadMyConcerns(1, 10, true);
    fetchStats();
  }, [user?.id]);

  // ── Real-time Socket Event Listeners for Live Accurate Stats ────────────
  useEffect(() => {
    if (!user?.id) return;

    const handleStatsUpdate = () => {
      fetchStats();
    };

    SocketService.on('concern_stats_updated', handleStatsUpdate);
    SocketService.on('new_concern', handleStatsUpdate);
    SocketService.on('concern_status_changed', handleStatsUpdate);
    SocketService.on('update_concern', handleStatsUpdate);
    SocketService.on('concern_approved', handleStatsUpdate);
    SocketService.on('concern_deleted', handleStatsUpdate);

    return () => {
      SocketService.off('concern_stats_updated', handleStatsUpdate);
      SocketService.off('new_concern', handleStatsUpdate);
      SocketService.off('concern_status_changed', handleStatsUpdate);
      SocketService.off('update_concern', handleStatsUpdate);
      SocketService.off('concern_approved', handleStatsUpdate);
      SocketService.off('concern_deleted', handleStatsUpdate);
    };
  }, [user?.id]);

  const syncingRef = useRef(false);
  const syncTimeoutRef = useRef(null);

  // ── Auto-Sync when internet is restored ─────────────────────────────────
  useEffect(() => {
    if (!isOffline && user?.id) {
      // Debounce auto-sync by 1.5s to collapse rapid consecutive events into one
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncOfflineConcerns();
      }, 1500);
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [isOffline, user?.id]);

  const syncOfflineConcerns = async () => {
    if (syncingRef.current) {
      console.log('[Auto-Sync] Sync already in progress, skipping duplicate call.');
      return;
    }
    
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueStr) return;
      
      const queue = JSON.parse(queueStr);
      if (!Array.isArray(queue) || queue.length === 0) return;

      console.log(`[Auto-Sync] Syncing ${queue.length} offline concerns...`);
      
      const remainingQueue = [];
      let syncedCount = 0;

      for (const item of queue) {
        try {
          // Attempt to upload to server
          await ConcernService.addConcern(item);
          syncedCount++;
        } catch (err) {
          console.log('[Auto-Sync] Failed to sync item:', err);
          remainingQueue.push(item); // Keep in queue if network or server failed
        }
      }

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
      
      if (syncedCount > 0) {
        refreshConcerns();
        if (Platform.OS === 'android') {
          ToastAndroid.show(`Synced ${syncedCount} offline report(s)`, ToastAndroid.SHORT);
        }
      }
    } catch (err) {
      console.log('[Auto-Sync] Error during sync:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  };

  // ── Manual refresh (pull-to-refresh) ───────────────────────────────────
  const refreshConcerns = async () => {
    if (!isOffline && user?.id) {
      syncOfflineConcerns();
    }
    await Promise.all([
      loadFeed(1, 10, true),
      loadMyConcerns(1, 10, true),
      fetchStats(),
    ]);
  };

  const addConcern = async (data) => {
    const payload = {
      ...data,
      userName: user.name,
      userBarangay: user.barangay,
    };

    const optimisticOfflineItem = {
      ...payload,
      id: 'offline-' + Date.now(),
      status: 'Pending Sync',
      created_at: new Date().toISOString(),
      comments_count: 0,
      isOfflineQueued: true, // Custom flag to render it differently if needed
    };

    if (isOffline) {
      // Save to offline queue
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = queueStr ? JSON.parse(queueStr) : [];
      
      queue.push({
        ...payload,
        _offlineId: Date.now().toString(),
        _queuedAt: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      // Optimistically add to UI state
      setConcerns(prev => [optimisticOfflineItem, ...prev]);
      setMyConcerns(prev => [optimisticOfflineItem, ...prev]);
      
      return { offline: true };
    }

    try {
      const res = await ConcernService.addConcern(payload);
      await refreshConcerns(); // Await this so the UI has the new data before navigating back
      return res;
    } catch (err) {
      // If network dropped mid-flight (e.g., Network request failed)
      if (err.message && (err.message.includes('Network') || err.message.includes('Failed to fetch') || err.message.includes('timeout'))) {
        console.log('[ConcernContext] Network failed during addConcern, falling back to offline queue');
        const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({
          ...payload,
          _offlineId: Date.now().toString(),
          _queuedAt: new Date().toISOString(),
        });
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        
        // Optimistically add to UI state
        setConcerns(prev => [optimisticOfflineItem, ...prev]);
        // If we are actually online (transient socket timeout), schedule an auto-sync retry
        if (!isOffline) {
          setTimeout(() => {
            syncOfflineConcerns();
          }, 2000);
        }
        
        return { offline: true };
      }
      throw err;
    }
  };

  const updateConcern = async (id, updates) => {};

  const deleteConcern = async (id) => {
    await ConcernService.deleteConcern(id);
    refreshConcerns();
  };

  const analyzeDraft = async (title, description) => {
    return await ConcernService.analyzeDraft(title, description);
  };

  const verifyImageAlignment = async (imageUri, title, description, category) => {
    return await ConcernService.verifyImageAlignment(imageUri, title, description, category);
  };

  return (
    <ConcernContext.Provider
      value={{
        concerns,
        myConcerns,
        cityStats,
        myStats,
        fetchStats,
        loading,
        isOffline,    // forwarded from NetworkContext for convenience
        addConcern,
        updateConcern,
        deleteConcern,
        refreshConcerns,
        analyzeDraft,
        verifyImageAlignment,
        loadFeed,
        loadMyConcerns,
        loadMapData,
      }}
    >
      {children}
    </ConcernContext.Provider>
  );
}

export const useConcerns = () => useContext(ConcernContext);
