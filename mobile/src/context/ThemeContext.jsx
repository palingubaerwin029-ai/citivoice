import React, { createContext, useState, useEffect, useContext } from 'react';
import { StatusBar, Platform, LayoutAnimation, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../utils/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [colors, setColors] = useState(getColors('dark'));

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

  const toggleTheme = () => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
