# CCTV Command Center — MVP (Tahap Pertama: 1 NVR + 4 CCTV)

Web-based centralized monitoring untuk NVR yang sudah ada. NVR tetap bertanggung
jawab untuk recording; sistem ini hanya menyediakan live monitoring terpusat via
browser, dengan arsitektur:

```
Hikvision NVR → RTSP → MediaMTX → WebRTC (WHEP) → Browser
```

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind-free custom CSS (dark VMS theme)
- Backend: Node.js/Express + JWT
- Database: PostgreSQL
- Streaming gateway: MediaMTX (RTSP in, WebRTC/WHEP out)
- Deployment: Docker Compose

## Yang sudah berfungsi di tahap ini
- Login JWT dengan role `administrator` / `operator` / `viewer`, ditegakkan di setiap endpoint (RBAC).
- Live video **sungguhan** lewat WebRTC/WHEP (bukan placeholder) — grid 1x1 s/d 6x6, substream untuk grid, main stream untuk fullscreen (double-click kamera).
- Kredensial NVR **dienkripsi (AES-256-GCM)** sebelum disimpan, dan **tidak pernah** dikirim ke browser. Browser hanya tahu path internal (`cam-<id>-sub` / `cam-<id>-main`).
- Backend otomatis mendaftarkan RTSP source ke MediaMTX (lewat REST API MediaMTX) setiap kali kamera/NVR dibuat atau diubah, dan saat container backend start ulang.
- Health check tiap 15 detik: TCP probe ke NVR + cek status `ready` path MediaMTX → status kamera (`online` / `offline` / `stream_error` / `nvr_offline`) dan status NVR (`online` / `offline`), plus activity log saat status berubah.
- Dashboard statistik, halaman CRUD untuk Areas / NVR / Cameras / Users, Video Wall (preset + auto rotation per halaman), Settings.
- Docker Compose tidak lagi expose Postgres ke host, semua secret lewat `.env`.

## Menjalankan

1. **Edit `mediamtx/mediamtx.yml`**: ganti `CHANGE_TO_SERVER_LAN_IP` dengan IP LAN
   server/PC yang menjalankan Docker (contoh: `192.168.1.50`). Ini wajib —
   tanpa ini, WebRTC akan macet di "CONNECTING" untuk siapapun yang membuka
   dashboard dari PC lain di jaringan yang sama, karena ICE akan mengiklankan
   IP internal Docker yang tidak bisa dijangkau dari luar.
2. Copy `.env.example` ke `.env`, lalu isi:
   ```bash
   cp .env.example .env
   # generate dua secret berikut:
   openssl rand -hex 32   # -> JWT_SECRET
   openssl rand -hex 32   # -> CRED_ENC_KEY (WAJIB 64 karakter hex / 32 byte)
   ```
3. Jalankan:
   ```bash
   docker compose up --build
   ```
4. Buka `http://localhost:3000`. Login demo: `admin` / `admin123`.
   **Ganti password ini segera** (halaman Users, atau lewat API).

## Menghubungkan NVR/Kamera asli (Tahap Pertama: 1 NVR + 4 CCTV)

Seed data berisi 1 NVR placeholder (`NVR-SECURITY-01`, IP `192.168.1.100`) dan
4 kamera contoh, semuanya **disabled** supaya health checker tidak mencoba
konek ke perangkat yang belum ada.

1. Buka halaman **NVR**, edit `NVR-SECURITY-01`: isi IP address, username,
   password NVR asli, lalu set Enabled = Ya. Password otomatis dienkripsi.
2. Buka halaman **Cameras**, sesuaikan `main_path` / `sub_path` tiap kamera
   jika channel Hikvision-nya berbeda dari default (`Streaming/Channels/101`
   dst — lihat catatan format di bawah), lalu set Enabled = Ya.
3. Backend otomatis mendaftarkan path ke MediaMTX begitu kamu simpan. Cek
   halaman **Live Monitoring** — status kamera akan berubah dari `unknown`
   ke `online` dalam ±15 detik jika NVR reachable dan stream jalan.
4. Setelah 4 kamera stabil, tambah NVR/kamera lain lewat halaman yang sama
   untuk scale ke 16 → 36 → 90 kamera.

### Format RTSP Hikvision
```
Main stream CH1:  Streaming/Channels/101
Sub stream  CH1:  Streaming/Channels/102
Main stream CH2:  Streaming/Channels/201
Sub stream  CH2:  Streaming/Channels/202
```
Konfirmasi ke NVR/firmware masing-masing — beberapa model punya path yang
sedikit berbeda.

## Production hardening yang masih perlu dilakukan
- Taruh di belakang Nginx/HTTPS, batasi ke VLAN CCTV/server, firewall port MediaMTX/API.
- Pin versi image Docker (`bluenviron/mediamtx:latest` → versi spesifik) setelah divalidasi.
- Pertimbangkan secrets manager (Vault/SOPS) untuk `.env` di production, bukan file plaintext.
- `npm audit` pada frontend masih melaporkan beberapa advisory Next.js yang baru
  benar-benar tuntas di Next 15/16 (breaking change dari App Router yang dipakai
  saat ini). Versi yang dipakai sekarang (14.2.35) sudah mencakup patch resmi
  Desember 2025 untuk kerentanan RCE/DoS kritis; migrasi ke Next 15/16 disarankan
  sebagai langkah lanjutan terpisah dengan testing menyeluruh.
- ONVIF discovery belum diimplementasikan (saat ini path RTSP diisi manual per kamera).

## Struktur proyek
```
backend/src/
  server.js       entrypoint - security middleware, routing, boot sync
  db.js           pg pool
  auth.js         JWT auth + role middleware
  crypto.js       AES-256-GCM untuk password NVR
  mediamtx.js     generate RTSP URL + sync path ke MediaMTX API
  health.js       TCP probe NVR + cek status path MediaMTX tiap interval
  log.js          activity log
  routes/         auth, areas, nvrs, cameras, users, dashboard, videowall, settings
frontend/
  app/            dashboard, live, cameras, nvr, areas, users, video-wall, settings, login
  components/     Shell, Sidebar, Player (WHEP), CameraCard, CrudTable
  lib/            api.js (fetch wrapper), webrtc.js (WHEP client)
database/
  schema.sql, seed.sql
mediamtx/mediamtx.yml
```
