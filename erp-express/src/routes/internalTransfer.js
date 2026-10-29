const express = require('express');
const router = express.Router();
const internalTransferController = require('../controllers/internalTransferController');
const auth = require('../middleware/auth');

// Surat Jalan Balikan routes
router.get('/sj-balikan', auth, internalTransferController.getSuratJalanBalikan);
router.post('/sj-balikan', auth, internalTransferController.createSuratJalanBalikan);

// Main internal transfers CRUD
router.get('/regrind-products', auth, internalTransferController.getRegrindProducts);
router.get('/', auth, internalTransferController.getTransfers);
router.get('/:id', auth, internalTransferController.getTransferById);
router.post('/', auth, internalTransferController.createTransfer);
router.post('/:id/receive', auth, internalTransferController.receiveTransfer);

module.exports = router;
