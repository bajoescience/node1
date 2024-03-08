const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");
const { toJSON, paginate } = require('./plugins');
const { ApiError } = require("../utils/ApiError");
const httpStatus = require("http-status");
const {transaction: { transaction_type, payment_method, payment_status }} = require('../utils/helpers')

const generateTransactionId = function (type) {
  //validations
  if (!type || type == " ") {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "please provide the event type");
  }

  type = type.toUpperCase();
  //invalid transaction type
  if (!transaction_type[type]) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "invalid transaction type");
  }

  var length = 26;
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var charactersLength = characters.length;
  var result = transaction_type[type].prefix;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  this.transaction_id = result;
};


const transactionModel = {
  date: { type: String, default: moment().format("LLLL") }, //date of transaction
  type: { 
    type: String, 
    trim: true, 
    index: true, 
    enum: Object.keys(transaction_type)
  }, // event, redeem, purchase, send
  // generated id (with prefixed tags like EV for event, RC for receiving RD for redeeming, PC for purchase and SN for send)
  transaction_id: {
    type: String,
    trim: true,
    match: [/^[WD|EV|RC|PR|SN|FN]+[A-Z0-9]{26}$/, "invalid transaction id"],
  },
  reference: String,
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,  
    get: amount => +parseFloat(amount).toFixed(2)
  },
  description: { type: String, trim: true },
  event_id: { type: String, trim: true }, //if transaction is an event (event code)
  currency: { type: String, default: 'NGN' },
  payment_method: {
    type: String,
    enum: Object.values(payment_method),
    default: payment_method.NA,
  },
  status: { 
    type: String, 
    trim: true, 
    default: payment_status.PENDING,
    enum: Object.values(payment_status)
  },
  //sender information
  sender: [
    {
      type: Schema.Types.ObjectId,
      ref: "wallets",
    }
  ],
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "wallets",
    required: true,
  },
  meta: { type: Object, default: {} },
};

const transactionSchema = new Schema(transactionModel, {
  timestamps: true,
  toJSON: { getters: true },
});

transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);
transactionSchema.methods.generateTransactionId = generateTransactionId;
const Transaction = mongoose.model("Transactions", transactionSchema);

module.exports = { Transaction };