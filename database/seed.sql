-- Demo admin. CHANGE THIS PASSWORD before exposing the system beyond a dev machine.
INSERT INTO users(username,password_hash,full_name,role)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'Administrator', 'administrator')
ON CONFLICT DO NOTHING;

INSERT INTO areas(name,description,sort_order) VALUES
  ('Security',   'Gerbang, pos satpam, area perimeter', 1),
  ('Produksi',   'Area produksi/pabrik',                2),
  ('Warehouse',  'Gudang penyimpanan',                  3),
  ('Office',     'Area perkantoran',                    4)
ON CONFLICT DO NOTHING;

-- Placeholder NVR for Tahap Pertama (1 NVR + 4 CCTV). Disabled by default so the
-- health checker and MediaMTX path sync don't try to reach a non-existent device.
-- Edit this via PUT /api/nvrs/:id (or the NVR page) with the real IP/username/password,
-- then set enabled = true. The password is encrypted by the backend, never stored in plain text.
INSERT INTO nvrs(name, area_id, ip_address, rtsp_port, http_port, brand, enabled)
SELECT 'NVR-SECURITY-01', a.id, '192.168.1.100', 554, 80, 'Hikvision', FALSE
FROM areas a WHERE a.name='Security'
ON CONFLICT DO NOTHING;

INSERT INTO cameras(code,name,area_id,nvr_id,channel_no,main_path,sub_path,enabled)
SELECT v.code, v.name, a.id, n.id, v.channel_no, v.main_path, v.sub_path, FALSE
FROM areas a
JOIN nvrs n ON n.name = 'NVR-SECURITY-01' AND n.area_id = a.id
JOIN (VALUES
  ('CAM-001','Gerbang Utama',       1, 'Streaming/Channels/101', 'Streaming/Channels/102'),
  ('CAM-002','Pos Satpam',          2, 'Streaming/Channels/201', 'Streaming/Channels/202'),
  ('CAM-003','Parkiran Depan',      3, 'Streaming/Channels/301', 'Streaming/Channels/302'),
  ('CAM-004','Perimeter Belakang',  4, 'Streaming/Channels/401', 'Streaming/Channels/402')
) AS v(code,name,channel_no,main_path,sub_path) ON TRUE
WHERE a.name='Security'
ON CONFLICT DO NOTHING;

INSERT INTO system_settings(key,value) VALUES
  ('default_rotation_seconds', '30'),
  ('health_check_interval_seconds', '15')
ON CONFLICT DO NOTHING;
