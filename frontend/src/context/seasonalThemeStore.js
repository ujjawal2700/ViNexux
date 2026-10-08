import { createContext } from 'react';
import { presetConfig } from '../../../shared/seasonalThemes';
export const defaultSeasonalTheme = { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null };
export const SeasonalThemeContext = createContext({ theme: defaultSeasonalTheme, refresh: async () => {} });
export const StorefrontScopeContext = createContext(false);
