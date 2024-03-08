const Agenda = require('agenda');
const {dbURI} = require('./index');

// initialize a singleton instance of agenda.js?
const agenda = new Agenda( 
    { 
        db: { 
            address: dbURI, 
            collection: "scheduledJobs"
        },
        maxConcurrency: 20,
        processEvery: '30 minutes'
    } 
);

module.exports = agenda