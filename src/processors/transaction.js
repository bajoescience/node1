// this processor sends emails for every transactions created based on it's type
const {emailService, eventService, userService} = require('../services');
const { transaction: { transaction_type } } = require('../utils/helpers');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');


const transactionProcessor = async (job, done) => {
    const transactionObject = job.data;

    try {
        const recipient = await userService.getUser({wallet_id: transactionObject.recipient});
        const {type, date, amount} = transactionObject;

        let mailData = { recipient, date, amount };
        // building email subject and body
        if (type == transaction_type.SEND.name) {
            const sender = await userService.getUser({wallet_id: transactionObject.sender[0]})
            mailData = { ...mailData, sender }
        }

        if (type == transaction_type.CLOSE_EVENT.name || type == transaction_type.ACCESS_FEE.name) {
            const event = await eventService.getEvent({event_code: transactionObject.event_id})
            mailData = { ...mailData, event }
        }
        
        await emailService.sendTransactionInfoEmail(mailData, type)
        done()
    }catch (error) {
        console.log(error)
        done(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `transaction failed`))
    } 
}

module.exports = transactionProcessor;