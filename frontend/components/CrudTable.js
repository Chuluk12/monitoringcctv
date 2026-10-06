'use client';
import { useState } from 'react';
import CustomSelect from './CustomSelect';

// fields: [{ key, label, type: 'text'|'number'|'password'|'select', options?: [{value,label}], hideInTable? }]
export default function CrudTable({ fields, rows, onCreate, onUpdate, onDelete, canWrite = true }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function startEdit(row) {
    setEditingId(row.id);
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? ''])));
    setShowPassword(false);
  }
  function startCreate() {
    setEditingId('new');
    setForm({});
    setShowPassword(false);
  }
  function cancel() {
    setEditingId(null);
    setForm({});
    setError('');
    setShowPassword(false);
  }
  async function save() {
    setError('');
    try {
      if (editingId === 'new') await onCreate(form);
      else await onUpdate(editingId, form);
      cancel();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="crud">
      {canWrite && editingId === null && <button className="btn" onClick={startCreate}>+ Tambah</button>}

      {editingId !== null && (
        <div className="crud-form">
          {fields.map((f) => f.type === 'password' ? (
            <div className="crud-password-field" key={f.key}>
              <label htmlFor={`crud-${f.key}`}>{f.label}</label>
              <div className="crud-password-input">
                <input
                  id={`crud-${f.key}`}
                  type={showPassword ? 'text' : 'password'}
                  value={form[f.key] ?? ''}
                  placeholder={editingId !== 'new' ? '(kosongkan jika tidak diganti)' : ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'} aria-pressed={showPassword}>
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>
          ) : (
            <label key={f.key}>
              {f.label}
              {f.type === 'select' ? (
                <CustomSelect value={form[f.key] ?? ''} onChange={(value) => setForm({ ...form, [f.key]: value })} options={[{ value: '', label: `Pilih ${f.label}` }, ...f.options]} aria-label={f.label} />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          {error && <small className="crud-error">{error}</small>}
          <div className="crud-actions">
            <button className="btn" onClick={save}>Simpan</button>
            <button className="btn ghost" onClick={cancel}>Batal</button>
          </div>
        </div>
      )}

      <table className="crud-table">
        <thead>
          <tr>
            {fields.filter((f) => !f.hideInTable).map((f) => <th key={f.key}>{f.label}</th>)}
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {fields.filter((f) => !f.hideInTable).map((f) => (
                <td key={f.key}>{f.type === 'select' ? (f.options.find((o) => String(o.value) === String(row[f.key]))?.label ?? row[f.key]) : String(row[f.key] ?? '')}</td>
              ))}
              {canWrite && (
                <td className="crud-row-actions">
                  <button className="btn ghost" onClick={() => startEdit(row)}>Edit</button>
                  <button className="btn ghost danger" onClick={() => onDelete(row.id)}>Hapus</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
