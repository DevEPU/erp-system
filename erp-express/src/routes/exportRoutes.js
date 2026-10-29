const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.get('/integrated-mrp-excel', exportController.exportIntegratedExcel);

module.exports = router;
