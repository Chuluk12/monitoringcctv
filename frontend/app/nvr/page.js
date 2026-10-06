'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import CrudTable from '../../components/CrudTable';
import { useDialog } from '../../components/DialogProvider';
import { api, useCurrentUser } from '../../lib/api';

export default function NvrPage() {
  const [nvrs, setNvrs] = useState([]);
  const [areas, setAreas] = useState([]);
  const [scanningId, setScanningId] = useState(null);
  const user = useCurrentUser();
  const { confirm, notify } = useDialog();

  async function load() {
    const [n, a] = await Promise.all([api('/api/nvrs'), api('/api/areas')]);
    setNvrs(n || []); setAreas(a || []);
  }
  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    load();
    const refresh = setInterval(load, 15000);
    return () => clearInterval(refresh);
  }, []);

  const fields = [
    { key: 'name', label: 'Nama NVR' },
    { key: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'rtsp_port', label: 'RTSP Port', type: 'number' },
    { key: 'http_port', label: 'HTTP Port', type: 'number' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password', hideInTable: true },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'enabled', label: 'Enabled', type: 'select', options: [{ value: true, label: 'Ya' }, { value: false, label: 'Tidak' }] },
    { key: 'status', label: 'Status' },
  ];

  async function scanCameras(nvr) {
    setScanningId(nvr.id);
    try {
      const result = await api(`/api/nvrs/${nvr.id}/discover-cameras`, { method: 'POST' });
      await notify(`Scan selesai: ${result.found} channel ditemukan, ${result.created} kamera baru ditambahkan.`, 'Scan selesai');
    } catch (err) {
      await notify(`Scan gagal: ${err.message}`, 'Scan gagal');
    } finally {
      setScanningId(null);
    }
  }

  return (
    <Shell title="NVR" subtitle="Kelola NVR per area. Password dienkripsi dan tidak pernah dikirim ke browser.">
      <CrudTable
        fields={fields}
        rows={nvrs}
        canWrite={user?.role === 'administrator'}
        onCreate={async (form) => { await api('/api/nvrs', { method: 'POST', body: JSON.stringify(form) }); load(); }}
        onUpdate={async (id, form) => { await api(`/api/nvrs/${id}`, { method: 'PUT', body: JSON.stringify(form) }); load(); }}
        onDelete={async (id) => { if (await confirm('Hapus NVR ini? Semua kamera di NVR ini juga akan terhapus.', 'Hapus NVR')) { await api(`/api/nvrs/${id}`, { method: 'DELETE' }); load(); } }}
      />
      <div className="nvr-health-grid" aria-label="Hasil pemeriksaan koneksi NVR">
        {nvrs.map((nvr) => <article className="nvr-health-card" key={nvr.id}>
          <div><strong>{nvr.name}</strong><span className={`nvr-health-state ${nvr.status || 'unknown'}`}>{nvr.status === 'online' ? 'Merespons' : 'Belum diketahui'}</span></div>
          <p>{nvr.last_check_message || 'Belum ada pemeriksaan koneksi.'}</p>
          <small>{nvr.last_checked_at ? `Terakhir diperiksa ${new Date(nvr.last_checked_at).toLocaleString('id-ID')}` : 'Menunggu pemeriksaan pertama'}</small>
        </article>)}
      </div>
      <div className="crud" style={{ marginTop: 24 }}>
        <h3>Scan kamera NVR Hikvision</h3>
        <p>Daftar channel dibaca dari NVR, lalu kamera yang belum ada ditambahkan otomatis.</p>
        {nvrs.filter((n) => n.enabled).map((n) => (
          <button key={n.id} className="btn" disabled={scanningId !== null} onClick={() => scanCameras(n)} style={{ marginRight: 8, marginBottom: 8 }}>
            {scanningId === n.id ? `Memindai ${n.name}...` : `Scan ${n.name}`}
          </button>
        ))}
      </div>
    </Shell>
  );
}
