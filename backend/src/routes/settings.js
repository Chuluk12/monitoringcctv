const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');

const router = express.Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const q = await pool.query('SELECT key, value FROM system_settings ORDER BY key');
  res.json(Object.fromEntries(q.rows.map((r) => [r.key, r.value])));
});

router.put('/', requireRole('administrator'), async (req, res) => {
  const entries = Object.entries(req.body || {});
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO system_settings(key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, String(value)]
    );
  }
  await log('settings_updated', { userId: req.user.id, username: req.user.username, detail: entries.map(([k]) => k).join(',') });
  const q = await pool.query('SELECT key, value FROM system_settings ORDER BY key');
  res.json(Object.fromEntries(q.rows.map((r) => [r.key, r.value])));
});

router.get('/logs', requireRole('administrator'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const q = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1', [limit]);
  res.json(q.rows);
});

module.exports = router;
