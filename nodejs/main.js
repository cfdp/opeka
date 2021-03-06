var drupal = require("drupal"),
    nconf = require("nconf"),
    winston = require("winston"),
    opeka = require("./lib/opeka"),
    util = require("util"),
    logger = require("./lib/loginit"),
    drupalconfig = require("./lib/drupalconfig");

// Use any command-line or environment settings.
nconf.argv().env();

// Load settings from config.json.
nconf.file({ file: 'config.json' });

// Provide some default settings.
nconf.defaults({
  "ban": {
    "salt": ""
  },
  "database": {
    "host": "localhost",
    "port": 3306,
  },
  "logging": {
    "level": "debug",
    "file": "../logs/chatlog"
  },
  "features": {
    "hidePairRoomsOnRoomList": false,
    "automaticPausePairRooms": true,
    "queueSystem" : false,
    "accessCodeEnabled" : false,
    "exposeDrupalUIDs": false,
    "requireDrupalLogin": false,
    "chatHistory": true,
    "screeningQuestions": false,
    "ipGeoDbKey": "",
    "ipGeoLocations": ["DK"]
  },
  "maxMessageLength": 2000,
  "maxMessageLengthGroup": 200,
  "authentication": {
    "accessCode": ""
  },
  "server": {
    "hostname": "localhost",
    "https": {
      "enabled": false,
    },
    "port": 3000
  },
  "drupalconfig": {
    "opeka_reconnect_attempts": 10,
    "opeka_reconnect_interval": 20000
  }
});

// Set up the database connection as our first order of business.
logger.info('Connecting to database...');
var client = drupal.db.connect(nconf.get('database')), server;

if (!client) {
  logger.error('FAIL: Could not connect to database. Exiting.');
}

// Load bans from the database before starting the server.
opeka.ipcheck.loadAllBans();

// Load invites from the database before starting the server.
opeka.invites.loadAll();

server = new opeka.Server(nconf, logger);
