var drupal = require("drupal"),
    settings = require('./settings'),
    opeka = require("./lib/opeka"),
    util = require("util");

// Set up the database connection as our first order of business.
util.log('Connecting to database...');
var client = drupal.db.connect(settings.databaseConnection),
    server = new opeka.Server(settings.httpPort);

process.on('exit', function () {
  if (!client) {
    util.log('FAIL: Could not connect to database. Exiting.');
  }
});

