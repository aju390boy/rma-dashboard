/**
 * Role-Based Access Control middleware factory.
 * Usage: router.post('/approve', verifyToken, requireRole('admin', 'support'), handler)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: [${roles.join(', ')}]. Your role: '${req.user.role}'`,
      });
    }
    next();
  };
};

module.exports = { requireRole };
