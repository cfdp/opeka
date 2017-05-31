// Handles saving chat session stats
"use strict";

var drupal = require("drupal"),
    util = require("util");

// Save chat session data if the table exists
module.exports.save = function (age, gender, screening) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_stats'], function(err, result) {
    if (result) {
      saveData(age, gender, screening);
    }
    else {
      util.log('Error: The opeka_stats table does not appear to be present ind the DB.');
    }
  });
};

// Add the submissions to the database.
function saveData(age, gender, screening) {
  // Get the current UNIX timestamp
  var timestamp = (+new Date()/1000);
  var question;
  var answer;

  // If screening data is present, save it
  if (screening) {
    question = screening['question'];
    answer = screening['answer'];
  }

  var record = {
    age: age,
    gender: gender,
    question: question,
    answer: answer,
    submission_date: timestamp
  };

  drupal.db.query('INSERT INTO opeka_stats SET ?', record, function (err, result) {
    if (result) {
      util.log('Info: Saved chat sessions stats.');
    }
    else {
      util.log('Error: Chat session stats could not be saved.');
      throw err;
    }
  });
}
