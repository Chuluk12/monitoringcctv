require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { pool } = require('./db');
const { syncCameraPaths } = require('./mediamtx');
const { startHealthLoop } = require('./health');

const authRoutes = require('./routes/auth');
const areaRoutes = require('./routes/areas');
const nvrRoutes = require('./routes/nvrs');
const cameraRoutes = require('./routes/cameras');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const videoWallRoutes = require('./routes/videowall');
const settingsRoutes = require('./routes/settings');

const app = express();
app.use(helmet());

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Generic API rate limit; login gets a tighter one to slow down credential guessing.
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300 }));
app.use('/api/auth/login', rateLimit({ windowMs: 60 * 1000, limit: 10 }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/nvrs', nvrRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/video-wall-presets', videoWallRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Re-registers every enabled camera's RTSP source with MediaMTX. Needed on every
// boot because MediaMTX's dynamic path config does not persist across container restarts.
async function syncAllCameraPaths() {
  const { rows: cameras } = await pool.query(
    `SELECT c.* FROM cameras c JOIN nvrs n ON n.id = c.nvr_id WHERE c.enabled = true AND n.enabled = true`
  );
  const { rows: nvrs } = await pool.query('SELECT * FROM nvrs WHERE enabled = true');
  const nvrById = new Map(nvrs.map((n) => [n.id, n]));

  let ok = 0;
  for (const camera of cameras) {
    const nvr = nvrById.get(camera.nvr_id);
    if (!nvr) continue;
    try {
      await syncCameraPaths(camera, nvr);
      ok++;
    } catch (err) {
      console.warn(`[boot] failed to register MediaMTX paths for camera ${camera.code}:`, err.message);
    }
  }
  console.log(`[boot] registered MediaMTX paths for ${ok}/${cameras.length} enabled cameras`);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`CCTV API listening on :${PORT}`);
  await pool.query(`
    ALTER TABLE nvrs ADD COLUMN IF NOT EXISTS last_check_message TEXT;
    ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_check_message TEXT;
  `);
  await syncAllCameraPaths().catch((err) => console.error('[boot] mediamtx sync failed', err));
  const intervalSeconds = parseInt(process.env.HEALTH_CHECK_INTERVAL_SECONDS, 10) || 15;
  startHealthLoop(intervalSeconds);
});
