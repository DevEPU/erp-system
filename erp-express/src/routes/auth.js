const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const auth = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/auth/login', authController.login);
router.get('/me', auth, authController.me);
router.get('/auth/me', auth, authController.me);

module.exports = router;
