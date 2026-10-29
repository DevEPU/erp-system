const express = require('express');
const router = express.Router();
const ngDisposalController = require('../controllers/ngDisposalController');
const auth = require('../middleware/auth');

// Summary & Statistics
router.get('/summary', auth, ngDisposalController.getSummary);

// Regrind products list
router.get('/regrind-products', auth, ngDisposalController.getRegrindProducts);

// Pending crusher items
router.get('/pending-crusher', auth, ngDisposalController.getPendingCrusher);

// Available production NG items waiting for crusher / disposal
router.get('/available-production-ng', auth, ngDisposalController.getAvailableProductionNg);

// Crusher logs with WO & disposal links
router.get('/crusher-logs', auth, ngDisposalController.getCrusherLogs);

// Create from production NG
router.post('/from-production', auth, ngDisposalController.createFromProduction);

// Create from customer claim
router.post('/from-claim', auth, ngDisposalController.createFromClaim);

// Process disposal (crusher complete / disposal confirm)
router.post('/:id/process', auth, ngDisposalController.processDisposal);

// Main CRUD
router.get('/', auth, ngDisposalController.getDisposals);
router.get('/:id', auth, ngDisposalController.getDisposalById);

module.exports = router;
