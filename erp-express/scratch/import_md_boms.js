const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

const detectComponentItemType = (name, code) => {
    const combined = `${name || ''} ${code || ''}`.toUpperCase();

    if (
        combined.includes("PACKAGING") ||
        combined.includes("BOX") ||
        combined.includes("KARDUS") ||
        combined.includes("CARTON") ||
        combined.includes("PLASTIK") ||
        combined.includes("POLYFOAM") ||
        combined.includes("LABEL") ||
        combined.includes("STICKER") ||
        combined.includes("INNER") ||
        combined.includes("OUTER")
    ) {
        return "PACKAGING";
    }

    if (
        combined.includes("WIP") ||
        combined.includes("SUB ASSY") ||
        combined.includes("SUB-ASSY") ||
        combined.includes("SUBASSY") ||
        combined.includes("SEMI") ||
        combined.includes("HOLDER MIRROR") ||
        combined.includes("BAR SEAT") ||
        combined.includes("STAY")
    ) {
        return "WIP";
    }

    if (
        combined.includes("CONSUMABLE") ||
        combined.includes("RELEASE") ||
        combined.includes("CHEMICAL") ||
        combined.includes("OIL") ||
        combined.includes("PELUMAS") ||
        combined.includes("GREASE") ||
        combined.includes("NUT") ||
        combined.includes("BOLT") ||
        combined.includes("SCREW") ||
        combined.includes("WASHER")
    ) {
        return "CONSUMABLE";
    }

    return "RAW";
};

