const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/referenceController');
const auth = require('../middleware/auth');

router.get('/next-reference', auth, referenceController.getNextReference);

module.exports = router;
