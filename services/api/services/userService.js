const User = require('../models/User');
const activityService = require('./activityService');
const logger = require('../utils/logger');
const runnerService = require('./runnerService');
const { sendPushNotification } = require('./notificationService');
const Order = require('../models/Order');
class UserService {
  /**
   * Update last login user
   */
  async updateLastLogin(id) {
    const user = await User.findById(id);

    if (!user) {
      throw new Error('User does not exist');
    }

    user.lastLogin = Date.now();
    await user.save();
  }

  /**
   * Get user by email or phone
   */
  async getUserByEmail(email, phone) {
    const user = await User.findOne({
      $or: [
        { email: email || '' },
        { phone: phone || '' }
      ]
    });

    if (!user) {
      throw new Error('Invalid credentials or user does not exist');
    }

    return user;
  }

  /**
   * Get runner by email or phone
   */
  async getRunnerByEmail(email, phone) {
    const runner = await User.findOne({
      $or: [
        { email: email || '' },
        { phone: phone || '' }
      ],
      role: 'runner'
    });

    if (!runner) {
      throw new Error('Invalid credentials or runner does not exist');
    }

    return runner;
  }

  /**
   * Find single user by id 
   */
  async getUserById(id) {
    const user = await User.findById(id);

    if (!user) {
      throw new Error('User does not exist');
    }

    return user;
  }

  /**
   * Get public user profile (excludes sensitive information)
   */
  async getPublicProfile(userId) {
    try {
      const user = await User.findById(userId).select('-email -phone -verificationToken -resetPasswordToken');

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User profile is not available');
      }

      // Only return public information
      const publicProfile = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        isEmailPublic: user.isEmailPublic,
        isPhonePublic: user.isPhonePublic,
        createdAt: user.createdAt,
        ...(user.isEmailPublic && { email: user.email }),
        ...(user.isPhonePublic && { phone: user.phone })
      };

