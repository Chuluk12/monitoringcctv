'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import CrudTable from '../../components/CrudTable';
import { useDialog } from '../../components/DialogProvider';
import { api, useCurrentUser } from '../../lib/api';

export default function CamerasPage() {
  const [cams, setCams] = useState([]);
  const [areas, setAreas] = useState([]);
  const [nvrs, setNvrs] = useState([]);
  const user = useCurrentUser();
  const { confirm } = useDialog();

  async function load() {
    const [c, a, n] = await Promise.all([api('/api/cameras'), api('/api/areas'), api('/api/nvrs')]);
    setCams(c || []); setAreas(a || []); setNvrs(n || []);
  }
  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    load();
  }, []);

  const fields = [
    { key: 'code', label: 'Camera ID' },
    { key: 'name', label: 'Nama' },
    { key: 'area_id', label: 'Area', type: 'select', options: areas.map((a) => ({ value: a.id, label: a.name })) },
    { key: 'nvr_id', label: 'NVR', type: 'select', options: nvrs.map((n) => ({ value: n.id, label: n.name })) },
    { key: 'channel_no', label: 'Channel', type: 'number' },
    { key: 'main_path', label: 'Main Stream (path RTSP)' },
    { key: 'sub_path', label: 'Sub Stream (path RTSP)' },
    { key: 'enabled', label: 'Enabled', type: 'select', options: [{ value: true, label: 'Ya' }, { value: false, label: 'Tidak' }] },
  ];

  return (
    <Shell title="Cameras" subtitle="Kelola daftar kamera dan pemetaan channel RTSP-nya">
      <CrudTable
        fields={fields}
        rows={cams}
        canWrite={['administrator', 'operator'].includes(user?.role)}
        onCreate={async (form) => { await api('/api/cameras', { method: 'POST', body: JSON.stringify(form) }); load(); }}
        onUpdate={async (id, form) => { await api(`/api/cameras/${id}`, { method: 'PUT', body: JSON.stringify(form) }); load(); }}
        onDelete={async (id) => { if (await confirm('Hapus kamera ini?', 'Hapus kamera')) { await api(`/api/cameras/${id}`, { method: 'DELETE' }); load(); } }}
      />
    </Shell>
  );
}
