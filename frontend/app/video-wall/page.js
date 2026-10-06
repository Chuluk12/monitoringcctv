'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import Player from '../../components/Player';
import CustomSelect from '../../components/CustomSelect';
import { api, useCurrentUser } from '../../lib/api';

function PresetForm({ cams, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [layoutCols, setLayoutCols] = useState(4);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationSeconds, setRotationSeconds] = useState(30);
  const [selected, setSelected] = useState(new Set());

  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div className="crud-form">
      <label>Nama Preset<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Layout (kolom)
        <CustomSelect value={layoutCols} onChange={(value) => setLayoutCols(Number(value))} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n * n} kamera (${n}×${n})` }))} aria-label="Layout Video Wall" />
      </label>
      <label>
        <input type="checkbox" checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} /> Auto Rotation
      </label>
      {rotationEnabled && (
        <label>Durasi per halaman (detik)<input type="number" value={rotationSeconds} onChange={(e) => setRotationSeconds(Number(e.target.value))} /></label>
      )}
      <label>Pilih Camera ({selected.size} dipilih)</label>
      <div className="preset-cam-picker">
        {cams.map((c) => (
          <label key={c.id} className="preset-cam-item">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
            {c.code} · {c.name}
          </label>
        ))}
      </div>
      <div className="crud-actions">
        <button className="btn" onClick={() => onSave({ name, layout_cols: layoutCols, rotation_enabled: rotationEnabled, rotation_seconds: rotationSeconds, camera_ids: [...selected] })}>Simpan</button>
        <button className="btn ghost" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}

function PresetPlayer({ preset, onClose }) {
  const pageSize = preset.layout_cols * preset.layout_cols;
  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < preset.items.length; i += pageSize) chunks.push(preset.items.slice(i, i + pageSize));
    return chunks.length ? chunks : [[]];
  }, [preset, pageSize]);
  const [pageIdx, setPageIdx] = useState(0);

  useEffect(() => {
    setPageIdx(0);
    if (!preset.rotation_enabled || pages.length <= 1) return;
    const t = setInterval(() => setPageIdx((i) => (i + 1) % pages.length), (preset.rotation_seconds || 30) * 1000);
    return () => clearInterval(t);
  }, [preset, pages.length]);

  return (
    <div>
      <div className="live-nav">
        <b>{preset.name}</b>
        {pages.length > 1 && <span>Page {pageIdx + 1}/{pages.length}</span>}
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>Tutup</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${preset.layout_cols},minmax(0,1fr))` }}>
        {pages[pageIdx].map((c) => (
          <div className="cam" key={c.camera_id}>
            <Player path={c.webrtc_path} dbStatus={c.status} diagnostic={c.last_check_message} />
            <div className="meta"><b>{c.name}</b><span>{c.area_name}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VideoWallPage() {
  const [presets, setPresets] = useState([]);
  const [cams, setCams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [playing, setPlaying] = useState(null);
  const user = useCurrentUser();

  async function load() {
    const [p, c] = await Promise.all([api('/api/video-wall-presets'), api('/api/cameras')]);
    setPresets(p || []); setCams(c || []);
  }
  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    load();
  }, []);

  return (
    <Shell title="Video Wall" subtitle="Preset kamera per area dengan opsi auto rotation">
      {playing ? (
        <PresetPlayer preset={playing} onClose={() => setPlaying(null)} />
      ) : (
        <>
          {['administrator', 'operator'].includes(user?.role) && !showForm && (
            <button className="btn" onClick={() => setShowForm(true)}>+ Preset Baru</button>
          )}
          {showForm && (
            <PresetForm
              cams={cams}
              onCancel={() => setShowForm(false)}
              onSave={async (data) => { await api('/api/video-wall-presets', { method: 'POST', body: JSON.stringify(data) }); setShowForm(false); load(); }}
            />
          )}
          <table className="crud-table" style={{ marginTop: 16 }}>
            <thead><tr><th>Preset</th><th>Layout</th><th>Jumlah Camera</th><th>Rotation</th><th></th></tr></thead>
            <tbody>
              {presets.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.layout_cols}×{p.layout_cols}</td>
                  <td>{p.items.length}</td>
                  <td>{p.rotation_enabled ? `${p.rotation_seconds}s/halaman` : '-'}</td>
                  <td><button className="btn ghost" onClick={() => setPlaying(p)}>Tampilkan</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Shell>
  );
}
