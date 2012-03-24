var drupal = require("drupal"),
    nconf = require("nconf"),
    opeka = require("./lib/opeka"),
    util = require("util");

// Use any command-line or environment settings.
nconf.argv().env();

// Load settings from config.json.
nconf.file({ file: 'config.json' });

// Provide some default settings.
nconf.defaults({
  "database": {
    "host": "localhost",
    "port": 3306,
  },
  "http": {
    "port": 3000
  },
  "https": {
    "enabled": false,
  }
});

// Set up the database connection as our first order of business.
util.log('Connecting to database...');
var client = drupal.db.connect(nconf.get('database')), server;

if (!client) {
  util.log('FAIL: Could not connect to database. Exiting.');
}

util.log('Starting Opeka chat server on port '  + nconf.get('http:port'));

server = new opeka.Server(nconf);

