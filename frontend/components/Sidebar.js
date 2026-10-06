'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { currentUser, api } from '../lib/api';
import Icon from './Icon';
import { useDialog } from './DialogProvider';

const ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/live', label: 'Live Monitoring', icon: 'monitor' },
  { href: '/video-wall', label: 'Video Wall', icon: 'grid' },
  { href: '/cameras', label: 'Cameras', icon: 'camera', roles: ['administrator', 'operator'] },
  { href: '/nvr', label: 'NVR', icon: 'server', roles: ['administrator', 'operator'] },
  { href: '/areas', label: 'Areas', icon: 'area', roles: ['administrator', 'operator'] },
  { href: '/users', label: 'Users', icon: 'users', roles: ['administrator'] },
  { href: '/settings', label: 'Settings', icon: 'settings', roles: ['administrator'] },
];

export default function Sidebar({ light = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useDialog();
  const [user, setUser] = useState(null);
  const [today, setToday] = useState(null);

  useEffect(() => {
    setUser(currentUser());
    setToday(new Date());
  }, []);

  async function logout() {
    if (!await confirm('Yakin ingin keluar dari CCTV Monitoring System?', 'Keluar dari sistem?')) return;
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <aside className={light ? 'sidebar-light' : ''}>
      {light ? (
        <Link className="sidebar-brand" href="/dashboard" aria-label="CCTV Monitoring System, buka Dashboard">
          <span className="sidebar-brand-icon"><Icon name="camera" size={22}/></span>
          <span className="sidebar-brand-copy"><strong>CCTV</strong><small>Monitoring System</small></span>
        </Link>
      ) : <div className="brand">CCTV // CC</div>}
      {!light && <h3>NAVIGATION</h3>}
      <nav className="sidebar-nav">
        {ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
          <button key={item.href} className={pathname === item.href ? 'active' : ''} onClick={() => router.push(item.href)}>
            {light && <Icon name={item.icon} size={17} />}{item.label}
          </button>
        ))}
      </nav>
      <div className="sidefoot">
        {light ? (
          <div className="sidebar-date"><Icon name="calendar" size={17}/><span>{today?.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) || ''}</span></div>
        ) : <span>{user?.username} · {user?.role}</span>}
        <button onClick={logout}><Icon name="logout" size={16}/>Logout</button>
      </div>
    </aside>
  );
}
