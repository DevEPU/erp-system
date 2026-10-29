const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const auth = require('../middleware/auth');

// Master Budgets (Supports both direct and prefixed paths)
// Master Budgets (Direct)
router.get('/master-budgets', auth, budgetController.getMasterBudgets);
router.post('/master-budgets', auth, budgetController.createMasterBudget);
router.put('/master-budgets/:id', auth, budgetController.updateMasterBudget);
router.delete('/master-budgets/:id', auth, budgetController.deleteMasterBudget);
router.post('/master-budgets/:id/sync-target', auth, budgetController.syncMasterBudgetWithTargetSales);
router.patch('/master-budgets/:id/toggle-active', auth, budgetController.toggleActiveMasterBudget);
router.post('/master-budgets/:id/toggle-active', auth, budgetController.toggleActiveMasterBudget);

// Master Budgets (Budgeting Prefix)
router.get('/budgeting/master-budgets', auth, budgetController.getMasterBudgets);
router.post('/budgeting/master-budgets', auth, budgetController.createMasterBudget);
router.put('/budgeting/master-budgets/:id', auth, budgetController.updateMasterBudget);
router.delete('/budgeting/master-budgets/:id', auth, budgetController.deleteMasterBudget);
router.patch('/budgeting/master-budgets/:id/toggle-active', auth, budgetController.toggleActiveMasterBudget);
router.post('/budgeting/master-budgets/:id/toggle-active', auth, budgetController.toggleActiveMasterBudget);

// Target Sales (Direct)
router.get('/target-sales', auth, budgetController.getTargetSales);
router.post('/target-sales', auth, budgetController.createTargetSales);
router.put('/target-sales/:id', auth, budgetController.updateTargetSales);
router.delete('/target-sales/:id', auth, budgetController.deleteTargetSales);

// Target Sales (Budgeting Prefix)
router.get('/budgeting/target-sales', auth, budgetController.getTargetSales);
router.post('/budgeting/target-sales', auth, budgetController.createTargetSales);
router.put('/budgeting/target-sales/:id', auth, budgetController.updateTargetSales);
router.delete('/budgeting/target-sales/:id', auth, budgetController.deleteTargetSales);

// Summary & Form Utility (Budgeting Prefix)
router.get('/budgeting/form-data', auth, budgetController.getBudgetingFormData);
router.get('/budgeting/master-budget-summary', auth, budgetController.getMasterBudgetSummary);
router.get('/budgeting/target-sales-summary', auth, budgetController.getTargetSalesSummary);
router.post('/budgeting/check-category-budget', auth, budgetController.checkCategoryBudget);
router.get('/budgeting/available-budgets', auth, budgetController.getAvailableBudgets);
router.get('/budgeting/available-borrow-sources', auth, budgetController.getAvailableBorrowSources);

// Other Utility Routes
router.get('/check-budget', auth, budgetController.checkBudget);

module.exports = router;
