import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ToastAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConcernService } from '../services/concernService';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';

const OFFLINE_QUEUE_KEY = 'cv_offline_concerns_queue';

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
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
        upvotes: 0,
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
      const res = await ConcernService.getConcerns({ page, limit });
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

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setConcerns([]);
      setMyConcerns([]);
      setLoading(false);
      return;
    }
    loadFeed(1, 10, true);
    loadMyConcerns(1, 10, true);
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
    await Promise.all([
      loadFeed(1, 10, true),
      loadMyConcerns(1, 10, true)
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
      upvotes: 0,
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
        setMyConcerns(prev => [optimisticOfflineItem, ...prev]);
        
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

  const toggleUpvote = async (concernId) => {
    await ConcernService.toggleUpvote(concernId);
    
    // Optimistically update the UI to avoid full reload delay
    const updater = (prev) => prev.map(c => {
      if (c.id === concernId) {
        const isUpvoted = !c.is_upvoted_by_me;
        return {
          ...c,
          is_upvoted_by_me: isUpvoted,
          upvotes: isUpvoted ? (c.upvotes || 0) + 1 : Math.max((c.upvotes || 0) - 1, 0)
        };
      }
      return c;
    });
    
    setConcerns(updater);
    setMyConcerns(updater);
  };

  const analyzeDraft = async (title, description) => {
    return await ConcernService.analyzeDraft(title, description);
  };

  return (
    <ConcernContext.Provider
      value={{
        concerns,
        myConcerns,
        loading,
        isOffline,    // forwarded from NetworkContext for convenience
        addConcern,
        updateConcern,
        deleteConcern,
        toggleUpvote,
        refreshConcerns,
        analyzeDraft,
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
