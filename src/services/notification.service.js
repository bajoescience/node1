const Pusher = require('pusher');
const { pusher: { appId, key, secret, cluster } } = require('../config');
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const { Notification } = require('../models/notification.model');
const _ = require('lodash');
const {getQueue} = require('../config/bull');

const pusher = new Pusher({ appId, key, secret, cluster })

module.exports = {
    getNotification: async (query) => {
        const notification = await Notification.findOne(query);
        if (!notification) throw new ApiError(httpStatus.NOT_FOUND, 'notification not found');
        return notification
    },

    getNotifications: async (query) => {
        const notifications = await Notification.find(query).sort({ createdAt: -1 });
        if (!notifications || _.isEmpty(notifications)) throw new ApiError(httpStatus.NOT_FOUND, 'notifications not found');
        return notifications
    },

    getUserNotification: async (userId) => {
        const query = {
            recipients: { $in: [userId] }
        }
        const notification = await Notification.find(query).populate({
            path: 'sender',
            select: 'username avatar email'
        })  
        if (!notification) throw new ApiError(httpStatus.NOT_FOUND, 'user notification not found');
        return notification
    },

    /**
     * * saves notification to db and triggers pusher notification
     * @param {object} notificationObject
     */
    trigger: async (notificationObject) => {        
        const newNotification = new Notification(notificationObject);
        await newNotification.save();
        if (!newNotification) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'error creating notification', 'unable to save notification to db, please contacts devs');

        if (newNotification.recipients.length) {
            // ! need to implement queues for this
            const notificationQueue = getQueue('notifications');
            notificationQueue.add(newNotification, {priority: 1})
        }
    },

    notify: async (recipient, data) => {
        console.log('recipient: ', `${data.type}-${recipient}`)
        return await pusher.trigger(data.channel, `${data.type}-${recipient}`, data);
    }
}