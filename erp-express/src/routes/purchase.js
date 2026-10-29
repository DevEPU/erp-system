const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const auth = require('../middleware/auth');

router.get('/', auth, purchaseController.getPurchases);
router.get('/unpaid-approved', auth, purchaseController.getPurchasesUnpaidApproved);
router.post('/', auth, purchaseController.createPurchase);
router.get('/:id', auth, purchaseController.getPurchaseById);
router.put('/:id', auth, purchaseController.updatePurchase);
router.delete('/:id', auth, purchaseController.deletePurchase);
router.post('/:id/update-actual', auth, purchaseController.updatePurchaseActual);
router.patch('/:id/update-borrowing-source', auth, purchaseController.updateBorrowingSource);
router.post('/:id/close', auth, purchaseController.closePurchase);
router.post('/:id/reopen', auth, purchaseController.reopenPurchase);

module.exports = router;
