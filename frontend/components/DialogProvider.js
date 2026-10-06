'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const DialogContext = createContext(null);
export function useDialog() { return useContext(DialogContext); }

export default function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  function confirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => setDialog({ title, message, resolve, confirm: true }));
  }
  function notify(message, title = 'Informasi') {
    return new Promise((resolve) => setDialog({ title, message, resolve, confirm: false }));
  }
  function close(result) { dialog?.resolve(result); setDialog(null); }
  useEffect(() => {
    if (!dialog) return;
    function onKey(event) { if (event.key === 'Escape') close(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog]);
  return <DialogContext.Provider value={{ confirm, notify }}>
    {children}
    {dialog && <div className="app-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
      <div className="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
        <span className="app-dialog-symbol">{dialog.confirm ? '?' : 'i'}</span>
        <h2 id="app-dialog-title">{dialog.title}</h2>
        <p id="app-dialog-message">{dialog.message}</p>
        <div className="app-dialog-actions">
          {dialog.confirm && <button type="button" className="app-dialog-cancel" onClick={() => close(false)}>Batal</button>}
          <button type="button" className="app-dialog-accept" autoFocus onClick={() => close(true)}>{dialog.confirm ? 'Ya, lanjutkan' : 'Mengerti'}</button>
        </div>
      </div>
    </div>}
  </DialogContext.Provider>;
}
