const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');
const { mainPathName, subPathName, syncCameraPaths, removeCameraPaths } = require('../mediamtx');

const router = express.Router();
router.use(authenticate);

function withStreamPaths(row) {
  return { ...row, webrtc_path: subPathName(row.id), main_webrtc_path: mainPathName(row.id) };
}

router.get('/', async (req, res) => {
  const params = [];
  const where = [];
  if (req.query.area) { params.push(req.query.area); where.push(`c.area_id=$${params.length}`); }
  if (req.query.nvr) { params.push(req.query.nvr); where.push(`c.nvr_id=$${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = await pool.query(
    `SELECT c.*, a.name area_name, n.name nvr_name
     FROM cameras c
     LEFT JOIN areas a ON a.id = c.area_id
     LEFT JOIN nvrs n ON n.id = c.nvr_id
     ${whereSql}
     ORDER BY a.sort_order NULLS LAST, c.code`,
    params
  );
  res.json(q.rows.map(withStreamPaths));
});

router.post('/', requireRole('administrator', 'operator'), async (req, res) => {
  const { code, name, area_id, nvr_id, channel_no, main_path, sub_path, enabled } = req.body || {};
  if (!code || !name || !nvr_id || !channel_no || !main_path || !sub_path) {
    return res.status(400).json({ error: 'code, name, nvr_id, channel_no, main_path, sub_path wajib diisi' });
  }
  const q = await pool.query(
    `INSERT INTO cameras(code,name,area_id,nvr_id,channel_no,main_path,sub_path,enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [code, name, area_id || null, nvr_id, channel_no, main_path, sub_path, enabled !== false]
  );
  const camera = q.rows[0];
  await log('camera_created', { userId: req.user.id, username: req.user.username, detail: code });

  const { rows: nvrRows } = await pool.query('SELECT * FROM nvrs WHERE id=$1', [nvr_id]);
  if (nvrRows[0] && camera.enabled) {
    try { await syncCameraPaths(camera, nvrRows[0]); }
    catch (err) { console.warn('[cameras] mediamtx sync failed', err.message); }
  }
  res.status(201).json(withStreamPaths(camera));
});

router.put('/:id', requireRole('administrator', 'operator'), async (req, res) => {
  const { code, name, area_id, nvr_id, channel_no, main_path, sub_path, enabled } = req.body || {};
  const q = await pool.query(
    `UPDATE cameras SET
       code=COALESCE($1,code), name=COALESCE($2,name), area_id=COALESCE($3,area_id),
       nvr_id=COALESCE($4,nvr_id), channel_no=COALESCE($5,channel_no),
       main_path=COALESCE($6,main_path), sub_path=COALESCE($7,sub_path), enabled=COALESCE($8,enabled)
     WHERE id=$9 RETURNING *`,
    [code, name, area_id, nvr_id, channel_no, main_path, sub_path, enabled, req.params.id]
  );
  if (!q.rowCount) return res.status(404).json({ error: 'Camera tidak ditemukan' });
  const camera = q.rows[0];
  await log('camera_updated', { userId: req.user.id, username: req.user.username, detail: camera.code });

  if (camera.enabled) {
    const { rows: nvrRows } = await pool.query('SELECT * FROM nvrs WHERE id=$1', [camera.nvr_id]);
    if (nvrRows[0]) {
      try { await syncCameraPaths(camera, nvrRows[0]); }
      catch (err) { console.warn('[cameras] mediamtx sync failed', err.message); }
    }
  } else {
    await removeCameraPaths(camera.id).catch(() => {});
  }
  res.json(withStreamPaths(camera));
});

router.delete('/:id', requireRole('administrator'), async (req, res) => {
  await removeCameraPaths(req.params.id).catch(() => {});
  await pool.query('DELETE FROM cameras WHERE id=$1', [req.params.id]);
  await log('camera_deleted', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.status(204).end();
});

module.exports = router;
