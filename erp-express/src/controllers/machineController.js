const db = require('../config/db');

// Utility for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

// ─── Machines CRUD ───────────────────────────────────────────────────────────
exports.getMachines = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM machines WHERE is_active = 1 ORDER BY CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED) ASC");
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMachine = async (req, res) => {
    const { code, name, type, line, capacity, status, leader_group, standard_mp, mold_ids, molds } = req.body;
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        if (!code || !name || !type) {
            return res.status(400).json({ success: false, message: 'Code, name, and type are required' });
        }
        const [result] = await conn.execute(
            'INSERT INTO machines (code, name, type, line, capacity, status, leader_group, standard_mp, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
            [
                code.toUpperCase().trim(),
                name.trim(),
                type.trim(),
                line || null,
                capacity || null,
                status || 'Idle',
                leader_group || null,
                standard_mp || 1
            ]
        );
        
        const newMachineId = result.insertId;
        
        if (molds && Array.isArray(molds) && molds.length > 0) {
            for (const item of molds) {
                await conn.execute(
                    'INSERT IGNORE INTO machine_mold_uph (machine_id, mold_id, product_id, uph, cavity, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
                    [newMachineId, item.mold_id, item.product_id || null, item.uph || 120, item.cavity || 4, item.is_primary !== undefined ? item.is_primary : 1]
                );
            }
        } else if (mold_ids && Array.isArray(mold_ids) && mold_ids.length > 0) {
            for (const moldId of mold_ids) {
                // Find a default product_id from mold_products
                const [pRows] = await conn.execute('SELECT product_id FROM mold_products WHERE mold_id = ? LIMIT 1', [moldId]);
                const defaultProdId = pRows.length > 0 ? pRows[0].product_id : null;
                await conn.execute(
                    'INSERT IGNORE INTO machine_mold_uph (machine_id, mold_id, product_id, uph, cavity, is_primary) VALUES (?, ?, ?, 120, 4, 1)',
                    [newMachineId, moldId, defaultProdId]
                );
            }
        }
        
        await conn.commit();
        return res.status(201).json({ success: true, message: 'Machine created successfully', id: newMachineId });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        conn.release();
    }
};

