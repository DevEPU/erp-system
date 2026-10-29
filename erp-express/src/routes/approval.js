const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const auth = require('../middleware/auth');

// Master Budgets (Direct)
router.get('/approval-types', auth, approvalController.getApprovalTypes);
router.post('/approval-types', auth, approvalController.createApprovalType);
router.get('/approval-rules', auth, approvalController.getApprovalRules);
router.get('/approval-rules/form-data', auth, approvalController.getApprovalRulesFormData);
router.post('/approval-rules', auth, approvalController.createApprovalRule);
router.put('/approval-rules/:id', auth, approvalController.updateApprovalRule);
router.delete('/approval-rules/:id', auth, approvalController.deleteApprovalRule);

router.get('/approval-requests', auth, approvalController.getApprovalRequests);
router.get('/pending-counts', auth, approvalController.getPendingCounts);
router.get('/notifications', auth, approvalController.getNotifications);
router.post('/approval-requests/:id/approve', auth, approvalController.approveRequest);
router.post('/approval-requests/:id/reject', auth, approvalController.rejectRequest);

// Master Budgets (Approvals Prefix)
router.get('/approvals/approval-types', auth, approvalController.getApprovalTypes);
router.post('/approvals/approval-types', auth, approvalController.createApprovalType);
router.get('/approvals/approval-rules', auth, approvalController.getApprovalRules);
router.get('/approvals/approval-rules/form-data', auth, approvalController.getApprovalRulesFormData);

router.get('/approvals/approval-requests', auth, approvalController.getApprovalRequests);
router.get('/approvals/pending-counts', auth, approvalController.getPendingCounts);
router.get('/approvals/notifications', auth, approvalController.getNotifications);
router.post('/approvals/approval-requests/:id/approve', auth, approvalController.approveRequest);
router.post('/approvals/approval-requests/:id/reject', auth, approvalController.rejectRequest);

module.exports = router;
