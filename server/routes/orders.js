const express = require('express');
const { getOrders, getOrderById, getStats, getAnalytics } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// All order routes require authentication + admin/support role
router.use(verifyToken, requireRole('admin', 'support'));

router.get('/stats',     getStats);
router.get('/analytics', getAnalytics);
router.get('/',          getOrders);
router.get('/:id',       getOrderById);

module.exports = router;

