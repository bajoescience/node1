const express = require('express');
const router = express.Router();
const youtubeController = require('../../controller/youtube.controller');
const auth = require('../../middleware/auth');

// router.post('/create', auth(), walletController.activate)

router.get('/videos/:username', auth(), youtubeController.getUserChannel)
router.get('/videos', youtubeController.getChannelByVideoId)

router.post('/ext/send', auth(), youtubeController.send)

module.exports = router