/**
 * @file
 * Code for managing chat rooms.
 */
"use strict";

var _ = require('underscore'),
    nowjs = require("now"),
    uuid = require('node-uuid'),
    util = require("util"),
    opeka = {
      user: require("./user"),
    },
    roomList = {},
    roomCounts = {
      group: {
        empty: 0,
        active: 0,
        full: 0
      },
      pair: {
        empty: 0,
        active: 0,
        full: 0
      },
      total: {
        empty: 0,
        active: 0,
        full: 0
      }
    };

// Get an open room of a specific type - pair or group.
var getOpenRoom = function (roomType) {
  return _.find(roomList, function (room) {
    var userCount = Object.keys(room.users).length;

    if (roomType === 'pair') {
      return (room.maxSize === 2 && userCount < 2);
    }
  });
};

// Sums together a room list into empty, active and full rooms.
var sumRoomList = function (rooms) {
  var empty = 0,
      active = 0,
      full = 0;

  _.each(rooms, function (room) {
    var userCount = Object.keys(room.users).length;

    if (userCount > 0) {
      if (room.isFull()) {
        full = full + 1;
      }
      else {
        active = active + 1;
      }
    }
    else {
      empty = empty + 1;
    }
  });

  return {
    empty: empty,
    active: active,
    full: full,
  };
};

// Count the rooms and update the roomCounts object with the result.
var updateRoomCounts = function () {
  var pairRooms = [],
      groupRooms = [],
      allRooms = [];

  _.each(roomList, function (room) {
    // Private rooms aren't counted.
    if (room.private) {
      return;
    }

    if (room.maxSize === 2) {
      pairRooms.push(room);
    }
    else {
      groupRooms.push(room);
    }

    allRooms.push(room);
  });

  roomCounts.pair = sumRoomList(pairRooms);
  roomCounts.group = sumRoomList(groupRooms);
  roomCounts.total = sumRoomList(allRooms);
};

// The main chatroom object.
var Room = function (options) {
  var self = this;

  self.construct = function () {
    // Core attributes of a room.
    self.id = options.id || uuid();
    self.name = options.name;
    self.maxSize = parseInt(options.maxSize, 10);
    self.private = options.private;
    self.ipLocation = options.ipLocation;
    self.uid = options.uid;
    self.queueSystem = options.queueSystem || 'private' // Default to private queue system.
    // When a room is created, the creator will join setting the member count to init value to 1.
    self.memberCount = 1;

    // Create Now.js groups for connected users and councellors.
    self.group = nowjs.getGroup(self.id);
    self.counsellorGroup = nowjs.getGroup("counsellors-" + self.id);

    // A hash of the users currently in the room.
    self.users = {};

    // A list of users waiting to join the chat.
    self.queue = [];

    // Add our new room to the room list.
    roomList[self.id] = self;

    util.log('Room created:' + self.id);

    updateRoomCounts();

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
  self.addUser = function (user, callback) {
    var count = _.size(self.users);
    // When a user enters a room, he is never muted.
    user.muted = false;
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.
    if ((user.account.isAdmin || (!self.maxSize || count < self.maxSize)) && user) {
      self.users[user.clientId] = opeka.user.filterData(user);
      self.group.addUser(user.clientId);

      // Start the timer in order to retrieve at the end the duration of the chat
      if (user.account.isAdmin) {
        self.counsellorGroup.addUser(user.clientId);
      }
      else {
        self.chatDurationStart_Min = Math.round((new Date()).getTime() / 60000);
      }

      updateRoomCounts();

      // Update user list for the admins.
      if (callback) {
        try {
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
    var queueUserID, removedUserNickname;

    if (self.users[clientId]) {
      removedUserNickname = self.users[clientId].name;
      // Remove clientId from either group as well as the user list.
      self.group.removeUser(clientId);
      self.counsellorGroup.removeUser(clientId);
      delete self.users[clientId];

      updateRoomCounts();
    }

    // Iterate over the queue to find the first user that is not in a
    // different room.
    while (self.queue.length > 0 && !queueUserID) {
      var user = self.queue.shift();
      // The user has not to be in other rooms.
      if (!user.activeRoomId) {
        queueUserID = user.clientId;
      }
    }

    if (callback) {
      try {
        callback(self.users, queueUserID, removedUserNickname);
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
  };

  self.getUserQueueNumber = function (clientId) {
    var userIndex = null;
    _.each(this.queue, function (user, index) {
      if (user.clientId === clientId) {
        userIndex = index;
      }
    });
    return userIndex;
  };

  // Reserve spot in room.
  self.reserveSpot = function (clientId) {
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.id,
      uid: self.uid,
      name: self.name,
      maxSize: self.maxSize,
      memberCount: self.memberCount,
      paused: this.paused || false,
      private: self.private,
      queueSystem: self.queueSystem
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

    updateRoomCounts();
  };

  /**
   * Check to see if the user is muted.
   */
  self.userIsMuted = function(clientId) {
    return self.users[clientId].muted;
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

    updateRoomCounts();
  }
};

module.exports = {
  Room: Room,
  clientData: clientData,
  counts: roomCounts,
  getOpenRoom: getOpenRoom,
  list: roomList,
  remove: remove
};