      return publicProfile;
    } catch (error) {
      logger.error('UserService - Get public profile error:', error);
      throw error;
    }
  }

  /**
   * List users with pagination and filters
   */
  async listUsers(filters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo
      } = filters;

      const query = { role: 'user' };

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      if (isActive !== undefined) query.isActive = isActive;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -verificationToken -resetPasswordToken -pin')
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);

      
      const userIds = users.map(u => u._id);
      const orderCounts = await Order.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } }
      ]);

      const orderMap = {};
      orderCounts.forEach(o => { orderMap[o._id.toString()] = o; });

      const enriched = users.map(u => ({
        ...u,
        orderCount: orderMap[u._id.toString()]?.count ?? 0,
        totalSpent: orderMap[u._id.toString()]?.totalSpent ?? 0,
      }));

      return {
        users: enriched,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      logger.error('UserService - List users error:', error);
      throw error;
    }
  }

  /**
   * Update single user by id 
   */
  async updateUser(id, updateData) {
    try {

      const user = await User.findById(id);
      if (!user) {
        throw new Error('User does not exist');
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: false }
      );

      return updatedUser;
    } catch (error) {
      console.error('❌ UPDATE ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            notificationPreferences: preferences
          }
        },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('UserService - Update notification preferences error:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, role) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('UserService - Update user role error:', error);
      throw error;
    }
  }

  /**
   * Update user status (active/inactive)
   */
  async updateUserStatus(userId, statusUpdates, reason = '') {
    try {
      const updateData = {
        ...statusUpdates,
        ...(reason && { statusReason: reason })
      };

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('UserService - Update user status error:', error);
      throw error;
    }
  }

  /**
   * Add a new saved location to user profile
   */
  async addSavedLocation(userId, locationData) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (user.savedLocations && user.savedLocations.length >= 10) {
        throw new Error('Maximum of 10 saved locations reached');
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $push: { savedLocations: locationData } },
        { new: true, runValidators: true }
      );

      return updatedUser.savedLocations;
    } catch (error) {
      logger.error('UserService - Add saved location error:', error);
      throw error;
    }
  }

  /**
   * Remove a saved location
   */
  async removeSavedLocation(userId, locationId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedLocations: { _id: locationId } } },
        { new: true }
      );
      if (!user) throw new Error('User not found');
      return user.savedLocations;
    } catch (error) {
      logger.error('UserService - Remove saved location error:', error);
      throw error;
    }
  }

  /**
   * Get all saved locations for a user
   */
  async getSavedLocations(userId) {
    try {
      const user = await User.findById(userId).select('savedLocations').lean();
      if (!user) throw new Error('User not found');
      return user.savedLocations;
    } catch (error) {
      logger.error('UserService - Get saved locations error:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        throw new Error('User not found');
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error('UserService - Delete user error:', error);
      throw error;
    }
  }

  /**
   * Search users with advanced filters
   */
  async searchUsers(filters = {}) {
    try {
      const {
        query: searchQuery,
        isActive,
        isVerified,
        dateFrom,
        dateTo,
        hasPhone,
        hasAvatar
      } = filters;

      // Build search query - only 'user' role
      const query = { role: 'user' };

      if (searchQuery) {
        query.$or = [
          { firstName: { $regex: searchQuery, $options: 'i' } },
          { lastName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { phone: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      if (isActive !== undefined) query.isActive = isActive;
      if (isVerified !== undefined) query.isVerified = isVerified;

      // Special filters
      if (hasPhone !== undefined) {
        query.phone = hasPhone ? { $exists: true, $ne: '' } : { $exists: false };
      }

      if (hasAvatar !== undefined) {
        query.avatar = hasAvatar ? { $exists: true, $ne: '' } : { $exists: false };
      }

      // Date range
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const users = await User.find(query)
        .select('-password -verificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .limit(50);

      return { users, count: users.length };
    } catch (error) {
      logger.error('UserService - Search users error:', error);
      throw error;
    }
  }

  /**
   * Find nearby users (for runners to find customers)
   */
  async findNearbyUsers({
    latitude, longitude,
    // serviceType, 
    fleetType,
  }) {
    try {
      return await User.findNearbyUsers({
        latitude,
        longitude,
        // serviceType,
        fleetType,
      });
    } catch (error) {
      logger.error('UserService - Find nearby users error:', error);
      throw error;
    }
  }

  /**
   * Notify users about new nearby runners (for customers to find runners)
   */
  async notifyNearbyRunnersOfRequest({ latitude, longitude, fleetType, serviceType, orderId }) {
    try {
      const nearbyRunners = await runnerService.findNearbyRunners({
        pickupLat: latitude,
        pickupLng: longitude,
        fleetType,
      });

      if (!nearbyRunners.length) return;

      const serviceLabel = serviceType === 'run-errand' ? 'Run Errand' : 'Pick Up';

      await Promise.allSettled(
        nearbyRunners.map(runner =>
          sendPushNotification({
            recipientId: runner._id,
            recipientType: 'runner',
            title: `New ${serviceLabel} request near you`,
            body: `Hi ${runner.firstName || 'runner'}, a user near you needs a ${serviceLabel.toLowerCase()}. Tap to connect.`,
            data: { type: 'new_request_nearby', orderId, serviceType },
          })
        )
      );

      console.log(`[notifyNearbyRunners] Notified ${nearbyRunners.length} runners`);
    } catch (err) {
      console.error('[notifyNearbyRunners] failed:', err.message);
    }
  }


  /**
   * Get user activity
   */
  async getUserActivity(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        severity,
        status,
        dateFrom,
        dateTo,
        search
      } = options;

      const result = await activityService.getUserActivities(userId, {
        page,
        limit,
        action,
        severity,
        status,
        dateFrom,
        dateTo,
        search
      });

      return result;
    } catch (error) {
      logger.error('UserService - Get user activity error:', error);
      throw error;
    }
  }

  /**
   * Get user activity statistics
   */
  async getUserActivityStats(userId, days = 30) {
    try {
      return await activityService.getActivityStats(userId, days);
    } catch (error) {
      logger.error('UserService - Get user activity stats error:', error);
      throw error;
    }
  }

  /**
   * Get user security activities
   */
  async getUserSecurityActivities(userId, limit = 50) {
    try {
      return await activityService.getSecurityActivities(userId, limit);
    } catch (error) {
      logger.error('UserService - Get user security activities error:', error);
      throw error;
    }
  }

  /**
   * Perform bulk actions on users
   */
  async bulkUserAction(userIds, action, role) {
    try {
      let result;
      switch (action) {
        case 'delete':
          result = await User.deleteMany({ _id: { $in: userIds } });
          break;
        case 'change-role':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { role: role } }
          );
          break;
        case 'suspend':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { isActive: false } }
          );
          break;
        case 'deactivate':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { isActive: false } }
          );
          break;
        default:
          throw new Error('Invalid bulk action');
      }
      return { modifiedCount: result.modifiedCount || result.deletedCount };
    } catch (error) {
      logger.error('UserService - Bulk action error:', error);
      throw error;
    }
  }

  /**
   * Convert users data to CSV
   */
  convertToCSV(users, fields) {
    if (users.length === 0) return '';

    const headers = fields.join(',');
    const rows = users.map(user => {
      return fields.map(field => {
        let value = user[field];

        if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        value = String(value || '').replace(/"/g, '""');
        return `"${value}"`;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Export users based on filters
   */
  async exportUsers({ format, fields, dateFrom, dateTo }) {
    try {
      const query = { role: 'user' };
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const users = await User.find(query).lean();

      let data;
      let contentType;
      let filename = `users-export-${Date.now()}`;

      if (format === 'csv') {
        data = this.convertToCSV(users, fields);
        contentType = 'text/csv';
        filename += '.csv';
      } else {
        data = this.convertToCSV(users, fields);
        contentType = 'text/csv';
        filename += '.csv';
      }

      return { data, contentType, filename };
    } catch (error) {
      logger.error('UserService - Export users error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();