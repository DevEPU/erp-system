const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturingController');
const mrpController = require('../controllers/mrpController');
const productionController = require('../controllers/productionController');
const moldController = require('../controllers/moldController');
const machineController = require('../controllers/machineController');
const auth = require('../middleware/auth');

// Dashboard Overview (Manufacturing Analytics)
router.get('/dashboard-overview', auth, manufacturingController.getDashboardOverview);

// Work Orders
router.get('/work-orders', auth, manufacturingController.getWorkOrders);
router.get('/work-orders/:id', auth, manufacturingController.getWorkOrderDetail);
router.post('/work-orders', auth, manufacturingController.createWorkOrder);
router.put('/work-orders/:id', auth, manufacturingController.updateWorkOrder);
router.delete('/work-orders/:id', auth, manufacturingController.deleteWorkOrder);

// Karyawan / Operator List for Manufacturing
router.get('/karyawan', auth, async (req, res) => {
    try {
        const db = require('../config/db');
        const [rows] = await db.query("SELECT id, nik, full_name as name, jabatan, department, bagian FROM employees WHERE status_kerja = 'Aktif' ORDER BY full_name ASC");
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// WO Lifecycle Actions (Start / Stop / Finish)
router.post('/work-orders/:id/start', auth, manufacturingController.startWorkOrder);
router.post('/work-orders/:id/stop', auth, manufacturingController.stopWorkOrder);
router.post('/work-orders/:id/finish', auth, manufacturingController.finishWorkOrder);

// Finish per-MPP item (selesaikan per mesin/item, WO auto-complete jika semua selesai)
router.post('/planning-produksi/:id/finish', auth, manufacturingController.finishMppItem);

// Material Issuances
router.get('/material-issuances', auth, manufacturingController.getMaterialIssuances);
router.post('/material-issuances', auth, manufacturingController.createMaterialIssuance);
router.put('/material-issuances/:id/release', auth, manufacturingController.releaseMaterialIssuance);

// Bill of Materials (BOM)
router.get('/boms', auth, manufacturingController.getBOMs);
router.get('/boms/:id', auth, manufacturingController.getBOMDetail);
router.post('/boms', auth, manufacturingController.createBOM);
router.put('/boms/:id', auth, manufacturingController.updateBOM);
router.delete('/boms/:id', auth, manufacturingController.deleteBOM);

// Material Requirements Planning (MRP)
router.get('/mrp', auth, mrpController.getMRPs);
router.get('/mrp/:id', auth, mrpController.getMRPDetail);
router.post('/mrp/generate', auth, mrpController.generateMRP);
router.post('/mrp/bulk-release', auth, mrpController.bulkReleaseMRPToPR);
router.post('/mrp/:id/release', auth, mrpController.releaseMRPToPR);
router.post('/mrp/:id/submit-approval', auth, mrpController.submitMRPForApproval);
router.post('/mrp/:id/revise', auth, mrpController.reviseMRP);
router.put('/mrp/:id/draft-pr-percent', auth, mrpController.saveDraftPRPercent);
router.put('/mrp/:id', auth, mrpController.updateMRP);
router.delete('/mrp/:id', auth, mrpController.deleteMRP);

// Planning Produksi (PrO)
router.get('/planning-produksi', auth, productionController.getPlanningProduksi);
router.get('/planning-produksi/:id', auth, productionController.getPlanningProduksiById);
router.post('/planning-produksi', auth, productionController.createPlanningProduksi);
router.put('/planning-produksi/:id', auth, productionController.updatePlanningProduksi);
router.delete('/planning-produksi/:id', auth, productionController.deletePlanningProduksi);

// Realisasi Output Produksi & QC Gate
router.get('/production-outputs', auth, productionController.getProductionOutputs);
router.post('/production-outputs', auth, productionController.receiveProductionOutput);
router.post('/production/assembly', auth, productionController.receiveAssemblyOutput);
router.post('/production/repair', auth, productionController.repairOutputSubmit);
router.post('/production-outputs/:id/qc-verify', auth, productionController.qcVerification);
router.put('/production-outputs/:id/verify-ng', auth, productionController.verifyMoldingDefect);
router.post('/production-outputs/:id/fg-receive', auth, productionController.receiveFinishedGoods);
router.get('/crusher-logs', auth, productionController.getCrusherLogs);
router.get('/replacements', auth, productionController.getReplacements);
router.post('/replacements/:id/ship', auth, productionController.shipReplacement);
router.get('/vendor-claims', auth, productionController.getVendorClaims);
router.put('/vendor-claims/:id/status', auth, productionController.updateVendorClaimStatus);
router.get('/customer-claims', auth, productionController.getCustomerClaims);
router.post('/customer-claims', auth, productionController.createCustomerClaim);
router.put('/customer-claims/:id/status', auth, productionController.updateCustomerClaimStatus);
router.get('/customer-claims/:id/investigation', auth, productionController.getClaimInvestigation);
router.post('/customer-claims/:id/investigate', auth, productionController.startClaimInvestigation);
router.post('/customer-claims/:id/sort-items', auth, productionController.sortClaimItems);
router.post('/customer-claims/:id/complete', auth, productionController.completeClaimInvestigation);

// Molds
router.get('/molds', auth, moldController.getMolds);
router.post('/molds', auth, moldController.createMold);
router.put('/molds/:id', auth, moldController.updateMold);
router.delete('/molds/:id', auth, moldController.deleteMold);
router.get('/molds/:id/products', auth, moldController.getMoldProducts);
router.post('/molds/:id/products', auth, moldController.addMoldProduct);
router.delete('/molds/:id/products/:productId', auth, moldController.deleteMoldProduct);

// Machines
router.get('/machines', auth, machineController.getMachines);
router.post('/machines', auth, machineController.createMachine);
router.put('/machines/:id', auth, machineController.updateMachine);
router.delete('/machines/:id', auth, machineController.deleteMachine);

// Machine Categories
router.get('/machine-categories', auth, machineController.getMachineCategories);
router.post('/machine-categories', auth, machineController.createMachineCategory);
router.put('/machine-categories/:id', auth, machineController.updateMachineCategory);
router.delete('/machine-categories/:id', auth, machineController.deleteMachineCategory);

// Production Lines
router.get('/production-lines', auth, machineController.getProductionLines);
router.post('/production-lines', auth, machineController.createProductionLine);
router.delete('/production-lines/:id', auth, machineController.deleteProductionLine);


// Machine-Mold UPH Matrix
router.get('/machines/:machineId/molds', auth, machineController.getMachineMoldUph);
router.post('/machines/:machineId/molds', auth, machineController.addOrUpdateMachineMoldUph);
router.delete('/machines/:machineId/molds/:moldId', auth, machineController.deleteMachineMoldUph);
router.get('/uph-lookup', auth, machineController.getUphByMachineAndMold);
router.get('/products-lookup', auth, machineController.getProductsLookup);

// Capacity Simulation Logs
router.get('/capacity-logs', auth, machineController.getCapacityLogs);
router.post('/capacity-logs', auth, machineController.saveCapacityLog);

// Karyawan / Users list for MPP operator dropdown (no extra auth needed, reuse same middleware)
router.get('/karyawan', auth, machineController.getKaryawanList);

// Leader Groups
router.get('/leader-groups', auth, machineController.getLeaderGroups);
router.post('/leader-groups', auth, machineController.createLeaderGroup);
router.put('/leader-groups/:id', auth, machineController.updateLeaderGroup);
router.delete('/leader-groups/:id', auth, machineController.deleteLeaderGroup);

module.exports = router;

