const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

// GET /settings/company
router.get('/company', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings LIMIT 1');
        // Return empty object if no settings found instead of 404
        return res.json(serialize(rows.length > 0 ? rows[0] : {}));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /settings/company
router.put('/company', auth, async (req, res) => {
    console.log(`[SETTINGS] PUT /company hit by user: ${req.user?.id}`);
    try {
        const { company_name, company_email, company_phone, company_address, notification_email, footer_text } = req.body;
        const [rows] = await db.query('SELECT id FROM settings LIMIT 1');
        
        const data = {
            company_name: company_name || '',
            company_email: company_email || '',
            company_phone: company_phone || '',
            company_address: company_address || '',
            notification_email: notification_email || '',
            footer_text: footer_text || '',
            default_currency_id: 1,
            default_currency_position: 'prefix',
            updated_at: new Date()
        };

        if (rows.length === 0) {
            data.created_at = new Date();
            await db.query('INSERT INTO settings SET ?', [data]);
        } else {
            await db.query('UPDATE settings SET ? WHERE id = ?', [data, rows[0].id]);
        }
        return res.json({ message: 'Company settings updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const toBool = (val, defaultVal = false) => {
    if (val === undefined || val === null) return defaultVal;
    return val === 1 || val === true || val === '1' || val === 'true';
};

// GET /settings/general
router.get('/general', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings LIMIT 1');
        const setting = rows.length > 0 ? rows[0] : {};
        return res.json(serialize({
            ...setting,
            enable_forecast: toBool(setting.enable_forecast, false),
            enable_po_customer_v12: toBool(setting.enable_po_customer_v12, false),
            enable_vendor_delivery_crud: toBool(setting.enable_vendor_delivery_crud, false),
            enable_mrp_release_pr: toBool(setting.enable_mrp_release_pr, true),
            enable_receipt_by_schedule: toBool(setting.enable_receipt_by_schedule, false),
            show_mrp_safety_stock: toBool(setting.show_mrp_safety_stock, true),
            show_mrp_scrap_loss: toBool(setting.show_mrp_scrap_loss, true),
            enable_mrp_manual_fg: toBool(setting.enable_mrp_manual_fg, true)
        }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /settings/general
router.put('/general', auth, async (req, res) => {
    console.log(`[SETTINGS] PUT /general hit by user: ${req.user?.id}`);
    try {
        const { enable_forecast, enable_po_customer_v12, enable_vendor_delivery_crud, enable_mrp_release_pr, enable_receipt_by_schedule, show_mrp_safety_stock, show_mrp_scrap_loss, enable_mrp_manual_fg } = req.body;
        
        // Ensure columns exist in settings table
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_forecast TINYINT(1) DEFAULT 0');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_po_customer_v12 TINYINT(1) DEFAULT 0');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_vendor_delivery_crud TINYINT(1) DEFAULT 0');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_mrp_release_pr TINYINT(1) DEFAULT 1');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_receipt_by_schedule TINYINT(1) DEFAULT 0');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN show_mrp_safety_stock TINYINT(1) DEFAULT 1');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN show_mrp_scrap_loss TINYINT(1) DEFAULT 1');
        } catch (e) {}
        try {
            await db.query('ALTER TABLE settings ADD COLUMN enable_mrp_manual_fg TINYINT(1) DEFAULT 1');
        } catch (e) {}

        const [rows] = await db.query('SELECT id, enable_forecast, enable_po_customer_v12, enable_vendor_delivery_crud, enable_mrp_release_pr, enable_receipt_by_schedule, show_mrp_safety_stock, show_mrp_scrap_loss, enable_mrp_manual_fg FROM settings LIMIT 1');
        
        let isForecast = rows.length > 0 ? rows[0].enable_forecast : 0;
        let isPoV12 = rows.length > 0 ? rows[0].enable_po_customer_v12 : 0;
        let isVendorDeliveryCrud = rows.length > 0 ? rows[0].enable_vendor_delivery_crud : 0;
        let isMrpReleasePr = rows.length > 0 ? (rows[0].enable_mrp_release_pr !== undefined ? rows[0].enable_mrp_release_pr : 1) : 1;
        let isReceiptBySchedule = rows.length > 0 ? rows[0].enable_receipt_by_schedule : 0;
        let isShowSafetyStock = rows.length > 0 ? (rows[0].show_mrp_safety_stock !== undefined ? rows[0].show_mrp_safety_stock : 1) : 1;
        let isShowScrapLoss = rows.length > 0 ? (rows[0].show_mrp_scrap_loss !== undefined ? rows[0].show_mrp_scrap_loss : 1) : 1;
        let isMrpManualFg = rows.length > 0 ? (rows[0].enable_mrp_manual_fg !== undefined ? rows[0].enable_mrp_manual_fg : 1) : 1;

        if (enable_forecast !== undefined) isForecast = enable_forecast ? 1 : 0;
        if (enable_po_customer_v12 !== undefined) isPoV12 = enable_po_customer_v12 ? 1 : 0;
        if (enable_vendor_delivery_crud !== undefined) isVendorDeliveryCrud = enable_vendor_delivery_crud ? 1 : 0;
        if (enable_mrp_release_pr !== undefined) isMrpReleasePr = enable_mrp_release_pr ? 1 : 0;
        if (enable_receipt_by_schedule !== undefined) isReceiptBySchedule = enable_receipt_by_schedule ? 1 : 0;
        if (show_mrp_safety_stock !== undefined) isShowSafetyStock = show_mrp_safety_stock ? 1 : 0;
        if (show_mrp_scrap_loss !== undefined) isShowScrapLoss = show_mrp_scrap_loss ? 1 : 0;
        if (enable_mrp_manual_fg !== undefined) isMrpManualFg = enable_mrp_manual_fg ? 1 : 0;

        if (rows.length === 0) {
            await db.query(
                'INSERT INTO settings (enable_forecast, enable_po_customer_v12, enable_vendor_delivery_crud, enable_mrp_release_pr, enable_receipt_by_schedule, show_mrp_safety_stock, show_mrp_scrap_loss, enable_mrp_manual_fg, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [isForecast, isPoV12, isVendorDeliveryCrud, isMrpReleasePr, isReceiptBySchedule, isShowSafetyStock, isShowScrapLoss, isMrpManualFg]
            );
        } else {
            await db.query(
                'UPDATE settings SET enable_forecast = ?, enable_po_customer_v12 = ?, enable_vendor_delivery_crud = ?, enable_mrp_release_pr = ?, enable_receipt_by_schedule = ?, show_mrp_safety_stock = ?, show_mrp_scrap_loss = ?, enable_mrp_manual_fg = ?, updated_at = NOW() WHERE id = ?',
                [isForecast, isPoV12, isVendorDeliveryCrud, isMrpReleasePr, isReceiptBySchedule, isShowSafetyStock, isShowScrapLoss, isMrpManualFg, rows[0].id]
            );
        }

        return res.json(serialize({
            success: true,
            message: 'Konfigurasi Umum berhasil diperbarui.',
            enable_forecast: Boolean(isForecast),
            enable_po_customer_v12: Boolean(isPoV12),
            enable_vendor_delivery_crud: Boolean(isVendorDeliveryCrud),
            enable_mrp_release_pr: Boolean(isMrpReleasePr),
            enable_receipt_by_schedule: Boolean(isReceiptBySchedule),
            show_mrp_safety_stock: Boolean(isShowSafetyStock),
            show_mrp_scrap_loss: Boolean(isShowScrapLoss),
            enable_mrp_manual_fg: Boolean(isMrpManualFg)
        }));
    } catch (error) {
        console.error('[SETTINGS] PUT /general error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ─── Print Templates CRUD ─────────────────────────────────────────────────────

// Lazy-create print_templates table if not exists
async function ensurePrintTemplatesTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS print_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                module_key VARCHAR(100) NOT NULL UNIQUE,
                module_name VARCHAR(200) NOT NULL,
                template_config LONGTEXT,
                is_customized TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('[PRINT-TEMPLATES] ensurePrintTemplatesTable error:', e.message);
    }
}

// Seed default module list
const DEFAULT_MODULES = [
    { module_key: 'purchase_request',  module_name: 'Permintaan Pembelian',    group: 'Pembelian' },
    { module_key: 'purchase_order',    module_name: 'Purchase Order',           group: 'Pembelian' },
    { module_key: 'goods_receipt',     module_name: 'Penerimaan Barang',        group: 'Pembelian' },
    { module_key: 'purchase_invoice',  module_name: 'Faktur Pembelian',         group: 'Pembelian' },
    { module_key: 'purchase_payment',  module_name: 'Pelunasan Utang',          group: 'Pembelian' },
    { module_key: 'retur_pembelian',   module_name: 'Retur Pembelian',          group: 'Pembelian' },
    { module_key: 'sales_order',       module_name: 'Sales Order',              group: 'Penjualan' },
    { module_key: 'surat_jalan',       module_name: 'Surat Jalan',              group: 'Penjualan' },
    { module_key: 'sales_invoice',     module_name: 'Faktur Penjualan',         group: 'Penjualan' },
    { module_key: 'penerimaan_piutang',module_name: 'Penerimaan Piutang',       group: 'Penjualan' },
    { module_key: 'retur_penjualan',   module_name: 'Retur Penjualan',          group: 'Penjualan' },
    { module_key: 'work_order',        module_name: 'Work Order',               group: 'Manufacturing' },
    { module_key: 'bom',               module_name: 'Bill of Materials',        group: 'Manufacturing' },
    { module_key: 'mpp',               module_name: 'MPP Jadwal Mesin',         group: 'Manufacturing' },
    { module_key: 'penerimaan_fg',     module_name: 'Penerimaan Gudang Jadi',   group: 'Persediaan' },
    { module_key: 'stok_opname',       module_name: 'Stok Opname',              group: 'Persediaan' },
    { module_key: 'penyesuaian_stok',  module_name: 'Penyesuaian Stok',        group: 'Persediaan' },
];

const DEFAULT_CONFIG = {
    paper_size: 'A4',
    orientation: 'portrait',
    show_header: true,
    show_logo: true,
    show_company_name: true,
    show_company_address: true,
    show_company_phone: true,
    document_title: '',
    document_subtitle: '',
    show_footer: true,
    footer_text: '',
    custom_notes: '',
    show_signature: true,
    signature_columns: 2,
    signature_labels: ['Dibuat Oleh', 'Disetujui Oleh'],
    font_size: 'normal',
    show_borders: true,
    zebra_striping: true,
    columns_visible: [],
};

async function seedDefaultModules() {
    await ensurePrintTemplatesTable();
    for (const mod of DEFAULT_MODULES) {
        try {
            const [existing] = await db.query(
                'SELECT id FROM print_templates WHERE module_key = ?',
                [mod.module_key]
            );
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO print_templates (module_key, module_name, template_config, is_customized) VALUES (?, ?, ?, 0)',
                    [mod.module_key, mod.module_name, JSON.stringify({ ...DEFAULT_CONFIG, group: mod.group })]
                );
            }
        } catch (e) {}
    }
}

// GET /settings/print-templates — list all modules with their config
const printTemplatesRouter = express.Router();

printTemplatesRouter.get('/', auth, async (req, res) => {
    try {
        await seedDefaultModules();
        const [rows] = await db.query('SELECT * FROM print_templates ORDER BY id ASC');
        const result = rows.map(r => ({
            ...r,
            template_config: (() => {
                try { return JSON.parse(r.template_config); } catch { return DEFAULT_CONFIG; }
            })(),
            is_customized: Boolean(r.is_customized),
        }));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[PRINT-TEMPLATES] GET error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /settings/print-templates/:module_key — get single template config
printTemplatesRouter.get('/:module_key', auth, async (req, res) => {
    try {
        await seedDefaultModules();
        const { module_key } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM print_templates WHERE module_key = ?',
            [module_key]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Template tidak ditemukan.' });
        }
        const row = rows[0];
        let config;
        try { config = JSON.parse(row.template_config); } catch { config = DEFAULT_CONFIG; }
        res.json({ success: true, data: { ...row, template_config: config, is_customized: Boolean(row.is_customized) } });
    } catch (error) {
        console.error('[PRINT-TEMPLATES] GET single error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /settings/print-templates/:module_key — save/update template config
printTemplatesRouter.put('/:module_key', auth, async (req, res) => {
    try {
        await ensurePrintTemplatesTable();
        const { module_key } = req.params;
        const { template_config, module_name } = req.body;

        const configStr = JSON.stringify(template_config || {});
        const [existing] = await db.query(
            'SELECT id FROM print_templates WHERE module_key = ?',
            [module_key]
        );
        if (existing.length === 0) {
            await db.query(
                'INSERT INTO print_templates (module_key, module_name, template_config, is_customized) VALUES (?, ?, ?, 1)',
                [module_key, module_name || module_key, configStr]
            );
        } else {
            await db.query(
                'UPDATE print_templates SET template_config = ?, is_customized = 1, updated_at = NOW() WHERE module_key = ?',
                [configStr, module_key]
            );
        }
        res.json({ success: true, message: 'Template cetakan berhasil disimpan.' });
    } catch (error) {
        console.error('[PRINT-TEMPLATES] PUT error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /settings/print-templates/reset/:module_key — reset template to default
printTemplatesRouter.post('/reset/:module_key', auth, async (req, res) => {
    try {
        await ensurePrintTemplatesTable();
        const { module_key } = req.params;
        const mod = DEFAULT_MODULES.find(m => m.module_key === module_key);
        const defaultConfig = mod ? { ...DEFAULT_CONFIG, group: mod.group } : DEFAULT_CONFIG;
        await db.query(
            'UPDATE print_templates SET template_config = ?, is_customized = 0, updated_at = NOW() WHERE module_key = ?',
            [JSON.stringify(defaultConfig), module_key]
        );
        res.json({ success: true, message: 'Template berhasil direset ke default.' });
    } catch (error) {
        console.error('[PRINT-TEMPLATES] RESET error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.use('/print-templates', printTemplatesRouter);

module.exports = router;
