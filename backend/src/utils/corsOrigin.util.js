// Treat numeric loopback and localhost as aliases only in development and
// only for a configured origin with the same protocol and port.
export function isDevelopmentLoopbackAlias(origin, allowedOrigins, nodeEnv) {
  if (nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
    return allowedOrigins.some(allowed => {
      try {
        const entry = new URL(allowed);
        return ['localhost', '127.0.0.1', '[::1]'].includes(entry.hostname) &&
          entry.protocol === url.protocol && entry.port === url.port;
      } catch { return false; }
    });
  } catch { return false; }
}
