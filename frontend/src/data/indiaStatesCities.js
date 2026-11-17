/** Urban-only city options, generated from Census TOWN / Urban records. */
import { INDIA_PLACE_FILES } from './indiaPlacesManifest.js';
import { INDIA_CITY_FALLBACKS } from './indiaCityFallbacks.js';
export const INDIA_STATES_CITIES = INDIA_CITY_FALLBACKS;

export const INDIA_STATES = Object.keys(INDIA_STATES_CITIES).sort();

export const getCitiesForState = (state) => [...new Set(INDIA_STATES_CITIES[state] || [])].sort((a, b) => a.localeCompare(b));

const placeCache = new Map();
export async function loadPlacesForState(state) {
  const fallback = getCitiesForState(state);
  const file = INDIA_PLACE_FILES[state]?.file;
  if (!file) return { names: fallback, aliases: {} };
  if (!placeCache.has(state)) {
    const pending = fetch(`/data/india-places/${file}?v=${INDIA_PLACE_FILES[state].version}`).then(async response => {
      if (!response.ok) throw new Error('Place suggestions unavailable');
      const data = await response.json();
      if (data.state !== state) throw new Error('Place suggestions do not match the selected state');
      if (data.classification !== 'urban') throw new Error('Only urban city data is supported');
      if (!Array.isArray(data.names) || !data.names.every(name => typeof name === 'string')) throw new Error('Invalid place suggestions');
      return { names: [...new Set([...fallback, ...data.names])].sort((a, b) => a.localeCompare(b)), aliases: data.aliases || {} };
    }).catch(error => { placeCache.delete(state); throw error; });
    placeCache.set(state, pending);
  }
  return placeCache.get(state);
}

export default INDIA_STATES_CITIES;
