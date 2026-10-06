'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, currentUser, useCurrentUser } from '../../lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const user = useCurrentUser();

  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    if (currentUser()?.role !== 'administrator') return (window.location.href = '/dashboard');
    api('/api/settings').then((s) => setSettings(s || {}));
  }, []);

  async function save() {
    await api('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Shell title="Settings" subtitle="Konfigurasi sistem">
      <div className="crud-form" style={{ maxWidth: 420 }}>
        <label>
          Durasi rotation Video Wall default (detik)
          <input
            type="number"
            value={settings.default_rotation_seconds || ''}
            onChange={(e) => setSettings({ ...settings, default_rotation_seconds: e.target.value })}
          />
        </label>
        <label>
          Interval health check (detik)
          <input
            type="number"
            value={settings.health_check_interval_seconds || ''}
            onChange={(e) => setSettings({ ...settings, health_check_interval_seconds: e.target.value })}
          />
          <small style={{ color: '#8395a7' }}>Perubahan nilai ini butuh restart service backend (env var) agar berlaku.</small>
        </label>
        <div className="crud-actions">
          <button className="btn" onClick={save}>Simpan</button>
          {saved && <small style={{ color: '#66e2a5' }}>Tersimpan.</small>}
        </div>
      </div>
    </Shell>
  );
}
