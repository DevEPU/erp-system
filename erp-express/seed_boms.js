const db = require('./src/config/db');

const initialBOMs = [
    { code: "BOM-21/ASKI/035", name: "BACK MRR GN LOOK RL YM FD-BMGL-M10BYR AM", description: "BOM produksi untuk BACK MRR GN LOOK RL YM" },
    { code: "BOM-21/ASKI/034", name: "BACK MRR GN LOOK RL HD FD-BMGL-M10BHR AM", description: "BOM produksi untuk BACK MRR GN LOOK RL HD" },
    { code: "BOM-21/ASKI/033", name: "BACK MRR GN LOOK RL YM 12-BMGL-M10BYR AM", description: "BOM produksi YM 12" },
    { code: "BOM-21/ASKI/032", name: "BACK MRR GN LOOK RL HD 12-BMGL-M10BHR AM", description: "BOM produksi HD 12" },
    { code: "BOM-21/ASKI/022 REV", name: "BACK MRR STYLISH RL YM 12-BMST-M10BYR AM", description: "BOM STYLISH YM 12" },
    { code: "BOM-21/ASKI/021 REV 2", name: "BACK MRR STYLISH RL HD 12-BMST-M10BHR AM", description: "BOM STYLISH HD 12" },
    { code: "BOM-21/ASKI/020 REV", name: "BACK MRR GN LOOK RL YM 12-BMGL-M10BYR AM", description: "BOM GN LOOK YM 12" },
    { code: "BOM-21/ASKI/019 REV", name: "BACK MRR GN LOOK RL HD 12-BMGL-M10BHR AM", description: "BOM produksi utama GN LOOK HD 12", username: "Fikri", is_dismantling: 0, target_warehouse_id: 1, finished_good_code: "EPAS-FSAPAHND", finished_good_name: "BACK MRR GN LOOK RL HD 12-E", finished_good_unit: "Set", finished_good_qty: 1.0000 }
];

