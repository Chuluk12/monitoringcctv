const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();
router.use(authenticate);

// One physical camera can be registered as a channel on several NVRs.
// Names are the best available identity until cameras have a physical ID.
const uniqueCameras = `WITH grouped AS (
  SELECT UPPER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) AS camera_key,
    BOOL_OR(status = 'online') AS is_online,
    BOOL_OR(status IN ('offline', 'stream_error', 'nvr_offline')) AS has_offline_status
  FROM cameras
  GROUP BY 1
)`;

const uniqueCamerasByArea = `WITH unique_cameras_by_area AS (
  SELECT area_id, UPPER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) AS camera_key,
    BOOL_OR(status = 'online') AS is_online,
    BOOL_OR(status IN ('offline', 'stream_error', 'nvr_offline')) AS has_offline_status
  FROM cameras
  GROUP BY area_id, 2
)`;

router.get('/stats', async (_req, res) => {
  const [cameras, nvrs, perArea] = await Promise.all([
    pool.query(`${uniqueCameras} SELECT
      COUNT(*)::int total,
      COUNT(*) FILTER (WHERE is_online)::int online,
      COUNT(*) FILTER (WHERE NOT is_online AND has_offline_status)::int offline,
      COUNT(*) FILTER (WHERE NOT is_online AND NOT has_offline_status)::int unknown
      FROM grouped`),
    pool.query(`SELECT
      COUNT(*)::int total,
      COUNT(*) FILTER (WHERE status='online')::int online,
      COUNT(*) FILTER (WHERE status='offline')::int offline
      FROM nvrs`),
    pool.query(`${uniqueCamerasByArea} SELECT a.name area_name, COUNT(c.camera_key)::int camera_count,
      COUNT(c.camera_key) FILTER (WHERE c.is_online)::int online_count,
      COUNT(c.camera_key) FILTER (WHERE NOT c.is_online AND c.has_offline_status)::int offline_count,
      COUNT(c.camera_key) FILTER (WHERE NOT c.is_online AND NOT c.has_offline_status)::int unknown_count
      FROM areas a LEFT JOIN unique_cameras_by_area c ON c.area_id = a.id
      GROUP BY a.id, a.name ORDER BY a.name`),
  ]);
  res.json({ cameras: cameras.rows[0], nvrs: nvrs.rows[0], per_area: perArea.rows });
});

module.exports = router;
