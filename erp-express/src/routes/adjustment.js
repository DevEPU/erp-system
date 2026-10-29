const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/adjustmentController');
const auth = require('../middleware/auth');

router.get('/', auth, adjustmentController.getAdjustments);
router.get('/:id', auth, adjustmentController.getAdjustmentDetail);
router.post('/', auth, adjustmentController.createAdjustment);

module.exports = router;
