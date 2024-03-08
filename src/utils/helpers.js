const { Wallet } = require("../models/wallet.model");

module.exports = {
    user: {
        roles: {
            ADMIN: "admin",
            DEFAULT: "default",
            CREATOR: "creator",
        },
        accountStatus: {
            PENDING: "Pending",
            ACTIVE: "Active",
            SUSPENDED: "Suspended",
            BLOCKED: "Blocked",
        },
        auth_providers: {
            google: "google",
            local: "local",
            facebook: "facebook",
            twitter: "twitter",
        }
    },
    event: {
        event_status: {
            ACTIVE : "ACTIVE",
            COMPLETED:'COMPLETED', 
            CANCELLED:'CANCELLED', 
            PENDING: "PENDING"
        },
        event_type: {
            PUBLIC : 'PUBLIC',
            PRIVATE : 'PRIVATE'
        },
        event_class: {
            FREE : 'FREE',
            PAID : 'PAID'
        },
        participant_roles: {
            OWNER: 'owner', 
            PARTICIPANT: 'participant'
        }
    },
    wallet: {
        providers: {
            paystack: "paystack",
        },
        actions: {
            credit: "credit",
            debit: "debit"
        }
    },
    transaction: {
        transaction_type: {
            EVENT: { name: "EVENT", prefix: "EV" },
            ACCESS_FEE: { name: "ACCESS_FEE", prefix: "AF" },
            CLOSE_EVENT: { name: "CLOSE_EVENT", prefix: "CE" },
            PURCHASE: { name: "PURCHASE", prefix: "PR" },
            SEND: { name: "SEND", prefix: "SN" },
            WITHDRAW: { name: "WITHDRAW", prefix: "WD" },
            FUND: { name: "FUND", prefix: "FN" },
        },          
        payment_method: {
            BANK: "bank",
            CARD: "card",
            NA: "na"
        },
        payment_status: {
            PENDING: "pending",
            SUCCESS: "success",
            CANCELLED: "cancelled",
            FAILED: "failed",
        }
    },
    notification: {
        notification_types: {
            event: {
                created: "event-created",
                live: "event-live",
                subscription: "event-subscription",
                start: "event-start",
                reminder: "event-reminder",
                join: "event-join",
                leave: "event-leave",
                instant: "event-instant"
            },
            user: {
                follow: 'user-follow'
            }
        },
        channels: {
            notification: 'notification'
        },
        notification_state: {
            read: "read",
            seen: "seen",
            unread: "unread"
        },
    },
    paystack_events: {
        fund: {
            charge_success: "charge.success",
        },
        withdraw: {
            transfer_success: "transfer.success",
            transfer_failed: "transfer.failed",
            transfer_reversed: "transfer.reversed",
        },
        customer: {
            identification_failed: "identification.failed",
        },
        misc: {}
    },
    sessionSettings: {
        "readConcern": { "level": "snapshot" },
        "writeConcern": { "w": "majority" }
    },
    emailSubjects: {
        DEBIT: 'Debit Transaction Notification',
        CREDIT: 'Credit Transaction Notification',
        PARTICIPATION: "Event Participation",
        COMPLETED_EVENT: "Event Completed"
    },
    requestMethods: {
        POST: 'POST',
        GET: 'GET',
    }, 
    eventActions : {
        JOIN: 'JOIN', 
        KICK: 'KICK',
        CHANGE_OWNER : 'CHANGE_OWNER'
    },
	select : {
		public_event_fields: 'name qrcode is_verified username avatar followersCount followers following followingCount events products'
	},
	populate : {
		public_user_fields : [
            {
                path: 'followers',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'following',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'events',
                model: "Event",
                select: 'id name image type status class start_date is_live amount isScheduled participantCount event_code access_fee'
            },
            {
                path: 'products',
                model: "Products"
            }
        ],
        private_user_fields : [
            {
                path: 'followers',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'following',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'bookmarks',
                populate: {
                    path: 'products',
                    model: "Products"
                }
            },
            {
                path: 'subscribed_events',
                select: '-qrcode -tags -products -participants',
                model: "Event"
            },
            {
                path: 'events',
                model: "Event"
            },
            {
                path: 'products',
                model: "Products"
            }, 
            {
                path: "wallet_id",
                select: 'balance',
                model: Wallet
            }
        ]
	}
}