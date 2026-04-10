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

      const user = await User.findById(req.user._id)
        .select('accountType businessProfile teamMembership');

      console.log('requireBusiness debug:', {
        userId: req.user._id,
        accountType: user?.accountType,
        teamMembership: user?.teamMembership,
        allowedRoles,
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      // ── Path A: User is the business owner ──────────────────────────────
      if (user.accountType === 'business') {
        // No role restriction = any business user can proceed
        if (allowedRoles.length === 0) {
          req.businessOwner = user;
          req.businessProfile = user.businessProfile;
          req.businessRole = 'owner';
          return next();
        }

        // Owners bypass role restrictions — they can do everything
        req.businessOwner = user;
        req.businessProfile = user.businessProfile;
        req.businessRole = 'owner';
        return next();
      }

      // ── Path B: User is a team member ───────────────────────────────────
      const membership = user.teamMembership;

      if (!membership?.businessOwnerId) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a business account.',
        });
      }

      // Only accepted members can access business features
      if (membership.status !== 'accepted') {
        return res.status(403).json({
          success: false,
          message: 'Your team membership is not yet active.',
        });
      }

      // No role restriction = any accepted member can proceed
      if (allowedRoles.length === 0) {
        const owner = await User.findById(membership.businessOwnerId)
          .select('businessProfile');
        req.businessOwner = owner;
        req.businessProfile = owner?.businessProfile;
        req.businessRole = membership.role;
        return next();
      }

      // Enforce role restriction
      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to do this.",
        });
      }

      const owner = await User.findById(membership.businessOwnerId)
        .select('businessProfile');

      req.businessOwner = owner;
      req.businessProfile = owner?.businessProfile;
      req.businessRole = membership.role;
      next();

    } catch (error) {
      console.error('requireBusiness error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking business permissions',
      });
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