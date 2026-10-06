CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160),
  role VARCHAR(30) NOT NULL DEFAULT 'viewer' CHECK (role IN ('administrator','operator','viewer')),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nvrs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  area_id INT REFERENCES areas(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  rtsp_port INT NOT NULL DEFAULT 554,
  http_port INT NOT NULL DEFAULT 80,
  username VARCHAR(120),
  -- password never stored in plaintext: app layer encrypts with AES-256-GCM before insert
  password_enc TEXT,
  brand VARCHAR(60) DEFAULT 'Hikvision',
  model VARCHAR(120),
  enabled BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (status IN ('online','offline','unknown')),
  last_checked_at TIMESTAMPTZ,
  last_check_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cameras (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  area_id INT REFERENCES areas(id) ON DELETE SET NULL,
  nvr_id INT REFERENCES nvrs(id) ON DELETE CASCADE,
  channel_no INT NOT NULL,
  -- relative RTSP path on the NVR, e.g. Streaming/Channels/101
  main_path VARCHAR(150) NOT NULL,
  sub_path VARCHAR(150) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (status IN ('online','offline','stream_error','nvr_offline','unknown')),
  last_checked_at TIMESTAMPTZ,
  last_check_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cameras_area ON cameras(area_id);
CREATE INDEX IF NOT EXISTS idx_cameras_nvr ON cameras(nvr_id);

CREATE TABLE IF NOT EXISTS video_wall_presets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  layout_cols INT NOT NULL DEFAULT 4,
  rotation_enabled BOOLEAN DEFAULT FALSE,
  rotation_seconds INT DEFAULT 30,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_wall_preset_items (
  id SERIAL PRIMARY KEY,
  preset_id INT NOT NULL REFERENCES video_wall_presets(id) ON DELETE CASCADE,
  camera_id INT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vwpi_preset ON video_wall_preset_items(preset_id);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(80),
  action VARCHAR(60) NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
