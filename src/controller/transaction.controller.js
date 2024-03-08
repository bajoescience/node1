const {transactionService, userService, walletService, paystackService} = require('../services');
const { wallet: { actions }, paystack_events, transaction: { transaction_type, payment_method, payment_status } } = require('../utils/helpers');
const mongoose = require('mongoose');
const _ = require('lodash');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');

module.exports = {
    verifyAccount: async (req, res, next) => {
        try {
            const {account_number, bank_code} = req.body;
            const {status, data} = await paystackService.resolveBankAccount(account_number, bank_code);
            if(!status) throw new ApiError(httpStatus.BAD_REQUEST, `failed: ${data}`)
            res.status(httpStatus.OK).json({
                message: 'success',
                data
            })
            
        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    },
    
    getBankData: async (req, res, next) => {
        try {
            const {status, data} = await paystackService.getBankInfo();
            const filtered = data?.map( ({name, slug, code, id}) => {return {name, slug, code, id}});
            if(!status) throw new ApiError(httpStatus.BAD_REQUEST, `failed: ${data}`)
            res.status(httpStatus.OK).json({
                message: 'success',
                data: filtered
            })
        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    },

    verifyTransaction: async (req, res, next) => {
        try {
            const {reference, gateway} = req.query;
            if(gateway !== 'paystack') {
                return res.json({message: `payment gateway not supported: ${gateway}`})
            }
            const data  = await paystackService.verifyPayment(reference);
            const {status, gateway_response, channel} = data;
            if(status !== payment_status.SUCCESS){
                return res.redirect(`https://symble-app.herokuapp.com/wallet?method=fund&status=${status}`)
            }
            
            res.redirect(`https://symble-app.herokuapp.com/wallet?method=fund&status=${status}`)
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    handleWebhook: async function (req, res, next) {
        const isVerified = paystackService.verifyWebhookSignature(req);
        // if(!isVerified)x

        const session = await mongoose.startSession();
        const sessionSettings = {
            "readConcern": { "level": "snapshot" },
            "writeConcern": { "w": "majority" }
        }

        try {
            session.startTransaction(sessionSettings);
            const {data, event} = req.body

            console.log({event})
            // ! temporary solution for event types
            // webhook event to fund wallet
            if(event == paystack_events.fund.charge_success) {
                const {customer, amount} = data;
                console.log({customer})
                const fundAmount = +parseFloat(amount / 100).toFixed(2);
                const {wallet_id, username, _id: userId} = await userService.getUser({email: customer.email});
                const transactionDetails = {
                    type: transaction_type.FUND.name,
                    recipient: wallet_id,
                    amount: fundAmount,
                    status: payment_status.SUCCESS,
                    description: `${username} top up with ${fundAmount}`
                }

                const [ credited, newTransaction ] = await Promise.all([
                    walletService.updateBalance( actions.credit, userId, fundAmount, session ),
                    transactionService.create(transactionDetails, payment_status.SUCCESS)
                ]);

                const fnTxnCount = await walletService.updateTransactions( userId, newTransaction._id, session );

                if(!fnTxnCount) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "unable to update wallet transactions");

                await session.commitTransaction();            
                res.send(200);
            }
            // webhook event to withdraw (success)
            if(event == paystack_events.withdraw.transfer_success) {
                const {} = data;
            }
            // webhook event to withdraw (failure or reversal)
            if(event == paystack_events.withdraw.transfer_failed || event == paystack_events.withdraw.transfer_failed) {
                
            }
        } catch (error) {
            await session.abortTransaction();
            console.log(error.message)
            logger.error(error.message);
            next(error);
        } finally {
            session.endSession();
        }
    },

}