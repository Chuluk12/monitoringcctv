'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import CameraCard from '../../components/CameraCard';
import Player from '../../components/Player';
import Icon from '../../components/Icon';
import CustomSelect from '../../components/CustomSelect';
import { api } from '../../lib/api';

export default function LivePage() {
  const [cams, setCams] = useState([]);
  const [areas, setAreas] = useState([]);
  const [nvrs, setNvrs] = useState([]);
  const [area, setArea] = useState('');
  const [nvr, setNvr] = useState('');
  const [q, setQ] = useState('');
  const [cols, setCols] = useState(4);
  const [view, setView] = useState('grid');
  const [focus, setFocus] = useState(null);
  const [now, setNow] = useState(null);
  const [loadError, setLoadError] = useState('');

  async function load() {
    try {
      const [c, a, n] = await Promise.all([
        api('/api/cameras'),
        api('/api/areas'),
        api('/api/nvrs'),
      ]);
      setCams(c || []);
      setAreas(a || []);
      setNvrs(n || []);
      setLoadError('');
    } catch (err) {
      setLoadError(`Gagal memperbarui daftar kamera: ${err.message}`);
    }
  }

  useEffect(() => {
    if (!localStorage.token) { window.location.href = '/login'; return; }
    setQ(new URLSearchParams(window.location.search).get('search') || '');
    load();
    setNow(new Date());
    const refresh = setInterval(load, 10000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, []);

  const filtered = useMemo(() => cams.filter((c) =>
    (!area || String(c.area_id) === area) &&
    (!nvr || String(c.nvr_id) === nvr) &&
    `${c.code} ${c.name} ${c.area_name} ${c.nvr_name}`.toLowerCase().includes(q.toLowerCase())
  ), [cams, area, nvr, q]);

  return (
    <Shell title="Live Monitoring" dashboard>
      <div className="live-page">
        <header className="live-hero">
          <div className="hero-copy"><h1>Live Monitoring</h1><p>{filtered.length} channel ditampilkan · mode substream</p></div>
        </header>

        <nav className="live-nav" aria-label="Filter dan tampilan kamera">
          <div className="live-search"><Icon name="search" size={17}/><input aria-label="Cari kamera atau area" placeholder="Cari kamera / area..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <CustomSelect aria-label="Filter area" value={area} onChange={setArea} options={[{ value: '', label: 'Semua Area' }, ...areas.map((a) => ({ value: a.id, label: a.name }))]} />
          <CustomSelect aria-label="Filter NVR" value={nvr} onChange={setNvr} options={[{ value: '', label: 'Semua NVR' }, ...nvrs.map((n) => ({ value: n.id, label: n.name }))]} />
          <div className="live-view-switch" role="group" aria-label="Mode tampilan">
            <button type="button" className={view === 'grid' ? 'selected' : ''} aria-label="Tampilan grid" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={16}/></button>
            <button type="button" className={view === 'list' ? 'selected' : ''} aria-label="Tampilan daftar" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={16}/></button>
          </div>
          <div className="layouts"><span>Grid:</span>{[1, 2, 3, 4, 5, 6].map((n) => (
            <button type="button" key={n} className={view === 'grid' && cols === n ? 'active' : ''} aria-label={`${n} kolom, ${n * n} kamera per layar`} aria-pressed={view === 'grid' && cols === n} onClick={() => { setCols(n); setView('grid'); }}>{n * n}</button>
          ))}</div>
        </nav>
        {loadError && <p className="live-load-error" role="alert">{loadError}</p>}

        <div className={`grid live-grid${view === 'list' ? ' live-list' : ''}`} style={view === 'grid' ? { gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` } : undefined}>
          {filtered.map((c) => <CameraCard key={c.id} c={c} onOpen={() => setFocus(c)} active={!focus} time={now?.toLocaleTimeString('id-ID') || ''} />)}
        </div>
        {filtered.length === 0 && <div className="live-empty">Tidak ada kamera yang sesuai dengan filter.</div>}
      </div>

      {focus && (
        <div className="modal" onClick={() => setFocus(null)}>
          <div className="focus" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setFocus(null)} aria-label="Tutup tampilan kamera">×</button>
            <div className="bigvideo"><Player path={focus.main_webrtc_path} dbStatus={focus.status} diagnostic={focus.last_check_message} /></div>
            <h2>{focus.name}</h2>
            <p>{focus.area_name} · {focus.nvr_name} · Channel {focus.channel_no} · main stream</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
