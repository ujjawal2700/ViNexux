export function optionalAdminLocation(location, now = new Date()) {
  const time = new Date(location?.capturedAt ?? location?.timestamp ?? NaN).getTime();
  if (location?.status !== 'available' || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180 || !Number.isFinite(location.accuracy) || location.accuracy < 0 || !Number.isFinite(time) || Math.abs(now.getTime() - time) > 5 * 60000) {
    return undefined;
  }
  return { status: 'available', latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, capturedAt: new Date(time), source: 'browser-reported' };
}
