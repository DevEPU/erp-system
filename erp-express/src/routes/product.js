const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

router.get('/', auth, productController.getProducts);
router.post('/', auth, productController.createProduct);
router.get('/stats', auth, productController.getProductsStats);
router.get('/stats-items', auth, productController.getProductsStatsItems);
router.get('/stock-stats', auth, productController.getStockStats);
router.get('/form-data', auth, productController.getProductsFormData);
router.get('/:id', auth, productController.getProductDetail);
router.put('/:id', auth, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);
router.get('/budgeting/form-data', auth, productController.getBudgetingFormData);
router.put('/:id/price', auth, productController.updateProductPrice);
router.get('/:id/transactions', auth, productController.getProductTransactions);

module.exports = router;
