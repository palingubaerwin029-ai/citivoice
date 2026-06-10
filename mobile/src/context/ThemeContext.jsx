import React, { createContext, useState, useEffect, useContext } from 'react';
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
    setColors(getColors(theme));
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
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
