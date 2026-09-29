import React, { createContext, useEffect, useCallback } from 'react';

export const ThemeContext = createContext(null);

const applyTheme = () => {
  const root = document.documentElement;
  // Always enforce light theme across the application
  root.classList.remove('dark');
};

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    applyTheme();
  }, []);

  const setTheme = useCallback(() => applyTheme(), []);

  const toggleTheme = useCallback(() => applyTheme(), []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
