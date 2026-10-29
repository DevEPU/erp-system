const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const productTypeController = require('../controllers/productTypeController');
const shiftController = require('../controllers/shiftController');
const auth = require('../middleware/auth');

// Currencies
router.get('/currencies', auth, masterController.getCurrencies);
router.post('/currencies', auth, masterController.createCurrency);
router.put('/currencies/:id', auth, masterController.updateCurrency);
router.delete('/currencies/:id', auth, masterController.deleteCurrency);

// Units
router.get('/units', auth, masterController.getUnits);
router.post('/units', auth, masterController.createUnit);
router.put('/units/:id', auth, masterController.updateUnit);
router.delete('/units/:id', auth, masterController.deleteUnit);

// Categories
router.get('/product-categories', auth, masterController.getProductCategories);
router.get('/product-categories/:id', auth, masterController.getCategoryDetail);
router.post('/product-categories', auth, masterController.createProductCategory);
router.put('/product-categories/:id', auth, masterController.updateProductCategory);
router.delete('/product-categories/:id', auth, masterController.deleteProductCategory);

// Taxes
router.get('/ppn', auth, masterController.getPpn);
router.post('/ppn', auth, masterController.createPpn);
router.put('/ppn/:id', auth, masterController.updatePpn);
router.delete('/ppn/:id', auth, masterController.deletePpn);

router.get('/pph', auth, masterController.getPph);
router.post('/pph', auth, masterController.createPph);
router.put('/pph/:id', auth, masterController.updatePph);
router.delete('/pph/:id', auth, masterController.deletePph);

// Departments
router.get('/departments', auth, masterController.getDepartments);
router.post('/departments', auth, masterController.createDepartment);
router.put('/departments/:id', auth, masterController.updateDepartment);
router.delete('/departments/:id', auth, masterController.deleteDepartment);

// Supplier Groups
router.get('/supplier-groups', auth, masterController.getSupplierGroups);
router.post('/supplier-groups', auth, masterController.createSupplierGroup);
router.put('/supplier-groups/:id', auth, masterController.updateSupplierGroup);
router.delete('/supplier-groups/:id', auth, masterController.deleteSupplierGroup);

// Payment Terms
router.get('/payment-terms', auth, masterController.getPaymentTerms);
router.post('/payment-terms', auth, masterController.createPaymentTerm);
router.put('/payment-terms/:id', auth, masterController.updatePaymentTerm);
router.delete('/payment-terms/:id', auth, masterController.deletePaymentTerm);

// Chart of Accounts
router.get('/chart-of-accounts', auth, masterController.getChartOfAccounts);
router.post('/chart-of-accounts', auth, masterController.createChartOfAccount);
router.put('/chart-of-accounts/:id', auth, masterController.updateChartOfAccount);
router.delete('/chart-of-accounts/:id', auth, masterController.deleteChartOfAccount);

// Tipe Barang Jadi
router.get('/tipe-barang-jadi', auth, masterController.getTipeBarangJadi);
router.post('/tipe-barang-jadi', auth, masterController.createTipeBarangJadi);
router.put('/tipe-barang-jadi/:id', auth, masterController.updateTipeBarangJadi);
router.delete('/tipe-barang-jadi/:id', auth, masterController.deleteTipeBarangJadi);

// Tipe Barang (Product Types)
router.get('/product-types', auth, productTypeController.getProductTypes);
router.post('/product-types', auth, productTypeController.createProductType);
router.put('/product-types/:id', auth, productTypeController.updateProductType);
router.delete('/product-types/:id', auth, productTypeController.deleteProductType);

// Shifts
router.get('/shifts', auth, shiftController.getShifts);
router.post('/shifts', auth, shiftController.createShift);
router.put('/shifts/:id', auth, shiftController.updateShift);
router.delete('/shifts/:id', auth, shiftController.deleteShift);

module.exports = router;
