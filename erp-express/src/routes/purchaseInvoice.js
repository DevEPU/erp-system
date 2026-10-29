const express = require('express');
const router = express.Router();
const purchaseInvoiceController = require('../controllers/purchaseInvoiceController');
const auth = require('../middleware/auth');

router.get('/', auth, purchaseInvoiceController.getPurchaseInvoices);
router.post('/', auth, purchaseInvoiceController.createPurchaseInvoice);
router.get('/:id', auth, purchaseInvoiceController.getPurchaseInvoiceById);
router.delete('/:id', auth, purchaseInvoiceController.deletePurchaseInvoice);

module.exports = router;
