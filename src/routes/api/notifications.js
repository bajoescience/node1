const express = require('express');
const router = express.Router();
const notificationController = require('../../controller/notification.controller');
const auth = require('../../middleware/auth');

router.route('/')
    .get(auth(), notificationController.getNotifications)

module.exports = router