const db = require('../src/config/db');

async function runTests() {
    const conn = await db.getConnection();
    try {
        console.log('=== STARTING INTEGRATION TESTS FOR SUB-ITEM MUTATION & STOCK OPNAME ===');

        // Setup clean state
        console.log('Cleaning test products and transaction records...');
        await conn.execute('DELETE FROM work_orders');
        await conn.execute('DELETE FROM material_issuances');
        await conn.execute('DELETE FROM stock_opnames');
        await conn.execute('DELETE FROM warehouse_stocks');
        await conn.execute('DELETE FROM product_suppliers WHERE product_id = 9999');
        await conn.execute('DELETE FROM products WHERE id = 9999');

        const [cats] = await conn.execute('SELECT id FROM categories LIMIT 1');
        if (cats.length === 0) {
            await conn.execute("INSERT INTO categories (id, name, created_at, updated_at) VALUES (1, 'Bahan Baku', NOW(), NOW())");
        }
        const catId = cats.length > 0 ? cats[0].id : 1;

        // 1. Insert a Parent Product "Test Bar Seat Lock"
        console.log('1. Creating test parent product with category ID:', catId);
        await conn.execute(`
            INSERT INTO products (id, product_name, product_code, category_id, product_unit, product_price, product_quantity, product_stock_alert)
            VALUES (9999, 'Test Bar Seat Lock K0JA', 'K0JA-PARENT', ?, 'Pcs', 0, 100, 0)
        `, [catId]);

        // 2. Insert 3 Vendors for this Parent Product
        console.log('2. Mapping 3 suppliers (Sub-Items)...');
        // Supplier 1
        await conn.execute(`
            INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, is_primary)
            VALUES (9999, 1, 'EPPP-BARSEATL-01', 1500, 2500, 100, 500, 1)
        `);
        // Supplier 2
        await conn.execute(`
            INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, is_primary)
            VALUES (9999, 2, 'EPPP-BARSEATL-02', 2000, 3000, 100, 500, 0)
        `);

        // 3. Initialize stock in Gudang Material (MATKOM, warehouse_id = 1) for Toko A and Toko B
        console.log('3. Seeding supplier-specific stock in MATKOM (warehouse 1)...');
        await conn.execute(`
            INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock)
            VALUES (9999, 1, 1, 100.00)
        `);
        await conn.execute(`
            INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock)
            VALUES (9999, 1, 2, 150.00)
        `);

        // 4. Test getBudgetingFormData to ensure expanded products are returned
        console.log('4. Testing budgeting form-data expanded products...');
        const productController = require('../src/controllers/productController');
        const reqMock = { query: {} };
        let resJson = null;
        const resMock = {
            json: (data) => { resJson = data; }
        };
        await productController.getBudgetingFormData(reqMock, resMock);
        
        const expandedProds = resJson.products.filter(p => Number(p.id) === 9999);
        console.log(`Found ${expandedProds.length} expanded test products in budgeting form-data!`);
        if (expandedProds.length !== 2) throw new Error('Failed: Mapped suppliers did not expand in budgeting form data');
        console.log('Products expanded correctly:');
        expandedProds.forEach(p => {
            console.log(` - Code: ${p.product_code}, Name: ${p.product_name}, Price: ${p.product_price}`);
        });

        // 5. Test createWorkOrder (BOM / planning only displays Parent Item)
        console.log('5. Creating a Work Order for 50 parent products...');
        const manufacturingController = require('../src/controllers/manufacturingController');
        let woId = null;
        const woResMock = {
            status: () => woResMock,
            json: (data) => { woId = data.id; }
        };
        await manufacturingController.createWorkOrder({
            body: {
                date: new Date(),
                parent_product_id: 9999,
                target_qty: 50,
                note: 'Test WO production',
                materials: [
                    { product_id: 9999, qty_required: 50 } // Component uses parent product ID
                ]
            }
        }, woResMock);
        console.log(`Work Order created successfully with ID: ${woId}`);

        // 6. Test createMaterialIssuance & releaseMaterialIssuance (Deduct supplier stock from MATKOM, and merge to Parent-Only in PROD)
        console.log('6. Issuing 30 pcs of EPPP-BARSEATL-01 (Toko A) from MATKOM to PROD...');
        let issId = null;
        const issResMock = {
            status: () => issResMock,
            json: (data) => { issId = data.id; }
        };
        await manufacturingController.createMaterialIssuance({
            body: {
                date: new Date(),
                work_order_id: woId,
                note: 'Issue Toko A components',
                details: [
                    { product_id: 9999, supplier_id: 1, qty_to_issue: 30.00 }
                ]
            }
        }, issResMock);

        console.log(`Material Issuance created with ID: ${issId}. Releasing issuance to mutate stocks...`);
        let releaseSuccess = false;
        const releaseResMock = {
            json: (data) => { releaseSuccess = data.success; }
        };
        await manufacturingController.releaseMaterialIssuance({
            params: { id: issId }
        }, releaseResMock);

        if (!releaseSuccess) throw new Error('Failed to release material issuance');
        console.log('Material Issuance released successfully! Verifying mutated stocks...');

        // 7. Verify MATKOM stock was decremented and PROD stock was incremented as Parent-only
        const [matkomStock] = await conn.execute(
            'SELECT qty_stock FROM warehouse_stocks WHERE product_id = 9999 AND warehouse_id = 1 AND supplier_id = 1'
        );
        const [prodStock] = await conn.execute(
            'SELECT qty_stock FROM warehouse_stocks WHERE product_id = 9999 AND warehouse_id = 2 AND supplier_id IS NULL'
        );
        console.log(` - MATKOM Toko A remaining stock: ${matkomStock[0]?.qty_stock} (Expected: 70.00)`);
        console.log(` - PROD Parent-only stock: ${prodStock[0]?.qty_stock} (Expected: 30.00)`);

        if (Number(matkomStock[0]?.qty_stock) !== 70.00 || Number(prodStock[0]?.qty_stock) !== 30.00) {
            throw new Error('Mutation validation failed: stock quantities are incorrect');
        }

        // 8. Test Stock Opname (STO) loading system stock
        console.log('8. Loading system stock for MATKOM (warehouse 1) Stock Opname...');
        const stockOpnameController = require('../src/controllers/stockOpnameController');
        let stoItems = [];
        const stoItemsResMock = {
            json: (data) => { stoItems = data.data; }
        };
        await stockOpnameController.loadSystemStockForOpname({
            query: { warehouse_id: 1 }
        }, stoItemsResMock);

        const loadedMatkomSto = stoItems.filter(i => Number(i.product_id) === 9999);
        console.log(`Loaded ${loadedMatkomSto.length} MATKOM stock opname items for parent product:`);
        loadedMatkomSto.forEach(i => {
            console.log(` - Name: ${i.product_name}, System Stock: ${i.qty_system}`);
        });

        if (loadedMatkomSto.length !== 2) throw new Error('MATKOM stock opname did not load supplier-specific rows');

        console.log('Loading system stock for PROD (warehouse 2) Stock Opname...');
        await stockOpnameController.loadSystemStockForOpname({
            query: { warehouse_id: 2 }
        }, stoItemsResMock);

        const loadedProdSto = stoItems.filter(i => Number(i.product_id) === 9999);
        console.log(`Loaded ${loadedProdSto.length} PROD stock opname items for parent product:`);
        loadedProdSto.forEach(i => {
            console.log(` - Name: ${i.product_name}, System Stock: ${i.qty_system}`);
        });

        if (loadedProdSto.length !== 1 || loadedProdSto[0].supplier_id !== null) {
            throw new Error('PROD stock opname did not load parent-only row properly');
        }

        // 9. Reconcile Stock Opname (Adjust stock to physically counted quantity)
        console.log('9. Reconciling a Stock Opname in MATKOM...');
        // Let's say physical count of Toko A is 80 (difference +10) and Toko B is 130 (difference -20)
        let stoId = null;
        const createStoResMock = {
            status: () => createStoResMock,
            json: (data) => { stoId = data.id; }
        };
        await stockOpnameController.createStockOpname({
            body: {
                date: new Date(),
                warehouse_id: 1,
                note: 'Reconcile MATKOM stock',
                items: [
                    { product_id: 9999, supplier_id: 1, qty_system: 70.00, qty_physical: 80.00 },
                    { product_id: 9999, supplier_id: 2, qty_system: 150.00, qty_physical: 130.00 }
                ]
            }
        }, createStoResMock);

        console.log(`Stock Opname created with ID: ${stoId}. Adjusting stock...`);
        let adjustSuccess = false;
        const adjustResMock = {
            json: (data) => { adjustSuccess = data.success; }
        };
        await stockOpnameController.adjustStockOpname({
            params: { id: stoId }
        }, adjustResMock);

        if (!adjustSuccess) throw new Error('Failed to adjust stock opname');

        const [matkomTokoAStock] = await conn.execute(
            'SELECT qty_stock FROM warehouse_stocks WHERE product_id = 9999 AND warehouse_id = 1 AND supplier_id = 1'
        );
        const [matkomTokoBStock] = await conn.execute(
            'SELECT qty_stock FROM warehouse_stocks WHERE product_id = 9999 AND warehouse_id = 1 AND supplier_id = 2'
        );
        console.log(` - Reconciled MATKOM Toko A stock: ${matkomTokoAStock[0]?.qty_stock} (Expected: 80.00)`);
        console.log(` - Reconciled MATKOM Toko B stock: ${matkomTokoBStock[0]?.qty_stock} (Expected: 130.00)`);

        if (Number(matkomTokoAStock[0]?.qty_stock) !== 80.00 || Number(matkomTokoBStock[0]?.qty_stock) !== 130.00) {
            throw new Error('Adjustment verification failed: reconciled stocks are incorrect');
        }

        console.log('=== ALL INTEGRATION TESTS PASSED TRIUMPHANTLY! ===');

    } catch (e) {
        console.error('Test Failed:', e.message);
    } finally {
        // Clean up test data
        console.log('Cleaning up test data...');
        await conn.execute('DELETE FROM work_orders');
        await conn.execute('DELETE FROM material_issuances');
        await conn.execute('DELETE FROM stock_opnames');
        await conn.execute('DELETE FROM warehouse_stocks');
        await conn.execute('DELETE FROM product_suppliers WHERE product_id = 9999');
        await conn.execute('DELETE FROM products WHERE id = 9999');

        conn.release();
        process.exit();
    }
}

runTests();
