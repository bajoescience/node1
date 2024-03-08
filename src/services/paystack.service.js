const axios = require('axios');
const Paystack = require('paystack');
const {paystack_test_secret_key, paystack_live_secret_key} = require('../config/index');
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const crypto = require('crypto');
const { requestMethods }= require('../utils/helpers')
// paystack object 
const paystack_secret_key = process.env.NODE_ENV == 'production' ? paystack_live_secret_key : paystack_test_secret_key;
const paystack = Paystack(paystack_secret_key);

const paystack_url = 'https://api.paystack.co'

let config = {
    headers: { 
        'Authorization': `Bearer ${paystack_secret_key}`,
        "Content-Type": "application/json",
        'cache-control': 'no-cache'
    }
}

const urls = {
    RESOLVE_BANK_ACCOUNT: (account_number, bank_code) => `${paystack_url}/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    LIST_BANKS: (currency = 'NGN') => `${paystack_url}/bank?currency=${currency}`,
    CREATE_RECIPIENT: `${paystack_url}/transferrecipient`,
    INITIATE_TRANSFER: `${paystack_url}/transfer`
}

module.exports = {
    verifyWebhookSignature: (request) => {
        const hash = crypto.createHmac('sha512', paystack_secret_key).update(JSON.stringify(request.body)).digest('hex');
        if (hash !== request.headers['x-paystack-signature']) return false
        return true;
    },

    // * misc
    /**
     * * verifies account number
     * @param {string} account_number 
     * @param {string} bank_code 
     * @returns {Promise<{status: boolean, data: any}>}
     */
    resolveBankAccount: async (account_number, bank_code) => {
        try {
            config['method'] = requestMethods['GET'];
            config['url'] = urls.RESOLVE_BANK_ACCOUNT(account_number, bank_code);
            
            const {data: {status, message, data}} = await axios(config)
            if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message);
            return {status, data};
        } catch (error) {
            if(error.isAxiosError) return {status: false, data:error.response.data.message}
            return {status:false, data:error.message}
        }
    },
    /**
     * * retrieves bank information
     * @returns {Promise<{data: any}>}
     */
    getBankInfo: async function() {
        const {status, message, data} = await paystack.misc.list_banks();
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message)
        return data;
    },

    //  transfers
    /**
     * * creates a transfer recipient
     * @param {{name: string, account_number: string, bank_code: string}} params 
     * @returns {Promise<{status: boolean, data: string}>}
     */
    createTransferRecipient: async function(params) {
        try {
            config['url'] = urls.CREATE_RECIPIENT;
            config['method'] = requestMethods['POST'];
            if(!params.type) params.type = 'nuban'
            if(!params.currency) params.currency = 'NGN'
            config['data'] = params
            
            const {data: {status, message, data}} = await axios(config)
            if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message);
            return {status, data: data?.recipient_code};
        } catch (error) {
            if(error.isAxiosError) return {status: false, data:error.response.data.message}
            return {status:false, data:error.message}
        }
    },

    /**
     * * initiates a transfer
     * @param {{recipient_code: string, amount: number}} params 
     * @returns {Promise<{status: boolean, data: any}>}
     */
    initTransfer: async params => {
        try {
            config['url'] = urls.INITIATE_TRANSFER;
            config['method'] = requestMethods['POST'];
            if(!params.source) params.source = 'balance';
            params.amount = +(params.amount) * 100;
            config['data'] = params
            
            const {data: {status, message, data}} = await axios(config)
            if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message);
            return {status, data};
        } catch (error) {
            if(error.isAxiosError) return {status: false, data:error.response.data.message}
            return {status:false, data:error.message}
        }
    },

    // * subaccounts
    /**
     * * Create a sub account for a user
     * @param {object} params - The data to be sent to paystack
    */
    createSubAccount: async (params) => {
        const {status, message, data} = await paystack.subaccount.create(params)
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message)
        return data;
    },
    /**
     * * retrieves subaccount information
     * @param {number | string} id 
    */
    getSubAccount: async (id) => {
        const {status, message, data} = await paystack.subaccount.get(id)
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message)
        return data;
    },
    /**
     * * retrieves all subaccounts
     * @param {any} params
    */
    allSubAccounts: async (params = {}) => {
        const {status, message, data} = await paystack.subaccount.list(params)
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message)
        return data;
    },
    /**
     * * retrieves subaccount information
     * @param {number | string} id 
     * @param {any} params
    */
    updateSubAccount: async (id) => {
        const {status, message, data} = await paystack.subaccount.update(id, params)
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message)
        return data;
    },

    // * transactions 
    /**
     * * initialize a charge transaction
     * @param {object} params
    */
   initializePayment: async params => {
        params.amount = +(params.amount) * 100;
        const {status, message, data} = await paystack.transaction.initialize(params);
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message);
        return data;
    },
    
    /**
     * @param {string} reference
     */
    verifyPayment: async (reference) => {
        const {status, message, data} = await paystack.transaction.verify(reference);
        if(!status) throw new ApiError(httpStatus.BAD_REQUEST, message);
        return data;
   }
}