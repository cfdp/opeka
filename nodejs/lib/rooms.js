/**
 * @file
 * Code for managing chat rooms.
 */
"use strict";

var _ = require('underscore'),
    nowjs = require("now"),
    uuid = require('node-uuid'),
    util = require("util"),
    roomList = {};

// The main chatroom object.
var Room = function (options) {
  var self = this;

  self.construct = function () {
    // Core attributes of a room.
    self.id = options.id || uuid();
    self.name = options.name;
    self.maxSize = options.maxSize;
    self.private = options.private;
    self.ipLocation = options.ipLocation;

    // Create Now.js groups for connected users and councellors.
    self.group = nowjs.getGroup(self.id);
    self.counsellorGroup = nowjs.getGroup("counsellors-" + self.id);

    // A hash of the users currently in the room.
    self.users = {};

    // A list of users waiting to join the chat.
    self.queue = [];

    // Add our new room to the room list.
    roomList[self.id] = self;

    console.log('Room created:' + self.id);

    return self;
  };

  // Method used in order to check if the room is full
  self.isFull = function() {
    var count = _.size(self.users);
    if (self.maxSize > 0 && count >= self.maxSize) {
      return true;
    }
    else {
      return false;
    }
  };

  // Add an user to the group.
  // Returns: 'OK' if the user has been added to the chat, an integer that is stating
  // the user place in the queue if the chat is busy, or a negative
  // integer if the user cannot join the chat.
  self.addUser = function (user, callback, count) {
    var count = _.size(self.users);
    // When a user enters a room, he is never muted.
    user.muted = false;
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.
    if ((user.account.isAdmin || (!self.maxSize || count < self.maxSize)) && user) {
      self.users[user.clientId] = filterUserData(user);
      self.group.addUser(user.clientId);

      // Start the timer in order to retrieve at the end the duration of the chat
      if (user.account.isAdmin) {
        self.counsellorGroup.addUser(user.clientId);
      }
      else {
        self.chatDurationStart_Min = Math.round((new Date()).getTime() / 60000);
      }

      // Update user list for the admins.
      if (callback) {
        try{
          callback(self.users);
        } catch(ignore) {
          //this is ignored since we have an exception if no counselor are in the room. We should discuss this eventuality...
        }
      }

      // The chat is free, we return 'OK'.
      return 'OK';
    } else {
      // Put in queue and return queue number.
      return self.queue.push(user) - 1;
    }
  };

  // Remove user from the room.
  // If somebody is in queue return the user object of the first in queue for this chat room
  self.removeUser = function (clientId, callback) {
    delete self.users[clientId];

    // Remove clientId from either group.
    self.group.removeUser(clientId);
    self.counsellorGroup.removeUser(clientId);

    var found = false;
    while (self.queue.length > 0 && !found) {
      var user = self.queue.shift();
      // The user has not to be in other rooms.
      if (!user.activeRoomId) {
        found = user.clientId;
      }
    }

    if (callback) {
      try {
        callback(self.users, found);
      } catch(ignored) {
        //this is ignored since we have an exception if no counselor are in the room. We should discuss this eventuality...
      }
    }
  };

  // Remove a user from the queue.
  self.removeUserFromQueue = function (clientId) {
    var userIndex = null;
    _.each(this.queue, function (user, index) {
      if (user.clientId === clientId) {
        userIndex = index;
      }
    });
    // We found the user - remove him.
    if (userIndex !== null) {
      this.queue.splice(userIndex, 1);
    }
  }

  self.getUserQueueNumber = function (clientId) {
    var userIndex = null;
    _.each(this.queue, function (user, index) {
      if (user.clientId === clientId) {
        userIndex = index;
      }
    });
    return userIndex;
  }

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.id,
      name: self.name,
      maxSize: self.maxSize,
      paused: this.paused || false,
      private: self.private
    };
  };

  /**
   * Remove all users from the room.
   */
  self.removeAllUsers = function() {
    _.each(self.users, function (user) {
      self.removeUser(user.clientId);
    });
    self.users = {};
    self.queue = [];
  };

  /**
   * Check to see if the user is muted.
   */
  self.userIsMuted = function(clientId) {
    return self.users[clientId].muted;
  }

  return self.construct();
};

/**
 * Filters the user data and remove personal/security sensitive data and
 * create and new user object.
 */
var filterUserData = function (user) {
  return {
    age: user.age,
    clientId: user.clientId,
    gender: user.gender,
    isAdmin: user.isAdmin,
    muted: user.muted,
    name: user.nickname || user.account.name
  };
};


// Provide a list of rooms for the client.
var clientData = function (includePrivateRooms) {
  var rooms = _.map(roomList, function (room) {
        return room.clientData();
      });

  rooms = _.sortBy(rooms, function (room) {
    return room.name;
  });

  if (!includePrivateRooms) {
    return rooms;
  }

  return rooms;
};

// Remove a room from the system.
var remove = function (roomId, callback) {
  var room = roomList[roomId];
  if (room) {
    room.removeAllUsers();

    delete roomList[roomId];

    if (callback) {
      callback();
    }
  }
};

module.exports = {
  Room: Room,
  clientData: clientData,
  list: roomList,
  remove: remove
};

