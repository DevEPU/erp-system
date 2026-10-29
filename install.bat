@echo off
title ERP EPU - Install Dependencies
echo ===================================================
echo [ERP EPU] Menginstal Dependensi Backend dan Frontend...
echo ===================================================

cd /d "%~dp0erp-express"
echo.
echo [1/2] Menginstal paket backend Express...
call npm install
echo [Prisma] Sinkronisasi schema prisma...
call npx prisma generate

cd /d "%~dp0erp-next"
echo.
echo [2/2] Menginstal paket frontend Next.js...
call npm install

echo.
echo ===================================================
echo [SUKSES] Semua dependensi berhasil dipasang!
echo Sekarang Anda dapat:
echo 1. Import database: 'budgeting_db_dump.sql' ke MySQL
echo 2. Jalankan 'start-all.bat' untuk memulai aplikasi
echo ===================================================
pause
