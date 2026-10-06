'use client';
import { useEffect, useRef, useState } from 'react';
import { connectWhep } from '../lib/webrtc';

const LABELS = {
  online: null,
  offline: 'OFFLINE',
  stream_error: 'STREAM ERROR',
  nvr_offline: 'NVR OFFLINE',
  unknown: 'CONNECTING…',
};

// path: MediaMTX path id (e.g. cam-3-sub). dbStatus: status reported by the backend health check.
// Only attempts a WHEP connection when the element is on screen. MediaMTX sources are
// on-demand, so an idle camera is "unknown" until this first viewer asks MediaMTX to pull RTSP.
// This still keeps off-screen tiles from opening WebRTC connections at once.
export default function Player({ path, dbStatus, diagnostic, active = true }) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [connection, setConnection] = useState({ state: 'idle', message: '' });
  const connState = connection.state;
  const unavailable = ['offline', 'nvr_offline'].includes(dbStatus);

  useEffect(() => {
    if (!wrapRef.current) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active || !visible || unavailable) {
      setConnection({ state: 'idle', message: '' });
      return;
    }
    const controller = connectWhep(path, videoRef.current, { onStatus: (state, message = '') => setConnection({ state, message }) });
    return () => controller.close();
  // Health polling alternates on-demand streams between unknown and online.
  // That must not tear down a WebRTC session that is already playing.
  }, [path, visible, active, unavailable]);

  let overlayLabel = unavailable ? LABELS[dbStatus]
    : connState === 'error' ? 'STREAM ERROR'
    : connState === 'connected' ? null
    : connState === 'connecting' ? 'CONNECTING…'
    : dbStatus !== 'online' ? LABELS[dbStatus] || LABELS.unknown
    : null;

  return (
    <div ref={wrapRef} className="video">
      <video ref={videoRef} autoPlay playsInline muted className="video-el" />
      {overlayLabel && (
        <div className="placeholder">
          {overlayLabel}
          <span>{connState === 'error' ? connection.message : diagnostic || (dbStatus === 'unknown' ? 'Menunggu stream diperiksa...' : path)}</span>
        </div>
      )}
    </div>
  );
}
