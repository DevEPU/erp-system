const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceiptController');
const auth = require('../middleware/auth');

router.get('/', auth, goodsReceiptController.getGoodsReceipts);
router.post('/', auth, goodsReceiptController.createGoodsReceipt);
router.get('/by-po/:po_id', auth, goodsReceiptController.getGoodsReceiptsByPo);
router.get('/:id', auth, goodsReceiptController.getGoodsReceiptById);
router.delete('/:id', auth, goodsReceiptController.deleteGoodsReceipt);

module.exports = router;
