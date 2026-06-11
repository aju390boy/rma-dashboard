const express = require('express');
const { transitionOrder, getAuditLog, getPendingRMAs } = require('../controllers/rmaController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);

// Pending RMAs — admin & support
router.get('/pending', requireRole('admin', 'support'), getPendingRMAs);

// Audit log — admin & support
router.get('/:orderId/audit', requireRole('admin', 'support'), getAuditLog);

// FSM transition — admin & support (role further checked inside FSM)
router.patch('/:orderId/transition', requireRole('admin', 'support'), transitionOrder);

module.exports = router;
