const {Transaction} = require('../models/transaction.model');
const { transaction: { transaction_type, payment_status } } = require('../utils/helpers')
const _ = require('lodash');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const {getQueue} = require('../config/bull');


module.exports = {

    /**
     * * creates a transaction
     * @param {Object} transactionDetails 
     * @param {string} status 
     * @returns 
    */
    create: async (transactionDetails, status) => {
        if(_.isEmpty(transactionDetails)) throw new ApiError(httpStatus.BAD_REQUEST, 'transaction details not provided');
        let { type } = transactionDetails;

        //invalid payment status
        if(!payment_status[status.toUpperCase()]) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid payment status');
        //invalid transaction type    
        const newTransaction = new Transaction({...transactionDetails, status});
        //generate transaction id
        newTransaction.generateTransactionId(type);
        await newTransaction.save();
        if(!newTransaction) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'error logging transaction');
        // process transactions email or sth here for each transaction type
        if(type == transaction_type.ACCESS_FEE.name || type == transaction_type.SEND.name || type == transaction_type.CLOSE_EVENT.name) {
            const transactionQueue = getQueue('transactions');
            transactionQueue.add(newTransaction, {priority: 1})
            console.log('transaction added to queue')
            return newTransaction;
        }
    },

    /**
     * * retrieves all Transactions
     * @param {Object} query 
    */
    getAll: async query => {
        return await Transaction.find(query).sort({createdAt: -1});
    },

    /**
     * * retrieves single Transaction
     * @param {object} query 
     */
    getOne: async query => {
        return await Transaction.findOne(query);
    },
    
    /**
     * * updates transactions
     * @param {object} query
     * @param {object} update
    */
    update: async (query, update) => {
        const transaction = await Transaction.findOneAndUpdate(query, {...update}, {new: true});
        if(!transaction) throw new ApiError(httpStatus.NOT_FOUND, 'transaction not found');
        return transaction;
    },

    /**
     * * gets all user transaction
     * @param {string} walletId
     * @param {Object} query
     */
    getUserTransactions: async (walletId, query = {}) => {
        const filter = {
            '$and': [
               {
                '$or': [
                    { sender: { $in: [walletId] } },
                    { recipient: walletId }
                ]
               }, 
                ...query
            ]
        }
        const userTransactions = await Transaction.find(filter).sort({createdAt: -1});
        return userTransactions;
    },

    queryTransactions: async query => {
        return await Transaction.find(query).sort({createdAt: -1});
    },
}