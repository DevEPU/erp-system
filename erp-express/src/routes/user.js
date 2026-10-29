const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userProductGroupController = require('../controllers/userProductGroupController');
const auth = require('../middleware/auth');

router.get('/', auth, userController.getUsers);
router.get('/form-data', auth, userController.getFormData);
router.post('/', auth, userController.createUser);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);

// Product Groups
router.get('/groups', auth, userProductGroupController.getProductGroups);
router.post('/groups', auth, userProductGroupController.createProductGroup);
router.put('/groups/:id', auth, userProductGroupController.updateProductGroup);
router.delete('/groups/:id', auth, userProductGroupController.deleteProductGroup);

module.exports = router;