async function seed() {
    try {
        console.log("=== SEEDING BOM DATA ===");

        // Clear existing data to allow clean re-run
        await db.query("DELETE FROM bom_items");
        await db.query("DELETE FROM boms");
        console.log("- Existing BOM data cleared.");

        for (const bom of initialBOMs) {
            const [res] = await db.query(
                `INSERT INTO boms 
                (bom_code, bom_name, description, username, status, target_warehouse_id, finished_good_code, finished_good_name, finished_good_unit, finished_good_qty, is_dismantling, created_at, updated_at) 
                VALUES (?, ?, ?, ?, 'Aktif', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    bom.code, 
                    bom.name, 
                    bom.description, 
                    bom.username || "Admin", 
                    bom.target_warehouse_id || null,
                    bom.finished_good_code || null,
                    bom.finished_good_name || null,
                    bom.finished_good_unit || null,
                    bom.finished_good_qty || null,
                    bom.is_dismantling || 0
                ]
            );
            
            const bomId = res.insertId;
            console.log(`- Inserted BOM: ${bom.code} (ID: ${bomId})`);

            // Seed nested items for ASKI/019 REV
            if (bom.code === "BOM-21/ASKI/019 REV") {
                // 1. Component 2: WIP Holder Mirror RH
                const [item1] = await db.query(
                    `INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                     VALUES (?, NULL, 'WIP', 1, 'EPHD-KHMRSKIL', 'EPHD-KHMRSKIL', 'HOLDER MIRROR ASK L H', 1.0000, 'PCS', 400.17)`,
                    [bomId]
                );
                const item1Id = item1.insertId;

                // Sub-components of WIP Holder Mirror RH (Component 3)
                await db.query(`
                    INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                    VALUES 
                    (?, ?, 'RAW', 1, 'EPPP-MCOMPONRC', 'Pilih Item', 'PP COMPOUND', 0.0480, 'Kg', 0.00),
                    (?, ?, 'RAW', 1, 'EPCH-PPCOMPCRH', 'Pilih Item', 'CRUSHER PP COMPOUND', 0.0020, 'Kg', 0.00),
                    (?, ?, 'RAW', 1, 'EPSC-KSCRM4X20', 'Pilih Item', 'SCREW OVAL 4 x 20 (93700-04020-1G)', 1.0000, 'Pcs', 0.00),
                    (?, ?, 'RAW', 1, 'EPNT-KNUTHM4OS', 'Pilih Item', 'NUT HEX 4 MM GN5 (94001-04000-OS)', 1.0000, 'Pcs', 0.00)
                `, [bomId, item1Id, bomId, item1Id, bomId, item1Id, bomId, item1Id]);

                // 2. Component 2: RAW Mirror Glass RH
                await db.query(
                    `INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                     VALUES (?, NULL, 'RAW', 1, 'EPMR-KMRGLSPAR', 'Pilih Item', 'MIRROR GLASS SAPTA RH', 1.0000, 'PCS', 0.00)`,
                    [bomId]
                );

                // 3. Component 2: RAW Stay Assy Stay
                await db.query(
                    `INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                     VALUES (?, NULL, 'RAW', 1, 'EPST-KASDTLBLK', 'Pilih Item', 'SUB ASSY STAY RH THREAD ASDOM', 2.0000, 'PCS', 3450.00)`,
                    [bomId]
                );

                // 4. Component 2: WIP Holder Mirror LH
                const [item4] = await db.query(
                    `INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                     VALUES (?, NULL, 'WIP', 1, 'EPHD-KHMRASKIR', 'EPHD-KHMRASKIR', 'HOLDER MIRROR ASKI RH', 1.0000, 'PCS', 400.98)`,
                    [bomId]
                );
                const item4Id = item4.insertId;

                // Sub-components of WIP Holder Mirror LH (Component 3)
                await db.query(`
                    INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                    VALUES 
                    (?, ?, 'RAW', 1, 'EPPP-MCOMPONRC', 'Pilih Item', 'PP COMPOUND', 0.0480, 'Kg', 0.00),
                    (?, ?, 'RAW', 1, 'EPCH-PPCOMPCRH', 'Pilih Item', 'CRUSHER PP COMPOUND', 0.0020, 'Kg', 0.00),
                    (?, ?, 'RAW', 1, 'EPSC-KSCRM4X20', 'Pilih Item', 'SCREW OVAL 4 x 20 (93700-04020-1G)', 1.0000, 'Pcs', 0.00),
                    (?, ?, 'RAW', 1, 'EPNT-KNUTHM4OS', 'Pilih Item', 'NUT HEX 4 MM GN5 (94001-04000-OS)', 1.0000, 'Pcs', 0.00)
                `, [bomId, item4Id, bomId, item4Id, bomId, item4Id, bomId, item4Id]);

                // 5. Component 2: RAW Mirror Glass LH
                await db.query(
                    `INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                     VALUES (?, NULL, 'RAW', 1, 'EPMR-KMRGLSPAL', 'Pilih Item', 'MIRROR GLASS SAPTA LH', 1.0000, 'PCS', 0.00)`,
                    [bomId]
                );

                // 6. Component 2: RAW Stickers & Packaging
                await db.query(`
                    INSERT INTO bom_items (bom_id, parent_item_id, item_type, warehouse_id, product_code, part_number, product_name, qty, unit, price)
                    VALUES 
                    (?, NULL, 'RAW', 1, 'EPSO-LSOSAHNAS', 'Pilih Item', 'STICKER OUTER GN LOOK HND 12-BMGL-M10BHR', 0.0630, 'PCS', 0.00),
                    (?, NULL, 'RAW', 1, 'EPSI-LSISAHNAS', 'Pilih Item', 'STICKER INNER GN LOOK HND 12-BMGL-M10BHR', 1.0000, 'PCS', 0.00),
                    (?, NULL, 'RAW', 1, 'EPIN-KBINSPASP', 'EPIN-KBINSPASP', 'KARTON BOX INNER ASP I08K1 27X11X6CM', 1.0000, 'PCS', 0.00),
                    (?, NULL, 'RAW', 1, 'EPGP-LGLPCHASD', 'Pilih Item', 'STICKER,S32 GELAS PECAH,43X54MM(TITIPAN)', 0.0630, 'PCS', 0.00),
                    (?, NULL, 'RAW', 1, 'EPHL-LHLOGRAOP', 'Pilih Item', 'STICKER,S43 HOLOGRAM AOP ASKO(TITIPAN)', 1.0000, 'PCS', 0.00),
                    (?, NULL, 'RAW', 1, 'EPOT-KBOUTRASD', 'EPOT-KBOUTRASD', 'BOX D05 BRAKE SHOE 44 X 29 X 32 CM', 0.0630, 'PCS', 8318.77),
                    (?, NULL, 'RAW', 1, 'EPPL-KPLASPASD', 'Pilih Item', 'PLASTIK ASP P07 CUSHION 12X48CMX0.05MM', 1.0000, 'PCS', 0.00)
                `, [bomId, bomId, bomId, bomId, bomId, bomId, bomId]);
                console.log("- Successfully seeded hierarchical multi-level items for ASKI/019 REV.");
            }
        }

        console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Seeding Failed:", err);
    } finally {
        process.exit(0);
    }
}

seed();
