// controllers/notificationController.js

const BaseController = require('./baseController');
const User = require('../models/User');
const Runner = require('../models/Runner');

class NotificationController extends BaseController {
    constructor() {
        super();
        this.optIn = this.optIn.bind(this);
        this.optOut = this.optOut.bind(this);
        this.getPreferences = this.getPreferences.bind(this);
    }

    _getTargetId(req) {
        return req.params.userId || req.params.runnerId;
    }

    _getUserType(req) {
        if (req.params.runnerId) return 'runner';
        if (req.params.userId) return 'user';
        return req.body?.userType || req.query?.userType || 'user';
    }

    _getModel(userType) {
        return userType === 'runner' ? Runner : User;
    }

    _authorize(req, res, id) {
        const isSelf = !!id && req.user._id.toString() === id;
        const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
        if (!isSelf && !isAdmin) {
            this.error(res, 'Unauthorized', 403);
            return false;
        }
        return true;
    }

    /**
     * Opt in - Enable all push notifications
     */
    async optIn(req, res) {
        try {
            const id = this._getTargetId(req);
            const userType = this._getUserType(req);

            if (!this._authorize(req, res, id)) return;

            const Model = this._getModel(userType);
            const user = await Model.findById(id);

            if (!user) {
                return this.notFound(res, `${userType} not found`);
            }

            user.notificationPreferences.push.messages = true;
            user.notificationPreferences.push.updates = true;
            user.notificationPreferences.push.promotions = true;

            await user.save();

            return this.success(res, {
                notificationPreferences: user.notificationPreferences
            }, 'Successfully opted in to all notifications');
        } catch (err) {
            console.error('Error opting in:', err);
            return this.error(res, err.message || 'Failed to opt in');
        }
    }

    /**
     * Opt out - Disable all push notifications
     */
    async optOut(req, res) {
        try {
            const id = this._getTargetId(req);
            const userType = this._getUserType(req);

            if (!this._authorize(req, res, id)) return;

            const Model = this._getModel(userType);
            const user = await Model.findById(id);

            if (!user) {
                return this.notFound(res, `${userType} not found`);
            }

            user.notificationPreferences.push.messages = false;
            user.notificationPreferences.push.updates = false;
            user.notificationPreferences.push.promotions = false;

            await user.save();

            return this.success(res, {
                notificationPreferences: user.notificationPreferences
            }, 'Successfully opted out of all notifications');
        } catch (err) {
            console.error('Error opting out:', err);
            return this.error(res, err.message || 'Failed to opt out');
        }
    }

    async getPreferences(req, res) {
        try {
            const id = this._getTargetId(req);
            const userType = this._getUserType(req);

            if (!this._authorize(req, res, id)) return;

            const Model = this._getModel(userType);
            const user = await Model.findById(id).select('notificationPreferences');

            if (!user) {
                return this.notFound(res, `${userType} not found`);
            }

            return this.success(res, {
                notificationPreferences: user.notificationPreferences
            }, 'Preferences retrieved successfully');
        } catch (err) {
            console.error('Error getting preferences:', err);
            return this.error(res, err.message || 'Failed to get preferences');
        }
    }
}

module.exports = new NotificationController();