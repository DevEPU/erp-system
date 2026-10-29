#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "==================================================="
echo "[ERP EPU] Menginstal Dependensi Backend dan Frontend"
echo "==================================================="

echo "[1/2] Installing Express backend dependencies..."
cd "$DIR/erp-express"
npm install
npx prisma generate

echo "[2/2] Installing Next.js frontend dependencies..."
cd "$DIR/erp-next"
npm install

echo "==================================================="
echo "[SUKSES] Instalasi selesai!"
echo "Jalankan './start-all.sh' untuk menjalankan server."
echo "==================================================="
