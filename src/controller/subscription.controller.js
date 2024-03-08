const subscriptionService = require('../services/subscription.service');
const httpStatus = require('http-status');
const _ = require('lodash');

module.exports = {
    suscribe: async function (req, res, next) {
        try {
            const params = req.body;
            // validate params
            const newSubscription = await subscriptionService.create(params);
            res.status(httpStatus.OK).json({message: 'success', result: newSubscription})
        } catch (error) {
            console.log(error)
            next(error);
        }
    }, 

    sendNotifications: async function(req, res, next) {
        try {

            const allSubscriptions = await subscriptionService.getAll();

            const payload = req.body;

            if(!(_.isEmpty(allSubscriptions))) {
                console.log('subscription not empty')
                for (let subscription of allSubscriptions) {
                    await Promise.all([
                        subscriptionService.sendNotification(subscription, payload),
                        subscriptionService.remove(subscription._id)
                    ])
                }
            }

            res.status(httpStatus.OK).json({
                message: 'success'
            })
            
        } catch (error) {
            console.log(error.message)
            next(error)
        }
    }
}