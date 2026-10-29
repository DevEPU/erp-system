const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const auth = require('../middleware/auth');

router.get('/', auth, purchaseOrderController.getPurchaseOrders);
router.get('/approved-items', auth, purchaseOrderController.getApprovedPrItems);
router.post('/', auth, purchaseOrderController.createPurchaseOrder);
router.get('/:id', auth, purchaseOrderController.getPurchaseOrderById);
router.put('/:id', auth, purchaseOrderController.updatePurchaseOrder);
router.delete('/:id', auth, purchaseOrderController.deletePurchaseOrder);
router.post('/:id/close', auth, purchaseOrderController.closePurchaseOrder);
router.post('/:id/reopen', auth, purchaseOrderController.reopenPurchaseOrder);

module.exports = router;
