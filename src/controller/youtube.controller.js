const userService = require('../services/user.service');
const youtubeService = require('../services/youtube.service')
const { ApiError } = require('../utils/ApiError');
const pick = require('../utils/pick');
const httpStatus = require('http-status');
const logger = require('../config/logger')
const tokenService = require('../services/token.service');
const config = require('../config');
const walletService = require('../services/wallet.service')

const tokenx = {
    access_token: "ya29.a0AVA9y1tdG2tLNC8ZJr8zU72kIYBYYBRf-TBlr0c6wLoplR12y0y36berWVlfejUcj6mDmQ5R06rjHtFKq5LoTs-ptHc8X_mP5PPmCtXKiw_cNABqVyWUjTuNmzwybx-KLGJfJE4OIRthfgh52JSGl4fxjGQsaCgYKATASAQASFQE65dr8sZCeO8cVqTnfYB6SrjZbQw0163",
    refresh_token: "1//03Le9-alTct2SCgYIARAAGAMSNwF-L9IrgtoDrDIIdQSfFiMd3euKmAX57C897iBRTw57_o32Bd9-qIgogZ6BOKu7bruQYDF7EtY",
    scope: "https://www.googleapis.com/auth/youtube.readonly",
    token_type: "Bearer",
    expiry_date: 1661546217356
}

module.exports = {
    getUserChannel: async (req, res, next) => {
        try {
            const token = await tokenService.getUserToken({owner:req.user.id, apis: 'youtube'}, ['youtube_api'])
            if (!token) {
                const auth = youtubeService.getAuthUrl()
                res.status(httpStatus.UNAUTHORIZED).json({
                    message:'Unauthorized to access user youtube content',
                    description: 'User has not granted symble app permission to access their youtube videos',
                    redirectURL: auth
                })
            }

            const auth = await youtubeService.getAuthClient(token.youtube_api)
            const data = await youtubeService.getUserChannel(auth)
            await userService.update({_id: req.user.id}, {youtube_channel: data.id})

            res.status(httpStatus.OK).json({
                message:`successful`,
                data
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    confirmToken: async (req, res, next) => {
        try {
            const user_id = req.query.state
            const code = req.query.code
            
            let auth = await youtubeService.confirmToken(code)
            await tokenService.store(auth.credentials.tokens, {_id: user_id })

            auth = await youtubeService.getAuthClient(auth.credentials.tokens)
            const data = await youtubeService.getUserChannel(auth)

            await userService.update({_id: user_id}, { 
                youtube: { 
                    enabled: true, 
                    channel: data.id,
                    title: data.title
                } 
            })
            const url = config.client_url + '/profile?channel' + data.title
            res.redirect(url)
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    getAuthUrl: async (req, res, next) => {
        try {
            const url = await youtubeService.getAuthUrl(req.user.id)

            res.status(httpStatus.OK).json({
                message:`successful`,
                redirectURL: url
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    send: async(req, res, next) => {
        try {
            let {amount} = req.body
            amount = parseFloat(amount)

            if (amount <= 0.00) throw new ApiError(httpStatus.BAD_REQUEST, 'amount to little');
            const from = await userService.getUser({_id: req.user.id})
            const data = await youtubeService.getChannelByVideoId(req.body.videoId)
            const to = await userService.getUser({"youtube.channel": data})

            await walletService.send({_id: req.user.id}, to, amount, from.pin)

            res.status(httpStatus.OK).json({
                message:`successful`,
                data: {
                    benefactor: to.username,
                    amount
                }
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    getChannelByVideoId: async(req, res, next) => {
        try {
            const data = await youtubeService.getChannelByVideoId(req.body.videoId)
            const user = await userService.getUser({"youtube.channel": data})

            res.status(httpStatus.OK).json({
                message:`successful`,
                data
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    }
}