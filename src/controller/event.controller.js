const { sessionSettings, notification: {notification_types} ,event: { event_status, event_type, event_class }, wallet: { actions }, transaction: { transaction_type, payment_status } } = require('../utils/helpers');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger')
const pick = require('../utils/pick');
const _ = require('lodash');
const mongoose = require('mongoose');
const {walletService, notificationService, eventService, userService, transactionService} = require('../services');

const categories = {
    '0' : 'concert',
    '1' : 'auction',
    '2' : 'marketing',
    '3' : 'podcasts',
    '4' : 'parties',
    '5' : 'charity donations',
    '6' : 'adverts',
    '7' : 'live commerce',
    '8' : 'comedy shows',
    '9' : 'education',
}

module.exports = {    
    createEvent: async (req, res, next) => {
        try {
            let filter = {
                '$and' : [
                    {'owner': req.user.id},
                    {'status': { '$nin' :  [event_status.CANCELLED, event_status.COMPLETED] } }
                ]
            }
            const pendingEvents = await eventService.queryEvents(filter);
            if (pendingEvents.length != 0) throw new ApiError(httpStatus.BAD_REQUEST, 'User has an active event', "Pending or active events needs to be closed before creating a new event");

            const eventDetail = req.body
            if (!eventDetail.isPublic) eventDetail['type'] = 'PRIVATE'
            if (!eventDetail.isFree && eventDetail.isScheduled) {
                eventDetail['class'] = 'PAID'
            }
            if (eventDetail.isScheduled) {
                eventDetail['start_date'] = new Date(eventDetail.scheduledDate);
            }

            const event = await eventService.createEvent(req.user, eventDetail);
            await userService.update({ _id:req.user.id }, { $push: { events: event.id } });
            // notify followers that user just created an event
            const {followers, user_id: ownerId, username: ownerUsername} = await userService.getFollowerData(req.user.id);
            // create a new notification object
            const notificationData = await eventService.showEventDetails({event_code: event.event_code});
            const notificationObject = {
                type: event.isScheduled ? notification_types.event.created : notification_types.event.instant,
                sender: ownerId,
                recipients: [...followers],
                message: `${ownerUsername} just posted an event, you do not want to miss this`,
                data: notificationData
            }

            await notificationService.trigger(notificationObject)
            
            res.status(httpStatus.OK).json({message: 'event created', data:event})
        } catch (error) {
            logger.error(error)
            next(error)
        }
    }, 

    // view all user events
    getAllEvents: async (req, res, next) => {
        try {
            const filter = pick(req.query, ['name']);
            let options = pick(req.query, ['sortBy', 'limit', 'page']);
            options['populate'] = [
                { path: 'owner', select: 'username name avatar' }
            ]
            filter['type'] = { $ne: event_type.PRIVATE }
            filter['status'] = { $in: [event_status.ACTIVE, event_status.PENDING] }

            const events = await eventService.getAllPublicEvents(filter, options);
            
            res.status(httpStatus.OK).json({
                message: "successful",
                ...events
            })

        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    getUserEvents: async (req, res, next) => {
        try {
            // if (!req.params.username) throw new ApiError(httpStatus.NOT_FOUND, 'username not found')
            const events = await eventService.queryEvents({
                owner: req.user.id, 
                status: { $in: [event_status.ACTIVE, event_status.PENDING] }
            })
            res.status(httpStatus.OK).json({
                message: "successful",
                data: events
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    cancelMany: async (req, res, next) => {
        try {
            // if (!req.params.username) throw new ApiError(httpStatus.NOT_FOUND, 'username not found')
            const events = await eventService.cancelMany({
                owner: req.user.id,
                _id: req.params.event_id,
            })

            console.log(events, "events to cancel")
            res.status(httpStatus.OK).json({
                message: "successful"
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    update: async (req, res, next) => {
        try {
            const {event_code} = req.params
            const params = req.body
            let {status, type} = params

            const query = {
                "$and": [
                    {'event_code': event_code},
                    {'owner': req.user.id},
                    {"status": {"$nin": [event_status.CANCELLED, event_status.COMPLETED]}}
                ]
            }
            let event = await eventService.getEvent(query)
            if (!event) throw new ApiError(httpStatus.NOT_FOUND, 'Event not found')
            if (status) {  
                status = status.toUpperCase()
                if (!event_status[status]) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid event status') 
                if (status == event_status.CANCELLED) {
                    params["finishTime"] = Date.now();
                }
                params['status'] = status
            }
            if (type) {
                type = type.toUpperCase()
                if (!event_type[type]) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid event type')
                    params['type'] = type
            }

            event = await eventService.update(event_code, params)

            res.status(httpStatus.OK).json({
                message: 'successfully changed event details',
                data: event
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    joinLiveStream: async (req, res, next) => {
        try {
            const {user, params} = req;
            const participant = await userService.getUser({_id: user.id})

            const {event_code} = params;
            if(!event_code || _.isEmpty(params)) throw new ApiError(httpStatus.BAD_REQUEST, 'event code required', "event code not provided in request params");

            let query = {
                event_code,
                '$and': [
                    {"participants.user_id": participant._id},
                    {'participants.is_active': true}
                ],
                "status": {"$nin": [event_status.CANCELLED, event_status.COMPLETED]}
            }

            const event = await eventService.getEvent(query);
            const participantIsOwner = event.owner.id.toString() == participant._id.toString()
            // validate the token first
            const roomTokenValid = eventService.validateRoomToken(event)
            // !only owner can create the room
            if(participantIsOwner && !event.room_token || participantIsOwner && !roomTokenValid) {
                await eventService.setRoomId(event);
            }

            const participantData = await eventService.setParticipantToken(event, req.user.id);
            const eventData = await eventService.showEventDetails({event_code})
            
            res.status(httpStatus.OK).json({
                message: `successfully retrieved room data for event: ${event_code}`,
                data: {
                    participantData,
                    event: eventData,
                    roomData: {
                        room_id: event.room_id, 
                        room_token: event.room_token
                    }
                }
            })
        }catch(error) {
            logger.error(error.message)
            next(error) 
        }
    },

    start: async (req, res, next) => {
        try {
            const {event_code} = req.params
            const isUserOwner = eventService.isUserOwner(event_code, req.user.id)
            const owner = await userService.getUser({_id: req.user.id})
            if (!isUserOwner) throw new ApiError(httpStatus.UNAUTHORIZED, 'User not allowed')
            const event = await eventService.start(event_code);
            const {followers} = await userService.getFollowerData(event.owner._id)

            if(event.isScheduled) {
                const notificationData = await eventService.showEventDetails({event_code: event.event_code})
                const notificationObject = {
                    type: notification_types.event.start,
                    sender: owner._id,
                    recipients: [...followers, ...event.subscribers],
                    message: `${event.name} is starting now`,
                    data: notificationData
                }
                // notify subscribers
                await notificationService.trigger(notificationObject)
            }

            res.status(httpStatus.OK).json({
                message: 'Event has started',
                data: event
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    end: async (req, res, next) => {
        try {
            const {event_code} = req.params
            const isUserOwner = eventService.isUserOwner(event_code, req.user.id)
            if (!isUserOwner) throw new ApiError(httpStatus.UNAUTHORIZED, 'User not allowed', `only event owner can end the event`);
            const query = {
                event_code,
                status: {'$nin': [ event_status.COMPLETED, event_status.CANCELLED ] }
            }

            const event = await eventService.getEvent(query);

            if(event.amount > 0) {
                const session = await mongoose.startSession();
                try {
                    session.startTransaction(sessionSettings);

                    const charge = event.amount * 0.05;
                    const amountToWithdraw = +(event.amount - charge).toFixed(2); 

                    console.log({charge, amountToWithdraw})

                    await Promise.all([
                        walletService.updateBalance(actions.credit, event.owner.id, amountToWithdraw, session),
                        eventService.withdraw(event.owner.id, event_code, session)
                    ])

                    const transactionDetails = {
                        sender: [ ...event.getParticipantWalletIds() ],
                        recipient: event.owner.wallet_id,
                        event_id: event.event_code,
                        description: `${event.description}`,
                        type: transaction_type.CLOSE_EVENT.name,
                        amount: amountToWithdraw
                    } 

                    const newTransaction = await transactionService.create(transactionDetails, payment_status.SUCCESS);
                    await walletService.updateTransactions(event.owner.id, newTransaction._id, session)

                    await session.commitTransaction();
                    session.endSession();
                } catch (error) {
                    await session.abortTransaction();
                    session.endSession()
                    throw error
                }
            }
            const data = await eventService.end(event_code)
            res.status(httpStatus.OK).json({
                message: 'Event ended',
                data
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    subscribe: async(req, res, next) => {
        try {
            const {event_id} = req.params
            const {isSubcribed, user, event} = await userService.toggleSubscribe({ _id:req.user.id}, event_id);

            if(isSubcribed) {
                await notificationService.notify('subscription', { 
                    message: `${user.username} just tuned in to your ${event.name}` 
                })
            }

            res.status(httpStatus.OK).json({
                message:`successful`,
                data: user
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },
  
    updateParticipants: async (req, res, next) => {
        try {
            let { action } = req.query;
            const { event_code } = req.params
            const user_id = req.user.id;
            const passcode = req.body.passcode

            let query = {
                '$and' : [
                    {'event_code': event_code }, 
                    {'status': { '$nin' :  [event_status.CANCELLED, event_status.COMPLETED] } }
                ]
            }

            const participant = await userService.getUser({_id: user_id})
            const event = await eventService.getEvent(query);
             // console.log(event)
            const notificationData = await eventService.showEventDetails({event_code: event.event_code})
            let notificationObject = {
                sender: participant._id, 
                recipient: [event.owner.id],
                data: notificationData
            }
            let result
            if(event.owner.id.toString() == user_id) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid request for event owner', 'You cannot join/leave your own event')
            if ( action.toUpperCase() == 'JOIN' ) {
                notificationObject.type = notification_types.event.join
                notificationObject.message = `${participant.username} joined`
                result = await eventService.join(event, user_id, passcode);
                if(event.class === event_class.PAID) {
                    notificationObject.message = `${participant.username} paid to view your event`
                    const session = await mongoose.startSession();
                    try {
                        session.startTransaction(sessionSettings);
                        const [debited, updatedEvent, participantWallet] = await Promise.all([
                            walletService.updateBalance(actions.debit, user_id, event.access_fee, session),
                            eventService.payEventFee(event.event_code, user_id, session),
                            walletService.getUserWallet(user_id)
                        ]);
        
                        const transactionDetails = {
                            sender: [participantWallet._id], // participant wallet_id
                            recipient: event.owner.wallet_id,
                            event_id: event.event_code,
                            description: `paid access fee to ${event.owner.username}'s event`,
                            type: transaction_type.ACCESS_FEE.name,
                            amount: event.access_fee
                        };
        
                        const newTransaction = await transactionService.create(transactionDetails, payment_status.SUCCESS);
                        await walletService.updateTransactions(user_id, newTransaction._id, session)
                        result = updatedEvent;
                        await session.commitTransaction();
                        session.endSession();
                    } catch (error) {
                        await session.abortTransaction();
                        session.endSession();
                        throw error;
                    }
                }
            }
            else if ( action.toUpperCase() == 'LEAVE' ) {
                notificationObject.type = notification_types.event.leave;
                notificationObject.message = `${participant.username} left`
                result = await eventService.leave(event, user_id)
            }

            await notificationService.trigger(notificationObject)
            res.status(httpStatus.OK).json({
                message: 'successful',
                result
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    }, 

    delete: async (req, res, next) => {
        try {
            const event = await eventService.delete({event_code: req.params.event_code})
            await userService.update({_id: req.user.id}, { $pull: { events: event.id } })
            res.status(httpStatus.OK).json({message: 'successfully deleted event'})
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    viewEvent: async (req, res, next) => {
        try {
            const event = await eventService.showEventDetails({event_code: req.params.event_code})
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: event
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    spray: async (req, res, next) => {
        try {
            let {params: {event_code}, user: {id: user_id}, body: {amount} } = req;
            if(!event_code) throw new ApiError(httpStatus.BAD_REQUEST, `invalid event code: ${event_code}`)
            if(amount < 0 || !amount) throw new ApiError(httpStatus.BAD_REQUEST, `invalid amount to deposit: ${amount}`)
            amount = +amount.toFixed(2)
    
			const session = await mongoose.startSession();
            let result;
            try {
                session.startTransaction(sessionSettings);
                const query = {
                    "$and": [
                        {"event_code": event_code}, // first find the event
                        { "status": event_status.ACTIVE }, // event should be is active
                    ]
                }
                const event = await eventService.getEvent(query);

                const [debited, updatedEvent, participantWallet] = await Promise.all([
                    walletService.updateBalance(actions.debit, user_id, amount, session),
                    eventService.deposit(event, user_id, amount, session),
                    walletService.getUserWallet(user_id)
                ]);

                const transactionDetails = {
					sender: [participantWallet._id], // participant wallet_id
					recipient: event.owner.wallet_id,
					event_id: event.event_code,
					description: `tipped ${event.owner.username} ${amount} during event`,
					type: transaction_type.EVENT.name,
					amount
				};

                const newTransaction = await transactionService.create(transactionDetails, payment_status.SUCCESS);
				await walletService.updateTransactions(user_id, newTransaction._id, session)
                
                result = updatedEvent;
                await session.commitTransaction();
                session.endSession();
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }

            return res.status(httpStatus.OK).json({
                message: `success`,
                data: result
            })
        }catch (err) {
            logger.error(err);
            next(err)
        }
    },
}