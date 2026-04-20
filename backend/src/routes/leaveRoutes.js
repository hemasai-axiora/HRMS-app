const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { rbacMiddleware, requireRole } = require('../rbac/rbacMiddleware');
const {
  createLeaveRequest,
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getMyLeaves,
  getLeaveBalance,
} = require('../controllers/leaveController');

router.get('/', authenticate, rbacMiddleware('LEAVE', 'VIEW'), getLeaveRequests);
router.get('/my', authenticate, getMyLeaves);
router.get('/balance', authenticate, getLeaveBalance);

router.post('/', authenticate, rbacMiddleware('LEAVE', 'CREATE'), createLeaveRequest);

router.put('/:id/approve', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), approveLeave);
router.put('/:id/reject', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rejectLeave);
router.put('/:id/cancel', authenticate, cancelLeave);

module.exports = router;