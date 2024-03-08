const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { notification: { notification_state, channels } } = require('../utils/helpers')

const notificationObject = {
    channel: { type: String, default: channels.notification },
    type: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],
    message: { type: String, required: true },
    state: { enum: Object.values(notification_state), type: String, default: notification_state.unread },
    date_read: Date,
    data: {type: Object}
}

const notificationSchema = new Schema(notificationObject, { timestamps: true, toJSON: { getters: true } })
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification }