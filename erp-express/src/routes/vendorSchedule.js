const express = require('express');
const router = express.Router();
const vendorScheduleController = require('../controllers/vendorScheduleController');
const auth = require('../middleware/auth');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/excel-agustus-2026', auth, vendorScheduleController.getExcelScheduleAgustus2026);
router.get('/daily-grid', auth, vendorScheduleController.getDailyGrid);
router.post('/save-cell', auth, vendorScheduleController.saveCell);
router.delete('/item', auth, vendorScheduleController.deleteItem);
router.post('/import', auth, upload.single('file'), vendorScheduleController.importExcel);
router.get('/export', auth, vendorScheduleController.exportExcel);
router.get('/download-template', auth, vendorScheduleController.downloadTemplate);

router.get('/', auth, vendorScheduleController.getVendorSchedules);
router.post('/', auth, vendorScheduleController.createVendorSchedule);
router.put('/:id/status', auth, vendorScheduleController.updateVendorScheduleStatus);

module.exports = router;
