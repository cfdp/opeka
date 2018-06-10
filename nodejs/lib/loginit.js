/**
 * Created by benjamin_dk 8/06/2018.
 */
var nconf = require("nconf"),
    winston = require("winston");
  
// Use any command-line or environment settings.
nconf.argv().env();

// Load settings from config.json.
nconf.file({ file: 'config.json' });

// Configure logging to use the console and a log file, but with timestamps (off by default).
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: nconf.get("logging:level"),
      timestamp: true
    }),
    new (winston.transports.File)({
      filename: nconf.get("logging:file"),
      colorize: true,
      level: nconf.get("logging:level"),
      timestamp: true
    })
  ]
});

logger.setLevels(winston.config.syslog.levels);

module.exports = logger;