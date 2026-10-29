const express = require('express');
const router = express.Router();
const productRequestController = require('../controllers/productRequestController');
const verifyToken = require('../middleware/auth');

// All routes are protected by auth
router.use(verifyToken);

router.get('/', productRequestController.getRequests);
router.get('/stats', productRequestController.getStats);
router.get('/form-data', productRequestController.getFormData);
router.post('/', productRequestController.store);
router.put('/:id', productRequestController.update);
router.delete('/:id', productRequestController.deleteRequest);
router.put('/:id/verify', productRequestController.verifyRequest);
router.post('/:id/input', productRequestController.inputToProduct);

module.exports = router;
