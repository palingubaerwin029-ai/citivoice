import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('@citivoice_lang').then(lang => {
      if (lang) setLanguage(lang);
    });
  }, []);

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('@citivoice_lang', lang);
  };

  const t = (key) => translations[language]?.[key] || translations['en']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);