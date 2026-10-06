'use client';
import Player from './Player';
import Icon from './Icon';

const STATUS_COLOR = {
  online: '#39e695',
  offline: '#ff7c7c',
  stream_error: '#ffb454',
  nvr_offline: '#ff7c7c',
  unknown: '#9bacbc',
};

export default function CameraCard({ c, onOpen, active = true, time = '' }) {
  const status = c.status || 'unknown';
  return (
    <button type="button" className="cam" onClick={() => onOpen(c)} aria-label={`Perbesar kamera ${c.name}`}>
      <div className="camera-frame">
        <Player path={c.webrtc_path} dbStatus={c.status} diagnostic={c.last_check_message} active={active} />
        <span className="signal" title={`${c.last_check_message || 'Belum ada informasi pemeriksaan.'}${c.last_checked_at ? ` Terakhir diperiksa: ${new Date(c.last_checked_at).toLocaleString('id-ID')}.` : ''}`} style={{ color: STATUS_COLOR[status] || STATUS_COLOR.unknown }}><i className="camera-status-dot"/>{status.toUpperCase().replace('_', ' ')}</span>
        <span className="cam-expand"><Icon name="expand" size={16}/></span>
        {time && <span className="cam-time">{time}</span>}
      </div>
      <div className="meta"><div><b>{c.name}</b><span>{c.area_name} · {c.nvr_name} (CH{c.channel_no})</span></div><Icon name="more" size={17}/></div>
    </button>
  );
}
