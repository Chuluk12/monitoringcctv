const paths = {
  dashboard: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  expand: <><path d="M9 3H3v6M15 3h6v6M3 15v6h6m12-6v6h-6"/></>,
  fullscreen: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></>,
  fullscreenExit: <><path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
  eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.1A11.5 11.5 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.7M6.2 6.2A17.5 17.5 0 0 0 2 12s3.6 6 10 6a11 11 0 0 0 3.8-.6"/></>,
  info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v5m0-8h.01"/></>,
  camera: <><path d="M4 8h11a3 3 0 0 1 3 3v3H7a3 3 0 0 1-3-3V8Z"/><path d="m18 10 3-2v7l-3-2M8 14l-2 5m9-5 2 5M5 19h13"/></>,
  server: <><rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><circle cx="8" cy="6.5" r=".7"/><circle cx="8" cy="17.5" r=".7"/><path d="M12 6.5h5M12 17.5h5"/></>,
  area: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m10 2 4 0 .6 2.5 1.6.7 2.2-1.4 2.8 2.8-1.4 2.2.7 1.6L23 11v4l-2.5.6-.7 1.6 1.4 2.2-2.8 2.8-2.2-1.4-1.6.7L14 24h-4l-.6-2.5-1.6-.7-2.2 1.4-2.8-2.8 1.4-2.2-.7-1.6L1 15v-4l2.5-.6.7-1.6-1.4-2.2 2.8-2.8 2.2 1.4 1.6-.7L10 2Z" transform="translate(0 -1) scale(.95)"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 3v4m5-4v4"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  more: <><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>,
  building: <><path d="M4 21V7l8-4 8 4v14M2 21h20M9 21v-6h6v6M8 9h1m6 0h1M8 12h1m6 0h1"/></>,
  logout: <><path d="M9 3H4v18h5m4-4 5-5-5-5m-8 5h13"/></>,
};

export default function Icon({ name, size = 18, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}
