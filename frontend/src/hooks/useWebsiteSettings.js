import { useContext } from 'react';
import { WebsiteSettingsContext } from '../context/websiteSettingsStore';

const useWebsiteSettings = () => {
  const context = useContext(WebsiteSettingsContext);
  if (!context) throw new Error('useWebsiteSettings must be used within WebsiteSettingsProvider');
  return context;
};

export default useWebsiteSettings;
