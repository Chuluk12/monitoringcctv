# Menjalankan tanpa Docker di Windows

Project ini membutuhkan tiga proses: PostgreSQL, MediaMTX, dan aplikasi Node.js.
PostgreSQL 17 berjalan pada port 5432. Unduh MediaMTX untuk Windows amd64 dari
[halaman rilis resmi](https://github.com/bluenviron/mediamtx/releases/latest),
lalu ekstrak `mediamtx.exe` ke folder `mediamtx/bin/`.

## 1. Buat user dan database PostgreSQL

Buka PowerShell baru lalu jalankan perintah berikut. Perintah pertama meminta
password akun PostgreSQL `postgres` secara interaktif.

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -d postgres
```

Di dalam prompt `postgres=#`, jalankan. Ganti `PASSWORD_APLIKASI_KUAT` dengan
password baru yang Anda pilih, kemudian gunakan password yang sama di `.env`.

```sql
CREATE USER cctv WITH PASSWORD 'PASSWORD_APLIKASI_KUAT';
CREATE DATABASE cctv_monitoring OWNER cctv;
\q
```

Lalu impor struktur dan data awal:

```powershell
$env:PGPASSWORD = 'PASSWORD_APLIKASI_KUAT'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U cctv -d cctv_monitoring -f '.\database\schema.sql'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U cctv -d cctv_monitoring -f '.\database\seed.sql'
Remove-Item Env:PGPASSWORD
```

## 2. Isi .env

Gunakan nilai berikut dan ganti semua nilai contoh:

```env
POSTGRES_DB=cctv_monitoring
POSTGRES_USER=cctv
POSTGRES_PASSWORD=PASSWORD_APLIKASI_KUAT
JWT_SECRET=SECRET_RANDOM_PANJANG
CRED_ENC_KEY=64_KARAKTER_HEKSADECIMAL
CORS_ORIGIN=http://localhost:3000
HEALTH_CHECK_INTERVAL_SECONDS=15
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WEBRTC_BASE=http://192.168.1.5:8889
```

Untuk membuat nilai `CRED_ENC_KEY`:

```powershell
-join ((0..9) + ('a'..'f') | Get-Random -Count 64)
```

## 3. Jalankan aplikasi

Jalankan dari root project:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Script akan membuka terminal backend dan frontend, serta menjalankan MediaMTX
di latar belakang. Setelah frontend selesai compile, buka `http://localhost:3000`.
Login awal adalah `admin` / `admin123`.

Untuk menghentikan semua proses, tutup dua terminal Node.js dan jalankan:

```powershell
Get-Process mediamtx -ErrorAction SilentlyContinue | Stop-Process
```

