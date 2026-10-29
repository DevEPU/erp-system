const db = require('../src/config/db');

const newPermissions = [
  'access_supplier_groups',
  'access_jurnal_pembelian',
  'access_jurnal_ap',
  'access_jurnal_biaya_impor',
  'access_tutup_pending_po',
  'access_transaksi_ap',
  'access_tutup_pr',
  'access_purchase_orders',
  'access_penerimaan_barang',
  'access_retur_pb',
  'access_faktur_pembelian',
  'access_pembelian_langsung',
  'access_biaya_impor',
  'access_pelunasan_utang',
  'access_retur_pembelian',
  'access_pengajuan_pembayaran',
  'access_grup_customer',
  'access_tipe_customer',
  'access_jurnal_penjualan',
  'access_jurnal_ar',
  'access_salesman',
  'access_weekday',
  'access_rumus_komisi',
  'access_komisi_per_item',
  'access_scan_product',
  'access_tutup_pending_so',
  'access_transaksi_ar',
  'access_forecast',
  'access_customer_po',
  'access_order_sheet',
  'access_surat_jalan',
  'access_retur_surat_jalan',
  'access_penjualan_via_sj',
  'access_penjualan_via_so',
  'access_penjualan_langsung',
  'access_penerimaan_piutang',
  'access_retur_penjualan',
  'access_tanda_terima',
  'access_penagihan_piutang',
  'access_stok_gudang',
  'access_inventory',
  'access_gudang',
  'access_merek',
  'access_jurnal_persediaan',
  'access_duplikat_barang',
  'access_jurnal_produksi',
  'access_biaya',
  'access_boms',
  'access_stok_masuk',
  'access_stok_keluar',
  'access_penyesuaian_stok',
  'access_tutup_pending_sr',
  'access_stock_request',
  'access_transaksi_persediaan',
  'access_penyesuaian_hpp',
  'access_stok_opname',
  'access_adjust_harga_jual',
  'access_produksi_langsung',
  'access_penerimaan_fg',
  'access_daftar_kas_bank',
  'access_transaksi_kas',
  'access_transfer_kas',
  'access_rekonsiliasi_bank',
  'access_akun_gl',
  'access_gl_kategori',
  'access_cost_center',
  'access_budget_cc',
  'access_rumus_rasio_keuangan',
  'access_gl_template',
  'access_transaksi_gl',
  'access_manufacturing',
  'access_planning_produksi',
  'access_machines',
  'access_molds',
  'access_work_orders',
  'access_routings',
  'access_work_centers',
  'access_daftar_pph',
  'access_daftar_ppn',
  'access_syarat_bayar',
  'access_tipe_barang_jadi',
  'access_tipe_barang',
  'access_daftar_shift',
  'access_konfigurasi_umum',
  'access_laporan_penjualan',
  'access_laporan_stok',
  'access_laporan_keuangan',
  'access_profil_perusahaan'
];

async function run() {
    console.log("Running permissions migration script...");
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insert permissions if they don't exist
        for (const perm of newPermissions) {
            const [rows] = await connection.execute(
                'SELECT id FROM permissions WHERE name = ? LIMIT 1',
                [perm]
            );

            if (rows.length === 0) {
                await connection.execute(
                    "INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, 'web', NOW(), NOW())",
                    [perm]
                );
                console.log(`Inserted permission: ${perm}`);
            } else {
                console.log(`Permission already exists: ${perm}`);
            }
        }

        // 2. Fetch all permission IDs for our list
        const [allPermRows] = await connection.execute(
            `SELECT id, name FROM permissions WHERE name IN (${newPermissions.map(() => '?').join(',')})`,
            newPermissions
        );

        console.log(`\nMapping ${allPermRows.length} permissions to role 1 (Admin) and role 2 (Super Admin)...`);

        // 3. Map to Admin (role_id = 1) and Super Admin (role_id = 2)
        for (const perm of allPermRows) {
            const permId = perm.id;

            // Admin (role_id = 1)
            const [adminCheck] = await connection.execute(
                'SELECT * FROM role_has_permissions WHERE permission_id = ? AND role_id = 1',
                [permId]
            );
            if (adminCheck.length === 0) {
                await connection.execute(
                    'INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, 1)',
                    [permId]
                );
            }

            // Super Admin (role_id = 2)
            const [superAdminCheck] = await connection.execute(
                'SELECT * FROM role_has_permissions WHERE permission_id = ? AND role_id = 2',
                [permId]
            );
            if (superAdminCheck.length === 0) {
                await connection.execute(
                    'INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, 2)',
                    [permId]
                );
            }
        }

        await connection.commit();
        console.log("\n✅ Migration completed successfully!");

    } catch (err) {
        await connection.rollback();
        console.error("Migration failed with error:", err);
    } finally {
        connection.release();
        db.end();
    }
}

run();