exports.updateMachine = async (req, res) => {
    const { id } = req.params;
    const { code, name, type, line, capacity, status, leader_group, standard_mp, is_active } = req.body;
    try {
        if (!code || !name || !type) {
            return res.status(400).json({ success: false, message: 'Code, name, and type are required' });
        }
        await db.execute(
            `UPDATE machines SET code = ?, name = ?, type = ?, line = ?, capacity = ?, status = ?, leader_group = ?, standard_mp = ?, is_active = ?, updated_at = NOW() 
             WHERE id = ?`,
            [
                code.toUpperCase().trim(),
                name.trim(),
                type.trim(),
                line || null,
                capacity || null,
                status || 'Idle',
                leader_group || null,
                standard_mp || 1,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                id
            ]
        );
        return res.json({ success: true, message: 'Machine updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMachine = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if machine is used in planning_produksi
        // We match by code since planning_produksi.machine_id stores the code string (e.g. 'MC-INJ-150T')
        const [mRow] = await db.execute('SELECT code FROM machines WHERE id = ?', [id]);
        if (mRow.length > 0) {
            const mCode = mRow[0].code;
            const [existing] = await db.execute('SELECT id FROM planning_produksi WHERE machine_id = ? LIMIT 1', [mCode]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Cannot delete machine assigned to a production plan.' });
            }
        }
        await db.execute('DELETE FROM machines WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Machine deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Machine-Mold UPH Matrix ──────────────────────────────────────────────────
exports.getMachineMoldUph = async (req, res) => {
    const { machineId } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT mmu.*, m.code as mold_code, m.name as mold_name,
                    p.product_code, p.product_name
             FROM machine_mold_uph mmu
             JOIN molds m ON mmu.mold_id = m.id
             LEFT JOIN products p ON mmu.product_id = p.id
             WHERE mmu.machine_id = ?
             ORDER BY mmu.is_primary DESC, m.name ASC`,
            [machineId]
        );
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Unified endpoint for creating or updating machine-mold UPH
exports.addOrUpdateMachineMoldUph = async (req, res) => {
    const { machineId } = req.params;
    const { mold_id, product_id, uph, cavity, is_primary } = req.body;
    try {
        if (!mold_id || !uph) {
            return res.status(400).json({ success: false, message: 'Mold ID and UPH are required' });
        }

        let finalProductId = product_id ? Number(product_id) : null;
        if (!finalProductId) {
            const [pRows] = await db.execute('SELECT product_id FROM mold_products WHERE mold_id = ? LIMIT 1', [mold_id]);
            if (pRows.length > 0) {
                finalProductId = pRows[0].product_id;
            }
        }
        
        // If this entry is set as primary, unmark other primary entries for this machine
        if (is_primary) {
            await db.execute('UPDATE machine_mold_uph SET is_primary = 0 WHERE machine_id = ?', [machineId]);
        }

        await db.execute(
            `INSERT INTO machine_mold_uph (machine_id, mold_id, product_id, uph, cavity, is_primary, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE uph = VALUES(uph), cavity = VALUES(cavity), is_primary = VALUES(is_primary), updated_at = NOW()`,
            [
                machineId,
                mold_id,
                finalProductId,
                uph,
                cavity || 1,
                is_primary ? 1 : 0
            ]
        );
        
        // Also sync capacity string to machine if primary
        if (is_primary) {
            await db.execute('UPDATE machines SET capacity = ? WHERE id = ?', [`${uph} Pcs/Jam`, machineId]);
        }

        return res.json({ success: true, message: 'UPH matrix configured successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMachineMoldUph = async (req, res) => {
    const { machineId, moldId } = req.params;
    const { product_id } = req.query;
    try {
        if (product_id) {
            await db.execute(
                'DELETE FROM machine_mold_uph WHERE machine_id = ? AND mold_id = ? AND product_id = ?',
                [machineId, moldId, product_id]
            );
        } else {
            await db.execute(
                'DELETE FROM machine_mold_uph WHERE machine_id = ? AND mold_id = ?',
                [machineId, moldId]
            );
        }
        return res.json({ success: true, message: 'Mold-UPH mapping removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper endpoint to query UPH directly by machine code and mold id
exports.getUphByMachineAndMold = async (req, res) => {
    const { machineCode, moldId } = req.query;
    try {
        if (!machineCode || !moldId) {
            return res.status(400).json({ success: false, message: 'machineCode and moldId query parameters are required' });
        }
        const [rows] = await db.execute(
            `SELECT mmu.* 
             FROM machine_mold_uph mmu
             JOIN machines mac ON mmu.machine_id = mac.id
             WHERE mac.code = ? AND mmu.mold_id = ?`,
            [machineCode, moldId]
        );
        if (rows.length > 0) {
            return res.json({ success: true, data: serialize(rows[0]) });
        } else {
            return res.json({ success: true, data: null });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Shift Capacity Logs ──────────────────────────────────────────────────────
exports.getCapacityLogs = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT spc.*, 
                    mac.code as machine_code, mac.name as machine_name,
                    mld.code as mold_code, mld.name as mold_name
             FROM shift_production_capacity spc
             JOIN machines mac ON spc.machine_id = mac.id
             JOIN molds mld ON spc.mold_id = mld.id
             ORDER BY spc.id DESC`
        );
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveCapacityLog = async (req, res) => {
    const {
        date,
        machine_id,
        mold_id,
        uph,
        shift_1_hours,
        shift_2_hours,
        shift_3_hours,
        shift_1_target,
        shift_2_target,
        shift_3_target,
        working_days,
        daily_target,
        monthly_target,
        notes
    } = req.body;

    try {
        if (!machine_id || !mold_id || !uph) {
            return res.status(400).json({ success: false, message: 'Machine ID, Mold ID, and UPH are required' });
        }

        await db.execute(
            `INSERT INTO shift_production_capacity 
                (date, machine_id, mold_id, uph, shift_1_hours, shift_2_hours, shift_3_hours, 
                 shift_1_target, shift_2_target, shift_3_target, working_days, daily_target, monthly_target, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                date || new Date().toISOString().substring(0, 10),
                machine_id,
                mold_id,
                uph,
                shift_1_hours || 0,
                shift_2_hours || 0,
                shift_3_hours || 0,
                shift_1_target || 0,
                shift_2_target || 0,
                shift_3_target || 0,
                working_days || 25,
                daily_target || 0,
                monthly_target || 0,
                notes || null
            ]
        );

        return res.status(201).json({ success: true, message: 'Simulasi kapasitas produksi berhasil disimpan!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductsLookup = async (req, res) => {
    const { productId } = req.query;
    try {
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId parameter is required' });
        }
        const [rows] = await db.execute(
            `SELECT DISTINCT mmu.id, mmu.machine_id, mmu.mold_id, mmu.product_id, mmu.uph, mmu.cavity, mmu.is_primary,
                    mac.code as machine_code, mac.name as machine_name,
                    mld.code as mold_code, mld.name as mold_name
             FROM machine_mold_uph mmu
             JOIN machines mac ON mmu.machine_id = mac.id
             JOIN molds mld ON mmu.mold_id = mld.id
             LEFT JOIN mold_products mp ON mp.mold_id = mld.id
             WHERE (mp.product_id = ? OR mmu.product_id = ?) AND mac.is_active = 1
             ORDER BY mmu.is_primary DESC, mmu.id ASC`,
            [productId, productId]
        );
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Machine Categories CRUD ──────────────────────────────────────────────────
const ensureCategoryTable = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS machine_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                icon_name VARCHAR(50) DEFAULT 'Cpu',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [rows] = await db.execute('SELECT COUNT(*) as count FROM machine_categories');
        if (rows[0].count === 0) {
            await db.execute(`
                INSERT INTO machine_categories (code, name, description) VALUES
                ('CAT-INJ', 'Injection', 'Mesin pencetak plastik presisi tinggi (Injection Molding)'),
                ('CAT-CNC', 'CNC', 'Mesin pemotong dan milling presisi tinggi (CNC Machine)'),
                ('CAT-ASM', 'Assembly', 'Line perakitan komponen dan finishing akhir (Assembly Line)')
            `);
        }
    } catch (err) {
        console.error('Error ensuring machine_categories table:', err);
    }
};

exports.getMachineCategories = async (req, res) => {
    try {
        await ensureCategoryTable();
        const [rows] = await db.execute(`
            SELECT mc.*, 
                   (SELECT COUNT(*) FROM machines m WHERE UPPER(m.type) = UPPER(mc.name) AND m.is_active = 1) as machine_count
            FROM machine_categories mc 
            WHERE mc.is_active = 1 
            ORDER BY mc.name ASC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMachineCategory = async (req, res) => {
    const { code, name, description, icon_name } = req.body;
    try {
        await ensureCategoryTable();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        const generatedCode = code ? code.toUpperCase().trim() : `CAT-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`;
        const [result] = await db.execute(
            'INSERT INTO machine_categories (code, name, description, icon_name, is_active) VALUES (?, ?, ?, ?, 1)',
            [generatedCode, name.trim(), description || null, icon_name || 'Cpu']
        );
        return res.status(201).json({ success: true, message: 'Machine category created successfully', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateMachineCategory = async (req, res) => {
    const { id } = req.params;
    const { code, name, description, icon_name, is_active } = req.body;
    try {
        await ensureCategoryTable();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        await db.execute(
            'UPDATE machine_categories SET code = ?, name = ?, description = ?, icon_name = ?, is_active = ? WHERE id = ?',
            [code ? code.toUpperCase().trim() : `CAT-${id}`, name.trim(), description || null, icon_name || 'Cpu', is_active !== undefined ? (is_active ? 1 : 0) : 1, id]
        );
        return res.json({ success: true, message: 'Machine category updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMachineCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureCategoryTable();
        await db.execute('DELETE FROM machine_categories WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Machine category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Production Lines CRUD ────────────────────────────────────────────────────
const ensureProductionLineTable = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS production_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [rows] = await db.execute('SELECT COUNT(*) as count FROM production_lines');
        if (rows[0].count === 0) {
            await db.execute(`
                INSERT INTO production_lines (code, name, description) VALUES
                ('LINE-INJ1', 'Line Injection 1', 'Lini Produksi Injection molding ke-1'),
                ('LINE-INJ2', 'Line Injection 2', 'Lini Produksi Injection molding ke-2'),
                ('LINE-WKM', 'Line Workshop Mold', 'Lini Workshop untuk Mold'),
                ('LINE-ASM1', 'Line Assembly 1', 'Lini Assembly ke-1')
            `);
        }
    } catch (err) {
        console.error('Error ensuring production_lines table:', err);
    }
};

exports.getProductionLines = async (req, res) => {
    try {
        await ensureProductionLineTable();
        const [rows] = await db.execute('SELECT * FROM production_lines WHERE is_active = 1 ORDER BY name ASC');
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProductionLine = async (req, res) => {
    const { code, name, description } = req.body;
    try {
        await ensureProductionLineTable();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        const generatedCode = code ? code.toUpperCase().trim() : `LINE-${name.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`;
        const [result] = await db.execute(
            'INSERT INTO production_lines (code, name, description, is_active) VALUES (?, ?, ?, 1)',
            [generatedCode, name.trim(), description || null]
        );
        return res.status(201).json({ success: true, message: 'Production line created successfully', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProductionLine = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureProductionLineTable();
        await db.execute('DELETE FROM production_lines WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Production line deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Leader Groups CRUD ─────────────────────────────────────────────────────
exports.getLeaderGroups = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM leader_groups WHERE is_active = 1 ORDER BY name ASC');
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createLeaderGroup = async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        const [result] = await db.execute(
            'INSERT INTO leader_groups (name, description) VALUES (?, ?)',
            [name.trim(), description || null]
        );
        return res.status(201).json({ success: true, message: 'Leader group created', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateLeaderGroup = async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }
        await db.execute(
            'UPDATE leader_groups SET name = ?, description = ?, is_active = ? WHERE id = ?',
            [name.trim(), description || null, is_active !== undefined ? (is_active ? 1 : 0) : 1, id]
        );
        return res.json({ success: true, message: 'Leader group updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteLeaderGroup = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM leader_groups WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Leader group deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Karyawan / Users List for MPP Operator Dropdown ─────────────────────────
exports.getKaryawanList = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT u.id, u.name, u.user_categories, d.name as department_name
             FROM users u
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE u.is_active = 1 OR u.is_active IS NULL
             ORDER BY u.name ASC`
        );
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