async function importAllBoms() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== STARTING FULL BOM IMPORT FROM MD BOM.xlsx ===");

        // 1. Clear existing BOM items and BOM headers
        await connection.query("DELETE FROM bom_items");
        await connection.query("DELETE FROM boms");
        console.log("[CLEAN] Cleared all old records in 'bom_items' and 'boms' tables.");

        // 2. Read Excel MD BOM.xlsx
        const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = 1;

        // Group rows by Finished Good Code
        const fgBomsMap = new Map();

        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const fgCode = row[3] ? String(row[3]).trim() : '';
            const fgName = row[4] ? String(row[4]).trim() : '';
            if (!fgCode) continue;

            if (!fgBomsMap.has(fgCode)) {
                fgBomsMap.set(fgCode, {
                    fgCode,
                    fgName,
                    rows: []
                });
            }

            fgBomsMap.get(fgCode).rows.push(row);
        }

        console.log(`[EXCEL] Grouped data into ${fgBomsMap.size} unique Finished Good BOMs.`);

        let insertedBomsCount = 0;
        let insertedItemsCount = 0;

        for (const [fgCode, fgData] of fgBomsMap.entries()) {
            const bomCode = `BOM-${fgCode}`;
            const bomName = fgData.fgName || fgCode;

            // Insert into boms table
            const [bomRes] = await connection.query(
                `INSERT INTO boms (bom_code, bom_name, finished_good_code, finished_good_name, finished_good_unit, finished_good_qty, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'Set', 1, 'Aktif', NOW(), NOW())`,
                [bomCode, bomName, fgCode, bomName]
            );

            const bomId = bomRes.insertId;
            insertedBomsCount++;

            // Map to store inserted item IDs for tree hierarchy
            const l2Map = new Map(); // comp2Code -> bom_items.id
            const l3Map = new Map(); // comp2Code + '|' + comp3Code -> bom_items.id

            let seqCounter = 10;
            let totalBomCost = 0;

            for (const row of fgData.rows) {
                // --- Layer 2 Component ---
                const c2Code = row[6] ? String(row[6]).trim() : '';
                const c2Name = row[7] ? String(row[7]).trim() : '';
                const c2Qty = row[8] !== undefined ? Number(row[8]) : 0;
                const c2Unit = row[9] ? String(row[9]).trim() : 'Pcs';
                const c2Price = row[10] !== undefined ? Number(row[10]) : 0;

                let l2Id = null;

                if (c2Code) {
                    if (!l2Map.has(c2Code)) {
                        const itemType = detectComponentItemType(c2Name, c2Code);
                        const [itemRes] = await connection.query(
                            `INSERT INTO bom_items (bom_id, parent_item_id, item_type, product_code, part_number, product_name, qty, unit, price, operation_seq, created_at)
                            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [bomId, itemType, c2Code, c2Code, c2Name, c2Qty, c2Unit, c2Price, seqCounter]
                        );
                        l2Id = itemRes.insertId;
                        l2Map.set(c2Code, l2Id);
                        seqCounter += 10;
                        insertedItemsCount++;
                        totalBomCost += (c2Qty * c2Price);
                    } else {
                        l2Id = l2Map.get(c2Code);
                        // If current row has non-zero qty and existing was 0, update it
                        if (c2Qty > 0) {
                            await connection.query("UPDATE bom_items SET qty = ?, price = IF(? > 0, ?, price) WHERE id = ?", [c2Qty, c2Price, c2Price, l2Id]);
                        }
                    }
                }

                // --- Layer 3 Component ---
                const c3Code = row[13] ? String(row[13]).trim() : '';
                const c3Name = row[14] ? String(row[14]).trim() : '';
                const c3Qty = row[15] !== undefined ? Number(row[15]) : 0;
                const c3Unit = row[16] ? String(row[16]).trim() : 'Pcs';
                const c3Price = row[17] !== undefined ? Number(row[17]) : 0;

                let l3Id = null;

                if (c3Code && l2Id) {
                    const l3Key = `${c2Code}|${c3Code}`;
                    if (!l3Map.has(l3Key)) {
                        const itemType = detectComponentItemType(c3Name, c3Code);
                        const [itemRes] = await connection.query(
                            `INSERT INTO bom_items (bom_id, parent_item_id, item_type, product_code, part_number, product_name, qty, unit, price, operation_seq, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [bomId, l2Id, itemType, c3Code, c3Code, c3Name, c3Qty, c3Unit, c3Price, seqCounter]
                        );
                        l3Id = itemRes.insertId;
                        l3Map.set(l3Key, l3Id);
                        seqCounter += 10;
                        insertedItemsCount++;
                        totalBomCost += (c3Qty * c3Price);
                    } else {
                        l3Id = l3Map.get(l3Key);
                    }
                }

                // --- Layer 4 Component ---
                const c4Code = row[20] ? String(row[20]).trim() : '';
                const c4Name = row[21] ? String(row[21]).trim() : '';
                const c4Qty = row[22] !== undefined ? Number(row[22]) : 0;
                const c4Unit = row[23] ? String(row[23]).trim() : 'Pcs';

                if (c4Code && l3Id) {
                    const itemType = detectComponentItemType(c4Name, c4Code);
                    await connection.query(
                        `INSERT INTO bom_items (bom_id, parent_item_id, item_type, product_code, part_number, product_name, qty, unit, price, operation_seq, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
                        [bomId, l3Id, itemType, c4Code, c4Code, c4Name, c4Qty, c4Unit, seqCounter]
                    );
                    seqCounter += 10;
                    insertedItemsCount++;
                }
            }

            // Update total_cost in boms table
            await connection.query("UPDATE boms SET total_cost = ? WHERE id = ?", [totalBomCost, bomId]);
        }

        console.log(`\n=== FULL BOM IMPORT COMPLETED ===`);
        console.log(`Successfully created ${insertedBomsCount} BOMs!`);
        console.log(`Successfully created ${insertedItemsCount} BOM Component Items!`);

        // Verify sample BOMs
        const [sampleBoms] = await connection.query("SELECT id, bom_code, bom_name, finished_good_code, total_cost FROM boms ORDER BY id ASC LIMIT 10");
        console.log("\nSample Imported BOMs in Database:");
        console.table(sampleBoms);

    } catch (err) {
        console.error("Error importing BOMs:", err);
    } finally {
        await connection.end();
    }
}

importAllBoms();
