const Queue = require("bull");
const httpStatus = require("http-status");
const Redis = require('ioredis');
const { redis: {url} } = require("../config");
const { ApiError } = require("../utils/ApiError");

const queues = {};

const client = new Redis(url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const subscriber = new Redis(url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

var opts = {
    createClient: function (type) {
      switch (type) {
        case 'client':
          return client;
        case 'subscriber':
          return subscriber;
        default:
          return new Redis(url, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });
      }
    }
}

class queue extends Queue {
  constructor(name) {
    super(name, opts);
    queues[name] = this;
  }
}


module.exports = {
    Queue: queue,
    getQueue: (name) => {
        const queue = queues[name];
        if(!queue) throw new ApiError(httpStatus.NOT_FOUND, 'not found', `${name} not registered as queue`);
        return queue;
    },
    getQueues: () => {
        return Object.values(queues)
    }
}