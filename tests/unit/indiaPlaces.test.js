import { describe, expect, test, jest, afterEach } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { INDIA_STATES, getCitiesForState, loadPlacesForState } from '../../frontend/src/data/indiaStatesCities.js';
import { INDIA_PLACE_FILES } from '../../frontend/src/data/indiaPlacesManifest.js';
afterEach(() => jest.restoreAllMocks());

describe('India state and city suggestions', () => {
  test('all 36 state/UT selectors have a bundled dataset', async () => {
    expect(INDIA_STATES).toHaveLength(36);
    expect(Object.keys(INDIA_PLACE_FILES).sort()).toEqual(INDIA_STATES);
    let total = 0;
    for (const state of INDIA_STATES) {
      const { file, count } = INDIA_PLACE_FILES[state];
      const data = JSON.parse(await readFile(new URL(`../../frontend/public/data/india-places/${file}`, import.meta.url), 'utf8'));
      expect(data.state).toBe(state);
      expect(data.classification).toBe('urban');
      expect(Object.keys(data.urbanCodes).sort()).toEqual([...data.names].sort());
      expect(data.names.some(name => /^\d/.test(name))).toBe(false);
      expect(data.names).toHaveLength(count);
      expect(new Set(data.names).size).toBe(count);
      expect(data.names.every(name => typeof name === 'string' && name.trim().length > 0)).toBe(true);
      total += count;
    }
    expect(total).toBeGreaterThan(4000);
  });
  test('Rajasthan includes Chittorgarh, alternate spellings and smaller towns', async () => {
    const data = JSON.parse(await readFile(new URL('../../frontend/public/data/india-places/rajasthan.json', import.meta.url), 'utf8'));
    expect(data.names).toEqual(expect.arrayContaining(['Chittorgarh', 'Rawatbhata', 'Jaipur', 'Udaipur']));
    expect(data.aliases.Chittorgarh).toEqual(expect.arrayContaining(['Chittaurgarh']));
    expect(getCitiesForState('Rajasthan')).toContain('Chittorgarh');
    for (const name of ['1 Arm (Surjanwali)', '11 Arm', '1A', '2A', 'Mumbai', 'Ahmedabad']) expect(data.names).not.toContain(name);
  });
  test('rejects a dataset belonging to another state', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ state: 'Maharashtra', names: ['Mumbai'], aliases: {} }) });
    await expect(loadPlacesForState('Gujarat')).rejects.toThrow('selected state');
  });
  test('rejects rural place data even when its state matches', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ state: 'Kerala', classification: 'rural', names: ['Rural Settlement'], aliases: {} }) });
    await expect(loadPlacesForState('Kerala')).rejects.toThrow('urban');
  });
  test('failed dataset loads can retry and cached data merges with the immediate suggestions', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ state: 'Rajasthan', classification: 'urban', names: ['Test City'], aliases: {} }) });
    await expect(loadPlacesForState('Rajasthan')).rejects.toThrow('unavailable');
    const result = await loadPlacesForState('Rajasthan');
    expect(result.names).toEqual(expect.arrayContaining(['Test City', 'Chittorgarh']));
    await loadPlacesForState('Rajasthan');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
