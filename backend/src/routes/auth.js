const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticate, SECRET } = require('../auth');
const { log } = require('../log');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const q = await pool.query(
    `SELECT id, username, full_name, role FROM users
     WHERE username=$1 AND enabled = true AND password_hash = crypt($2, password_hash)`,
    [username, password]
  );
  if (!q.rowCount) {
    await log('login_failed', { username, detail: 'invalid credentials' });
    return res.status(401).json({ error: 'Username/password salah' });
  }
  const user = q.rows[0];
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '12h' });
  await log('login_success', { userId: user.id, username: user.username });
  res.json({ token, user });
});

router.post('/logout', authenticate, async (req, res) => {
  await log('logout', { userId: req.user.id, username: req.user.username });
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
