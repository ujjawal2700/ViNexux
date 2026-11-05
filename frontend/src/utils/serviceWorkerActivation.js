// navigator.serviceWorker.ready resolves the controlling scope, which may be the
// admin offline worker rather than the notification worker being registered.
export const waitForServiceWorkerActivation = async registration => {
  if (registration.active) return registration;
  const worker = registration.installing || registration.waiting;
  if (!worker) throw new Error('Notification service worker is not ready. Please try again.');
  await new Promise((resolve, reject) => {
    const finish = error => { clearTimeout(timeout); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
    const changed = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('Notification service worker could not activate.'));
    };
    const timeout = setTimeout(() => finish(new Error('Notification service worker activation timed out.')), 20000);
    worker.addEventListener('statechange', changed); changed();
  });
  return registration;
};
