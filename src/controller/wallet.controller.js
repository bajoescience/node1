const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const {transactionService, userService, walletService, paystackService, emailService} = require('../services');
const { wallet: { actions }, transaction: { transaction_type, payment_method, payment_status } } = require('../utils/helpers');

const sessionSettings = {
    "readConcern": { "level": "snapshot" },
    "writeConcern": { "w": "majority" }
}

module.exports = {
    send: async function(req, res, next) {
        let {amount, to, description} = req.body;
        try {
            const session = await mongoose.startSession();
            
            let result;
            try {
                session.startTransaction(sessionSettings);
                const [sender, recipient] = await Promise.all([
                    userService.getUser({_id: req.user.id}),
                    userService.getUser({username: to})
                ])
    
                if(sender?.wallet_id.toString() == recipient?.wallet_id.toString()) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'transaction invalid: sender and recipient are the same')
                }
                
                await Promise.all([
                    walletService.updateBalance( actions.debit, sender?._id, amount, session ), 
                    walletService.updateBalance( actions.credit, recipient?._id, amount, session )
                ]);
    
                // log the transaction to the db
                const transactionDetails = {
                    type: transaction_type.SEND.name,
                    sender: sender?.wallet_id,
                    recipient: recipient?.wallet_id,
                    amount,
                    description: description || `${amount} sent to ${recipient?.username}`
                }
    
                const newTransaction = await transactionService.create(transactionDetails, payment_status.SUCCESS);
    
                await Promise.all([
                    walletService.updateTransactions(sender?._id, newTransaction._id, session),
                    walletService.updateTransactions(recipient?._id, newTransaction._id, session)
                ])
    
                await session.commitTransaction();
                session.endSession();
                result = newTransaction
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error
            }
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: result
            });
        } catch (error) {
            logger.error(error.message);
            next(error)
        }
    },

    createWallet: async (req, res, next) => {
        try {
            const wallet = await walletService.create(req.user.id);
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: wallet
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    getAll: async (req, res, next) => {
        try{
            const wallets = await walletService.getWallets();
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: wallets
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    getUserWallet: async (req, res, next) => {
        try{
            const userWallet = await walletService.getUserWallet(req.user.id);
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: userWallet
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    fundWallet: async (req, res, next) => {
        try{
            const userWallet = await walletService.getUserWallet(req.user.id);
            const data = await paystackService.initializePayment({email: userWallet.user.email, amount: req.body.amount});
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: {
                    ...data, 
                    verificationUrl: `/api/transactions/verify?gateway=paystack&reference=${data.reference}`
                }
            });
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },
    withdraw: async (req, res, next) => {
        try {
            const {name, account_number, bank_code, amount} = req.body;
            const recipientToCreate = {name, account_number, bank_code,}
            const [recipient, recipientData] = await Promise.all( [
                await userService.getUser({_id: req.user.id}),
                await paystackService.createTransferRecipient(recipientToCreate)
            ])
            if(!recipientData.status) throw new ApiError(httpStatus.BAD_REQUEST, recipientData.data)
            
            const params = { amount, recipient: recipientData?.data };
            
            const transferData = await paystackService.initTransfer(params);
            
            if(!transferData.status) throw new ApiError(httpStatus.BAD_REQUEST, transferData.data)

            console.log({transferData: transferData.data});

            const {reference, status: withdrawal_status, transfer_code} = transferData.data;
            console.log({withdrawal_status})
            const transactionDetails = {
                reference,
                type: transaction_type.WITHDRAW.name,
                recipient: recipient?.wallet_id,
                meta: {transfer_code}
            }
            const newTransaction = await transactionService.create(transactionDetails, payment_status.PENDING);
            res.status(httpStatus.OK).json({
                message: 'success',
                data: newTransaction
            })

        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    },
    validatePin: async function(req, res, next) {
        try {
            const {user, body} = req
            const {pin} = body;

            if(!pin) throw new ApiError(httpStatus.BAD_REQUEST, 'pin not provided')
            const userWallet = await walletService.getUserWallet(user.id);
            console.log({pin, userWallet})

            if(!userWallet.pin) throw new ApiError(httpStatus.BAD_REQUEST, 'user does not have pin');

            const result = await userWallet.validatePin(pin)

            res.status(httpStatus.OK).json({
                message: 'success',
                result
            })
        } catch (error) {
            logger.error(error.message);
            next(error)
        }
    },
}