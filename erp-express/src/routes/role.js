const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const permissionGroupController = require('../controllers/permissionGroupController');
const auth = require('../middleware/auth');

// Roles
router.get('/', auth, roleController.getRoles);
router.post('/', auth, roleController.createRole);
router.put('/:id', auth, roleController.updateRole);
router.post('/bulk-permissions', auth, roleController.bulkUpdatePermissions);

// Permission Groups
router.get('/groups', auth, permissionGroupController.getPermissionGroups);
router.post('/groups', auth, permissionGroupController.createPermissionGroup);
router.put('/groups/:id', auth, permissionGroupController.updatePermissionGroup);
router.delete('/groups/:id', auth, permissionGroupController.deletePermissionGroup);

module.exports = router;
