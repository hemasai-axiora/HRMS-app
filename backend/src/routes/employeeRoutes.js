const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { rbacMiddleware, requireRole } = require('../rbac/rbacMiddleware');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  updateDepartment,
  createDepartment,
  getOrgChart,
} = require('../controllers/employeeController');

router.get('/departments', authenticate, getDepartments);
router.post('/departments', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), createDepartment);
router.put('/departments/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), updateDepartment);

router.get('/org-chart', authenticate, getOrgChart);

router.get('/', authenticate, rbacMiddleware('EMPLOYEES', 'VIEW'), getAllEmployees);
router.get('/:id', authenticate, rbacMiddleware('EMPLOYEES', 'VIEW'), getEmployeeById);
router.post('/', authenticate, rbacMiddleware('EMPLOYEES', 'CREATE'), createEmployee);
router.put('/:id', authenticate, rbacMiddleware('EMPLOYEES', 'EDIT'), updateEmployee);
router.delete('/:id', authenticate, rbacMiddleware('EMPLOYEES', 'DELETE'), deleteEmployee);

module.exports = router;