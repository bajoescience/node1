const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const subscriptionObject = {
    endpoint: {type: String, required: true},
    keys: {
        auth: String,
        p256dh: String,
    }
}

const subscriptionSchema = new Schema(subscriptionObject, {timestamps: true});
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = {Subscription};