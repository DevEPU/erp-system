const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const auth = require('../middleware/auth');

router.get('/', auth, bankAccountController.getBankAccounts);
router.post('/', auth, bankAccountController.createBankAccount);
router.put('/:id', auth, bankAccountController.updateBankAccount);
router.delete('/:id', auth, bankAccountController.deleteBankAccount);

module.exports = router;
