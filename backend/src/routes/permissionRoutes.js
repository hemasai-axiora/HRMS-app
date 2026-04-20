const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole, rbacMiddleware } = require('../rbac/rbacMiddleware');
const {
  getUserPermissions,
  getAllPermissions,
  updateUserPermissions,
  resetToDefault,
} = require('../controllers/permissionController');

router.get('/user/:userId', authenticate, getUserPermissions);
router.get('/all', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), getAllPermissions);
router.put('/user/:userId', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), updateUserPermissions);
router.post('/reset/:userId', authenticate, requireRole('SUPER_ADMIN'), resetToDefault);

module.exports = router;