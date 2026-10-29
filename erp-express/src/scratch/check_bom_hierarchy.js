const db = require('../config/db');

async function checkBOMHierarchy() {
    try {
        console.log("=== DESCRIBE bom_items ===");
        const [cols] = await db.execute("DESCRIBE bom_items");
        console.log("Columns:", cols.map(c => `${c.Field} (${c.Type})`));

        console.log("\n=== DESCRIBE boms ===");
        const [bCols] = await db.execute("DESCRIBE boms");
        console.log("Columns:", bCols.map(c => `${c.Field} (${c.Type})`));

        console.log("\n=== CHECKING BOM ITEMS WITH PARENT_ITEM_ID OR SUB-BOMS ===");
        const [parentItems] = await db.execute(`
            SELECT bi.*, b.bom_code, b.finished_good_code, b.finished_good_name
            FROM bom_items bi
            JOIN boms b ON bi.bom_id = b.id
            WHERE bi.parent_item_id IS NOT NULL OR bi.item_type IN ('SUB_ASSEMBLY', 'WIP', 'SEMI_FINISHED')
            LIMIT 20
        `);
        console.log("Sub-Assembly / Parent Item BOM rows count:", parentItems.length);
        console.log(JSON.stringify(parentItems, null, 2));

        console.log("\n=== CHECKING SAMPLE BOM ITEMS FOR FG 'EPBL-FBXLUGK1Z' OR BOM ID 22 ===");
        const [bom22Items] = await db.execute(`
            SELECT bi.id, bi.bom_id, bi.parent_item_id, bi.item_type, bi.product_code, bi.part_number, bi.product_name, bi.qty, bi.unit, bi.price, bi.operation_seq
            FROM bom_items bi
            WHERE bi.bom_id = 22
            ORDER BY bi.id ASC
        `);
        console.log("BOM ID 22 Items:", JSON.stringify(bom22Items, null, 2));

        console.log("\n=== CHECKING IF PRODUCTS HAVE THEIR OWN SUB-BOMs (RECURSIVE MULTI-LEVEL BOM) ===");
        // Check if any product_code in bom_items is ALSO a finished_good_code in boms table!
        const [subBoms] = await db.execute(`
            SELECT bi.bom_id as parent_bom_id, b_parent.bom_code as parent_bom_code, b_parent.finished_good_code as top_fg,
                   bi.product_code as sub_item_code, bi.product_name as sub_item_name,
                   b_child.id as child_bom_id, b_child.bom_code as child_bom_code
            FROM bom_items bi
            JOIN boms b_parent ON bi.bom_id = b_parent.id
            JOIN boms b_child ON bi.product_code = b_child.finished_good_code
        `);
        console.log("Multi-level BOM connections found (Child items that have their own BOM):", subBoms.length);
        console.log(JSON.stringify(subBoms, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error checking BOM hierarchy:", e);
        process.exit(1);
    }
}

checkBOMHierarchy();
