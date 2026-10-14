let latest = { status: 'unavailable' };
let watchId = null;
const listeners = new Set();
const publish = value => { latest = value; listeners.forEach(listener => listener(value)); };
export const adminLocation = {
  get: () => latest,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  start() {
    if (watchId !== null) return;
    if (!navigator.geolocation) { publish({ status: 'unavailable' }); return; }
    watchId = navigator.geolocation.watchPosition(position => publish({ status: 'available', latitude: position.coords.latitude,
      longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }),
    error => { publish({ status: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable' });
      if (error.code === 1) { navigator.geolocation.clearWatch(watchId); watchId = null; } },
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
  },
  stop() { if (watchId !== null) navigator.geolocation?.clearWatch(watchId); watchId = null; publish({ status: 'unavailable' }); },
};
