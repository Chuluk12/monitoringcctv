const { pool } = require('./db');
const { log } = require('./log');
const { mainPathName, subPathName, listRuntimePaths } = require('./mediamtx');

async function probeNvrHttp(nvr, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Check reachability without submitting credentials. Polling with Basic auth
    // against a Digest-only NVR can count as repeated failed logins and lock it.
    // Any HTTP response (including 401) confirms that the device is reachable.
    const response = await fetch(`http://${nvr.ip_address}:${nvr.http_port || 80}/ISAPI/ContentMgmt/InputProxy/channels`, {
      signal: controller.signal,
      redirect: 'manual',
    });
    response.body?.cancel().catch(() => {});
    const authHint = response.status === 401 ? ' NVR meminta autentikasi; pemeriksaan ini tidak mencoba password.' : '';
    return { reachable: true, message: `NVR merespons di HTTP port ${nvr.http_port || 80} (HTTP ${response.status}).${authHint}` };
  } catch (err) {
    const code = err.cause?.code;
    const reason = err.name === 'AbortError' ? `Tidak ada respons dalam ${Math.round(timeoutMs / 1000)} detik (timeout).`
      : code === 'ECONNREFUSED' ? 'Koneksi ditolak oleh perangkat.'
      : code === 'ENETUNREACH' || code === 'EHOSTUNREACH' ? 'Alamat perangkat tidak dapat dijangkau dari server.'
      : code === 'ETIMEDOUT' ? 'Koneksi melewati batas waktu.'
      : `Tidak dapat menghubungi HTTP port ${nvr.http_port || 80}${code ? ` (${code})` : ''}.`;
    return { reachable: false, message: `${reason} Periksa IP, port HTTP, jaringan, dan firewall.` };
  } finally {
    clearTimeout(timer);
  }
}

async function runHealthCheck() {
  const { rows: nvrs } = await pool.query('SELECT * FROM nvrs WHERE enabled = true');
  if (!nvrs.length) return;

  let runtimePaths = new Map();
  let runtimeError = null;
  try {
    runtimePaths = await listRuntimePaths();
  } catch (err) {
    runtimeError = err;
    console.warn('[health] could not reach MediaMTX API:', err.message);
  }

  for (const nvr of nvrs) {
    // The HTTP management port is the dependable reachability probe. On some
    // Windows installations Node's direct RTSP TCP probe can be blocked while
    // MediaMTX is still able to establish the on-demand stream itself.
    const probe = await probeNvrHttp(nvr);
    const reachable = probe.reachable;
    // If the management probe is inconclusive, keep the NVR eligible for
    // on-demand playback. MediaMTX performs the definitive RTSP connection
    // when a tile becomes visible.
    const nvrStatus = reachable ? 'online' : 'unknown';

    if (nvrStatus !== nvr.status) {
      await log('nvr_status_change', { detail: `${nvr.name} -> ${nvrStatus}` });
    }
    await pool.query('UPDATE nvrs SET status=$1, last_checked_at=now(), last_check_message=$2 WHERE id=$3', [nvrStatus, probe.message, nvr.id]);

    const { rows: cameras } = await pool.query(
      'SELECT * FROM cameras WHERE nvr_id=$1 AND enabled = true',
      [nvr.id]
    );

    for (const camera of cameras) {
      let status;
      let message;
      if (!reachable) {
        status = 'unknown';
        message = `Kamera belum diperiksa karena NVR tidak terjangkau. ${probe.message}`;
      } else if (runtimeError) {
        status = 'unknown';
        message = `NVR dapat dijangkau, tetapi status stream tidak dapat dibaca dari MediaMTX: ${runtimeError.message}`;
      } else {
        // Sources are on-demand: no path is "ready" until a viewer asks to play it.
        // Keep an idle reachable camera as unknown, then mark it online while either
        // stream is actively being read. Actual playback failures remain visible in
        // the player overlay.
        const mainRuntime = runtimePaths.get(mainPathName(camera.id));
        const subRuntime = runtimePaths.get(subPathName(camera.id));
        const activePath = [mainRuntime, subRuntime].find((path) => path?.ready);
        const sourceError = [mainRuntime, subRuntime].map((path) => path?.source?.lastError || path?.lastError).find(Boolean);
        status = activePath ? 'online' : sourceError ? 'stream_error' : 'unknown';
        message = activePath ? 'Stream sedang aktif dan dibaca melalui MediaMTX.'
          : sourceError ? `MediaMTX gagal membaca stream: ${sourceError}`
          : 'NVR merespons. Stream kamera belum diuji; buka tile kamera untuk mencoba pemutaran.';
      }
      if (status !== camera.status) {
        await log('camera_status_change', { detail: `${camera.code} -> ${status}` });
      }
      await pool.query('UPDATE cameras SET status=$1, last_checked_at=now(), last_check_message=$2 WHERE id=$3', [status, message, camera.id]);
    }
  }
}

function startHealthLoop(intervalSeconds = 15) {
  runHealthCheck().catch((err) => console.error('[health] initial check failed', err));
  return setInterval(() => {
    runHealthCheck().catch((err) => console.error('[health] check failed', err));
  }, intervalSeconds * 1000);
}

module.exports = { startHealthLoop, runHealthCheck };
