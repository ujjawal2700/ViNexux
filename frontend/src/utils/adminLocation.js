let latest = { status: 'checking' }, watchId = null, permission = null, permissionRequest = null;
let tracking = false, generation = 0, acquiring = null;
const listeners = new Set();
const publish = value => { latest = value; listeners.forEach(listener => listener(value)); };
const isFresh = () => latest.status === 'available' && Number.isFinite(latest.timestamp) && Math.abs(Date.now() - latest.timestamp) <= 2 * 60000;
const locationError = () => Object.assign(new Error('A current location is required for employee and super-admin access. Allow location and keep device location services enabled.'), { code: 'LOCATION_REQUIRED' });
const clearWatch = () => { if (watchId !== null) navigator.geolocation?.clearWatch(watchId); watchId = null; };
const position = value => {
  if (Math.abs(value.coords?.latitude) > 90 || Math.abs(value.coords?.longitude) > 180 || value.coords?.accuracy < 0 || !Number.isFinite(value.coords?.latitude) || !Number.isFinite(value.coords?.longitude) || !Number.isFinite(value.coords?.accuracy) || !Number.isFinite(value.timestamp) || Math.abs(Date.now() - value.timestamp) > 2 * 60000) throw locationError();
  publish({ status: 'available', latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy, timestamp: value.timestamp });
};
const failure = error => {
  if (error.code === 1) { generation++; acquiring = null; clearWatch(); publish({ status: 'denied' }); }
  // A watch timeout does not invalidate a still-current browser position.
  else if (!isFresh()) publish({ status: error.code === 3 ? 'timeout' : 'unavailable' });
};
async function observePermission() {
  if (permission || !navigator.permissions?.query) return;
  if (!permissionRequest) permissionRequest = Promise.resolve().then(() => navigator.permissions.query({ name: 'geolocation' })).then(value => {
    permission = value;
    permission.onchange = () => {
      if (!tracking) return;
      generation++; acquiring = null; clearWatch();
      if (permission.state !== 'granted') publish({ status: permission.state === 'denied' ? 'denied' : 'unavailable' });
      else { publish({ status: 'checking' }); adminLocation.requireValid().catch(() => {}); }
    };
  }).catch(() => { /* Geolocation still enforces permission without PermissionStatus. */ }).finally(() => { permissionRequest = null; });
  await permissionRequest;
}
export const adminLocation = {
  get: () => latest,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  invalidate() { generation++; acquiring = null; clearWatch(); publish({ status: 'checking' }); },
  start() {
    tracking = true; observePermission();
    if (watchId !== null || !navigator.geolocation || permission?.state === 'denied') return;
    const version = generation;
    // Network-based positioning is sufficient for audit logs and avoids waiting
    // for a high-accuracy GPS fix on desktop computers.
    const id = navigator.geolocation.watchPosition(value => {
      if (!tracking || version !== generation) return;
      try { position(value); } catch { if (!acquiring) failure({ code: 2 }); }
    }, error => {
      if (!tracking || version !== generation) return;
      if (error.code === 1 || !acquiring) failure(error);
    }, { enableHighAccuracy: false, maximumAge: 30000, timeout: 12000 });
    watchId = id;
  },
  async requireValid() {
    tracking = true;
    await observePermission();
    if (!tracking) throw locationError();
    if (permission?.state === 'denied') { failure({ code: 1 }); throw locationError(); }
    if (isFresh()) { this.start(); if (!isFresh()) throw locationError(); return latest; }
    if (acquiring) return acquiring;
    if (!navigator.geolocation) { failure({ code: 2 }); throw locationError(); }
    publish({ status: 'checking' });
    const version = generation;
    const request = new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 30000, timeout: 12000 }))
      .then(value => {
        if (!tracking || version !== generation) throw locationError();
        position(value); this.start(); if (!isFresh()) throw locationError(); return latest;
      }).catch(error => {
        if (!tracking || version !== generation) throw locationError();
        // Another concurrent watch may already have supplied a good fix.
        if (error.code !== 1 && isFresh()) return latest;
        failure(error); throw locationError();
      }).finally(() => { if (acquiring === request) acquiring = null; });
    acquiring = request;
    return request;
  },
  stop() { tracking = false; generation++; acquiring = null; clearWatch(); publish({ status: 'checking' }); },
};
