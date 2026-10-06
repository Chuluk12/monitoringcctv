'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import CrudTable from '../../components/CrudTable';
import { useDialog } from '../../components/DialogProvider';
import { api, useCurrentUser } from '../../lib/api';

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const user = useCurrentUser();
  const { confirm } = useDialog();

  async function load() { setAreas((await api('/api/areas')) || []); }
  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    load();
  }, []);

  const fields = [
    { key: 'name', label: 'Nama Area' },
    { key: 'description', label: 'Deskripsi' },
    { key: 'sort_order', label: 'Urutan', type: 'number' },
  ];

  return (
    <Shell title="Areas" subtitle="Kelola wilayah/area penempatan CCTV">
      <CrudTable
        fields={fields}
        rows={areas}
        canWrite={user?.role === 'administrator'}
        onCreate={async (form) => { await api('/api/areas', { method: 'POST', body: JSON.stringify(form) }); load(); }}
        onUpdate={async (id, form) => { await api(`/api/areas/${id}`, { method: 'PUT', body: JSON.stringify(form) }); load(); }}
        onDelete={async (id) => { if (await confirm('Hapus area ini?', 'Hapus area')) { await api(`/api/areas/${id}`, { method: 'DELETE' }); load(); } }}
      />
    </Shell>
  );
}
