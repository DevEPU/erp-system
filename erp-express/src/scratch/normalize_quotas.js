const db = require('../config/db');

async function normalizeAllProductSupplierQuotas() {
    try {
        console.log("=== CHECKING ALL MULTI-VENDOR PRODUCTS WITH UNNORMALIZED QUOTAS ===");
        
        // Fetch all products that have product_suppliers entries
        const [prodIds] = await db.execute(`
            SELECT DISTINCT product_id
            FROM product_suppliers
        `);

        let fixedCount = 0;

        for (const p of prodIds) {
            const pid = p.product_id;
            const [psRows] = await db.execute(`
                SELECT id, supplier_id, allocation_percent, is_primary
                FROM product_suppliers
                WHERE product_id = ?
                ORDER BY is_primary DESC, id ASC
            `, [pid]);

            if (psRows.length === 0) continue;

            const totalPct = psRows.reduce((sum, r) => sum + Number(r.allocation_percent || 0), 0);

            if (psRows.length === 1) {
                // Single vendor should always be 100%
                if (Number(psRows[0].allocation_percent) !== 100) {
                    await db.execute("UPDATE product_suppliers SET allocation_percent = 100.00 WHERE id = ?", [psRows[0].id]);
                    fixedCount++;
                }
            } else if (totalPct !== 100 && totalPct > 0) {
                // Normalize so total equals 100%
                let currentSum = 0;
                for (let i = 0; i < psRows.length; i++) {
                    const row = psRows[i];
                    let normalized = 0;
                    if (i === psRows.length - 1) {
                        normalized = 100 - currentSum;
                    } else {
                        normalized = Math.round((Number(row.allocation_percent) / totalPct) * 100);
                        currentSum += normalized;
                    }
                    await db.execute("UPDATE product_suppliers SET allocation_percent = ? WHERE id = ?", [normalized, row.id]);
                }
                fixedCount++;
            } else if (totalPct === 0) {
                // If all 0%, distribute evenly (e.g. 50% / 50%)
                const evenPct = Math.round(100 / psRows.length);
                let currentSum = 0;
                for (let i = 0; i < psRows.length; i++) {
                    const row = psRows[i];
                    let normalized = i === psRows.length - 1 ? (100 - currentSum) : evenPct;
                    currentSum += normalized;
                    await db.execute("UPDATE product_suppliers SET allocation_percent = ? WHERE id = ?", [normalized, row.id]);
                }
                fixedCount++;
            }
        }

        console.log(`Normalized product_suppliers quota percentages for ${fixedCount} products!`);

        // Check Nut Spring (ID 5004) specifically
        const [nutSpringPs] = await db.execute(`
            SELECT ps.id, ps.product_id, ps.supplier_id, ps.allocation_percent, ps.is_primary, s.supplier_code, s.supplier_name
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id = 5004
            ORDER BY ps.is_primary DESC, ps.id ASC
        `);
        console.log("\nNormalized Nut Spring product_suppliers:", nutSpringPs);

        // Update MRP ID 40 mrp_details quotas as well
        await db.execute(`
            UPDATE mrp_details md
            JOIN product_suppliers ps ON md.product_id = ps.product_id AND md.supplier_id = ps.supplier_id
            SET md.allocation_percent = ps.allocation_percent
            WHERE md.mrp_id = 40
        `);
        console.log("Updated mrp_details allocation_percent for MRP ID 40!");

        process.exit(0);
    } catch (e) {
        console.error("Error normalizing quotas:", e);
        process.exit(1);
    }
}

normalizeAllProductSupplierQuotas();
