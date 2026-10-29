const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const auth = require('../middleware/auth');

// Endpoint: /api/permissions
router.get('/', auth, roleController.getPermissions);
router.post('/', auth, roleController.createPermission);
router.put('/:id', auth, roleController.updatePermission);
router.delete('/:id', auth, roleController.deletePermission);

module.exports = router;
