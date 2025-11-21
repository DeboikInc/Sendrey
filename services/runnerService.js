const User = require('../models/User');

class RunnerService {
  /**
   * Find nearby runners within specified distance
   */
  async findNearbyRunners({ latitude, longitude, serviceType, fleetType, maxDistance = 2000 }) {
    return await User.findNearbyRunners({
      latitude,
      longitude,
      serviceType,
      fleetType,
      maxDistance
    });
  }

  /**
   * Get all runners with optional filters
   */
  async getAllRunners(serviceType, fleetType) {
    const query = { role: 'runner' };

    if (serviceType) query.serviceType = serviceType;
    if (fleetType) query.fleetType = fleetType;

    return await User.find(query)
      .select('firstName lastName phone fleetType serviceType location latitude longitude isOnline isAvailable')
      .lean();
  }

  /**
   * Find runners by service type
   */
  async findRunnersByServiceType(serviceType) {
    return await User.find({ 
      role: 'runner',
      serviceType 
    })
      .select('firstName lastName phone fleetType serviceType location latitude longitude isOnline isAvailable')
      .lean();
  }

  /**
   * Get online runners with optional filters
   */
  async getOnlineRunners(serviceType, fleetType) {
    const query = {
      role: 'runner',
      isOnline: true,
      isAvailable: true
    };

    if (serviceType) query.serviceType = serviceType;
    if (fleetType) query.fleetType = fleetType;

    return await User.find(query)
      .select('firstName lastName phone fleetType serviceType location latitude longitude isOnline')
      .lean();
  }

  /**
   * Update runner location
   */
  async updateRunnerLocation(userId, latitude, longitude) {
    const runner = await User.findByIdAndUpdate(
      userId,
      {
        latitude,
        longitude,
        lastLocationUpdate: new Date()
      },
      { new: true }
    ).select('firstName lastName location latitude longitude lastLocationUpdate');

    if (!runner) {
      throw new Error('Runner not found');
    }

    return runner;
  }

  /**
   * Set runner online status
   */
  async setRunnerOnlineStatus(userId, isOnline, isAvailable) {
    const updateData = { lastActive: new Date() };
    
    if (typeof isOnline === 'boolean') {
      updateData.isOnline = isOnline;
    }
    
    if (typeof isAvailable === 'boolean') {
      updateData.isAvailable = isAvailable;
    }

    const runner = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('firstName lastName isOnline isAvailable');

    if (!runner) {
      throw new Error('Runner not found');
    }

    return runner;
  }

  /**
   * Get runner statistics
   */
  async getRunnerStats() {
    const totalRunners = await User.countDocuments({ role: 'runner' });
    const onlineRunners = await User.countDocuments({ role: 'runner', isOnline: true });
    const availableRunners = await User.countDocuments({ 
      role: 'runner', 
      isOnline: true, 
      isAvailable: true 
    });

    const runnersByService = await User.aggregate([
      { $match: { role: 'runner' } },
      { $group: { _id: '$serviceType', count: { $sum: 1 } } }
    ]);

    const runnersByFleet = await User.aggregate([
      { $match: { role: 'runner' } },
      { $group: { _id: '$fleetType', count: { $sum: 1 } } }
    ]);

    return {
      total: totalRunners,
      online: onlineRunners,
      available: availableRunners,
      byService: runnersByService,
      byFleet: runnersByFleet
    };
  }
}

module.exports = new RunnerService();