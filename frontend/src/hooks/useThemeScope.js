import { useContext } from 'react';
import { StorefrontScopeContext } from '../context/seasonalThemeStore';
import { useSeasonalTheme } from './useSeasonalTheme';
import { themeVariables } from '../../../shared/seasonalThemes';
export function useThemeScope() {
  const inStorefront = useContext(StorefrontScopeContext);
  const { theme } = useSeasonalTheme();
  return { inStorefront, themeStyle: inStorefront ? themeVariables(theme.config) : {} };
}
