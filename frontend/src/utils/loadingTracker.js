let activeRequests = 0;
let currentMessage = 'Loading content...';
const listeners = new Set();

const emit = () => {
  const snapshot = { active: activeRequests > 0, count: activeRequests, message: currentMessage };
  listeners.forEach((listener) => listener(snapshot));
};

export const loadingTracker = {
  start(message = 'Loading content...') {
    activeRequests += 1;
    currentMessage = message;
    emit();
  },
  finish() {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) currentMessage = 'Loading content...';
    emit();
  },
  subscribe(listener) {
    listeners.add(listener);
    listener({ active: activeRequests > 0, count: activeRequests, message: currentMessage });
    return () => listeners.delete(listener);
  },
};

export default loadingTracker;
