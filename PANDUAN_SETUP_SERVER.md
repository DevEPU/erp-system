# Panduan Pemindahan Project ke Komputer Server (Local & Tunneling)

Dokumen ini memandu langkah demi langkah cara memasang, mengimpor database, dan menjalankan sistem ERP (Backend Express + Frontend Next.js) di komputer server agar dapat diakses secara **lokal (LAN)** maupun secara **online (Tunneling)**.

---

## 📋 1. Persyaratan Sistem di Server

Pastikan di komputer server sudah terinstal:
1. **Node.js**: Versi LTS 18 atau lebih baru (v20+ direkomendasikan).
   - Cek dengan: `node -v` dan `npm -v`
2. **MySQL Server / MariaDB** (atau Laragon / XAMPP):
   - Port default: `3306`
   - Database name: `budgeting`

---

## 🗄️ 2. Restore Database MySQL

File dump database telah disertakan di root project: `budgeting_db_dump.sql`.

### Cara Restore (Pilih salah satu):
- **Opsi A: Menggunakan HeidiSQL / DBeaver / phpMyAdmin**:
  1. Buat database baru bernama `budgeting`.
  2. Buka file `budgeting_db_dump.sql`.
  3. Jalankan / Execute file SQL tersebut sampai selesai.

- **Opsi B: Menggunakan Terminal / CMD**:
  ```bash
  mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS budgeting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root -p budgeting < budgeting_db_dump.sql
  ```

---

## ⚙️ 3. Konfigurasi Environment (`.env`)

### Backend (`/erp-express/.env`):
Periksa file `.env` di dalam folder `erp-express`:
```env
PORT=2121
DATABASE_URL="mysql://root:@127.0.0.1:3306/db_ims_epu"
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_ims_epu
JWT_SECRET=secret_key_erp_express_2026
```
*(Sesuaikan `DB_PASSWORD` jika MySQL di server Anda menggunakan password)*

### Frontend (`/erp-next/.env`):
Secara default cukup dibiarkan kosong:
```env
NEXT_PUBLIC_API_URL=
```
> **Keuntungan**: Next.js sudah dikonfigurasi dengan reverse proxy internal (`rewrites`), sehingga semua request `/api/*` dari browser klien (baik via localhost, LAN IP, maupun domain tunnel) akan otomatis diteruskan ke backend Express port 5656. Anda tidak perlu repot mengganti-ganti IP server!

---

## 📦 4. Instalasi Dependensi

Cukup jalankan script otomatis:
- **Windows**: Dobel-klik file `install.bat`.
- **Linux / Mac**: Jalankan `./install.sh`.

*(Atau secara manual menjalankan `npm install && npx prisma generate` di `erp-express`, dan `npm install` di `erp-next`).*

---

## 🚀 5. Menjalankan Aplikasi

### Di Windows Server:
Dobel-klik file **`start-all.bat`**.
Script ini akan membuka dua jendela terminal:
1. **Backend Express** pada port `5656`
2. **Frontend Next.js** pada port `5555`

### Di Linux Server:
Jalankan:
```bash
chmod +x start-all.sh install.sh
./start-all.sh
```

---

## 🌐 6. Cara Akses Sistem

### A. Akses Local & Intranet (LAN Kantor)
- Dari komputer server sendiri: `http://localhost:5555`
- Dari komputer karyawan / device lain di jaringan Wi-Fi/LAN yang sama:
  ```text
  http://<IP_KOMPUTER_SERVER>:5555
  ```
  *(Contoh: `http://192.168.1.100:5555`)*
  > **Tips Firewall Windows**: Pastikan Windows Defender Firewall mengizinkan koneksi port `5555` untuk Private Network.

---

### B. Akses Online / Luar Kantor (Tunneling)

Sistem sudah dioptimasi sehingga Anda **hanya perlu mentunnelkan port `5555`** (port backend 5656 otomatis ter-proxy di belakangnya).

#### 1. Cloudflare Quick Tunnel (Paling Mudah, Gratis & HTTPS)
Jalankan file **`start-tunnel.bat`** dan pilih opsi **`1`**, atau jalankan perintah:
```bash
npx -y cloudflared tunnel --url http://localhost:5555
```
Cloudflare akan memberikan tautan publik acak berformat:
`https://xxx-xxx-xxx.trycloudflare.com`
Tautan tersebut langsung bisa dibuka dari HP / laptop di mana saja tanpa perlu setting router / IP publik!

#### 2. Cloudflare Named Tunnel (Domain Permanen Perusahaan, misal: `erp.pt-epu.com`)
Jika memiliki domain sendiri di Cloudflare:
1. Buat tunnel di Cloudflare Zero Trust Dashboard: `Networks > Tunnels`.
2. Pasang `cloudflared service install <token>`.
3. Arahkan Public Hostname `erp.domain-anda.com` ke service `http://localhost:5555`.

#### 3. Ngrok
```bash
ngrok http 5555
```

---

## 🔄 7. Menjalankan 24/7 Otomatis (Menggunakan PM2)

Agar aplikasi otomatis restart jika crash atau saat server reboot:
```bash
npm install -g pm2

# Jalankan Backend
cd erp-express
pm2 start server.js --name "erp-backend"

# Jalankan Frontend
cd ../erp-next
pm2 start "npm run dev" --name "erp-frontend"

# Simpan state agar auto-start saat komputer menyala
pm2 save
pm2 startup
```
