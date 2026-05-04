import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { ConcernService } from "../services/concernService";
import { useAuth } from "./AuthContext";

const ConcernContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 seconds — matches notification polling

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // ── Core data loader ───────────────────────────────────────────────────
  // silent = true → background poll (no loading spinner)
  // silent = false → initial load or manual refresh (shows spinner)
  const loadData = React.useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const all = await ConcernService.getConcerns();
      setConcerns(all);
      const mine = all.filter(c => c.user_id === user.id);
      setMyConcerns(mine);
    } catch (err) {
      // Silently ignore polling errors to avoid spamming the user
      if (!silent) console.log('Failed to load concerns', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id]);

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setConcerns([]);
      setMyConcerns([]);
      setLoading(false);
      return;
    }
    loadData(false); // full load with spinner
  }, [loadData, user?.id]);

  // ── Auto-poll for status updates ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Poll every 30s while the app is in the foreground
    const interval = setInterval(() => {
      if (appState.current === 'active') {
        loadData(true); // silent refresh
      }
    }, POLL_INTERVAL);

    // Pause/resume on app state changes
    const subscription = AppState.addEventListener('change', (nextState) => {
      // If the app comes back to the foreground, do an immediate silent refresh
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        loadData(true);
      }
      appState.current = nextState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadData, user?.id]);

  // ── Manual refresh (pull-to-refresh) ───────────────────────────────────
  const refreshConcerns = async () => {
    await loadData(false);
  };

  const addConcern = async (data) => {
    const res = await ConcernService.addConcern({
      ...data,
      userId: user.id,
      userName: user.name,
      userBarangay: user.barangay,
    });
    loadData(true);
    return res;
  };

  const updateConcern = async (id, updates) => {};

  const deleteConcern = async (id) => {
    await ConcernService.deleteConcern(id);
    loadData(true);
  };

  const toggleUpvote = async (concernId) => {
    await ConcernService.toggleUpvote(concernId);
    loadData(true);
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
      }}
    >
      {children}
    </ConcernContext.Provider>
  );
}

export const useConcerns = () => useContext(ConcernContext);

