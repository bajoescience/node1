const axios = require('axios');
const { baseURL,X_API_Key } = require('../config');

const requestMethods = {
    POST: 'POST',
    GET: 'GET',
}
const headers = { 
    'X-API-Key': X_API_Key
}
// if there's need to add a new redeem type, please add them here
const redeemTypes = {
    airtime: "airtime",
    "gift-card": "gift-card",
    bank: "bank"
}

let chiRate = 1000;

const urls = {
    WALLET_LOOKUP: `${baseURL}wallets/lookup`,
    GET_SUB_ACCOUNT: id => `${baseURL}sub-account/get?id=${id}` ,
    ALL_SUB_ACCOUNTS: `${baseURL}sub-account/list`,
    CREATE_SUB_ACCOUNT: `${baseURL}sub-account/create`,
    DELETE_SUB_ACCOUNT: id => `${baseURL}sub-account/delete?id=${id}`,
    FUND_ACCOUNT: `${baseURL}account/transfer`,
    WALLET_TRANSFER: `${baseURL}wallets/transfer`,
    REDEEM: type => `${baseURL}payouts/${type}`,
    CONVERT_TO_USD: (amountInOriginCurrency, originCurrency) => `${baseURL}info/local-amount-in-usd?originCurrency=${originCurrency}&amountInOriginCurrency=${amountInOriginCurrency}`,
    CONVERT_TO_LOCAL: (amountInUSD, destinationCurrency) => `${baseURL}info/usd-amount-in-local?destinationCurrency=${destinationCurrency}&amountInUSD=${amountInUSD}`,
    BANK_INFO: (countryCode) => `${baseURL}info/country-banks?countryCode=${countryCode}`
}
// needs refactoring
module.exports = {
    redeemTypes,
    getWallet: async (body) => {
        try {
            if(!body || Object.values(body).includes(" ") || Object.values(body).includes("")) return { status: 400, message: "subAccount id is required for wallet lookup" }
            const { walletID } = body
            var request = {
                method: requestMethods['POST'],
                url: urls['WALLET_LOOKUP'] ,
                headers,
                data: {
                    walletID
                }
            }
            const {data} = await axios(request);
            return {
                status: data.status == "success" ? 200 : 500, 
                message: data.status == "success" ? data.status : `Could not fetch wallet for ${walletID}`,
                data: data.status == "success" ? data.data : data.error
            }            
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    },
    /**
     * * retrieves a single sub-account
     * @param {string} id 
     * @returns 
     */
    getSubAccount: async (id) => {
        try {
            if(!id || id == ' ') return { status: 400, message: "please provide sub-account id"}
            //finding parent for logging
            var request = {
                method: requestMethods['GET'],
                url: urls['GET_SUB_ACCOUNT'](id),
                headers
            };
            const {data} = await axios(request);
            return {
                status: data.status == "success" ? 200 : 500, 
                message: data.status,
                data: data.status == "success" ? data.data : data.error
            }             
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    /**
     * * retrieves all sub-accounts
     * @returns {Promise} status, message, data
     */
    getSubAccounts: async () => {
        try {
            //finding parent for logging
            var request = {
                method: requestMethods['GET'],
                url: urls['ALL_SUB_ACCOUNTS'],
                headers
            };
            const {data} = await axios(request);
            return {
                status: data.status == "success" ? 200 : 500, 
                message: data.status,
                data: data.status == "success" ? data.data : data.error
            }            
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    /**
     * * creates sub-account from a registered user
     * @param {object} body 
     * @returns {Promise} status, message, data
     */
    createSubAccount: async (body) => {
        try {
            if(Object.values(body).includes(" ") || !body || Object.values(body).includes("")) {
                return {
                    status: 400, 
                    message: "name, email required for creating sub account"
                }
            }
            console.log(body);
            const { fullname , email} = body
            var request = {
                method: requestMethods['POST'],
                url: urls['CREATE_SUB_ACCOUNT'],
                headers,
                data: {
                    "name": `${fullname}`,
                    email
                }
            }
              
            const {data} = await axios(request);
            const success = data.status == "success" && !data.data.error;
            return {
                status: success ? 201 : 500, 
                message: success ? "successfully created sub account" : `error occurred when creating sub account`,
                data: success ? data.data : data.error
            }             
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    deleteSubAccount: async id => {
        try {
            if(!id || id == ' ') return { status: 400, message: "please provide sub-account id"}
            //finding parent for logging
            var request = {
                method: requestMethods['GET'],
                url: urls['DELETE_SUB_ACCOUNT'](id),
                headers
            };
            const {data} = await axios(request);
            const isDeleted = data.status == "success"
            return { status: isDeleted ? 200 : 500, message: data.status }             
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    },

    /**
     * * funds sub-account with chimoney
     * @param {object} body 
     * @returns 
     */
    fund: async (body) => {
        try {
            if(!body || Object.values(body).includes(" ") || Object.values(body).includes("")) {
                return {
                    status: 404, 
                    message: "receiver, amount, wallet required for funding"
                }
            }
            const {receiver, amount, wallet} = body
            var request = {
                method: requestMethods['POST'],
                url: urls['FUND_ACCOUNT'],
                headers,
                data : {
                    receiver, 
                    amount, 
                    wallet
                }
            };
            const {data} = await axios(request)
            const isSuccess = data.status == "success";
            return {
                status: isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            }            
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 
    /**
     * * sends chimoney to sub-account from (main|sub)-account
     * @param {object} body 
     * @returns {Promise} status, message, data
     */
    send: async (body) => {
        try {
            if(!body || Object.values(body).includes(" ") || Object.values(body).includes("")) {
                return {
                    status: 404, 
                    message: "receiver, amount, wallet required for sending"
                }
            }
            // adding  rest variable to check if the subAccount field was passed
            const { receiver, amount, currency, ...rest } = body;
            var request = {
                method: requestMethods['POST'],
                url: urls['WALLET_TRANSFER'],
                headers,
                data : {
                    receiver,
                    amount,
                    "wallet": `${currency}`,
                    ...rest
                }
            };
            const {data} = await axios(request);
            const isSuccess = data.status == "success";
            return {
                status:  isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            }            
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    /**
     * * redeems chimoney as airtime | bank | gift-card
     * @param {object} body 
     * @param {string} type 
     * @returns {Promise} status, message, data
     */
    redeem: async (body, type) => {
        try {
            if(!body || Object.values(body).includes(" ") || Object.values(body).includes("")) {
                return {
                    status: 404, 
                    message: `missing fields to redeem: ${type}, please provide all fields`
                }
            }
            type = type.toLowerCase();
            if(!Object.keys(redeemTypes).includes(type)) return { status: 400, message: `invalid redeem type: ${type}`}
            
            // const {subAccount, amount, phoneNumber, countryToSend} = body
            
            var request = {
                method: requestMethods['POST'],
                url: urls['REDEEM'](type),
                headers,
                data :body
            };

            console.log({request});
            const {data} = await axios(request);
            const isSuccess = data.status == "success";
            return {
                status: isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            }            
        } catch (error) {
            console.error(error.response.data);
            return { status: 500, message: `server error: ${error.response.data.error}` }
        }
    },

    /**
     * * converts amount in local currency to USD
     * @param {number} amountInOriginCurrency 
     * @param {string} originCurrency 
     * @returns {Promise} status, message, data
     */
    convertToUSD: async (amountInOriginCurrency, originCurrency) => {
        try {
            originCurrency = originCurrency.toUpperCase();
            var request = {
                method: requestMethods['GET'],
                url: urls['CONVERT_TO_USD'](amountInOriginCurrency, originCurrency),
                headers
            }

            const {data} = await axios(request);
            const isSuccess = data.status == "success";
            // data would include
            /*
            {
                "amountInOriginCurrency": "2850", amount
                "originCurrency": "NGN", // currency
                "amountInUSD": 5.18, // required data
                "validUntil": "2022-04-17T12:33:20.882Z"
            }
            */
            return {
                status: isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            } 
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    /**
     * * converts USD amount to CHI
     * * note: check if value is truthy for case is NaN
     * @param {number} amountInUSD 
     */
    convertToChi: amountInUSD => {
        if(amountInUSD < 0) return `cannot convert ${amountInUSD} to chi`;
        console.log({chiRate});
        return +(amountInUSD * chiRate).toFixed(2);
    },

    /**
     * * modifies the current chiRate
     * * admin services: requires auth token
     * @param {number} newRate 
     * @returns 
     */
    setChiRate: newRate => {
        if(newRate < 0 || typeof newRate !== 'number') return false;
        chiRate = +(newRate).toFixed(2);
        return true;
    },

    /**
     * * retrieves current chiRate
     * @returns 
     */
    getChiRate: () => {
        return chiRate;
    },

    /**
     * * convert local currency to USD
     * @param {number} amountInUSD 
     * @param {string} destinationCurrency 
     * @returns {Promise} status, message, data
     */
    convertToLocal: async (amountInUSD, destinationCurrency) => {
        try {
            if(!amountInUSD || !destinationCurrency || destinationCurrency == ' ') return { status:400, message: "amount and destination currency not provided" }
            currency = currency.toUpperCase();
            var request = {
                method: requestMethods['GET'],
                url: urls['CONVERT_TO_LOCAL'](amountInUSD, destinationCurrency),
                headers
            }

            const {data} = await axios(request);
            const isSuccess = data.status == "success";
            // data would include
            /*
            {
                "amountInUSD": "2",
                "destinationCurrency": "NGN",
                "amountInDestinationCurrency": 1100,
                "validUntil": "2022-04-17T12:43:56.971Z"
            }
            */
            return {
                status: isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            } 
        } catch (error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }, 

    /**
     * * gets bank info for a particular country
     * 
     */
    getBankInfo: async (countryCode = "NG") => {
        try{
            var request = {
                method: requestMethods['GET'],
                url: urls['BANK_INFO'](countryCode),
                headers
            }

            const {data} = await axios(request);
            const isSuccess = data.status == "success";

            return {
                status: isSuccess ? 200 : 500, 
                message: data.status,
                data: isSuccess ? data.data : data.error
            } 
        }catch(error) {
            console.error(error);
            return { status: 500, message: `server error: ${error.message}` }
        }
    }
}