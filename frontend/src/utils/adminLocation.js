let latest = { status: 'unavailable' }, watchId = null, permission = null;
const listeners = new Set();
const publish = value => { latest = value; listeners.forEach(listener => listener(value)); };
const failure = error => { publish({ status: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable' }); };
const position = value => publish({ status: 'available', latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy, timestamp: value.timestamp });
const isFresh = () => latest.status === 'available' && Math.abs(Date.now() - latest.timestamp) <= 2 * 60000;
const locationError = () => Object.assign(new Error('Location permission is required for employee and super-admin access. Allow location in your browser and try again.'), { code: 'LOCATION_REQUIRED' });
async function observePermission() {
  if (permission || !navigator.permissions?.query) return;
  try {
    permission = await navigator.permissions.query({ name: 'geolocation' });
    permission.onchange = () => { if (permission.state !== 'granted') { adminLocation.stop(); publish({ status: permission.state === 'denied' ? 'denied' : 'unavailable' }); } };
  } catch { /* Browsers without PermissionStatus still enforce geolocation permission. */ }
}
export const adminLocation = {
  get: () => latest,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  invalidate() { publish({ status: 'unavailable' }); },
  start() {
    observePermission();
    if (watchId !== null) return;
    if (!navigator.geolocation) { publish({ status: 'unavailable' }); return; }
    watchId = navigator.geolocation.watchPosition(position, error => { failure(error); if (error.code === 1) { navigator.geolocation.clearWatch(watchId); watchId = null; } }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 });
  },
  async requireValid() {
    await observePermission();
    if (permission?.state === 'denied') { publish({ status: 'denied' }); throw locationError(); }
    if (isFresh()) return latest;
    if (!navigator.geolocation) throw locationError();
    try {
      const value = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }));
      position(value); this.start(); return latest;
    } catch (error) { failure(error); throw locationError(); }
  },
  stop() { if (watchId !== null) navigator.geolocation?.clearWatch(watchId); watchId = null; publish({ status: 'unavailable' }); },
};
