const User = require('../models/User');

const isRunner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role !== 'runner') {
    return res.status(403).json({ success: false, message: 'Access denied. Only runners can perform this action.' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const role = req.headers['x-admin-role'] || req.user?.role;
  if (!['admin', 'super-admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
};

const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const role = req.headers['x-admin-role'] || req.user?.role;
  if (role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super admin privileges required.' });
  }
  next();
};

const isRunnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const role = req.headers['x-admin-role'] || req.user?.role;
  if (!['runner', 'admin', 'super-admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Insufficient privileges.' });
  }
  next();
};

const requireBusiness = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const user = await User.findById(req.user._id).select('accountType businessProfile');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (user.accountType !== 'business') {
        return res.status(403).json({ success: false, message: 'This feature requires a business account.' });
      }

      if (allowedRoles.length === 0) {
        req.businessUser = user;
        return next();
      }

      const isOwner = user.businessProfile?.members?.[0]?.userId?.toString() === req.user._id.toString();
      if (isOwner) {
        req.businessUser = user;
        return next();
      }

      const member = user.businessProfile?.members?.find(
        (m) => m.userId.toString() === req.user._id.toString()
      );

      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ success: false, message: "You don't have permission to do this." });
      }

      req.businessUser = user;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error checking business permissions' });
    }
  };
};

module.exports = {
  isRunner,
  isAdmin, 
  isSuperAdmin, 
  isRunnerOrAdmin, 
  requireBusiness
};