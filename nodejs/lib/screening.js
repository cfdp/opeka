// Handles saving screening questions and responses
"use strict";

var drupal = require("drupal"),
    util = require("util");

// Save a submission if the table exists
module.exports.save = function (age, gender, screening) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_screening_submissions'], function(err, result) {
    if (result) {
      saveData(age, gender, screening);
    }
    else {
      util.log('Error: The Drupal Opeka Screening module does not appear to be installed.');
    }
  });
};

// Add the submissions to the database.
function saveData(age, gender, screening) {
  // Get the current UNIX timestamp
  var timestamp = (+new Date()/1000);

  var record = {
    age: age,
    gender: gender,
    question: screening['question'],
    answer: screening['answer'],
    submission_date: timestamp
  };

  drupal.db.query('INSERT INTO opeka_screening_submissions SET ?', record, function (err, result) {
    if (result) {
      util.log('Info: Saved screening responses.');
    }
    else {
      util.log('Error: Screening responses could not be saved.');
      throw err;
    }
  });
}
