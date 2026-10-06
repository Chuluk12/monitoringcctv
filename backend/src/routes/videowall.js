const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');
const { subPathName, mainPathName } = require('../mediamtx');

const router = express.Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const presets = (await pool.query('SELECT * FROM video_wall_presets ORDER BY sort_order, name')).rows;
  const items = (await pool.query(
    `SELECT vwi.preset_id, vwi.sort_order, c.id camera_id, c.code, c.name, c.area_id, a.name area_name
     FROM video_wall_preset_items vwi
     JOIN cameras c ON c.id = vwi.camera_id
     LEFT JOIN areas a ON a.id = c.area_id
     ORDER BY vwi.preset_id, vwi.sort_order`
  )).rows.map((r) => ({ ...r, webrtc_path: subPathName(r.camera_id), main_webrtc_path: mainPathName(r.camera_id) }));

  res.json(presets.map((p) => ({ ...p, items: items.filter((i) => i.preset_id === p.id) })));
});

router.post('/', requireRole('administrator', 'operator'), async (req, res) => {
  const { name, layout_cols, rotation_enabled, rotation_seconds, camera_ids } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nama preset wajib diisi' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const preset = (await client.query(
      `INSERT INTO video_wall_presets(name, layout_cols, rotation_enabled, rotation_seconds)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, layout_cols || 4, !!rotation_enabled, rotation_seconds || 30]
    )).rows[0];
    let i = 0;
    for (const cameraId of camera_ids || []) {
      await client.query(
        'INSERT INTO video_wall_preset_items(preset_id, camera_id, sort_order) VALUES ($1,$2,$3)',
        [preset.id, cameraId, i++]
      );
    }
    await client.query('COMMIT');
    await log('videowall_preset_created', { userId: req.user.id, username: req.user.username, detail: name });
    res.status(201).json(preset);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id', requireRole('administrator', 'operator'), async (req, res) => {
  const { name, layout_cols, rotation_enabled, rotation_seconds, camera_ids } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const preset = (await client.query(
      `UPDATE video_wall_presets SET
         name=COALESCE($1,name), layout_cols=COALESCE($2,layout_cols),
         rotation_enabled=COALESCE($3,rotation_enabled), rotation_seconds=COALESCE($4,rotation_seconds)
       WHERE id=$5 RETURNING *`,
      [name, layout_cols, rotation_enabled, rotation_seconds, req.params.id]
    )).rows[0];
    if (!preset) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Preset tidak ditemukan' }); }
    if (Array.isArray(camera_ids)) {
      await client.query('DELETE FROM video_wall_preset_items WHERE preset_id=$1', [req.params.id]);
      let i = 0;
      for (const cameraId of camera_ids) {
        await client.query(
          'INSERT INTO video_wall_preset_items(preset_id, camera_id, sort_order) VALUES ($1,$2,$3)',
          [req.params.id, cameraId, i++]
        );
      }
    }
    await client.query('COMMIT');
    await log('videowall_preset_updated', { userId: req.user.id, username: req.user.username, detail: req.params.id });
    res.json(preset);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', requireRole('administrator'), async (req, res) => {
  await pool.query('DELETE FROM video_wall_presets WHERE id=$1', [req.params.id]);
  await log('videowall_preset_deleted', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.status(204).end();
});

module.exports = router;
