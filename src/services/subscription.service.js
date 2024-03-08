const { Subscription } = require('../models/subscription.model');
const webPush = require('web-push');
const { vapid_keys } = require('../config');

webPush.setVapidDetails('mailto:hey@symble.live', vapid_keys.public, vapid_keys.private);

module.exports = {
    create: async function (params) {
        const newSubscription = new Subscription(params);
        await newSubscription.save();
        return newSubscription.toObject();
    },

    getAll: async function () {
        const allSubscription = await Subscription.find();
        return allSubscription;
    },

    getByType: async function (type) {
        const subscriptions = await Subscription.find({ type });
        return subscriptions
    },

    remove: async function (subscriptionId) {
        await Subscription.deleteOne({ _id: subscriptionId });
    },

    sendNotification: async function (subscription, payload) {
        const result = await webPush.sendNotification(subscription, JSON.stringify(payload));
        console.log({result})
        return result;
    }
}