const express = require('express');
const router = express.Router();
const purchasePaymentController = require('../controllers/purchasePaymentController');
const auth = require('../middleware/auth');

router.get('/', auth, purchasePaymentController.getPayments);
router.get('/unpaid', auth, purchasePaymentController.getUnpaidInvoices);
router.get('/:id', auth, purchasePaymentController.getPaymentById);
router.post('/', auth, purchasePaymentController.createPayment);

module.exports = router;
