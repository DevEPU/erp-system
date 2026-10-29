const express = require('express');
const router = express.Router();
const errorLogController = require('../controllers/errorLogController');
const auth = require('../middleware/auth');

router.get('/', auth, errorLogController.getErrorLogs);

module.exports = router;
