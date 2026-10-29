#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "==================================================="
echo "[ERP EPU] Menjalankan Server di Background"
echo "==================================================="

# Jalankan Backend Express
cd "$DIR/erp-express"
node server.js > express.log 2>&1 &
EXPRESS_PID=$!
echo "Backend running on port 5656 (PID: $EXPRESS_PID)"

# Jalankan Frontend Next.js
cd "$DIR/erp-next"
npm run dev > next.log 2>&1 &
NEXT_PID=$!
echo "Frontend running on port 5555 (PID: $NEXT_PID)"

echo "==================================================="
echo "Aplikasi berjalan di background!"
echo "Akses: http://localhost:5555 atau http://<IP_SERVER>:5555"
echo "Log tersimpan di erp-express/express.log dan erp-next/next.log"
echo "==================================================="
