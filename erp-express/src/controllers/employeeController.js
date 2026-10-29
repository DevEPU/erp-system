const db = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');

const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
));

function excelDateToSqlDate(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const trimmed = serial.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
  }
  if (typeof serial === 'number') {
    if (serial <= 0) return null;
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (isNaN(dateInfo.getTime())) return null;
    const year = dateInfo.getFullYear();
    const month = String(dateInfo.getMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

// GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const { search, department, status_kerja, status_kontrak, limit, offset } = req.query;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(nik LIKE ? OR full_name LIKE ? OR phone LIKE ? OR no_ktp LIKE ? OR bagian LIKE ? OR jabatan LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (department && department !== 'Semua') {
      whereClauses.push('department = ?');
      params.push(department);
    }

    if (status_kerja && status_kerja !== 'Semua') {
      whereClauses.push('status_kerja = ?');
      params.push(status_kerja);
    }

    if (status_kontrak && status_kontrak !== 'Semua') {
      whereClauses.push('status_kontrak = ?');
      params.push(status_kontrak);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) as total FROM employees ${whereSql}`;
    const [countResult] = await db.query(countSql, params);
    const totalCount = countResult[0].total;

    let dataSql = `SELECT * FROM employees ${whereSql} ORDER BY id ASC`;
    if (limit) {
      dataSql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit, 10), parseInt(offset || 0, 10));
    }

    const [rows] = await db.query(dataSql, params);

    return res.json({
      success: true,
      total: totalCount,
      data: serialize(rows)
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/employees/stats
exports.getEmployeeStats = async (req, res) => {
  try {
    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM employees');
    const [activeRows] = await db.query("SELECT COUNT(*) as active FROM employees WHERE status_kerja = 'Aktif'");
    const [nonActiveRows] = await db.query("SELECT COUNT(*) as non_active FROM employees WHERE status_kerja = 'Non Aktif'");

    const [deptRows] = await db.query(`
      SELECT department, COUNT(*) as count 
      FROM employees 
      WHERE department != '' 
      GROUP BY department 
      ORDER BY count DESC
    `);

    const [kontrakRows] = await db.query(`
      SELECT status_kontrak, COUNT(*) as count 
      FROM employees 
      WHERE status_kontrak != '' 
      GROUP BY status_kontrak 
      ORDER BY count DESC
    `);

    const [genderRows] = await db.query(`
      SELECT jenis_kelamin, COUNT(*) as count 
      FROM employees 
      WHERE jenis_kelamin != '' 
      GROUP BY jenis_kelamin
    `);

    return res.json({
      success: true,
      stats: {
        total: totalRows[0].total,
        active: activeRows[0].active,
        nonActive: nonActiveRows[0].non_active,
        byDepartment: serialize(deptRows),
        byStatusKontrak: serialize(kontrakRows),
        byGender: serialize(genderRows)
      }
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/employees/:id
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM employees WHERE id = ? OR nik = ?', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }
    return res.json({ success: true, data: serialize(rows[0]) });
  } catch (error) {
    console.error('Error fetching employee by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/employees
exports.createEmployee = async (req, res) => {
  try {
    const data = req.body;
    if (!data.nik || !data.full_name) {
      return res.status(400).json({ success: false, message: 'NIK dan Nama Lengkap wajib diisi.' });
    }

    // Check unique nik
    const [existing] = await db.query('SELECT id FROM employees WHERE nik = ?', [data.nik]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Karyawan dengan NIK ${data.nik} sudah terdaftar.` });
    }

    const newEmp = {
      nik: cleanString(data.nik),
      full_name: cleanString(data.full_name),
      status_kerja: cleanString(data.status_kerja) || 'Aktif',
      status_kontrak: cleanString(data.status_kontrak) || 'Kontrak',
      jabatan: cleanString(data.jabatan),
      department: cleanString(data.department),
      section: cleanString(data.section),
      bagian: cleanString(data.bagian),
      no_ktp: cleanString(data.no_ktp),
      tempat_lahir: cleanString(data.tempat_lahir),
      tanggal_lahir: data.tanggal_lahir || null,
      jenis_kelamin: cleanString(data.jenis_kelamin),
      nama_ibu: cleanString(data.nama_ibu),
      alamat: cleanString(data.alamat),
      tanggal_bergabung: data.tanggal_bergabung || null,
      phone: cleanString(data.phone),
      no_rek_mandiri: cleanString(data.no_rek_mandiri),
      npwp: cleanString(data.npwp),
      email: cleanString(data.email),
      no_kpj: cleanString(data.no_kpj),
      no_jkn: cleanString(data.no_jkn),
      lokasi_faskes: cleanString(data.lokasi_faskes),
      tanggal_resign: data.tanggal_resign || null,
      tipe_resign: cleanString(data.tipe_resign),
      status_resign: cleanString(data.status_resign),
      pendidikan: cleanString(data.pendidikan),
      no_fingerprint: cleanString(data.no_fingerprint),
      kontak_darurat_nama: cleanString(data.kontak_darurat_nama),
      kontak_darurat_hubungan: cleanString(data.kontak_darurat_hubungan),
      kontak_darurat_telp: cleanString(data.kontak_darurat_telp),
      notes: cleanString(data.notes),
      is_active: data.status_kerja === 'Non Aktif' ? 0 : 1
    };

    const [result] = await db.query('INSERT INTO employees SET ?', [newEmp]);
    return res.status(201).json({
      success: true,
      message: 'Karyawan berhasil ditambahkan',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [existing] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }

    const updateData = { ...data };
    delete updateData.id;
    delete updateData.created_at;

    if (updateData.status_kerja) {
      updateData.is_active = updateData.status_kerja === 'Non Aktif' ? 0 : 1;
    }

    await db.query('UPDATE employees SET ? WHERE id = ?', [updateData, id]);
    return res.json({ success: true, message: 'Data karyawan berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM employees WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Karyawan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/employees/sync-excel
exports.syncFromExcel = async (req, res) => {
  try {
    const filePath = 'c:/laragon/www/erp-epu-main/08. Master Data Karyawan PT EPU 2026 - Agustus.xlsx';
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets['MP EPU - AUG 26'];
    if (!sheet) {
      return res.status(400).json({ success: false, message: 'Sheet "MP EPU - AUG 26" tidak ditemukan di file Excel.' });
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const employees = [];
    for (let i = 7; i < rows.length; i++) {
      const r = rows[i];
      const no = cleanString(r[1]);
      const rawNik = cleanString(r[2]);
      const nama = cleanString(r[4]);

      if (!rawNik && !nama) continue;

      const nik = rawNik || (no ? `EPU-NO-${String(no).padStart(4, '0')}` : `EPU-ROW-${i + 1}`);
      const statusKerja = cleanString(r[3]) || 'Aktif';
      const isActive = statusKerja.toLowerCase().includes('non') ? 0 : 1;

      employees.push({
        nik: nik,
        full_name: nama,
        status_kerja: statusKerja,
        status_kontrak: cleanString(r[5]) || 'Kontrak',
        jabatan: cleanString(r[6]),
        department: cleanString(r[7]),
        section: cleanString(r[8]),
        bagian: cleanString(r[9]),
        no_ktp: cleanString(r[10]),
        tempat_lahir: cleanString(r[11]),
        tanggal_lahir: excelDateToSqlDate(r[12]),
        jenis_kelamin: cleanString(r[13]),
        nama_ibu: cleanString(r[14]),
        alamat: cleanString(r[15]),
        tanggal_bergabung: excelDateToSqlDate(r[16]),
        phone: cleanString(r[17]),
        no_rek_mandiri: cleanString(r[18]),
        npwp: cleanString(r[19]),
        email: cleanString(r[20]),
        no_kpj: cleanString(r[21]),
        no_jkn: cleanString(r[22]),
        lokasi_faskes: cleanString(r[23]),
        tanggal_resign: excelDateToSqlDate(r[24]),
        tipe_resign: cleanString(r[25]),
        status_resign: cleanString(r[26]),
        pendidikan: cleanString(r[27]),
        no_fingerprint: cleanString(r[28]),
        kontak_darurat_nama: cleanString(r[29]),
        kontak_darurat_hubungan: cleanString(r[30]),
        kontak_darurat_telp: cleanString(r[31]),
        notes: cleanString(r[34]),
        is_active: isActive
      });
    }

    await db.query('TRUNCATE TABLE employees');
    for (const emp of employees) {
      await db.query('INSERT INTO employees SET ?', [emp]);
    }

    return res.json({
      success: true,
      message: `Berhasil menyinkronkan ${employees.length} karyawan dari sheet "MP EPU - AUG 26"!`,
      total: employees.length
    });
  } catch (error) {
    console.error('Error syncing employees from excel:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
