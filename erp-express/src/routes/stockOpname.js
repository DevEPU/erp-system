const express = require('express');
const router = express.Router();
const stockOpnameController = require('../controllers/stockOpnameController');
const auth = require('../middleware/auth');

router.get('/', auth, stockOpnameController.getStockOpnames);
router.get('/system-stock', auth, stockOpnameController.loadSystemStockForOpname);
router.get('/:id', auth, stockOpnameController.getStockOpnameDetail);
router.post('/', auth, stockOpnameController.createStockOpname);
router.put('/:id', auth, stockOpnameController.updateStockOpname);
router.delete('/:id', auth, stockOpnameController.deleteStockOpname);
router.put('/:id/adjust', auth, stockOpnameController.adjustStockOpname);

module.exports = router;

