'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import CrudTable from '../../components/CrudTable';
import { useDialog } from '../../components/DialogProvider';
import { api, currentUser, useCurrentUser } from '../../lib/api';

const ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const user = useCurrentUser();
  const { confirm } = useDialog();

  async function load() { setUsers((await api('/api/users')) || []); }
  useEffect(() => {
    if (!localStorage.token) return (window.location.href = '/login');
    if (currentUser()?.role !== 'administrator') return (window.location.href = '/dashboard');
    load();
  }, []);

  const fields = [
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', type: 'password', hideInTable: true },
    { key: 'full_name', label: 'Nama Lengkap' },
    { key: 'role', label: 'Role', type: 'select', options: ROLES },
    { key: 'enabled', label: 'Enabled', type: 'select', options: [{ value: true, label: 'Ya' }, { value: false, label: 'Tidak' }] },
  ];

  return (
    <Shell title="Users" subtitle="Kelola akun operator/administrator/viewer">
      <CrudTable
        fields={fields}
        rows={users}
        canWrite
        onCreate={async (form) => { await api('/api/users', { method: 'POST', body: JSON.stringify(form) }); load(); }}
        onUpdate={async (id, form) => { await api(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(form) }); load(); }}
        onDelete={async (id) => { if (await confirm('Hapus user ini?', 'Hapus user')) { await api(`/api/users/${id}`, { method: 'DELETE' }); load(); } }}
      />
    </Shell>
  );
}
