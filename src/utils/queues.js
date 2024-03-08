const {Queue} = require('../config/bull');

const notificationProcessor = require("../processors/notification");
const transactionProcessor = require("../processors/transaction");

const registerQueues = () => {
  const notificationQueue = new Queue("notifications");
  const transactionQueue = new Queue("transactions");
  
  notificationQueue.process(5, notificationProcessor)
  transactionQueue.process(5, transactionProcessor)

  console.log('🚀 queue setup successful 🚀 ')
};


module.exports = {registerQueues}