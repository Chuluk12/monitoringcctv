'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Icon from './Icon';
import { api, currentUser } from '../lib/api';

export default function Shell({ title, subtitle, children, light = true, dashboard = false }) {
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(null);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(currentUser());
    let stop = false;
    async function load() {
      const next = await api('/api/dashboard/stats').catch(() => null);
      if (!stop) setStats(next);
    }
    load();
    setNow(new Date());
    const statsTimer = setInterval(load, 15000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => { stop = true; clearInterval(statsTimer); clearInterval(clockTimer); };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('Tidak dapat mengubah mode layar penuh:', error);
    }
  }

  return (
    <div className={`shell${light ? ' shell-light' : ''}`}>
      <Sidebar light={light} />
      <div className="shell-main">
        <header className="topbar">
          <div className="status"><span className="status-dot"/> SYSTEM ONLINE</div>
          {stats && (
            <div className="topbar-counts">
              {stats.cameras.unknown === stats.cameras.total && stats.cameras.total > 0 ? (
                <span><i className="dot slate"/>{stats.cameras.unknown} kamera belum terverifikasi</span>
              ) : <>
                <span><i className="dot green"/>{stats.cameras.online} kamera online</span>
                <span><i className="dot red"/>{stats.cameras.offline} kamera offline</span>
                {stats.cameras.unknown > 0 && <span><i className="dot slate"/>{stats.cameras.unknown} belum terverifikasi</span>}
              </>}
              <span><i className="dot slate"/>{stats.nvrs.online} NVR online</span>
            </div>
          )}
          {light && (
            <form className="topbar-search" onSubmit={(event) => { event.preventDefault(); router.push(`/live?search=${encodeURIComponent(search)}`); }}>
              <Icon name="search" size={16}/>
              <input aria-label="Cari kamera, area, atau NVR" placeholder="Cari kamera, area, atau NVR..." value={search} onChange={(event) => setSearch(event.target.value)}/>
            </form>
          )}
          <button type="button" className="topbar-fullscreen" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Masuk layar penuh'} aria-pressed={isFullscreen} title={isFullscreen ? 'Keluar dari layar penuh (Esc)' : 'Layar penuh'}>
            <Icon name={isFullscreen ? 'fullscreenExit' : 'fullscreen'} size={18}/>
          </button>
          <div className="topbar-user"><span className="user-name">{user?.username || 'User'}<small>{user?.role || ''}</small></span>{light && <span className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</span>}</div>
          {!light && <div className="topbar-clock">{now?.toLocaleTimeString('id-ID') || '--:--:--'}</div>}
        </header>
        <section className={`shell-content${dashboard ? '' : ' shell-content--page'}`}>
          {!dashboard && <header className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header>}
          {children}
        </section>
      </div>
    </div>
  );
}
