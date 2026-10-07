'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../components/Icon';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function Brand({ compact = false }) {
  return <div className={`login-brand${compact ? ' login-brand--compact' : ''}`}>
    <span className="login-brand-mark"><Icon name="camera" size={compact ? 23 : 27}/></span>
    <span><strong>CCTV</strong><small>Monitoring System</small></span>
  </div>;
}

const FEATURES = [
  { icon: 'monitor', title: 'Live Monitoring', detail: 'Pantau real-time di semua area' },
  { icon: 'server', title: 'Multi NVR', detail: 'Dukungan banyak perangkat' },
  { icon: 'grid', title: 'Mudah Digunakan', detail: 'Tampilan sederhana dan cepat' },
];

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUsername');
    if (remembered) { setUsername(remembered); setRemember(true); }
  }, []);

  async function login(event) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (!username.trim()) { setError('Username wajib diisi.'); return; }
    if (!password) { setError('Password wajib diisi.'); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Login gagal. Periksa username dan password.'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (remember) localStorage.setItem('rememberedUsername', username.trim());
      else localStorage.removeItem('rememberedUsername');
      router.push('/dashboard');
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi atau jalankan backend.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-screen">
    <div className="login-layout">
      <div className="login-intro">
        <Brand/>
        <div className="login-intro-copy">
          <span className="login-accent-line"/>
          <h1>Pantau<br/>Keamanan<br/><em>Lebih Mudah</em></h1>
          <p>Monitoring kamera dan NVR dalam<br/>satu sistem terpusat.</p>
          <div className="login-features">
            {FEATURES.map((feature) => <div className="login-feature" key={feature.title}>
              <span className="login-feature-icon"><Icon name={feature.icon} size={19}/></span>
              <span><strong>{feature.title}</strong><small>{feature.detail}</small></span>
            </div>)}
          </div>
        </div>
        <div className="login-footer"><span/>CCTV Monitoring System<br/>Secure Places, Safer People</div>
      </div>

      <form className="login-panel" onSubmit={login} noValidate>
        <Brand compact/>
        <h2>Masuk ke Sistem</h2>
        <p className="login-panel-subtitle">Silakan login untuk mengakses monitoring CCTV</p>

        <label className="login-input"><Icon name="user" size={17}/><input autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(''); }} placeholder="Username" aria-label="Username"/></label>
        <label className="login-input"><Icon name="lock" size={17}/><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Password" aria-label="Password"/><button type="button" className="login-eye" aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'} onClick={() => setShowPassword((shown) => !shown)}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17}/></button></label>

        <div className="login-form-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/>Ingat saya</label><button type="button" onClick={() => setShowHelp((shown) => !shown)}>Lupa password?</button></div>
        {showHelp && <p className="login-help">Hubungi administrator sistem untuk mengatur ulang password akun Anda.</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" disabled={submitting} type="submit">{submitting ? 'Memproses...' : 'Masuk Sistem →'}</button>
        <div className="login-divider"><span/>atau<span/></div>
        <div className="login-note"><Icon name="info" size={17}/><span>Gunakan akun yang diberikan administrator.<br/>Password dapat diubah setelah login.</span></div>
      </form>
    </div>
  </main>;
}
