const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');

const router = express.Router();
router.use(authenticate, requireRole('administrator'));

router.get('/', async (_req, res) => {
  const q = await pool.query('SELECT id, username, full_name, role, enabled, created_at FROM users ORDER BY username');
  res.json(q.rows);
});

router.post('/', async (req, res) => {
  const { username, password, full_name, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role wajib diisi' });
  if (!['administrator', 'operator', 'viewer'].includes(role)) return res.status(400).json({ error: 'Role tidak valid' });
  const q = await pool.query(
    `INSERT INTO users(username, password_hash, full_name, role)
     VALUES ($1, crypt($2, gen_salt('bf')), $3, $4)
     RETURNING id, username, full_name, role, enabled, created_at`,
    [username, password, full_name || null, role]
  );
  await log('user_created', { userId: req.user.id, username: req.user.username, detail: username });
  res.status(201).json(q.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { password, full_name, role, enabled } = req.body || {};
  const q = await pool.query(
    `UPDATE users SET
       password_hash = CASE WHEN $1::text IS NOT NULL THEN crypt($1, gen_salt('bf')) ELSE password_hash END,
       full_name = COALESCE($2, full_name),
       role = COALESCE($3, role),
       enabled = COALESCE($4, enabled)
     WHERE id=$5 RETURNING id, username, full_name, role, enabled, created_at`,
    [password || null, full_name, role, enabled, req.params.id]
  );
  if (!q.rowCount) return res.status(404).json({ error: 'User tidak ditemukan' });
  await log('user_updated', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.json(q.rows[0]);
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  await log('user_deleted', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.status(204).end();
});

module.exports = router;
