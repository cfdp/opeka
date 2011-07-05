var drupal = require("drupal"),
    settings = require('./settings'),
    opeka = require("./lib/opeka"),
    util = require("util");

// Set up the database connection as our first order of business.
util.log('Connecting to database...');
var client = drupal.db.connect(settings.databaseConnection, function (err, connection) {
  if (err) {
    util.log('Error connecting to Drupal database: ' + err.message);
  }
  else if (connection) {
    util.log('Database connection established, initlialising Now.js server...');
    var server = new spravka.Server(settings.httpPort);
  }
});

process.on('exit', function () {
  if (!client) {
    util.log('FAIL: Could not connect to database. Exiting.');
  }
});

