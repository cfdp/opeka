// Handles saving chat session stats
"use strict";

var drupal = require("drupal"),
  logger = require('./loginit');

// Save chat session data if the table exists
module.exports.save = function (clientId, age, gender, screening, callback) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_stats'], function (err, result) {
    if (result) {
      return saveData(clientId, age, gender, screening, callback);
    }
    else {
      logger.warning('Error: The opeka_stats table does not appear to be present ind the DB.');
    }
  });
};

module.exports.saveChatDuration = function(stats_id, duration) {
  drupal.db.query('SHOW TABLES LIKE ?', ['opeka_stats'], function (err, result) {
    if (result) {
      return saveChatDuration(stats_id, duration);
    }
    else {
      logger.warning('Error: The opeka_stats table does not appear to be present ind the DB.');
    }
  });
}

// Add the submissions to the database.
function saveData(clientId, age, gender, screening, callback) {
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
    client_id: clientId,
    age: age,
    gender: gender,
    question: question,
    answer: answer,
    submission_date: timestamp
  };

  drupal.db.query('INSERT INTO opeka_stats SET ?', record, function (err, result) {
    if (result) {
      logger.info('Info: Saved preliminary chat sessions stats.');
      if (callback) {
        callback(result.insertId);
      }
    }
    else {
      logger.error('Error: Chat session stats could not be saved.');
    }
  });
}

// Add the chat duration to the database.
function saveChatDuration(stats_id, duration) {

  drupal.db.query('UPDATE opeka_stats SET chat_duration = ? WHERE submission_id = ?', [duration, stats_id], function (err, result) {
    if (result) {
      logger.info('Saved chat duration to statistics.');
    }
    else {
      logger.error('Chat duration could not be saved to opeka_stats table.');
    }
  });
}
