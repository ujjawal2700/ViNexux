import React, { createContext, useState, useEffect, useCallback } from 'react';

export const ThemeContext = createContext(null);

const STORAGE_KEY = 'vinexus-theme';

const getInitialTheme = () => {
  return 'light';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  // Always enforce light theme across the application
  root.classList.remove('dark');
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    applyTheme('light');
    try {
      window.localStorage.setItem(STORAGE_KEY, 'light');
    } catch {}
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState('light');
    applyTheme('light');
    try {
      window.localStorage.setItem(STORAGE_KEY, 'light');
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState('light');
    applyTheme('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
