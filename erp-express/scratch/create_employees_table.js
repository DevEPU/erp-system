const db = require('../src/config/db');

async function createEmployeesTable() {
  console.log('Creating or updating employees table...');
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nik VARCHAR(50) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      status_kerja VARCHAR(50) DEFAULT 'Aktif',
      status_kontrak VARCHAR(50) DEFAULT 'Kontrak',
      jabatan VARCHAR(100) DEFAULT '',
      department VARCHAR(100) DEFAULT '',
      section VARCHAR(100) DEFAULT '',
      bagian VARCHAR(100) DEFAULT '',
      no_ktp VARCHAR(50) DEFAULT '',
      tempat_lahir VARCHAR(100) DEFAULT '',
      tanggal_lahir DATE NULL,
      jenis_kelamin VARCHAR(10) DEFAULT '',
      nama_ibu VARCHAR(150) DEFAULT '',
      alamat TEXT,
      tanggal_bergabung DATE NULL,
      phone VARCHAR(50) DEFAULT '',
      no_rek_mandiri VARCHAR(50) DEFAULT '',
      npwp VARCHAR(50) DEFAULT '',
      email VARCHAR(150) DEFAULT '',
      no_kpj VARCHAR(50) DEFAULT '',
      no_jkn VARCHAR(50) DEFAULT '',
      lokasi_faskes VARCHAR(150) DEFAULT '',
      tanggal_resign DATE NULL,
      tipe_resign VARCHAR(100) DEFAULT '',
      status_resign VARCHAR(50) DEFAULT '',
      pendidikan VARCHAR(50) DEFAULT '',
      no_fingerprint VARCHAR(50) DEFAULT '',
      kontak_darurat_nama VARCHAR(150) DEFAULT '',
      kontak_darurat_hubungan VARCHAR(50) DEFAULT '',
      kontak_darurat_telp VARCHAR(50) DEFAULT '',
      notes TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nik (nik),
      INDEX idx_department (department),
      INDEX idx_status_kerja (status_kerja),
      INDEX idx_jabatan (jabatan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await db.query(createTableQuery);
  console.log('Table employees is ready!');
  process.exit(0);
}

createEmployeesTable().catch(err => {
  console.error('Error creating table:', err);
  process.exit(1);
});
