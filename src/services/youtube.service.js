const {Wallet} = require('../models/wallet.model');
const {User} = require('../models/user.model');
const fs = require('fs').promises;
const readline = require('readline');
let {google} = require('googleapis');
let OAuth2 = google.auth.OAuth2;
const config = require('../config');
const logger = require('../config/logger')

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
// var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
//         process.env.USERPROFILE) + '/.credentials/';
// var TOKEN_PATH = TOKEN_DIR + 'symbleapp.json';

function getOauthClient () {
    const credentials = {
        client_id: config.google_client_id, 
        client_secret: config.google_client_secret,
        redirect_uri: config.youtube.callback
    }
    const clientSecret = credentials.client_secret;
    const clientId = credentials.client_id;
    const redirectUrl = credentials.redirect_uri;

    const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
    return oauth2Client
}


module.exports = {
    getAuthClient: async (token) => {
        const oauth2Client = getOauthClient()
        oauth2Client.credentials = token;
        return oauth2Client
    },

    getAuthUrl: async (userID) => {
        const oauth2Client = getOauthClient()
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: userID
        });
    },

    confirmToken: async (code) => {
        const oauth2Client = getOauthClient()
        const token = await oauth2Client.getToken(code);
        if (!token) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'error while generating user token')
        oauth2Client.credentials = token;

        return oauth2Client;
    },

    getUserChannel: async(auth) => {
        const service = google.youtube('v3');
        const response = await service.channels.list({
            auth,
            part: 'contentDetails,snippet',
            mine: true
        })
        return {
            id: response.data.items[0].id,
            title: response.data.items[0].snippet.title,
        }
    },

    getChannelByVideoId: async(video_id) => {
        const service = google.youtube('v3');
        // console.log(config.youtube.api_key)
        const response = await service.videos.list({
            id: [video_id],
            key: config.youtube.api_key,
            part: 'contentDetails,snippet',
            
        })
        return response.data.items[0].snippet.channelId
    }

}