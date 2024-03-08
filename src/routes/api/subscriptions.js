const express = require('express');
const subscriptionController = require('../../controller/subscription.controller');
const router = express.Router();

router.post('/', subscriptionController.suscribe)
router.post('/send', subscriptionController.sendNotifications)

module.exports = router;