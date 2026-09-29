const STORAGE_KEY = 'vinexus_storage_choices_v1';
const OPTIONAL_KEYS = ['vinexus_wishlist', 'vinexus_recently_viewed'];

export const getStorageChoices = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return value && typeof value.preferences === 'boolean' ? value : null;
  } catch {
    return null;
  }
};

export const allowsPreferences = () => getStorageChoices()?.preferences === true;

export const saveStorageChoices = (preferences) => {
  const choice = { preferences: Boolean(preferences), updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    if (!choice.preferences) OPTIONAL_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // A private browser may block storage; the banner can reappear next visit.
  }
  window.dispatchEvent(new Event('storage-choices-updated'));
  window.dispatchEvent(new Event('wishlist-updated'));
  return choice;
};

export const openStorageChoices = () => window.dispatchEvent(new Event('open-storage-choices'));
