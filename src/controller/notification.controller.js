const logger = require('../config/logger');
const {notificationService} = require('../services');
const _ = require('lodash');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
module.exports = {
    send: async function (req, res, next) {
        try {
            const {user, body} = req;

        } catch (error) {
            logger.error(error);
            next(error)
        }
    },

    getNotifications: async function (req, res, next) {
        try {
            const notifications = await notificationService.getUserNotification(req.user.id);
            
            res.status(httpStatus.OK).json({
                message: 'success',
                result: notifications
            })
        } catch (error) {
            logger.error(error);
            next(error)
        }
    }
}