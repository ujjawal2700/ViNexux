import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import useTheme from '../../hooks/useTheme';

/**
 * ThemeToggle - light/dark mode switch button.
 * Drop into any header. Persists choice via ThemeContext (localStorage + system fallback).
 */
const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-muted/60 text-foreground hover:bg-muted hover:text-primary transition-colors focus-ring',
        className
      )}
    >
      <Sun className={cn('w-4 h-4 transition-all', isDark ? 'scale-0 -rotate-90 absolute' : 'scale-100 rotate-0')} />
      <Moon className={cn('w-4 h-4 transition-all', isDark ? 'scale-100 rotate-0' : 'scale-0 rotate-90 absolute')} />
    </button>
  );
};

export default ThemeToggle;
