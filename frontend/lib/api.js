import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function currentUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.user || 'null'); } catch { return null; }
}

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(currentUser()); }, []);
  return user;
}

export async function api(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.token : null;
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed: ${res.status}`);
  return data;
}

export const API_BASE = API;
export const WEBRTC_BASE = process.env.NEXT_PUBLIC_WEBRTC_BASE || 'http://localhost:8889';
