import { useEffect, useState } from 'react';
import { INDIA_STATES, getCitiesForState, loadPlacesForState } from '../../data/indiaStatesCities';
import { INDIA_GST_STATE_CODES } from '../../../../shared/indiaGstStates.js';

// State and city can only be selected from the supplied place lists.
export default function StateCityFields({ value, onChange, disabled = false, required = false, errors = {}, prefix, stateLabel = 'State', includeCity = true, withStateCode = false, stateDisabled = false }) {
  const [places, setPlaces] = useState({ state: '', names: [], aliases: {}, failed: false });
  const state = value.state || '';
  useEffect(() => {
    if (!state || !includeCity) return;
    let active = true;
    loadPlacesForState(state).then(result => { if (active) setPlaces({ state, ...result, failed: false }); })
      .catch(() => { if (active) setPlaces({ state, names: getCitiesForState(state), aliases: {}, failed: true }); });
    return () => { active = false; };
  }, [state, includeCity]);
  const controlClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-50';
  const cities = places.state === state ? places.names : getCitiesForState(state);
  return <>
    <label className="min-w-0 space-y-1.5">
      <span className="block text-xs font-medium text-slate-600">{stateLabel}{required ? ' *' : ' (optional)'}</span>
      <select aria-label={`${stateLabel}${required ? ' *' : ''}`} value={state} disabled={disabled || stateDisabled} required={required} aria-invalid={!!errors.state} className={controlClass} data-pos-field={prefix ? `${prefix}.state` : undefined}
        onChange={event => { const next = event.target.value; onChange({ ...value, state: next, ...(includeCity && next !== state ? { city: '' } : {}), ...(withStateCode ? { stateCode: INDIA_GST_STATE_CODES[next] || '' } : {}) }); }}>
        <option value="">Select state</option>{INDIA_STATES.map(name => <option key={name}>{name}</option>)}
      </select>
      {errors.state && <span role="alert" className="block text-xs text-rose-700">{errors.state}</span>}
    </label>
    {includeCity && <label className="min-w-0 space-y-1.5">
      <span className="block text-xs font-medium text-slate-600">City{required ? ' *' : ' (optional)'}</span>
      <select aria-label={`City${required ? ' *' : ''}`} value={value.city || ''} disabled={disabled || !state} required={required} aria-invalid={!!errors.city} className={controlClass} data-pos-field={prefix ? `${prefix}.city` : undefined}
        onChange={event => onChange({ ...value, city: event.target.value })}>
        <option value="">{state ? 'Select city' : 'Select state first'}</option>
        {value.city && !cities.includes(value.city) && <option value={value.city} disabled>{value.city} — choose from list</option>}
        {cities.map(name => <option key={name}>{name}</option>)}
      </select>
      {places.state === state && places.failed && <span className="block text-xs text-slate-500">Full city list unavailable. Showing available cities.</span>}
      {errors.city && <span role="alert" className="block text-xs text-rose-700">{errors.city}</span>}
    </label>}
  </>;
}
