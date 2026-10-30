import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { StatusBar, Platform, Animated, Easing, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../utils/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [colors, setColors] = useState(getColors('dark'));
  const fade = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    const nextColors = getColors(theme);
    setColors(nextColors);
    StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(nextColors.bgDark, true);
    }
    AsyncStorage.setItem('app_theme', theme);
  }, [theme]);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_theme');
      if (saved) setTheme(saved);
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  // Smooth cross-fade: dip the UI, swap palette while it is dimmed, then fade back in.
  const toggleTheme = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    Animated.timing(fade, {
      toValue: 0.15,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      // Wait a frame so the new palette is rendered before fading back in
      requestAnimationFrame(() => {
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          animating.current = false;
        });
      });
    });
  }, [fade]);

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <Animated.View style={{ flex: 1, opacity: fade }}>{children}</Animated.View>
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
