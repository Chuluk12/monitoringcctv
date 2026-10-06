'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import Icon from '../../components/Icon';
import { api } from '../../lib/api';

function StatCard({ label, value, note, tone, icon }) {
  return <div className={`overview-card tone-${tone}`}>
    <span className="overview-icon"><Icon name={icon} size={23}/></span>
    <div className="overview-copy"><strong>{value ?? '—'}</strong><span>{label}</span><small>{note}</small></div>
  </div>;
}

function PanelHeading({ icon, title, href }) {
  return <div className="dashboard-panel-heading">
    <h2><Icon name={icon} size={20}/>{title}</h2>
    <Link href={href}>Lihat Detail <Icon name="arrow" size={14}/></Link>
  </div>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [nvrs, setNvrs] = useState([]);
  const [now, setNow] = useState(null);

  useEffect(() => {
    if (!localStorage.token) { window.location.href = '/login'; return; }
    let stop = false;
    async function load() {
      const [nextStats, nextNvrs] = await Promise.all([
        api('/api/dashboard/stats').catch(() => null),
        api('/api/nvrs').catch(() => []),
      ]);
      if (!stop) { setStats(nextStats); setNvrs(nextNvrs || []); }
    }
    load();
    setNow(new Date());
    const refresh = setInterval(load, 10000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { stop = true; clearInterval(refresh); clearInterval(clock); };
  }, []);

  const cameras = stats?.cameras || {};
  const nvrStats = stats?.nvrs || {};
  const totalCameras = cameras.total || 0;
  const unknownCameras = cameras.unknown ?? Math.max(0, totalCameras - (cameras.online || 0) - (cameras.offline || 0));
  const allUnverified = totalCameras > 0 && unknownCameras === totalCameras;
  const totalNvrs = nvrStats.total || 0;
  const percent = (part, total) => total ? `${Math.round((part || 0) / total * 100)}% dari total` : 'Belum ada data';

  return <Shell title="Dashboard" dashboard>
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="hero-copy"><h1>Dashboard</h1><p>Ringkasan kondisi seluruh kamera dan NVR</p></div>
        <div className="hero-clock"><Icon name="calendar" size={19}/><span><small>{now?.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) || 'Memuat tanggal...'}</small><strong>{now?.toLocaleTimeString('id-ID') || '--:--:--'}</strong></span></div>
      </div>

      <div className="overview-grid">
        <StatCard icon="camera" tone="red" label="Total Kamera" value={cameras.total} note="Berdasarkan nama kamera unik"/>
        <StatCard icon="camera" tone="green" label="Kamera Online" value={allUnverified ? '—' : cameras.online} note={allUnverified ? 'Belum terverifikasi' : percent(cameras.online, totalCameras)}/>
        <StatCard icon="camera" tone="red" label="Kamera Offline" value={allUnverified ? '—' : cameras.offline} note={allUnverified ? 'Belum terverifikasi' : percent(cameras.offline, totalCameras)}/>
        <StatCard icon="server" tone="slate" label="Total NVR" value={nvrStats.total} note="NVR terdaftar"/>
        <StatCard icon="server" tone="green" label="NVR Online" value={nvrStats.online} note={percent(nvrStats.online, totalNvrs)}/>
        <StatCard icon="server" tone="red" label="NVR Offline" value={nvrStats.offline} note={percent(nvrStats.offline, totalNvrs)}/>
      </div>

      {unknownCameras > 0 && <div className="dashboard-unknown" role="status">
        <span className="dashboard-unknown-icon"><Icon name="info" size={19}/></span>
        <div><strong>{unknownCameras} kamera belum terverifikasi</strong><p>Status online atau offline baru diketahui ketika stream kamera berhasil dibaca. NVR yang online belum tentu berarti semua videonya dapat diputar.</p></div>
      </div>}

      <div className="dashboard-panels">
        <div className="dashboard-panel">
          <PanelHeading icon="building" title="Kamera per Area*" href="/areas"/>
          <div className="dashboard-table-wrap"><table className="dashboard-table">
            <thead><tr><th>Area</th><th>Total Kamera</th><th>Online</th><th>Offline</th><th>Belum dicek</th><th>Status</th></tr></thead>
            <tbody>{(stats?.per_area || []).map((area) => {
              const offline = area.offline_count || 0;
              const unknown = area.unknown_count || 0;
              const state = area.camera_count === 0 ? 'Belum ada kamera'
                : offline ? 'Perlu dicek'
                : unknown === area.camera_count ? 'Belum diketahui'
                : unknown ? 'Sebagian belum dicek' : 'Normal';
              return <tr key={area.area_name}><td className="area-name"><Icon name="building" size={15}/>{area.area_name}</td><td>{area.camera_count}</td><td className="text-green">{area.online_count}</td><td className={offline ? 'text-red' : ''}>{offline}</td><td className={unknown ? 'text-amber' : ''}>{unknown}</td><td><span className={`state-pill ${offline ? 'state-red' : area.camera_count === 0 || unknown ? 'state-muted' : 'state-green'}`}>{state}</span></td></tr>;
            })}</tbody>
          </table></div>
          <p className="dashboard-area-note">*Total per area bisa tumpang tindih jika kamera yang sama tercatat di beberapa area. Total perusahaan menghitungnya sekali. Status berdasarkan stream yang berhasil diperiksa.</p>
        </div>

        <div className="dashboard-panel">
          <PanelHeading icon="server" title="Status NVR" href="/nvr"/>
          <div className="dashboard-table-wrap"><table className="dashboard-table">
            <thead><tr><th>Nama NVR</th><th>IP Address</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>{nvrs.map((nvr) => <tr key={nvr.id}><td>{nvr.name}</td><td>{nvr.ip_address}</td><td><span className={`state-pill ${nvr.status === 'online' ? 'state-green' : nvr.status === 'offline' ? 'state-red' : 'state-muted'}`}><i className="state-dot"/>{nvr.status === 'online' ? 'Online' : nvr.status === 'offline' ? 'Offline' : 'Unknown'}</span><small className="status-detail">{nvr.last_check_message || 'Belum diperiksa'}{nvr.last_checked_at ? ` · ${new Date(nvr.last_checked_at).toLocaleTimeString('id-ID')}` : ''}</small></td><td><Link className="row-action" href="/nvr" aria-label={`Lihat ${nvr.name}`}><Icon name="more" size={17}/></Link></td></tr>)}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  </Shell>;
}
