const httpStatus = require('http-status');
const {notify} = require('../services/notification.service');
const { ApiError } = require('../utils/ApiError');

const notificationProcessor = async (job, done) => {
    const notificationObject = job.data;
    try {
        console.log('sending notification', notificationObject.message)
        for(let recipient of notificationObject.recipients) {
            await notify(recipient, notificationObject)
        }
        done()
    }catch (error) {
        done(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `notification failed: -${notificationObject.message}`))
    }
}

module.exports = notificationProcessor;