/**
 * PM2 process file for the Vinexus API on a 4 vCPU VPS (Hostinger KVM 4).
 *
 * Cluster mode starts one Node process per instance, all sharing port 5000;
 * PM2 balances incoming connections across them. nginx proxies to 5000.
 *
 *   cd backend
 *   pm2 start ecosystem.config.cjs --env production   # first start
 *   pm2 reload ecosystem.config.cjs --env production  # zero-downtime deploy
 *   pm2 save && pm2 startup                           # survive reboots
 *
 * Secrets (MONGODB_URI, JWT_SECRET, ...) stay in backend/.env, which the app
 * loads itself. Values set below take precedence over .env.
 */
const path = require('node:path');

// One instance per vCPU. Override with WEB_CONCURRENCY=<n> when starting.
const instances = Number(process.env.WEB_CONCURRENCY) || 4;

module.exports = {
  apps: [
    {
      name: 'vinexus-api',
      cwd: __dirname,
      // Keep relative to cwd: PM2 cluster mode fails on absolute script
      // paths that contain spaces.
      script: 'src/server.js',
      exec_mode: 'cluster',
      instances,

      // Instance 0 runs one-off startup jobs (data backfills, index builds).
      instance_var: 'NODE_APP_INSTANCE',

      // Zero-downtime reloads: an old instance stops only after its
      // replacement reports ready (src/server.js sends 'ready' on listen).
      wait_ready: true,
      listen_timeout: 15000,
      // The server force-exits after 8s of graceful shutdown; PM2 waits 10s.
      kill_timeout: 10000,

      // Restart policy: back off on crash loops, recycle on memory leaks.
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 15,
      exp_backoff_restart_delay: 200,
      // 16 GB RAM / 4 instances leaves ample headroom for the OS and nginx.
      max_memory_restart: '1500M',
      node_args: '--max-old-space-size=1536',

      // Logs (rotate with: pm2 install pm2-logrotate).
      out_file: path.join(__dirname, 'logs', 'api-out.log'),
      error_file: path.join(__dirname, 'logs', 'api-error.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      watch: false,

      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // nginx runs on this server and connects from 127.0.0.1.
        TRUST_PROXY: 'loopback',
        // Per instance: 4 x 25 = 100 MongoDB connections in total.
        MONGO_MAX_POOL_SIZE: 25,
      },
    },
  ],
};
