/**
 * @file
 * Code for managing chat queues.
 */
"use strict";

var _ = require('underscore'),
    uuid = require('node-uuid'),
    logger = require('./loginit'),
    opeka = {
      user: require("./user"),
    },
    queueList = {};


// The main queue object.
var Queue = function (options) {
  var self = this;

  self.construct = function () {
    // Core attributes of a queue.
    self.id = options.id || uuid();
    self.name = options.name;
    self.active = options.active;

    // A list of users who is in the queue.
    self.queue = [];

    // Add our new queue to the queue list.
    queueList[self.id] = self;

    logger.info('Queue created: ' + self.name);

    return self;
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.id,
      name: self.name,
      active: self.active,
    };
  };

  // Add a user to the queue.
  self.addToQueue = function (user) {
    logger.info('User added to queue ');
    var position;
    _.forEach(self.queue, function (queueUser, index) {
      if (queueUser.clientId === user.clientId) {
        // Zero indexes so +1 to make truthy.
        position = index + 1;
      }
    });
    // Make sure that the user can't join the queue twice.
    if (position) {
      return position - 1;
    }
    return self.queue.push(user) - 1;
  }

  // Get the position of the user in the queue
  self.getPosition = function (clientId) {
    var position = 0;
    _.forEach(self.queue, function (user, index) {
      if (user.clientId === clientId) {
        // Zero indexes count, so + 1.
        position = index + 1;
      }
    });
    return position;
  }

  // Get the next user from the queue and return the cient id.
  self.getUserFromQueue = function() {
    var user = self.queue.shift();
    if (user) {
      return user.clientId;
    }
    return false;
  }

  // Remove a specific client id from the queue
  self.removeUserFromQueue = function (clientId) {
    var position = self.getPosition(clientId);
    if (position > 0) {
      self.queue.splice(position - 1, 1);
      return true;
    }
    return false;
  }

  // Flush the queue - remove the users in the queue
  self.flushQueue = function (users) {
    var user;
    while (user = self.queue.shift()) {
      if (users[user.clientId]) {
        users[user.clientId].remote('queueIsFlushed', user.clientId);
      }
    }
  }

  // Count the number of the users in the queue
  self.countUsers = function () {
    var count = 0;
    _.forEach(self.queue, function (user, index) {
      count += 1;
    });
    return count;
  }

  return self.construct();
};

// Provide a list of queues for the client.
var clientData = function () {
  var queues = _.map(queueList, function (queue) {
    return queue.clientData();
  });

  queues = _.sortBy(queues, function (queue) {
    return queue.name;
  });

  return queues;
};


module.exports = {
  Queue: Queue,
  clientData: clientData,
  list: queueList
};
