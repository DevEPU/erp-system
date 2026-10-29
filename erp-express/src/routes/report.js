const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const reportProductionController = require('../controllers/reportProductionController');
const auth = require('../middleware/auth');

router.get('/budget-summary', auth, reportController.getBudgetSummary);
router.get('/reports/purchase-requests', auth, reportController.getPurchaseReport);
router.get('/reports/master-budgets', auth, reportController.getMasterBudgetReport);

// Production Reports
router.get('/reports/rekap-plan-prod', auth, reportProductionController.getRekapPlanProd);
router.get('/reports/rekap-actual-prod', auth, reportProductionController.getRekapActualProd);
router.get('/reports/rekap-ng', auth, reportProductionController.getRekapNG);
router.get('/reports/control-stock-whfg', auth, reportProductionController.getControlStockWHFG);
router.get('/reports/ach-rate', auth, reportProductionController.getAchRate);
router.get('/reports/ach-leader', auth, reportProductionController.getAchLeader);
router.get('/reports/os-delivery-matrix', auth, reportProductionController.getOsDeliveryMatrix);
router.get('/reports/daily-board', auth, reportProductionController.getDailyBoard);

module.exports = router;
