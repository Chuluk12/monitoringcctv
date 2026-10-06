'use client';
import { useEffect, useRef, useState } from 'react';

export default function CustomSelect({ value, onChange, options, 'aria-label': ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return;
    function close(event) { if (!root.current?.contains(event.target)) setOpen(false); }
    function escape(event) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  return <div className={`custom-select ${className}`} ref={root}>
    <button type="button" className="custom-select-trigger" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(!open)}>
      <span>{selected?.label ?? options[0]?.label ?? 'Pilih...'}</span><span className="custom-select-chevron" aria-hidden="true" />
    </button>
    {open && <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={String(option.value) === String(value)} className="custom-select-option" key={String(option.value)} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span>{option.label}</span>{String(option.value) === String(value) && <span aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>;
}
