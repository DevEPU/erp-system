const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');

router.get('/', warehouseController.getWarehouses);
router.get('/form-data', warehouseController.getWarehouseFormData);
router.get('/:id', warehouseController.getWarehouseDetail);
router.post('/', warehouseController.createWarehouse);
router.put('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

module.exports = router;
