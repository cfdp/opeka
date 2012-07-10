/**
 * @file
 * Code for managing chat queues.
 */
"use strict";

var _ = require('underscore'),
    nowjs = require("now"),
    uuid = require('node-uuid'),
    util = require("util"),
    opeka = {
      user: require("./user"),
    },
    queueList = {};


// The main queue object.
var Queue = function (options) {
  var self = this;

  self.construct = function () {
    // Core attributes of a room.
    self.id = options.id || uuid();
    self.name = options.name;
    self.active = options.active;

    // A list of users who is in the queue.
    self.queue = [];

    // Add our new room to the room list.
    queueList[self.id] = self;

    util.log('Queue created: ' + self.name);

    return self;
  };

  return self.construct();
};

module.exports = {
  Queue: Queue,
  list: queueList
};
