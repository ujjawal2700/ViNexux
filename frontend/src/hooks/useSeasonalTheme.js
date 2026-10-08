import { useContext } from 'react';
import { SeasonalThemeContext } from '../context/seasonalThemeStore';
export const useSeasonalTheme = () => useContext(SeasonalThemeContext);
