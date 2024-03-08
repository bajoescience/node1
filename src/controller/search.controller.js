const eventService = require('../services/event.service');
const { event: { event_status, event_type } } = require('../utils/helpers');
const userService = require('../services/user.service');
const pick = require('../utils/pick');
const httpStatus = require('http-status');
const logger = require('../config/logger')

const public_user_select_options = 'name qrcode username avatar followersCount followers following followingCount events products'

module.exports = {
	search: async (req, res, next) => {
        try {
            const filter = pick(req.query, ['query']);
            filter['type'] = { $ne: event_type.PRIVATE }
            filter['status'] = { $in: [event_status.ACTIVE, event_status.PENDING] }
            let results = {}
            results['events'] = await eventService.search(filter)
            results['users'] = await userService.search(filter)
            res.status(httpStatus.OK).json({
                message: "successful",
                data: results
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },
}