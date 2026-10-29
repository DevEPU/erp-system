const ExcelJS = require('exceljs');
const db = require('../config/db');

/**
 * Utility for serializing BigInt values
 */
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

/**
 * Generate an integrated Excel Workbook containing:
 * 1. 01_Master_Vendor
 * 2. 02_Master_Customer
 * 3. 03_Master_Product
 * 4. 03B_Product_Multi_Vendor
 * 5. 04_BOM (Struktur Tree Multi-Level: Part Induk & Seluruh Turunan-Turunannya)
 * 6. 05_Forecast
 * 7. 06_PO_Customer
 * 8. 07_MRP (Transaksi MRP/EPU/26/08/0002 | Planner: PPIC Planner)
 */
async function generateIntegratedExcelWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP EPU System';
    workbook.lastModifiedBy = 'ERP System Automation';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Query Suppliers
    const [vRows] = await db.execute(`
        SELECT s.id, s.supplier_code, s.supplier_name, s.contact_person, s.supplier_email, s.supplier_phone, s.region, s.is_active,
               pt.name as payment_term_name
        FROM suppliers s
        LEFT JOIN payment_terms pt ON s.payment_term_id = pt.id
        ORDER BY s.id ASC
    `);
    const vendors = serialize(vRows);

    // 2. Query Customers
    const [cRows] = await db.execute(`
        SELECT id, customer_name, customer_email, customer_phone, city, country, address
        FROM customers
        ORDER BY id ASC
    `);
    const customers = serialize(cRows).map((c, idx) => ({
        ...c,
        customer_code: `CUST-${String(c.id || idx + 1).padStart(3, '0')}`,
        status: 'Active'
    }));

    // 3. Query Multi-Vendor Counts per Product
    const [mvCounts] = await db.execute(`
        SELECT product_id, COUNT(supplier_id) as vendor_count
        FROM product_suppliers
        GROUP BY product_id
    `);
    const mvCountMap = {};
    serialize(mvCounts).forEach(m => {
        mvCountMap[m.product_id] = Number(m.vendor_count);
    });

    // 4. Query All Products
    const [pRows] = await db.execute(`
        SELECT p.id, p.product_code, p.part_number, p.product_name, p.product_type, p.product_quantity, p.min_qty, p.product_stock_alert, p.product_price, p.product_unit,
               cat.category_name, s.supplier_code, s.supplier_name
        FROM products p
        LEFT JOIN categories cat ON p.category_id = cat.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.id ASC
    `);
    const products = serialize(pRows).map(p => {
        const vCount = mvCountMap[p.id] || 0;
        let mvStatus = 'NO (Single Vendor)';
        if (vCount > 1) {
            mvStatus = `YES (${vCount} Vendors)`;
        } else if (vCount === 1) {
            mvStatus = 'YES (1 Vendor)';
        }
        return {
            ...p,
            product_code: p.product_code || `PRD-${p.id}`,
            part_number: p.part_number || 'N/A',
            product_name: p.product_name || 'Unnamed Product',
            category_name: p.category_name || 'General',
            product_unit: p.product_unit || 'PCS',
            product_type: p.product_type || (p.product_code?.startsWith('FG') ? 'FG' : 'RAW'),
            is_multi_vendor: mvStatus,
            product_quantity: Number(p.product_quantity || 0),
            min_qty: Number(p.min_qty || 0),
            product_stock_alert: Number(p.product_stock_alert || 0),
            lead_time: Number(p.lead_time_days || 5),
            product_price: Number(p.product_price || 0),
            supplier_code: p.supplier_code || 'N/A'
        };
    });

    // 5. Query Product Suppliers (Multi-Vendor Mappings)
    const [psRows] = await db.execute(`
        SELECT ps.product_id, ps.supplier_id, ps.supplier_part_number, ps.purchase_price, ps.sell_price, ps.allocation_percent, ps.is_primary, ps.min_qty, ps.max_qty, ps.product_name as part_name_vendor,
               p.product_code as internal_code, p.product_name as internal_name, p.product_unit, p.product_type,
               cat.category_name,
               s.supplier_code, s.supplier_name
        FROM product_suppliers ps
        JOIN products p ON ps.product_id = p.id
        LEFT JOIN categories cat ON p.category_id = cat.id
        JOIN suppliers s ON ps.supplier_id = s.id
        ORDER BY ps.product_id ASC, ps.is_primary DESC, ps.id ASC
    `);
    const multiVendorMappings = serialize(psRows).map(ps => ({
        part_no_vendor: ps.supplier_part_number || ps.internal_code,
        internal_name: ps.internal_name,
        category_name: ps.category_name || 'Component',
        product_unit: ps.product_unit || 'PCS',
        product_type: ps.product_type || 'Component',
        supplier_name: ps.supplier_name,
        vendor_status: ps.is_primary ? 'Mandatory' : 'Sub Vendor',
        quota_percent: Number(ps.allocation_percent || 0) / 100,
        purchase_price: Number(ps.purchase_price || 0),
        internal_code: ps.internal_code,
        supplier_code: ps.supplier_code || `SPL-${ps.supplier_id}`,
        moq: Number(ps.min_qty || 0),
        max_qty: Number(ps.max_qty || 0)
    }));

    // 6. Query All BOM Header & BOM Items (Hierarki Multi-Level Part & Turunannya)
    const [bomsRows] = await db.execute(`
        SELECT id, bom_code, bom_name, finished_good_code, finished_good_name, finished_good_unit, finished_good_qty
        FROM boms
        ORDER BY id ASC
    `);
    const bomsData = serialize(bomsRows);

    const [itemsRows] = await db.execute(`
        SELECT id, bom_id, parent_item_id, item_type, product_code, part_number, product_name, qty, unit, price, operation_seq
        FROM bom_items
        ORDER BY bom_id ASC, id ASC
    `);
    const itemsData = serialize(itemsRows);

    const expandedBOMTree = [];

    for (const bom of bomsData) {
        const bomItems = itemsData.filter(i => i.bom_id === bom.id);
        if (bomItems.length === 0) continue;

        // Level 0: Top FG
        expandedBOMTree.push({
            bom_code: bom.bom_code,
            bom_level: 'Level 0 (Top FG)',
            parent_code: '-',
            item_code: bom.finished_good_code,
            item_name: bom.finished_good_name,
            item_type: 'Finished Goods',
            qty_per_parent: Number(bom.finished_good_qty || 1),
            unit: bom.finished_good_unit || 'PCS',
            unit_cost: 0,
            ext_cost: 0,
            operation_seq: '-'
        });

        const itemMap = {};
        bomItems.forEach(i => { itemMap[i.id] = i; });

        const rootItems = bomItems.filter(i => !i.parent_item_id || !itemMap[i.parent_item_id]);

        function pushChildTree(item, level, parentCode) {
            const isParent = bomItems.some(child => child.parent_item_id === item.id);
            const displayType = isParent ? 'WIP / Sub-Assembly' : (item.item_type || 'RAW');
            const unitCost = Number(item.price || 0);
            const qty = Number(item.qty || 0);

            expandedBOMTree.push({
                bom_code: bom.bom_code,
                bom_level: `Level ${level}`,
                parent_code: parentCode,
                item_code: item.product_code,
                item_name: item.product_name,
                item_type: displayType,
                qty_per_parent: qty,
                unit: item.unit || 'PCS',
                unit_cost: unitCost,
                ext_cost: qty * unitCost,
                operation_seq: item.operation_seq || '-'
            });

            const children = bomItems.filter(child => child.parent_item_id === item.id);
            children.forEach(child => {
                pushChildTree(child, level + 1, item.product_code);
            });
        }

        rootItems.forEach(root => {
            pushChildTree(root, 1, bom.finished_good_code);
        });
    }

    // 7. Query Customer Forecasts
    const [fRows] = await db.execute(`
        SELECT f.id, f.reference, f.month, f.year, f.customer_id, c.customer_name,
               fd.product_code, fd.product_name, fd.forecast_qty, fd.price
        FROM customer_forecasts f
        LEFT JOIN customer_forecast_details fd ON f.id = fd.forecast_id
        LEFT JOIN customers c ON f.customer_id = c.id
        ORDER BY f.id ASC
    `);
    const forecasts = serialize(fRows).map((f) => ({
        reference: f.reference || `FCT/REF/${f.id}`,
        period: f.year && f.month ? `${f.year}-${String(f.month).padStart(2, '0')}` : '2026-08',
        customer_code: `CUST-${String(f.customer_id || 1).padStart(3, '0')}`,
        product_code: f.product_code || 'EPBL-FBXLUGK1Z',
        forecast_qty: Number(f.forecast_qty || 0),
        price: Number(f.price || 0)
    }));

    // 8. Query Customer POs
    const [poRows] = await db.execute(`
        SELECT po.id, po.reference, po.tanggal_po, po.customer_id, c.customer_name,
               pod.forecast_detail_id, pod.product_code, pod.product_name, pod.po_qty, pod.price, pod.discount_percent, pod.discount_amount
        FROM customer_po po
        LEFT JOIN customer_po_details pod ON po.id = pod.po_id
        LEFT JOIN customers c ON po.customer_id = c.id
        ORDER BY po.id ASC
    `);
    const customerPOs = serialize(poRows).map(po => ({
        reference: po.reference,
        po_date: po.tanggal_po ? new Date(po.tanggal_po).toISOString().split('T')[0] : '2026-08-10',
        customer_code: `CUST-${String(po.customer_id || 1).padStart(3, '0')}`,
        forecast_ref: po.forecast_detail_id ? `FCT-${po.forecast_detail_id}` : 'FCT/26/08/0001',
        product_code: po.product_code || 'EPBL-FBXLUGK1Z',
        po_qty: Number(po.po_qty || 0),
        price: Number(po.price || 0),
        discount_percent: Number(po.discount_percent || 0) / 100,
        tax_percent: 0.11
    }));

    // 9. Query MRP Details for Transaction MRP/EPU/26/08/0002
    const [mrpRows] = await db.execute(`
        SELECT mrp.reference_code, mrp.planner_name, mrp.planning_source, cp.reference as po_ref,
               md.product_id, p.product_code as rm_code, p.product_name as rm_name, p.product_unit,
               md.part_no_vendor, md.part_name_vendor, s.supplier_code, s.supplier_name, md.allocation_percent,
               md.gross_qty, md.current_stock, md.safety_stock_qty, md.net_qty, md.unit_price, md.amount
        FROM mrps mrp
        JOIN mrp_details md ON mrp.id = md.mrp_id
        JOIN products p ON md.product_id = p.id
        LEFT JOIN suppliers s ON md.supplier_id = s.id
        LEFT JOIN customer_po cp ON mrp.po_customer_id = cp.id
        WHERE mrp.reference_code = 'MRP/EPU/26/08/0002'
        ORDER BY md.id ASC
    `);
    const mrpDetails = serialize(mrpRows).map(m => ({
        reference_code: m.reference_code,
        planner_name: m.planner_name || 'PPIC Planner',
        rm_code: m.rm_code,
        part_no_vendor: m.part_no_vendor || m.rm_code,
        vnd_code: m.supplier_code || 'N/A',
        vnd_name: m.supplier_name || 'N/A',
        quota_percent: Number(m.allocation_percent || 100) / 100,
        buy_price: Number(m.unit_price || 0),
        gross_qty: Number(m.gross_qty || 0),
        current_stock: Number(m.current_stock || 0),
        safety_stock: Number(m.safety_stock_qty || 0),
        net_qty: Number(m.net_qty || 0),
        amount: Number(m.amount || 0)
    }));

    // Styling definitions
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
    const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    const sectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
    const highlightFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
    const fgLevelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6D9F1' } };
    const level1Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
    const mandatoryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
    const subVendorFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } };

    const borderThin = {
        top: { style: 'thin', color: { argb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
        left: { style: 'thin', color: { argb: 'D9D9D9' } },
        right: { style: 'thin', color: { argb: 'D9D9D9' } }
    };
    const currencyFormat = '"Rp"#,##0;("Rp"#,##0);"-"';
    const numberFormat = '#,##0.0000';
    const integerFormat = '#,##0';
    const percentFormat = '0.0%';

    function addTitleBlock(sheet, title, subtitle) {
        sheet.mergeCells('A1:P1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = title.toUpperCase();
        titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '1F4E78' } };

        sheet.mergeCells('A2:P2');
        const subCell = sheet.getCell('A2');
        subCell.value = subtitle;
        subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '595959' } };
        sheet.addRow([]);
    }

    // ==========================================
    // SHEET 1: 01_Master_Vendor
    // ==========================================
    const wsVendor = workbook.addWorksheet('01_Master_Vendor');
    addTitleBlock(wsVendor, 'Master Data Vendor (Suppliers)', `Daftar Lengkap ${vendors.length} Pemasok Resmi Perusahaan dari Database System`);

    wsVendor.columns = [
        { header: 'Vendor Code', key: 'supplier_code', width: 16 },
        { header: 'Vendor Name', key: 'supplier_name', width: 36 },
        { header: 'Contact Person', key: 'contact_person', width: 22 },
        { header: 'Email', key: 'supplier_email', width: 28 },
        { header: 'Phone', key: 'supplier_phone', width: 18 },
        { header: 'Region', key: 'region', width: 18 },
        { header: 'Payment Term', key: 'payment_term_name', width: 18 },
        { header: 'Status', key: 'status', width: 12 }
    ];

    const vHeaderRow = wsVendor.getRow(4);
    wsVendor.columns.forEach((col, idx) => {
        const cell = vHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    vHeaderRow.height = 24;

    vendors.forEach((v) => {
        const row = wsVendor.addRow({
            supplier_code: v.supplier_code || `SPL-${v.id}`,
            supplier_name: v.supplier_name || 'N/A',
            contact_person: v.contact_person || 'N/A',
            supplier_email: v.supplier_email || 'N/A',
            supplier_phone: v.supplier_phone || 'N/A',
            region: v.region || 'Domestic',
            payment_term_name: v.payment_term_name || '30 Days',
            status: v.is_active !== false ? 'Active' : 'Inactive'
        });
        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 2: 02_Master_Customer
    // ==========================================
    const wsCustomer = workbook.addWorksheet('02_Master_Customer');
    addTitleBlock(wsCustomer, 'Master Data Customer', `Daftar Lengkap ${customers.length} Pelanggan Perusahaan dari Database System`);

    wsCustomer.columns = [
        { header: 'Customer Code', key: 'customer_code', width: 18 },
        { header: 'Customer Name', key: 'customer_name', width: 32 },
        { header: 'Email', key: 'customer_email', width: 28 },
        { header: 'Phone', key: 'customer_phone', width: 18 },
        { header: 'City', key: 'city', width: 18 },
        { header: 'Country', key: 'country', width: 16 },
        { header: 'Address', key: 'address', width: 35 },
        { header: 'Status', key: 'status', width: 12 }
    ];

    const cHeaderRow = wsCustomer.getRow(4);
    wsCustomer.columns.forEach((col, idx) => {
        const cell = cHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    cHeaderRow.height = 24;

    customers.forEach((c) => {
        const row = wsCustomer.addRow(c);
        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 3: 03_Master_Product
    // ==========================================
    const wsProduct = workbook.addWorksheet('03_Master_Product');
    addTitleBlock(wsProduct, 'Master Data Produk & Bahan Baku', `Katalog Lengkap Seluruh ${products.length} Produk dari Database System`);

    wsProduct.columns = [
        { header: 'Internal Product Code', key: 'product_code', width: 22 },
        { header: 'Part Number', key: 'part_number', width: 22 },
        { header: 'Product Name', key: 'product_name', width: 38 },
        { header: 'Category', key: 'category_name', width: 22 },
        { header: 'Unit (UOM)', key: 'product_unit', width: 12 },
        { header: 'Type (FG/RAW/COMP)', key: 'product_type', width: 18 },
        { header: 'Multi-Vendor Status', key: 'is_multi_vendor', width: 22 },
        { header: 'Current Stock', key: 'product_quantity', width: 14 },
        { header: 'Min Stock', key: 'min_qty', width: 12 },
        { header: 'Safety Stock', key: 'product_stock_alert', width: 12 },
        { header: 'Lead Time (Days)', key: 'lead_time', width: 16 },
        { header: 'Standard Price', key: 'product_price', width: 18 },
        { header: 'Primary Vendor Code', key: 'supplier_code', width: 20 },
        { header: 'Primary Vendor Name', key: 'supplier_name_formula', width: 32 }
    ];

    const pHeaderRow = wsProduct.getRow(4);
    wsProduct.columns.forEach((col, idx) => {
        const cell = pHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    pHeaderRow.height = 24;

    products.forEach((p, idx) => {
        const rowNum = idx + 5;
        const row = wsProduct.addRow({
            product_code: p.product_code,
            part_number: p.part_number,
            product_name: p.product_name,
            category_name: p.category_name,
            product_unit: p.product_unit,
            product_type: p.product_type,
            is_multi_vendor: p.is_multi_vendor,
            product_quantity: p.product_quantity,
            min_qty: p.min_qty,
            product_stock_alert: p.product_stock_alert,
            lead_time: p.lead_time,
            product_price: p.product_price,
            supplier_code: p.supplier_code,
            supplier_name_formula: { formula: `IFERROR(VLOOKUP(M${rowNum}, '01_Master_Vendor'!A:B, 2, FALSE), "N/A")` }
        });

        row.getCell('product_quantity').numberFormat = numberFormat;
        row.getCell('min_qty').numberFormat = numberFormat;
        row.getCell('product_stock_alert').numberFormat = numberFormat;
        row.getCell('lead_time').numberFormat = integerFormat;
        row.getCell('product_price').numberFormat = currencyFormat;

        if (p.is_multi_vendor.startsWith('YES')) {
            row.getCell('is_multi_vendor').fill = highlightFill;
            row.getCell('is_multi_vendor').font = { bold: true, color: { argb: 'C00000' } };
        }

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 3B: 03B_Product_Multi_Vendor
    // ==========================================
    const wsMultiVendor = workbook.addWorksheet('03B_Product_Multi_Vendor');
    addTitleBlock(wsMultiVendor, 'Pemetaan Produk Multi-Vendor (Category, Unit UOM, Type, Status Mandatory/Sub Vendor)', 'Daftar Lengkap Part No Vendor, Nama Item, Category, Unit (UOM), Type (FG/RAW/COMP), Vendor Name, Status Vendor, Quota %, Harga Beli');

    wsMultiVendor.columns = [
        { header: 'Part No Vendor', key: 'part_no_vendor', width: 24 },
        { header: 'Nama Item (Part Name)', key: 'internal_name', width: 38 },
        { header: 'Category', key: 'category_name', width: 22 },
        { header: 'Unit (UOM)', key: 'product_unit', width: 12 },
        { header: 'Type (FG/RAW/COMP)', key: 'product_type', width: 18 },
        { header: 'Nama Vendor / Supplier', key: 'supplier_name', width: 34 },
        { header: 'Status Vendor', key: 'vendor_status', width: 18 },
        { header: 'Quota (%)', key: 'quota_percent', width: 14 },
        { header: 'Harga Beli (Buy Price)', key: 'purchase_price', width: 20 },
        { header: 'Internal Product Code', key: 'internal_code', width: 22 },
        { header: 'Vendor Code', key: 'supplier_code', width: 16 },
        { header: 'MOQ (Min Qty)', key: 'moq', width: 14 },
        { header: 'Max Qty', key: 'max_qty', width: 14 }
    ];

    const mvHeaderRow = wsMultiVendor.getRow(4);
    wsMultiVendor.columns.forEach((col, idx) => {
        const cell = mvHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    mvHeaderRow.height = 24;

    multiVendorMappings.forEach((mv) => {
        const row = wsMultiVendor.addRow(mv);

        row.getCell('part_no_vendor').font = { bold: true, color: { argb: '1F4E78' } };
        row.getCell('internal_name').font = { bold: true };
        row.getCell('category_name').alignment = { horizontal: 'center' };
        row.getCell('product_unit').alignment = { horizontal: 'center' };
        row.getCell('product_type').alignment = { horizontal: 'center' };
        row.getCell('purchase_price').numberFormat = currencyFormat;
        row.getCell('quota_percent').numberFormat = percentFormat;
        row.getCell('moq').numberFormat = integerFormat;
        row.getCell('max_qty').numberFormat = integerFormat;

        const statusCell = row.getCell('vendor_status');
        if (mv.vendor_status === 'Mandatory') {
            statusCell.fill = mandatoryFill;
            statusCell.font = { bold: true, color: { argb: '276A3C' } };
        } else {
            statusCell.fill = subVendorFill;
            statusCell.font = { bold: true, color: { argb: 'A61C1C' } };
        }

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 4: 04_BOM
    // ==========================================
    const wsBOM = workbook.addWorksheet('04_BOM');
    addTitleBlock(wsBOM, 'Bill of Materials (BOM Tree Multi-Level)', `Hierarki Multi-Level BOM Sistem (${expandedBOMTree.length} Baris Tree: FG, Sub-Assembly, & Turunan Bahan Baku)`);

    wsBOM.columns = [
        { header: 'BOM Code', key: 'bom_code', width: 22 },
        { header: 'BOM Level (Induk/Turunan)', key: 'bom_level', width: 24 },
        { header: 'Parent Part Code (Induk)', key: 'parent_code', width: 24 },
        { header: 'Part Code (Item Code)', key: 'item_code', width: 24 },
        { header: 'Part Name (Item Name)', key: 'item_name', width: 40 },
        { header: 'Item Type', key: 'item_type', width: 20 },
        { header: 'Qty Per Parent', key: 'qty_per_parent', width: 16 },
        { header: 'Unit (UOM)', key: 'unit', width: 12 },
        { header: 'Unit Cost', key: 'unit_cost', width: 18 },
        { header: 'Extended Cost', key: 'ext_cost', width: 20 },
        { header: 'Operation / Process Seq', key: 'operation_seq', width: 22 }
    ];

    const bHeaderRow = wsBOM.getRow(4);
    wsBOM.columns.forEach((col, idx) => {
        const cell = bHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    bHeaderRow.height = 24;

    expandedBOMTree.forEach((t) => {
        const row = wsBOM.addRow({
            bom_code: t.bom_code,
            bom_level: t.bom_level,
            parent_code: t.parent_code,
            item_code: t.item_code,
            item_name: t.item_name,
            item_type: t.item_type,
            qty_per_parent: t.qty_per_parent,
            unit: t.unit,
            unit_cost: t.unit_cost,
            ext_cost: t.ext_cost,
            operation_seq: t.operation_seq
        });

        row.getCell('bom_level').alignment = { horizontal: 'center' };
        row.getCell('qty_per_parent').numberFormat = numberFormat;
        row.getCell('unit_cost').numberFormat = currencyFormat;
        row.getCell('ext_cost').numberFormat = currencyFormat;
        row.getCell('operation_seq').alignment = { horizontal: 'center' };

        if (t.bom_level.startsWith('Level 0')) {
            row.eachCell((cell) => {
                cell.fill = fgLevelFill;
                cell.font = { bold: true, name: 'Calibri', size: 11, color: { argb: '1F4E78' } };
            });
        } else if (t.bom_level === 'Level 1') {
            row.getCell('bom_level').fill = level1Fill;
            row.getCell('item_code').font = { bold: true };
        } else {
            row.getCell('bom_level').font = { italic: true };
            row.getCell('item_code').font = { color: { argb: '595959' } };
        }

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 5: 05_Forecast
    // ==========================================
    const wsForecast = workbook.addWorksheet('05_Forecast');
    addTitleBlock(wsForecast, 'Customer Sales Forecast', 'Daftar Ramalan Penjualan Customer');

    wsForecast.columns = [
        { header: 'Forecast Ref', key: 'reference', width: 20 },
        { header: 'Period (YYYY-MM)', key: 'period', width: 18 },
        { header: 'Customer Code', key: 'customer_code', width: 18 },
        { header: 'Customer Name', key: 'cust_name_formula', width: 30 },
        { header: 'FG Product Code', key: 'product_code', width: 20 },
        { header: 'FG Product Name', key: 'prod_name_formula', width: 30 },
        { header: 'Forecast Qty', key: 'forecast_qty', width: 14 },
        { header: 'Unit Price', key: 'price_formula', width: 18 },
        { header: 'Total Forecast Amount', key: 'total_formula', width: 22 }
    ];

    const fHeaderRow = wsForecast.getRow(4);
    wsForecast.columns.forEach((col, idx) => {
        const cell = fHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    fHeaderRow.height = 24;

    forecasts.forEach((f, idx) => {
        const rowNum = idx + 5;
        const row = wsForecast.addRow({
            reference: f.reference,
            period: f.period,
            customer_code: f.customer_code,
            cust_name_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '02_Master_Customer'!A:B, 2, FALSE), "")` },
            product_code: f.product_code,
            prod_name_formula: { formula: `IFERROR(VLOOKUP(E${rowNum}, '03_Master_Product'!A:C, 3, FALSE), "")` },
            forecast_qty: Number(f.forecast_qty),
            price_formula: { formula: `IFERROR(VLOOKUP(E${rowNum}, '03_Master_Product'!A:L, 12, FALSE), ${f.price || 0})` },
            total_formula: { formula: `G${rowNum}*H${rowNum}` }
        });

        row.getCell('forecast_qty').numberFormat = integerFormat;
        row.getCell('price_formula').numberFormat = currencyFormat;
        row.getCell('total_formula').numberFormat = currencyFormat;

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 6: 06_PO_Customer
    // ==========================================
    const wsPO = workbook.addWorksheet('06_PO_Customer');
    addTitleBlock(wsPO, 'PO Customer (Sales Orders)', 'Daftar Pesanan Resmi PO Customer');

    wsPO.columns = [
        { header: 'PO Ref', key: 'reference', width: 22 },
        { header: 'PO Date', key: 'po_date', width: 14 },
        { header: 'Customer Code', key: 'customer_code', width: 16 },
        { header: 'Customer Name', key: 'cust_name_formula', width: 28 },
        { header: 'Forecast Ref', key: 'forecast_ref', width: 20 },
        { header: 'FG Product Code', key: 'product_code', width: 20 },
        { header: 'FG Product Name', key: 'prod_name_formula', width: 28 },
        { header: 'PO Qty', key: 'po_qty', width: 12 },
        { header: 'Unit Price', key: 'price_formula', width: 18 },
        { header: 'Subtotal', key: 'subtotal_formula', width: 20 },
        { header: 'Discount %', key: 'discount_percent', width: 14 },
        { header: 'Discount Amount', key: 'disc_amt_formula', width: 18 },
        { header: 'Tax % (PPN)', key: 'tax_percent', width: 14 },
        { header: 'Tax Amount', key: 'tax_amt_formula', width: 18 },
        { header: 'Grand Total', key: 'grand_total_formula', width: 22 }
    ];

    const poHeaderRow = wsPO.getRow(4);
    wsPO.columns.forEach((col, idx) => {
        const cell = poHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    poHeaderRow.height = 24;

    customerPOs.forEach((po, idx) => {
        const rowNum = idx + 5;
        const row = wsPO.addRow({
            reference: po.reference,
            po_date: po.po_date,
            customer_code: po.customer_code,
            cust_name_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '02_Master_Customer'!A:B, 2, FALSE), "")` },
            forecast_ref: po.forecast_ref,
            product_code: po.product_code,
            prod_name_formula: { formula: `IFERROR(VLOOKUP(F${rowNum}, '03_Master_Product'!A:C, 3, FALSE), "")` },
            po_qty: Number(po.po_qty),
            price_formula: { formula: `IFERROR(VLOOKUP(F${rowNum}, '03_Master_Product'!A:L, 12, FALSE), ${po.price || 0})` },
            subtotal_formula: { formula: `H${rowNum}*I${rowNum}` },
            discount_percent: Number(po.discount_percent),
            disc_amt_formula: { formula: `J${rowNum}*K${rowNum}` },
            tax_percent: Number(po.tax_percent),
            tax_amt_formula: { formula: `(J${rowNum}-L${rowNum})*M${rowNum}` },
            grand_total_formula: { formula: `J${rowNum}-L${rowNum}+N${rowNum}` }
        });

        row.getCell('po_qty').numberFormat = integerFormat;
        row.getCell('price_formula').numberFormat = currencyFormat;
        row.getCell('subtotal_formula').numberFormat = currencyFormat;
        row.getCell('discount_percent').numberFormat = percentFormat;
        row.getCell('disc_amt_formula').numberFormat = currencyFormat;
        row.getCell('tax_percent').numberFormat = percentFormat;
        row.getCell('tax_amt_formula').numberFormat = currencyFormat;
        row.getCell('grand_total_formula').numberFormat = currencyFormat;

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // ==========================================
    // SHEET 7: 07_MRP (Transaksi MRP/EPU/26/08/0002 | Planner: PPIC Planner)
    // ==========================================
    const wsMRP = workbook.addWorksheet('07_MRP');
    addTitleBlock(wsMRP, 'MRP & Alokasi Pembelian Multi-Vendor (Ref: MRP/EPU/26/08/0002)', 'Transaksi MRP Nomor MRP/EPU/26/08/0002 | Planner: PPIC Planner');

    wsMRP.columns = [
        { header: 'No Transaksi MRP', key: 'mrp_ref', width: 22 },
        { header: 'Planner Name', key: 'planner_name', width: 18 },
        { header: 'Internal Product Code', key: 'rm_code', width: 22 },
        { header: 'Internal Product Name', key: 'rm_name_formula', width: 34 },
        { header: 'Part No Vendor', key: 'part_no_vendor', width: 24 },
        { header: 'Vendor Code', key: 'vnd_code', width: 16 },
        { header: 'Vendor Name', key: 'vnd_name_formula', width: 32 },
        { header: 'Quota %', key: 'quota_percent', width: 12 },
        { header: 'Unit (UOM)', key: 'unit_formula', width: 12 },
        { header: 'Current Stock', key: 'stock_formula', width: 14 },
        { header: 'Safety Stock', key: 'safety_formula', width: 14 },
        { header: 'Total Gross Req', key: 'gross_req_formula', width: 18 },
        { header: 'Total Net Req', key: 'net_req_formula', width: 16 },
        { header: 'Allocated Order Qty', key: 'plan_qty_formula', width: 20 },
        { header: 'Harga Beli Vendor', key: 'unit_cost_formula', width: 20 },
        { header: 'Total Biaya Alokasi', key: 'total_cost_formula', width: 22 }
    ];

    const mrpHeaderRow = wsMRP.getRow(4);
    wsMRP.columns.forEach((col, idx) => {
        const cell = mrpHeaderRow.getCell(idx + 1);
        cell.value = col.header;
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    mrpHeaderRow.height = 24;

    const maxBOMRow = expandedBOMTree.length + 4;
    const maxPORow = customerPOs.length + 4;

    mrpDetails.forEach((item, idx) => {
        const rowNum = idx + 5;
        const row = wsMRP.addRow({
            mrp_ref: item.reference_code,
            planner_name: item.planner_name,
            rm_code: item.rm_code,
            rm_name_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '03_Master_Product'!A:C, 3, FALSE), "")` },
            part_no_vendor: item.part_no_vendor,
            vnd_code: item.vnd_code,
            vnd_name_formula: { formula: `IFERROR(VLOOKUP(F${rowNum}, '01_Master_Vendor'!A:B, 2, FALSE), "${item.vnd_name || ''}")` },
            quota_percent: item.quota_percent,
            unit_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '03_Master_Product'!A:E, 5, FALSE), "")` },
            stock_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '03_Master_Product'!A:H, 8, FALSE), ${item.current_stock})` },
            safety_formula: { formula: `IFERROR(VLOOKUP(C${rowNum}, '03_Master_Product'!A:J, 10, FALSE), ${item.safety_stock})` },
            gross_req_formula: item.gross_qty > 0 ? item.gross_qty : { formula: `SUMPRODUCT(('04_BOM'!D$5:D$${maxBOMRow}=C${rowNum})*'04_BOM'!G$5:G$${maxBOMRow}, SUMIFS('06_PO_Customer'!H$5:H$${maxPORow}, '06_PO_Customer'!F$5:F$${maxPORow}, '04_BOM'!C$5:C$${maxBOMRow}))` },
            net_req_formula: { formula: `MAX(0, L${rowNum}+K${rowNum}-J${rowNum})` },
            plan_qty_formula: { formula: `M${rowNum}*H${rowNum}` },
            unit_cost_formula: item.buy_price,
            total_cost_formula: { formula: `N${rowNum}*O${rowNum}` }
        });

        row.getCell('mrp_ref').font = { bold: true };
        row.getCell('planner_name').font = { bold: true, color: { argb: '1F4E78' } };
        row.getCell('part_no_vendor').font = { bold: true, color: { argb: '1F4E78' } };
        row.getCell('quota_percent').numberFormat = percentFormat;
        row.getCell('stock_formula').numberFormat = numberFormat;
        row.getCell('safety_formula').numberFormat = numberFormat;
        row.getCell('gross_req_formula').numberFormat = numberFormat;
        row.getCell('net_req_formula').numberFormat = numberFormat;
        row.getCell('plan_qty_formula').numberFormat = numberFormat;
        row.getCell('unit_cost_formula').numberFormat = currencyFormat;
        row.getCell('total_cost_formula').numberFormat = currencyFormat;

        row.eachCell((cell) => { cell.border = borderThin; });
    });

    // Summary Row for MRP Total Purchase Cost across all vendors
    const totalRowIndex = mrpDetails.length + 5;
    const summaryRow = wsMRP.addRow({
        mrp_ref: 'TOTAL',
        planner_name: 'ESTIMASI TOTAL BIAYA PEMBELIAN MATERIAL (TRANSAKSI MRP/EPU/26/08/0002)',
        total_cost_formula: { formula: `SUM(P5:P${totalRowIndex - 1})` }
    });

    summaryRow.getCell('mrp_ref').font = { bold: true };
    summaryRow.getCell('planner_name').font = { bold: true };
    summaryRow.getCell('total_cost_formula').font = { bold: true };
    summaryRow.getCell('total_cost_formula').numberFormat = currencyFormat;

    for (let c = 1; c <= 16; c++) {
        const cell = summaryRow.getCell(c);
        cell.fill = sectionFill;
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    }

    return workbook;
}

module.exports = {
    generateIntegratedExcelWorkbook
};
