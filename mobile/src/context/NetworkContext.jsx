import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  isOnline: true,
  connectionType: 'unknown',
  justReconnected: false,
  isChecking: false,
  bannerDismissed: false,
  setBannerDismissed: () => {},
  checkConnection: async () => {},
});

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const prevOfflineRef = useRef(false);
  const reconnectedTimerRef = useRef(null);

  const evaluateState = useCallback((state) => {
    // isConnected: false means device is disconnected from any network
    // isInternetReachable === false means connected to local network but internet cannot be reached
    // If state.isConnected is true and state.isInternetReachable is null, it's still verifying; default to online
    const offline = !(state.isConnected && state.isInternetReachable !== false);

    setIsConnected(Boolean(state.isConnected));
    setIsInternetReachable(state.isInternetReachable);
    setConnectionType(state.type || 'unknown');
    setIsOffline(offline);

    if (prevOfflineRef.current && !offline) {
      // Transition from OFFLINE -> ONLINE
      console.log('[NetworkContext] Internet connection restored!');
      setJustReconnected(true);
      setBannerDismissed(false); // Reset dismissal on reconnect so success banner shows
      if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
      reconnectedTimerRef.current = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
    } else if (offline && !prevOfflineRef.current) {
      // Transition from ONLINE -> OFFLINE
      console.log('[NetworkContext] Internet connection lost! Switched to offline mode.');
      setJustReconnected(false);
      setBannerDismissed(false); // Reset dismissal so offline notice shows
    }

    prevOfflineRef.current = offline;
    return offline;
  }, []);

  useEffect(() => {
    // 1. Immediately fetch the real network state on mount
    NetInfo.fetch().then((state) => {
      evaluateState(state);
    });

    // 2. Listen to real-time network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      evaluateState(state);
    });

    return () => {
      unsubscribe();
      if (reconnectedTimerRef.current) clearTimeout(reconnectedTimerRef.current);
    };
  }, [evaluateState]);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      const offline = evaluateState(state);
      return !offline;
    } catch (err) {
      console.log('[NetworkContext] checkConnection error:', err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [evaluateState]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        isOffline,
        isOnline: !isOffline,
        connectionType,
        justReconnected,
        isChecking,
        bannerDismissed,
        setBannerDismissed,
        checkConnection,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
