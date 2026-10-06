import { WEBRTC_BASE } from './api';

// Connects a <video> element to a MediaMTX path over WHEP.
// Returns a controller with close() to tear the connection down cleanly.
export function connectWhep(path, videoEl, { onStatus } = {}) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  let closed = false;
  let resourceUrl = null;
  const request = new AbortController();
  const connectionTimeout = setTimeout(() => {
    if (!closed && pc.connectionState !== 'connected') onStatus?.('error', 'Tidak ada respons stream dalam 20 detik.');
  }, 20000);

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  pc.ontrack = (ev) => {
    if (videoEl && videoEl.srcObject !== ev.streams[0]) {
      videoEl.srcObject = ev.streams[0];
    }
  };

  pc.onconnectionstatechange = () => {
    if (closed) return;
    if (pc.connectionState === 'connected') {
      clearTimeout(connectionTimeout);
      onStatus?.('connected');
    }
    else if (['failed', 'disconnected'].includes(pc.connectionState)) onStatus?.('error', `Koneksi WebRTC ${pc.connectionState}. Periksa alamat WHEP, firewall, dan konfigurasi MediaMTX.`);
  };

  async function start() {
    try {
      onStatus?.('connecting');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to finish so we send a complete SDP (WHEP is non-trickle here).
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const check = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); resolve(); } };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 3000); // safety timeout
      });

      const timeout = setTimeout(() => request.abort(), 15000);
      let res;
      try {
        res = await fetch(`${WEBRTC_BASE}/${path}/whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription.sdp,
          signal: request.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) throw new Error(`MediaMTX menolak koneksi WebRTC (HTTP ${res.status}). Periksa path stream dan konfigurasi MediaMTX.`);
      resourceUrl = res.headers.get('Location');
      const answerSdp = await res.text();
      if (closed) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      if (!closed) onStatus?.('error', err.name === 'AbortError' ? 'Permintaan stream timeout. Periksa jaringan dan port WebRTC MediaMTX.' : `${err.message} Periksa jalur RTSP dan kredensial NVR.`);
      console.warn('[webrtc] connect failed for', path, err.message);
    }
  }

  start();

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(connectionTimeout);
    request.abort();
    try { pc.close(); } catch {}
    if (resourceUrl) {
      const url = resourceUrl.startsWith('http') ? resourceUrl : `${WEBRTC_BASE}${resourceUrl}`;
      fetch(url, { method: 'DELETE' }).catch(() => {});
    }
  }

  return { close };
}
