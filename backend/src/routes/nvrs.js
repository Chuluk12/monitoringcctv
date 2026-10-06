const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');
const { log } = require('../log');
const { encrypt } = require('../crypto');
const { syncCameraPaths } = require('../mediamtx');
const { discoverChannels } = require('../hikvision');

const router = express.Router();
router.use(authenticate);

// password_enc is intentionally never selected here.
const SAFE_COLUMNS = `id, name, area_id, ip_address, rtsp_port, http_port, username,
  brand, model, enabled, status, last_checked_at, last_check_message, created_at`;

router.get('/', async (_req, res) => {
  const q = await pool.query(
    `SELECT n.*, a.name area_name FROM (SELECT ${SAFE_COLUMNS} FROM nvrs) n
     LEFT JOIN areas a ON a.id = n.area_id ORDER BY n.name`
  );
  res.json(q.rows);
});

router.post('/', requireRole('administrator'), async (req, res) => {
  const { name, area_id, ip_address, rtsp_port, http_port, username, password, brand, model, enabled } = req.body || {};
  if (!name || !ip_address) return res.status(400).json({ error: 'Nama dan IP address wajib diisi' });
  const q = await pool.query(
    `INSERT INTO nvrs(name, area_id, ip_address, rtsp_port, http_port, username, password_enc, brand, model, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${SAFE_COLUMNS}`,
    [name, area_id || null, ip_address, rtsp_port || 554, http_port || 80, username || null,
     password ? encrypt(password) : null, brand || 'Hikvision', model || null, enabled !== false]
  );
  await log('nvr_created', { userId: req.user.id, username: req.user.username, detail: name });
  res.status(201).json(q.rows[0]);
});

router.put('/:id', requireRole('administrator'), async (req, res) => {
  const { name, area_id, ip_address, rtsp_port, http_port, username, password, brand, model, enabled } = req.body || {};
  const q = await pool.query(
    `UPDATE nvrs SET
       name=COALESCE($1,name), area_id=COALESCE($2,area_id), ip_address=COALESCE($3,ip_address),
       rtsp_port=COALESCE($4,rtsp_port), http_port=COALESCE($5,http_port), username=COALESCE($6,username),
       password_enc=COALESCE($7,password_enc), brand=COALESCE($8,brand), model=COALESCE($9,model),
       enabled=COALESCE($10,enabled)
     WHERE id=$11 RETURNING ${SAFE_COLUMNS}`,
    [name, area_id, ip_address, rtsp_port, http_port, username,
     password ? encrypt(password) : null, brand, model, enabled, req.params.id]
  );
  if (!q.rowCount) return res.status(404).json({ error: 'NVR tidak ditemukan' });
  await log('nvr_updated', { userId: req.user.id, username: req.user.username, detail: req.params.id });

  // Credentials or address changed -> re-register every camera path on this NVR.
  const { rows: fullNvr } = await pool.query('SELECT * FROM nvrs WHERE id=$1', [req.params.id]);
  const { rows: cams } = await pool.query('SELECT * FROM cameras WHERE nvr_id=$1 AND enabled=true', [req.params.id]);
  for (const cam of cams) {
    try { await syncCameraPaths(cam, fullNvr[0]); }
    catch (err) { console.warn('[nvrs] mediamtx sync failed for camera', cam.id, err.message); }
  }

  res.json(q.rows[0]);
});

// Reads Hikvision channels through the NVR's authenticated ISAPI endpoint and
// creates only channels that this scanner has not added before.
router.post('/:id/discover-cameras', requireRole('administrator', 'operator'), async (req, res) => {
  const { rows: nvrRows } = await pool.query('SELECT * FROM nvrs WHERE id=$1', [req.params.id]);
  const nvr = nvrRows[0];
  if (!nvr) return res.status(404).json({ error: 'NVR tidak ditemukan' });
  if (!nvr.enabled) return res.status(400).json({ error: 'Aktifkan NVR sebelum scan kamera' });

  let channels;
  try {
    channels = await discoverChannels(nvr);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  const { rows: existingRows } = await pool.query(
    'SELECT code, channel_no FROM cameras WHERE nvr_id=$1', [nvr.id]
  );
  const existingCodes = new Set(existingRows.map((row) => row.code));
  const existingChannels = new Set(existingRows.map((row) => row.channel_no));
  const created = [];
  for (const channel of channels) {
    const code = `NVR-${nvr.id}-CH-${channel.channelNo}`;
    if (existingCodes.has(code) || existingChannels.has(channel.channelNo)) continue;
    const { rows } = await pool.query(
      `INSERT INTO cameras(code,name,area_id,nvr_id,channel_no,main_path,sub_path,enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
      [code, channel.name, nvr.area_id, nvr.id, channel.channelNo,
       `Streaming/Channels/${channel.channelNo}01`, `Streaming/Channels/${channel.channelNo}02`]
    );
    created.push(rows[0]);
  }

  for (const camera of created) {
    try { await syncCameraPaths(camera, nvr); }
    catch (err) { console.warn('[nvrs] mediamtx sync failed for discovered camera', camera.id, err.message); }
  }
  await log('nvr_cameras_discovered', {
    userId: req.user.id,
    username: req.user.username,
    detail: `${nvr.name}: ${created.length} baru dari ${channels.length} channel`,
  });
  res.json({ found: channels.length, created: created.length, channels });
});

router.delete('/:id', requireRole('administrator'), async (req, res) => {
  await pool.query('DELETE FROM nvrs WHERE id=$1', [req.params.id]);
  await log('nvr_deleted', { userId: req.user.id, username: req.user.username, detail: req.params.id });
  res.status(204).end();
});

module.exports = router;
