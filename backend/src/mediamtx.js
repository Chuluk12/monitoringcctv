// Keeps MediaMTX's runtime path config in sync with the cameras/nvrs tables.
// The frontend and the database only ever know friendly path IDs
// (cam-<id>-main / cam-<id>-sub); the real RTSP URL (with NVR credentials)
// is built here, server-side, and handed to MediaMTX directly. It is never
// sent to the browser.
const { decrypt } = require('./crypto');

const API = process.env.MEDIAMTX_API || 'http://mediamtx:9997';
const API_USER = process.env.MEDIAMTX_API_USER;
const API_PASSWORD = process.env.MEDIAMTX_API_PASSWORD;

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (API_USER) {
    headers.Authorization = `Basic ${Buffer.from(`${API_USER}:${API_PASSWORD || ''}`).toString('base64')}`;
  }
  return headers;
}

function mainPathName(cameraId) { return `cam-${cameraId}-main`; }
function subPathName(cameraId) { return `cam-${cameraId}-sub`; }

function buildRtspUrl(nvr, relativePath) {
  const password = nvr.password_enc ? decrypt(nvr.password_enc) : '';
  const auth = nvr.username ? `${encodeURIComponent(nvr.username)}:${encodeURIComponent(password)}@` : '';
  const cleanPath = String(relativePath).replace(/^\/+/, '');
  return `rtsp://${auth}${nvr.ip_address}:${nvr.rtsp_port}/${cleanPath}`;
}

async function upsertPath(name, source) {
  const payload = JSON.stringify({ source, sourceOnDemand: true });
  // Try adding first (for new path), if already exists (400/409), replace it.
  let res = await fetch(`${API}/v3/config/paths/add/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: apiHeaders(),
    body: payload,
  });
  if (!res.ok) {
    // If path already exists, update/replace it
    res = await fetch(`${API}/v3/config/paths/replace/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: apiHeaders(),
      body: payload,
    });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MediaMTX upsert path ${name} failed: ${res.status} ${body}`);
  }
}

async function deletePath(name) {
  const res = await fetch(`${API}/v3/config/paths/delete/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: apiHeaders(),
  });
  // 404 just means it was never registered - fine.
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => '');
    console.warn(`[mediamtx] delete path ${name} failed: ${res.status} ${body}`);
  }
}

// Registers both the substream (grid) and main stream (fullscreen) paths for one camera.
async function syncCameraPaths(camera, nvr) {
  const mainUrl = buildRtspUrl(nvr, camera.main_path);
  const subUrl = buildRtspUrl(nvr, camera.sub_path);
  await Promise.all([
    upsertPath(mainPathName(camera.id), mainUrl),
    upsertPath(subPathName(camera.id), subUrl),
  ]);
}

async function removeCameraPaths(cameraId) {
  await Promise.all([deletePath(mainPathName(cameraId)), deletePath(subPathName(cameraId))]);
}

// Runtime status (ready = source connected & publishing) for health checks.
async function listRuntimePaths() {
  const map = new Map();
  let page = 0;
  let pageCount = 1;
  do {
    const res = await fetch(`${API}/v3/paths/list?page=${page}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`MediaMTX paths/list page ${page} failed: ${res.status}`);
    const data = await res.json();
    for (const item of data.items || []) map.set(item.name, item);
    pageCount = Math.max(1, Number(data.pageCount) || 1);
    page++;
  } while (page < pageCount);
  return map;
}

module.exports = {
  mainPathName,
  subPathName,
  buildRtspUrl,
  syncCameraPaths,
  removeCameraPaths,
  listRuntimePaths,
};
