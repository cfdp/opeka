var drupal = require("drupal"),
    nconf = require("nconf"),
    winston = require("winston"),
    opeka = require("./lib/opeka"),
    util = require("util");

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
  "http": {
    "hostname": "localhost",
    "port": 3000
  },
  "https": {
    "enabled": false,
  },
  "logging": {
    "level": "debug"
  },
  "features": {
    "hidePairRoomsOnRoomList": false,
    "queueSystem" : true
  }
});

// Configure logging to use the console, but with timestamps (off by default).
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: nconf.get("logging:level"),
      timestamp: true
    }),
  ]
});

logger.setLevels(winston.config.syslog.levels);

// Set up the database connection as our first order of business.
logger.info('Connecting to database...');
var client = drupal.db.connect(nconf.get('database')), server;

if (!client) {
  logger.error('FAIL: Could not connect to database. Exiting.');
}

// Load bans from the database before starting the server.
opeka.ban.loadAll();

server = new opeka.Server(nconf, logger);
