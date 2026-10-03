import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const secretLikeFrontendVariables = Object.keys(env).filter((name) =>
    /^VITE_.*(?:SECRET|PRIVATE|PASSWORD|ACCESS_TOKEN|CLIENT_SECRET|CREDENTIAL|JWT|SIGNING_KEY)/i.test(name)
  );
  if (secretLikeFrontendVariables.length) {
    throw new Error(`Secret-like VITE_ variables cannot be bundled into browser code: ${secretLikeFrontendVariables.join(', ')}`);
  }

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 3000, host: '0.0.0.0', open: false },
  };
});
