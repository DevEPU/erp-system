@echo off
title ERP EPU - Runner
echo ===================================================
echo [ERP EPU] Menjalankan Server Backend dan Frontend...
echo ===================================================

echo [1/2] Menjalankan Backend Express (Port 2121)...
start "ERP EPU - Backend API (Port 2121)" cmd /k "cd /d "%~dp0erp-express" && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Menjalankan Frontend Next.js (Port 1212)...
start "ERP EPU - Frontend Next.js (Port 1212)" cmd /k "cd /d "%~dp0erp-next" && npm run dev"

echo.
echo ===================================================
echo [ONLINE] Sistem ERP EPU telah berjalan!
echo - Akses Lokal: http://localhost:1212
echo - Akses LAN:   http://[IP_KOMPUTER_SERVER]:1212
echo.
echo * Catatan: Backend otomatis diproxy melalui port 1212.
echo * Untuk akses internet dari luar kantor, jalankan 'start-tunnel.bat'
echo ===================================================
pause
