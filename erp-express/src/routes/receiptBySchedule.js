const express = require('express');
const router = express.Router();
const receiptByScheduleController = require('../controllers/receiptByScheduleController');
const auth = require('../middleware/auth');

// GET /api/receipt-by-schedule
router.get('/', auth, receiptByScheduleController.getReceiptsFromSchedule);

// POST /api/receipt-by-schedule/bulk-send (Kirim Semua Schedule Vendor ke Penerimaan)
router.post('/bulk-send', auth, receiptByScheduleController.bulkCreateReceiptsFromSchedule);

// GET /api/receipt-by-schedule/:id
router.get('/:id', auth, receiptByScheduleController.getReceiptFromScheduleDetail);

// POST /api/receipt-by-schedule
router.post('/', auth, receiptByScheduleController.createReceiptFromSchedule);

// POST /api/receipt-by-schedule/:id/confirm
router.post('/:id/confirm', auth, receiptByScheduleController.confirmReceiptFromSchedule);

module.exports = router;
