const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');

const router = express.Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const q = await pool.query('SELECT * FROM areas ORDER BY sort_order, name');
  res.json(q.rows);
});

router.post('/', requireRole('administrator'), async (req, res) => {
  const { name, description, sort_order } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nama area wajib diisi' });
  const q = await pool.query(
    'INSERT INTO areas(name, description, sort_order) VALUES ($1,$2,$3) RETURNING *',
    [name, description || null, sort_order || 0]
  );
  await log('area_created', { userId: req.user.id, username: req.user.username, detail: name });
  res.status(201).json(q.rows[0]);
});

router.put('/:id', requireRole('administrator'), async (req, res) => {
  const { name, description, sort_order } = req.body || {};
  const q = await pool.query(
    'UPDATE areas SET name=COALESCE($1,name), description=COALESCE($2,description), sort_order=COALESCE($3,sort_order) WHERE id=$4 RETURNING *',
    [name, description, sort_order, req.params.id]
  );
  if (!q.rowCount) return res.status(404).json({ error: 'Area tidak ditemukan' });
  await log('area_updated', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.json(q.rows[0]);
});

router.delete('/:id', requireRole('administrator'), async (req, res) => {
  await pool.query('DELETE FROM areas WHERE id=$1', [req.params.id]);
  await log('area_deleted', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.status(204).end();
});

module.exports = router;
