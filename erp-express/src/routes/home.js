const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const auth = require('../middleware/auth');

router.get('/stats', auth, homeController.totalBudgetPurchase);
router.get('/chart/target-vs-purchase', auth, homeController.targetVsPurchaseChart);
router.get('/chart/budget-purchases', auth, homeController.budgetPurchasesChart);
router.get('/chart/budget-department', auth, homeController.budgetByDepartmentChart);
router.get('/chart/budget-category', auth, homeController.budgetByCategoryChart);
router.get('/pending-purchases', auth, homeController.pendingPurchasesList);
router.get('/supplier-procurement-stats', auth, homeController.supplierProcurementStats);
router.get('/inventory-stats', auth, homeController.inventoryStats);
router.get('/sales-stats', auth, homeController.salesStats);
router.get('/manufacturing-stats', auth, homeController.manufacturingStats);

module.exports = router;
