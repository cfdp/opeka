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
    if (self.maxSize > 0 && self.group.count >= self.maxSize) {
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
  self.addUser = function (user, callback) {
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.

    //nationality check:
    //if (!user.account.isAdmin && self.nationality && user.state && (self.nationality.indexOf(user.state) < 0)) {
      //return -1;
    //}

    if ((!self.maxSize || true || self.group.count < self.maxSize) && user) {
      self.users[user.clientId] = user;
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
    } else if(!user.account.isAdmin) {
      return self.queue.push(user) - 1;
    } else {
      return -1;
    }
  };

  // Remove user from the room.
  // If somebody is in queue return the user object of the first in queue for this chat room
  self.removeUser = function (clientId, callback) {
    try {
      self.users[clientId].now.activeRoomId = null;
    } catch(ignored) {
      // If we get an exception here, it means that the user is
      // disconnected. We let that pass silently.
    } finally {
      delete self.users[clientId];

      // Remove clientId from either group.
      self.group.removeUser(clientId);
      self.counsellorGroup.removeUser(clientId);

      var found = false;
      while (self.queue.length > 0 && !found) {
        var user = self.queue.shift();
        var group = nowjs.getGroup(user.clientId);
        //the user has to be connected and has not to be in other rooms
        if (group.count > 0 && !user.activeRoomId) {
          found = true;
          group.now.changeRoom(self.id);
          group.now.joinRoom(self.id);
        }
      }

      if (callback) {
        try {
          callback(self.users);
        } catch(ignored) {
          //this is ignored since we have an exception if no counselor are in the room. We should discuss this eventuality...
        }
      }
    }
  };

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

  return self.construct();
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

