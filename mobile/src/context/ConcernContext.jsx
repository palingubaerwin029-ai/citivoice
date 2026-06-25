import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ConcernService } from '../services/concernService';
import { useAuth } from './AuthContext';

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadFeed = async (page = 1, limit = 10, refresh = false) => {
    if (!user?.id) return null;
    if (page === 1 && refresh) setLoading(true);
    try {
      const res = await ConcernService.getConcerns({ page, limit });
      if (res && res.data) {
        setConcerns(prev => refresh ? res.data : [...prev, ...res.data]);
      }
      return res;
    } catch (err) {
      console.log('Failed to load concerns', err);
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
        setMyConcerns(prev => refresh ? res.data : [...prev, ...res.data]);
      }
      return res;
    } catch (err) {
      console.log('Failed to load my concerns', err);
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

  // ── Manual refresh (pull-to-refresh) ───────────────────────────────────
  const refreshConcerns = async () => {
    await Promise.all([
      loadFeed(1, 10, true),
      loadMyConcerns(1, 10, true)
    ]);
  };

  const addConcern = async (data) => {
    const res = await ConcernService.addConcern({
      ...data,
      userName: user.name,
      userBarangay: user.barangay,
    });
    refreshConcerns();
    return res;
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
