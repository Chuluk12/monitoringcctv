param(
  [switch]$FrontendOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path $envFile)) {
  throw 'File .env belum ada. Salin .env.example menjadi .env lalu lengkapi nilainya.'
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
  }
}

$required = 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'JWT_SECRET', 'CRED_ENC_KEY'
foreach ($key in $required) {
  $value = [Environment]::GetEnvironmentVariable($key, 'Process')
  if ([string]::IsNullOrWhiteSpace($value) -or $value -match 'CHANGE_ME|CHANGE_TO') {
    throw "$key di .env belum diisi."
  }
}
if ($env:CRED_ENC_KEY -notmatch '^[0-9a-fA-F]{64}$') {
  throw 'CRED_ENC_KEY harus berupa 64 karakter heksadesimal.'
}

$encodedPassword = [Uri]::EscapeDataString($env:POSTGRES_PASSWORD)
$env:DATABASE_URL = "postgresql://$($env:POSTGRES_USER):$encodedPassword@localhost:5432/$($env:POSTGRES_DB)"

if (-not $FrontendOnly) {
  $mediaMtx = Join-Path $projectRoot 'mediamtx\bin\mediamtx.exe'
  $mediaMtxConfig = Join-Path $projectRoot 'mediamtx\mediamtx.yml'
  if (-not (Test-Path $mediaMtx)) { throw 'MediaMTX tidak ditemukan.' }

  Start-Process -FilePath $mediaMtx -ArgumentList ('"{0}"' -f $mediaMtxConfig) -WorkingDirectory $projectRoot -WindowStyle Hidden
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd start' -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Normal
}

Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd run dev' -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Normal

Write-Host 'Service sedang dimulai. Buka http://localhost:3000 setelah frontend selesai compile.'
