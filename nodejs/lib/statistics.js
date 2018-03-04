// Handles saving chat session stats
"use strict";

var drupal = require("drupal"),
  util = require("util");

// Save chat session data if the table exists
module.exports.save = function (age, gender, screening, callback) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_stats'], function (err, result) {
    if (result) {
      return saveData(age, gender, screening, callback);
    }
    else {
      util.log('Error: The opeka_stats table does not appear to be present ind the DB.');
    }
  });
};

module.exports.saveChatDuration = function(statsId, duration) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_stats'], function (err, result) {
    if (result) {
      return saveChatDuration(statsId, duration);
    }
    else {
      util.log('Error: The opeka_stats table does not appear to be present ind the DB.');
    }
  });
}

// Add the submissions to the database.
function saveData(age, gender, screening, callback) {
  // Get the current UNIX timestamp
  var timestamp = (+new Date() / 1000);
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
      util.log('Info: Saved preliminary chat sessions stats.');
      if (callback) {
        callback(result.insertId);
      }
    }
    else {
      util.log('Error: Chat session stats could not be saved.');
      throw err;
    }
  });
}

// Add the chat duration to the database.
function saveChatDuration(statsId, duration) {

  drupal.db.query('UPDATE opeka_stats SET chat_duration = ? WHERE submission_id = ?', [duration, statsId], function (err, result) {
    if (result) {
      util.log('Info: Saved chat duration into stats.');
    }
    else {
      util.log('Error: Chat duration could not be saved into stats.');
      throw err;
    }
  });
}
