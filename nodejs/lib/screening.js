// Handles saving screening questions and responses
"use strict";

var drupal = require("drupal"),
    util = require("util");

// Save a submission
module.exports.save = function (resp) {
  // Get the current UNIX timestamp
  var timestamp = (+new Date()/1000);
  
  // Add the submissions to the database.
  drupal.db.query('INSERT INTO opeka_screening_submissions SET ?', [resp, timestamp], function (err, result) {
    if (result) {
      util.log('Info: Saved screening responses.');
    }
    else {
      util.log('Error: Screening responses could not be saved.');
      throw err;    
    }
  });
};