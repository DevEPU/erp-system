const db = require('../src/config/db');

async function test() {
    console.log("Starting MRP CRUD & Bulk Release verification tests...");
    const connection = await db.getConnection();

    try {
        // 1. Fetch active BOMs
        const [bomRows] = await connection.execute("SELECT DISTINCT finished_good_code FROM boms WHERE status = 'Aktif'");
        const activeFGCodes = bomRows.map(row => row.finished_good_code);
        let poId = null;
        let poRef = '';
        
        if (activeFGCodes.length > 0) {
            const placeholders = activeFGCodes.map(() => '?').join(',');
            const [poDetailsRows] = await connection.execute(
                `SELECT DISTINCT po_id FROM customer_po_details WHERE product_code IN (${placeholders}) LIMIT 1`,
                activeFGCodes
            );
            if (poDetailsRows.length > 0) {
                poId = poDetailsRows[0].po_id;
                const [poHeader] = await connection.execute('SELECT reference FROM customer_po WHERE id = ?', [poId]);
                if (poHeader.length > 0) poRef = poHeader[0].reference;
            }
        }

        if (!poId) {
            console.log("No customer PO with active BOMs found. Trying a fallback PO...");
            const [fallbackRows] = await connection.execute('SELECT id, reference FROM customer_po LIMIT 1');
            if (fallbackRows.length === 0) {
                console.log("No customer POs at all. Cannot run tests.");
                return;
            }
            poId = fallbackRows[0].id;
            poRef = fallbackRows[0].reference;
        }
        console.log(`Using Customer PO ID: ${poId} (Ref: ${poRef})`);

        // 2. Generate a new MRP
        console.log("\n--- Testing: Generate MRP ---");
        const genResponse = await fetch('http://localhost:5656/api/manufacturing/mrp/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bypass-auth': 'true'
            },
            body: JSON.stringify({
                po_customer_id: poId,
                time_frame_start: '2026-07-01',
                time_frame_end: '2026-07-31'
            })
        });

        const genResult = await genResponse.json();
        console.log("Generate API Response Status:", genResponse.status);
        console.log("Generate API Response Body:", genResult);

        if (!genResponse.ok || !genResult.success) {
            console.log("❌ Failed to generate MRP. Aborting test.");
            return;
        }

        const mrpId = genResult.mrp_id;
        console.log(`Generated MRP ID: ${mrpId}, Reference: ${genResult.reference_code}`);

        // 3. Fetch details of generated MRP
        const [mrpDetailsRows] = await connection.execute('SELECT * FROM mrp_details WHERE mrp_id = ?', [mrpId]);
        console.log(`Found ${mrpDetailsRows.length} material requirement items for this MRP.`);

        if (mrpDetailsRows.length === 0) {
            console.log("❌ No MRP details generated. Aborting test.");
            return;
        }

        // Verify the formula calculation on the first raw material item
        const firstItem = mrpDetailsRows[0];
        const rawProductId = firstItem.product_id;
        const generatedQty = Number(firstItem.qty_required);

        // Fetch min_qty and product_code
        const [pRows] = await connection.execute('SELECT product_code, min_qty FROM products WHERE id = ?', [rawProductId]);
        const pCode = pRows[0].product_code;
        const minQty = Number(pRows[0].min_qty || 0);

        // Fetch actual stock
        const [stockRows] = await connection.execute('SELECT COALESCE(SUM(qty_stock), 0) as current_stock FROM warehouse_stocks WHERE product_id = ?', [rawProductId]);
        const currentStock = Number(stockRows[0].current_stock || 0);

        // Compute expected BOM qty manually
        let expectedBOMQty = 0;
        const [poDetails] = await connection.execute(
            'SELECT product_code, po_qty FROM customer_po_details WHERE po_id = ?',
            [poId]
        );
        for (const item of poDetails) {
            const [bomRows] = await connection.execute(
                "SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = 'Aktif' LIMIT 1",
                [item.product_code]
            );
            if (bomRows.length > 0) {
                const bom = bomRows[0];
                const [bomItems] = await connection.execute(
                    "SELECT qty FROM bom_items WHERE bom_id = ? AND product_code = ? AND item_type = 'RAW'",
                    [bom.id, pCode]
                );
                if (bomItems.length > 0) {
                    const qtyRequiredPerFG = Number(bomItems[0].qty);
                    const totalReqQty = Math.ceil((Number(item.po_qty) / Number(bom.finished_good_qty || 1)) * qtyRequiredPerFG);
                    expectedBOMQty += totalReqQty;
                }
            }
        }

        const expectedFinalQty = Math.max(0, expectedBOMQty + minQty - currentStock);
        console.log(`\n--- Formula Verification ---`);
        console.log(`Product Code: ${pCode}`);
        console.log(`BOM Requirement (PO): ${expectedBOMQty}`);
        console.log(`Min Qty (Standard Stock): ${minQty}`);
        console.log(`Current Stock (Actual): ${currentStock}`);
        console.log(`Calculated Expected Qty (PO + Min - Actual): ${expectedFinalQty}`);
        console.log(`Generated Qty in DB: ${generatedQty}`);

        if (generatedQty === expectedFinalQty) {
            console.log("✅ FORMULA VERIFICATION PASSED!");
        } else {
            console.log("❌ FORMULA VERIFICATION MISMATCH!");
        }

        // Prepare details payload for edit
        const editDetails = mrpDetailsRows.map(item => ({
            id: item.id,
            qty_required: Number(item.qty_required) + 15 // Increment requirement by 15 for testing
        }));

        // 4. Update the MRP
        console.log("\n--- Testing: Update MRP (Draft) ---");
        const updateResponse = await fetch(`http://localhost:5656/api/manufacturing/mrp/${mrpId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-bypass-auth': 'true'
            },
            body: JSON.stringify({
                time_frame_start: '2026-07-05',
                time_frame_end: '2026-07-28',
                details: editDetails
            })
        });

        const updateResponseText = await updateResponse.text();
        console.log("Update API Response Status:", updateResponse.status);
        let updateResult;
        try {
            updateResult = JSON.parse(updateResponseText);
            console.log("Update API Response Body:", updateResult);
        } catch (e) {
            console.log("Update API Response is not JSON. Raw body snippet:", updateResponseText.slice(0, 500));
            return;
        }

        // Verify update in DB
        const [mrpHeaderRows] = await connection.execute('SELECT time_frame_start, time_frame_end FROM mrps WHERE id = ?', [mrpId]);
        const updatedHeader = mrpHeaderRows[0];
        
        const formatDate = (v) => {
            if (!(v instanceof Date)) return v;
            const Y = v.getFullYear(), M = String(v.getMonth()+1).padStart(2,'0'), D = String(v.getDate()).padStart(2,'0');
            return `${Y}-${M}-${D}`;
        };

        const startDateStr = formatDate(updatedHeader.time_frame_start);
        const endDateStr = formatDate(updatedHeader.time_frame_end);

        console.log(`Updated Timeframe: ${startDateStr} to ${endDateStr}`);

        const [mrpDetailsUpdated] = await connection.execute('SELECT qty_required FROM mrp_details WHERE id = ?', [editDetails[0].id]);
        console.log(`Updated Qty Required for item: ${mrpDetailsUpdated[0].qty_required} (Expected: ${editDetails[0].qty_required})`);

        const isUpdateOk = updateResponse.ok && 
                           updateResult.success && 
                           startDateStr === '2026-07-05' && 
                           endDateStr === '2026-07-28' &&
                           Number(mrpDetailsUpdated[0].qty_required) === editDetails[0].qty_required;

        if (isUpdateOk) {
            console.log("✅ UPDATE TEST PASSED!");
        } else {
            console.log("❌ UPDATE TEST FAILED!");
        }

        // 5. Bulk Release MRP to PR
        console.log("\n--- Testing: Bulk Release MRP to PR ---");
        const releaseResponse = await fetch('http://localhost:5656/api/manufacturing/mrp/bulk-release', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bypass-auth': 'true'
            },
            body: JSON.stringify({
                ids: [mrpId]
            })
        });

        const releaseResult = await releaseResponse.json();
        console.log("Bulk Release API Response Status:", releaseResponse.status);
        console.log("Bulk Release API Response Body:", releaseResult);

        // Verify Released state in DB
        const [mrpHeaderAfterRelease] = await connection.execute('SELECT status FROM mrps WHERE id = ?', [mrpId]);
        console.log(`MRP Status after release: ${mrpHeaderAfterRelease[0].status} (Expected: Released)`);

        const isReleaseOk = releaseResponse.ok && releaseResult.success && mrpHeaderAfterRelease[0].status === 'Released';
        if (isReleaseOk) {
            console.log("✅ BULK RELEASE TEST PASSED!");
        } else {
            console.log("❌ BULK RELEASE TEST FAILED!");
        }

        // 6. Test that editing/deleting a Released MRP fails
        console.log("\n--- Testing: Edit Released MRP (Should Fail) ---");
        const editFailRes = await fetch(`http://localhost:5656/api/manufacturing/mrp/${mrpId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-bypass-auth': 'true'
            },
            body: JSON.stringify({
                time_frame_start: '2026-07-10',
                time_frame_end: '2026-07-20',
                details: []
            })
        });
        const editFailResult = await editFailRes.json();
        console.log("Edit Released MRP Status:", editFailRes.status);
        console.log("Edit Released MRP Body:", editFailResult);
        if (editFailRes.status === 400 && !editFailResult.success) {
            console.log("✅ EDIT BLOCK PASSED (correctly blocked editing released MRP)");
        } else {
            console.log("❌ EDIT BLOCK FAILED (allowed editing released MRP)");
        }

        console.log("\n--- Testing: Delete Released MRP (Should Fail) ---");
        const delFailRes = await fetch(`http://localhost:5656/api/manufacturing/mrp/${mrpId}`, {
            method: 'DELETE',
            headers: {
                'x-bypass-auth': 'true'
            }
        });
        const delFailResult = await delFailRes.json();
        console.log("Delete Released MRP Status:", delFailRes.status);
        console.log("Delete Released MRP Body:", delFailResult);
        if (delFailRes.status === 400 && !delFailResult.success) {
            console.log("✅ DELETE BLOCK PASSED (correctly blocked deleting released MRP)");
        } else {
            console.log("❌ DELETE BLOCK FAILED (allowed deleting released MRP)");
        }

        // 7. Generate another MRP to test Delete (Draft)
        console.log("\n--- Testing: Delete MRP (Draft) ---");
        const gen2Res = await fetch('http://localhost:5656/api/manufacturing/mrp/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bypass-auth': 'true'
            },
            body: JSON.stringify({
                po_customer_id: poId,
                time_frame_start: '2026-07-01',
                time_frame_end: '2026-07-31'
            })
        });
        const gen2Result = await gen2Res.json();
        const mrp2Id = gen2Result.mrp_id;
        console.log(`Generated second MRP ID: ${mrp2Id}`);

        const delRes = await fetch(`http://localhost:5656/api/manufacturing/mrp/${mrp2Id}`, {
            method: 'DELETE',
            headers: {
                'x-bypass-auth': 'true'
            }
        });
        const delResult = await delRes.json();
        console.log("Delete Draft Response Status:", delRes.status);
        console.log("Delete Draft Response Body:", delResult);

        // Verify from DB that it is gone
        const [mrp2HeaderRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [mrp2Id]);
        const [mrp2DetailRows] = await connection.execute('SELECT * FROM mrp_details WHERE mrp_id = ?', [mrp2Id]);

        const isDeleteOk = delRes.ok && delResult.success && mrp2HeaderRows.length === 0 && mrp2DetailRows.length === 0;
        if (isDeleteOk) {
            console.log("✅ DELETE DRAFT TEST PASSED!");
        } else {
            console.log("❌ DELETE DRAFT TEST FAILED!");
        }

    } catch (err) {
        console.error("Test execution failed with error:", err);
    } finally {
        connection.release();
        db.end();
    }
}

test();
