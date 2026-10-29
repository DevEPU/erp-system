@echo off
title ERP EPU - Tunneling Manager
echo ========================================================
echo         ERP EPU - TUNNELING MANAGER (AKSES PUBLIK)
echo ========================================================
echo.
echo Pilih metode tunneling untuk menghubungkan port 5555 ke internet:
echo.
echo [1] Cloudflare Tunnel Quick (Gratis, HTTPS, Tanpa Akun / Domain)
echo [2] Localtunnel (Gratis via NPM, port 5555)
echo [3] Ngrok (Perlu akun ngrok, port 5555)
echo [4] Keluar
echo.
set /p opt="Pilih opsi (1-4): "

if "%opt%"=="1" (
    echo.
    echo Menghubungkan Cloudflare Tunnel...
    where cloudflared >nul 2>nul
    if %errorlevel%==0 (
        cloudflared tunnel --url http://localhost:5555
    ) else (
        echo [INFO] Perintah cloudflared tidak ditemukan di PATH.
        echo Menjalankan tunnel otomatis via npx cloudflared...
        npx -y cloudflared tunnel --url http://localhost:5555
    )
) else if "%opt%"=="2" (
    echo.
    echo Menghubungkan Localtunnel...
    npx -y localtunnel --port 5555
) else if "%opt%"=="3" (
    echo.
    echo Menghubungkan Ngrok...
    ngrok http 5555
) else (
    echo Keluar...
)
pause
