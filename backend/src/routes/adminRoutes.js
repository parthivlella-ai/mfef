const express = require('express');
const router = express.Router();
const {
  getAdminDashboardStats,
  getAllUsers,
  getUserMedicineStats,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAuditLogs,
  getSystemHealth,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getAdminDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id/stats', getUserMedicineStats);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/audit-logs', getAuditLogs);
router.get('/system-health', getSystemHealth);

module.exports = router;
