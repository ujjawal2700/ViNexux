import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, ExternalLink, MapPin, Search } from 'lucide-react';

const DEFAULT_CENTER = [26.9124, 75.7873];

const markerIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#800020;border:4px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.35)"><div style="width:6px;height:6px;background:white;border-radius:50%;margin:7px"></div></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const formatCoordinate = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(6) : '';
const hasCoordinates = (location) => location?.latitude !== '' && location?.longitude !== '' && location?.latitude != null && location?.longitude != null && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

const OfficeLocationPicker = ({ value, onChange, disabled = false }) => {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return undefined;

    const hasInitialPosition = hasCoordinates(value);
    const initialPosition = hasInitialPosition
      ? [Number(value.latitude), Number(value.longitude)]
      : DEFAULT_CENTER;
    const map = L.map(mapNodeRef.current, { scrollWheelZoom: false }).setView(initialPosition, hasInitialPosition ? 16 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const setLocation = (lat, lng) => {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      if (!markerRef.current) {
        markerRef.current = L.marker([latitude, longitude], { draggable: true, icon: markerIcon }).addTo(map);
        markerRef.current.on('dragend', () => {
          const position = markerRef.current.getLatLng();
          onChangeRef.current({ latitude: position.lat, longitude: position.lng, formattedAddress: '' });
        });
      } else {
        markerRef.current.setLatLng([latitude, longitude]);
      }
      onChangeRef.current({ latitude, longitude, formattedAddress: '' });
    };

    map.on('click', ({ latlng }) => {
      if (!disabled) setLocation(latlng.lat, latlng.lng);
    });
    mapRef.current = map;

    if (hasInitialPosition) {
      markerRef.current = L.marker(initialPosition, { draggable: !disabled, icon: markerIcon }).addTo(map);
      markerRef.current.on('dragend', () => {
        const position = markerRef.current.getLatLng();
        onChangeRef.current({ ...value, latitude: position.lat, longitude: position.lng });
      });
    }

    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is initialized once; prop changes are synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !hasCoordinates(value)) return;
    const position = [Number(value.latitude), Number(value.longitude)];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { draggable: !disabled, icon: markerIcon }).addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const next = markerRef.current.getLatLng();
        onChangeRef.current({ ...value, latitude: next.lat, longitude: next.lng });
      });
    } else {
      markerRef.current.setLatLng(position);
    }
  }, [disabled, value]);

  const selectLocation = (latitude, longitude, formattedAddress = '') => {
    const next = { latitude: Number(latitude), longitude: Number(longitude), formattedAddress };
    onChange(next);
    mapRef.current?.setView([next.latitude, next.longitude], 17);
    setLocationError('');
  };

  const handleSearch = async (event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setLocationError('');
    try {
      const params = new URLSearchParams({ format: 'jsonv2', limit: '5', countrycodes: 'in', q: query.trim() });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error('Location search is unavailable');
      const data = await response.json();
      setResults(data);
      if (!data.length) setLocationError('No matching office location found. Try a nearby landmark or a more complete address.');
    } catch {
      setLocationError('Could not search locations right now. You can still click the map or enter coordinates.');
    } finally {
      setSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location access is not supported by this browser.');
      return;
    }
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => selectLocation(coords.latitude, coords.longitude, 'Current location'),
      () => setLocationError('Location permission was denied or your position could not be found.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const updateCoordinate = (field, rawValue) => {
    if (rawValue === '') {
      onChange({ ...value, [field]: '' });
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) onChange({ ...value, [field]: parsed });
  };

  const hasLocation = hasCoordinates(value);

  return (
    <div className="space-y-3 text-left">
      <div>
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-800">Location of your office *</h3>
        <p className="mt-1 text-xs text-gray-500">Search, use your current location, or click the map to drop a draggable pin.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
        <div className="relative z-[500] flex gap-2 border-b border-gray-200 p-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSearch(event); }} disabled={disabled} placeholder="Search city, address, business or landmark..." className="w-full rounded border border-gray-300 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <button type="button" onClick={handleSearch} disabled={disabled || searching} className="rounded bg-primary px-3 text-xs font-bold text-white disabled:opacity-50">{searching ? 'Searching…' : 'Search'}</button>
          <button type="button" onClick={useCurrentLocation} disabled={disabled} title="Use current location" className="rounded border border-gray-300 px-3 text-primary hover:bg-primary/5 disabled:opacity-50"><Crosshair className="h-4 w-4" /></button>
        </div>
        {results.length > 0 && (
          <div className="relative z-[500] max-h-40 overflow-y-auto border-b border-gray-200 bg-white">
            {results.map((result) => (
              <button key={result.place_id} type="button" onClick={() => { selectLocation(result.lat, result.lon, result.display_name); setResults([]); setQuery(result.display_name); }} className="flex w-full items-start gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 last:border-0">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {result.display_name}
              </button>
            ))}
          </div>
        )}
        <div ref={mapNodeRef} className="h-72 w-full" aria-label="Office location map" />
      </div>

      {locationError && <p className="text-xs font-medium text-rose-600">{locationError}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Latitude *
          <input type="number" step="any" min="-90" max="90" required value={value?.latitude ?? ''} onChange={(event) => updateCoordinate('latitude', event.target.value)} disabled={disabled} className="w-full rounded border border-gray-300 px-3.5 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. 26.916102" />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Longitude *
          <input type="number" step="any" min="-180" max="180" required value={value?.longitude ?? ''} onChange={(event) => updateCoordinate('longitude', event.target.value)} disabled={disabled} className="w-full rounded border border-gray-300 px-3.5 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. 75.781760" />
        </label>
      </div>

      {hasLocation && (
        <a href={`https://www.google.com/maps?q=${value.latitude},${value.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-bold text-primary hover:bg-primary/10">
          <MapPin className="h-4 w-4" /> View office on maps ({formatCoordinate(value.latitude)}, {formatCoordinate(value.longitude)}) <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
};

export default OfficeLocationPicker;
