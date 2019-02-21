/**
 * @file
 * Code for managing chat rooms.
 */
"use strict";

var _ = require('underscore'),
  uuid = require('node-uuid'),
  logger = require('./loginit'),
  opeka = {
    groups: require('./groups'),
    user: require("./user"),
    queues: require("./queues")
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
  },
  numberOfUserColors = 12;

/**
 * Get an open room of a specific type - pair or group.
 * Should not return a paused room and it should (@todo)
 * randomize between the available rooms so counselors will be handed new clients evenly.
 * @todo: test if this works for group chats
 */
var getOpenRoom = function (roomType) {
  return _.find(roomList, function (room) {
    var userCount = Object.keys(room.users).length;

    // No empty rooms, no full rooms and no paused rooms
    if (userCount == 0 || userCount >= room.maxSize || room.paused) {
      return false;
    }

    // Pair rooms should be exactly two users
    if (roomType === 'pair') {
      return (room.maxSize === 2);
    } else {
      // And other types of room should _not_ be two users
      return (room.maxSize !== 2);
    }
  });
};

// Sums together a room list into empty, active and full rooms.
// @todo: the "full" variable should be renamed to e.g. inaccessible
// signaling that it reflects the paused property also
var sumRoomList = function (rooms) {
  var empty = 0,
    active = 0,
    full = 0;

  _.each(rooms, function (room) {
    var userCount = Object.keys(room.users).length;

    if (userCount > 0) {
      // If the room is full or paused, it counts as inaccessible
      if (room.isFull() || room.paused) {
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
    full: full
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
    self.invite = options.invite;
    self.ipLocation = options.ipLocation;
    self.uid = options.uid;
    self.queueSystem = options.queueSystem || 'private'; // Default to private queue system.
    // When a room is created, the creator will join setting the member count to init value to 1.
    self.memberCount = 1;
    // A room can be paused by the counselor and an autoPauseRoom setting is available as well in config.json
    self.paused = false;
    // Is it allowed for clients to be alone in a room without a counselor?
    self.soloClientsAllowed = options.soloClientsAllowed || false;

    // Create groups for connected users and councellors.
    self.group = opeka.groups.getGroup(self.id);
    self.counselorGroup = opeka.groups.getGroup("counselors-" + self.id);

    // A hash of the users currently in the room.
    self.users = {};

    // A list of users waiting to join the chat.
    self.queue = [];

    // A list group messages.
    self.messages = [];

    // Add our new room to the room list.
    roomList[self.id] = self;

    logger.info('Room created: ' + self.id + ', invite: ' + self.invite);

    updateRoomCounts();

    return self;
  };

  // Method used in order to check if the room is full
  self.isFull = function () {
    var count = _.size(self.users);
    if (self.maxSize > 0 && count >= self.maxSize) {
      return true;
    }
    else {
      return false;
    }
  };

  // Method used to see if there is an counselor in the room
  // with an online connection
  self.hasCounselor = function () {
    var count,
        counselorOnline = false,
        clientId;

    var setCount = function (response) {
      count = response;
     };
    self.counselorGroup.count(function (ct) {
      setCount(ct);
    });
    // check for online counselor
    Object.keys(self.counselorGroup.members).forEach(function(key) {
      if (self.users[key].online === "online") {
        counselorOnline = true;
      }
    });
  
    if (count >= 1 && counselorOnline) {
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
  self.addUser = function (client, callback) {
    var count = _.size(self.users);
    // When a user enters a room, he is never muted.
    client.muted = false;
    // If we have both rooms and groups, check that
    // - we don't exceed the room size (if set)
    // - that the room is not paused
    // - that we have a counselor present (if needed)
    // before adding the person to the room.
    if (client.account.isAdmin
        || (((!self.maxSize || count < self.maxSize)) && (!self.paused) && (self.hasCounselor() && !self.soloClientsAllowed))
        && client) {
      self.users[client.clientId] = opeka.user.filterData(client);
      self.group.addUser(client.clientId);

      // Start the timer in order to retrieve at the end the duration of the chat
      if (client.account.isAdmin) {
        self.counselorGroup.addUser(client.clientId);
        logger.info('Admin user added to room ' + self.id);
      }
      else {
        logger.info('Regular user added to room ' + self.id);
      }

      updateRoomCounts();

      // Update user list for the admins.
      if (callback) {
        try {
          callback(self.users);
        } catch (ignore) {
          // this is ignored since we have an exception if no counselor are in the room. 
          // We should discuss this eventuality...
        }
      }

      // The chat is available, we return 'OK'.
      return 'OK';
    } else {
      // Put in queue and return queue number.
      return self.addToQueue(client);
    }
  };

  // Remove user from the room.
  // If somebody is in queue return the user object of the first in queue for this chat room
  self.removeUser = function (clientId, callback) {
    var queueUserID, removedUserNickname, queue;

    if (self.users[clientId]) {
      removedUserNickname = self.users[clientId].name;
      // Remove clientId from either group as well as the user list.
      self.group.removeUser(clientId);
      self.counselorGroup.removeUser(clientId);
      delete self.users[clientId];

      updateRoomCounts();
    }
    
    // Check which queue to get the next user from.
    if (self.queueSystem === 'private') {
      // Iterate over the queue to find the first user that is not in a
      // different room.
      while (self.queue.length > 0) {
        var user = self.queue.shift();
        // The user has not to be in other rooms.
        if (!user.activeRoomId) {
          queueUserID = user.clientId;
        }
      }
    }
    // self.isFull() should not be needed but is needed anyways. Failsafe.
    else if (self.paused !== true && !self.isFull()) {
      // Get the next user from the global queue system.
      queue = opeka.queues.list[self.queueSystem];
      queueUserID = queue.getUserFromQueue();
    }

    if (callback) {
      try {
        callback(null, self.users, queueUserID, removedUserNickname);
      } catch (ignored) {
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
      return true;
    }
    return false;
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

  self.addToQueue = function (user) {
    // Private queue system - add to the private queue.
    if (self.queueSystem === 'private') {
      return self.queue.push(user) - 1;
    }
    // Global queue.
    var queue = opeka.queues.list[self.queueSystem];
    if (queue) {
      return queue.addToQueue(user);
    }
    return false;
  };

  // Assign an available colorId to a new user in the room.
  self.assignColorId = function (clientId, callback) {
    var i = 0;
    var newColorId;
    var colorsAvailable = _.range(numberOfUserColors);
    var colorsTaken = [];
    // Filter out the colorIds that have been taken already
    _.each(this.users, function (user, index) {
      if (user.colorId != null && user.clientId != clientId) {
        colorsTaken.push(parseInt(user.colorId));
      }
      if (i >= numberOfUserColors) {
        // There were no available colorIds - hand out a random one.
        logger.debug('More users than user colors, assigning random value.');
        colorsAvailable = false;
      }
      i++;
    });
    if (colorsAvailable) {
      colorsAvailable = _.difference(colorsAvailable, colorsTaken);
      newColorId = String(colorsAvailable[0]);
    }
    else {
      newColorId = String(Math.floor((Math.random() * numberOfUserColors)));
    }
    if (callback) {
      this.users[clientId].colorId = newColorId;
      callback(newColorId);
    }
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.id,
      uid: self.uid,
      name: self.name,
      invite: self.invite,
      maxSize: self.maxSize,
      memberCount: self.memberCount,
      paused: self.paused || false,
      private: self.private,
      queueSystem: self.queueSystem,
      messages: self.messages,
      counselorPresent: self.hasCounselor()
    };
  };

  /**
   * Remove all users from the room.
   */
  self.removeAllUsers = function () {
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
  self.userIsMuted = function (clientId) {
    return self.users[clientId].muted;
  };

  /**
   * Replaces the user with clientId with the newClient
   *
   * Used in the reconnect feature
   */
  self.replaceUser = function (clientId, newClient) {
    if (self.users[clientId]) {
      if (clientId !== newClient.clientId) {
        logger.debug('Replaced user ' + clientId + ' with ' + newClient.clientId + ' in room ' + self.id);
        self.removeUser(clientId);
        self.addUser(newClient);
        opeka.user.sendUserList(self.group, self.id, self.users);
      }
    }
  };

  return self.construct();
};

// Provide a list of rooms for the client.
var clientData = function (includePrivateRooms) {
  var rooms = [];
  _.each(roomList, function (room) {
    if (!room.private) {
      rooms.push(room.clientData());
    }
  });

  rooms = _.map(roomList, function (room) {
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
  remove: remove,
  updateRoomCounts: updateRoomCounts
};

