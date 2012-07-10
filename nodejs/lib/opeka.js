/**
 * Main opeka module.
 *
 * This contains the core of the Opeka code encapsulated in the Server
 * object, so you can instance it from your own code if need be.
 */
"use strict";

// Load all our dependencies.
var _ = require("underscore"),
    async = require("async"),
    crypto = require('crypto'),
    nowjs = require("now"),
    util = require("util"),
    uuid = require('node-uuid'),
    opeka = {
      ban: require('./ban'),
      queues: require('./queues'),
      rooms: require('./rooms'),
      user: require('./user')
    };


function Server(config, logger) {
  var self = this;

  self.construct = function () {
    var queues = config.get('queues');
    self.config = config;
    self.logger = logger;

    // Configure the main web server.
    self.server = self.createServer(self.config, function (req, res) {
      res.writeHead(200);
      res.write('Welcome to Opeka.');
      res.end();
    });
    self.server.listen(self.config.get('http:port'), function () {
      logger.info('Opeka chat server listening on port '  + self.config.get('http:port'));
    });

    // Keep track of valid sign in nonces.
    self.signInNonces = {};

    // Initialise Now.js on our server object.
    self.everyone = nowjs.initialize(self.server);

    // Create groups for councellors and guests.
    self.councellors = nowjs.getGroup('councellors');
    self.guests = nowjs.getGroup('guests');
    self.signedIn = nowjs.getGroup('signedIn');
    self.banCodeGenerator = nowjs.getGroup('banCodeGenerator');

    // Create the queues from the settings.
    if (_.isArray(queues)) {
      _.forEach(queues, function (name) {
        new opeka.queues.Queue({
          name: name,
          active: true,
        });
      });
    }
  };

  /**
   * Create a server instance, HTTP or HTTPS depending on config.
   */
  self.createServer = function (config, callback) {
    if (config.get('https:enabled')) {
      return require('https').createServer(config.get('https'), callback);
    }

    return require('http').createServer(callback);
  };

  // Update the client side guest/councellor counts.
  self.updateUserStatus = function (context) {
    // Getting the user count for groups is an async operation, so we
    // need to use async.parallel to marshall the results.
    async.parallel({
      councellors: function (callback) {
        self.councellors.count(function (count) {
          callback(null, count);
        });
      },
      guests: function (callback) {
        self.guests.count(function (count) {
          callback(null, count);
        });
      },
      rooms: function (callback) {
        callback(null, opeka.rooms.counts);
      },
      roomsList: function (callback) {
        callback(null, opeka.rooms);
      }
    }, function (err, results) {
      if (results && _.isFunction(context.updateStatus)) {
        var roomList = [];

        _.each(results.roomsList.list, function (room) {
          if (room.maxSize > 2 && !room.private) {
            var roomData = {
              maxSize: room.maxSize,
              memberCount: room.memberCount,
              name: room.name
            };
            roomList.push(roomData);
          }
        });

        results.roomsList = roomList;
        results.queueSystem = self.config.get('features:queueSystem');
        results.chatPageURL = self.config.get('chatPage');
        context.updateStatus(results);
      }
    });
  };

  // The following methods require Nowjs to be instantiated, so we need
  // to call the constructor here. That is bad form, but it requires
  // more refactoring to change that I care for right now.
  self.construct();

  /**
   * This function is called by the client when he's ready to load the chat.
   *
   * This usually means after loading client-side templates and other
   * resources required for the safe operation of the chat.
   */
  self.everyone.now.signIn = function (clientUser, callback) {
    var client = this;

    opeka.user.authenticate(clientUser, function (err, account) {
      if (err) {
        throw err;
      }

      // Add the user to the signedIn group.
      self.signedIn.addUser(client.user.clientId);

      if (account.canGenerateCanCode) {
        self.banCodeGenerator.addUser(client.user.clientId);
        self.logger.info('User that can generate ban codes signed in.', client.user.clientId);
      }
      if (account.isAdmin) {
        self.councellors.addUser(client.user.clientId);

        self.logger.info('Admin user signed in.', client.user.clientId);

        client.now.receiveRoomList(opeka.rooms.clientData(true));
      }
      else {
        self.guests.addUser(client.user.clientId);
        // The following is done in order to put each user in a single group.
        // In this way we are able to give to the counselors the ability to whisper
        nowjs.getGroup(client.user.clientId).addUser(client.user.clientId);

        self.logger.info('User signed in.', client.user.clientId);

        // Store the location information for later use, if they have been defined.
        if (clientUser.address) {
          var add = clientUser.address.split(", ");
          client.user.city = add[0];
          client.user.state = add[1];
        }

        client.now.receiveRoomList(opeka.rooms.clientData());
      }

      client.now.receiveQueueList(opeka.queues.clientData());

      // Store the account and nickname for later use.
      client.user.account = account;
      client.user.nickname = clientUser.nickname;
      client.user.gender = clientUser.gender;
      client.user.age = clientUser.age;

      // Update online users count for all clients.
      self.updateUserStatus(self.everyone.now);

      if (callback) {
        callback(account);
      }
    });
  };

  // Give the client a URL where he can sign in and go directly to a
  // room of the requested type.
  self.everyone.now.getDirectSignInURL = function (roomType, callback) {
    var rightNow = new Date(),
        nonce = crypto.createHash('sha256').update(this.user.clientId + rightNow.getTime()).digest('hex'),
        signInURL = self.config.get('chatPage');

    self.signInNonces[nonce] = {
      date: rightNow,
      roomType: roomType
    };

    callback(signInURL + '#signIn/' + nonce);
  };

// -------- GLOBAL QUEUE FUNCTIONS START -----------

  // Called by the Counsellors in order to create a new room.
  self.councellors.now.createQueue = function (attributes, callback) {
    if (attributes.name.length > 0) {
      if (attributes.active === undefined) {
        attributes.active = true;
      }
      var queue = new opeka.queues.Queue(attributes);

      if (callback) {
        callback(null, queue.clientData());
      }

      // Send the new complete room list to connected users.
      //self.councellors.now.queueCreated(room.clientData());

      self.logger.info('Queue ' + queue.name + ' (' + queue.id + ') created.');

    } else {
      callback("Error creating room: room name too short.");
    }
  };

  self.everyone.now.getGlobalQueuePosition = function(queueId, callback) {
    var queue = opeka.queues.list[queueId],
        position,
        rooms = 0;
    if (queue) {
      position = queue.getPosition(this.user.clientId);
    }
    _.forEach(opeka.rooms.list, function(room) {
      if (room.queueSystem === queueId) {
        rooms += 1;
      }
    })
    if (callback) {
      callback(position, rooms);
    }
  };

  // Remove the user from queue - can only remove yourself.
  self.everyone.now.removeUserFromGlobalQueue = function (queueId, clientId) {
    if (this.user.clientId === clientId) {
      var queue = opeka.queues.list[queueId],
          roomId;
      queue.removeUserFromQueue(clientId);
      // Get a room that is attached to the queue and mark is as it has
      // updated queue status. This is a small hack to reuse code.
      _.forEach(opeka.rooms.list, function (room) {
        if (room.queueSystem == queueId) {
          roomId = room.id;
        }
      });
      self.everyone.now.updateQueueStatus(roomId);
    }
  };

// -------- GLOBAL QUEUE FUNCTIONS END -----------


  // Once the user has a direct sign in nonce, he has the ability to
  // reserve his spot in a room.
  self.everyone.now.reserveRoomSpot = function (nonce, callback) {
    var room, roomType;

    if (self.signInNonces[nonce]) {
      roomType = self.signInNonces[nonce].roomType;

      room = opeka.rooms.getOpenRoom(roomType);

      if (room) {
        room.reserveSpot(this.user.clientId);
        callback(room.id);
      }
    }
  };

  self.everyone.now.getFeatures = function (callback) {
    callback(self.config.get('features'));
  };

  // Allow the councellors to pause a room.
  self.councellors.now.pauseRoom = function (roomId, callback) {
    var context = this;
    var room = opeka.rooms.list[roomId];

    if (room.paused) {
      self.logger.error('User ' + this.user.clientId + ' tried to pause room ' + roomId + ' that was already paused.');
      callback("Error Pause: the room has already been paused.");
      return;
    }

    room.paused = true;
    self.everyone.now.roomUpdated(roomId, { paused: true });
    self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
    callback();
  };

  // Allow the councellors to unpause a room.
  self.councellors.now.unpauseRoom = function (roomId, callback) {
    var context = this;
    var room = opeka.rooms.list[roomId];

    if (!room.paused) {
      self.logger.error('User ' + this.user.clientId + ' tried to unpause room ' + roomId + ' that was not paused.');
      callback("Error Unpause: the room has not been paused.");
      return;
    }

    room.paused = false;
    self.everyone.now.roomUpdated(roomId, { paused: false });
    self.sendSystemMessage('[Pause]: Chat is available again.', room.group);
    callback();
  };

  // Function used by the counselors to ban a user from the chat.
  self.councellors.now.banUser = function (clientId, banCode, callback) {
    if (opeka.ban.validCode(banCode)) {
      nowjs.getClient(clientId, function () {
        var socket = this.socket,
            ip = socket.handshake.address.address;

        if (!ip) { return; }

        // Register the ban.
        opeka.ban.create(ip, self.config.get('ban:salt'));

        // Mark banned user's session as banned.
        this.now.isBanned = true;

        // Close the socket so the banned user is disconnected, after
        // now.js has had its chance to synch.
        setTimeout(function () {
          socket.disconnect();
        }, 500);

        // Invalidate the ban code so it can't be used again.
        opeka.ban.invalidateCode(banCode);

        // Let the calling user know we've successfully banned someone.
        callback();
      });
    }
    else {
      callback('Invalid ban code.');
    }
  };

  // Function used by admins to get a ban code.
  self.banCodeGenerator.now.getBanCode = function (callback) {
    callback(opeka.ban.getCode());
  };

  // Function used by the counselors to kick an user out of a room.
  self.councellors.now.kick = function (clientId, messageText, roomId) {
    // Get room.
    var room = opeka.rooms.list[roomId],
        roomGroup = nowjs.getGroup(roomId);
    // Tell that the user is being removed.
    if (self.everyone.users[clientId]) {
      roomGroup.now.roomUserKicked(roomId, clientId, messageText, self.everyone.users[clientId].user.nickname);
    }
    // Remove the user.
    self.removeUserFromRoom(room, clientId, function (users) {
      opeka.user.sendUserList(room.group, room.id, users);
    });

    self.updateUserStatus(self.everyone.now);
    self.helperUpdateRoomCount(roomId);
  };

  /* Function used in order to mute a single user */
  self.councellors.now.mute = function (roomId, clientId) {
    var room = opeka.rooms.list[roomId],
        roomGroup = nowjs.getGroup(roomId);
    // Mute the user.
    room.users[clientId].muted = true;
    // Tell the councellors about the muted user.
    opeka.user.sendUserList(room.counsellorGroup, room.id, room.users);
    // Tell the user that he was muted.
    roomGroup.now.roomUserMuted(roomId, clientId, room.users[clientId], this.user.nickname);
  };

  /* Function used in order to unmute a single user */
  self.councellors.now.unmute = function (roomId, clientId) {
    var room = opeka.rooms.list[roomId],
        roomGroup = nowjs.getGroup(roomId);
    // Mute the user.
    room.users[clientId].muted = false;
    // Tell the councellors about the muted user.
    opeka.user.sendUserList(room.counsellorGroup, room.id, room.users);
    // Tell the user that he was muted.
    roomGroup.now.roomUserUnmuted(roomId, clientId, room.users[clientId], this.user.nickname);
  };

  /* Function used by the counselors in order to whisper to an user */
  self.councellors.now.whisper = function (clientId, messageText) {
    var whisperClientId = this.user.clientId,
        whisperName = this.user.nickname,
        recieverName = self.everyone.users[clientId].user.nickname,
        date = new Date();
    // Send to user being whispered.
    self.everyone.users[clientId].now.roomRecieveWhisper(clientId, messageText, whisperName, true, date);
    // Send to counselor who did the whispering.
    this.now.roomRecieveWhisper(whisperClientId, messageText, recieverName, false, date);
  };

  // Called by the Counsellors in order to create a new room.
  self.councellors.now.createRoom = function (attributes, callback) {
    attributes.uid = this.user.account.uid;
    if (attributes.name.length > 0) {
      var room = new opeka.rooms.Room(attributes);

      if (callback) {
        callback(null, room.clientData());
      }

      // Send the new complete room list to connected users.
      if (room.private) {
        self.councellors.now.roomCreated(room.clientData());
      } else {
        self.everyone.now.roomCreated(room.clientData());
      }

      self.logger.info('Room ' + room.name + ' (' + room.id + ') created.');

      self.updateUserStatus(self.everyone.now);
    } else {
      callback("Error creating room: room name too short.");
    }
  };

  // This function is called by the Counsellors in order to delete a room from the system
  self.councellors.now.deleteRoom = function (roomId, finalMessage) {
    var room = opeka.rooms.list[roomId];

    if (room) {
      self.logger.info('Room ' + room.name + ' (' + roomId + ') deleted.');

      opeka.rooms.remove(roomId);
      self.everyone.now.roomDeleted(roomId, finalMessage);

      self.updateUserStatus(self.everyone.now);
    } else {
      this.now.displayError("Error deleting room: a room with the specified ID does not exist.");
    }
  };

  /* Function used in order to delete all messages of a single user */
  self.councellors.now.deleteAllMsg = function (clientId) {
    var room = opeka.rooms.get(this.user.activeRoomId);
    if (room) {
      room.group.now.localDeleteAllMsg(clientId);
    }
  };

  /* Function used in order to delete a single message */
  self.councellors.now.roomDeleteMessage = function (roomId, messageId) {
    var room = opeka.rooms.list[roomId];

    if (room) {
      room.group.now.messageDeleted(roomId, messageId);
    }
  };

  // Get the number you have in the queue.
  self.councellors.now.triggerDeleteAllMessages = function (roomId) {
    var room = opeka.rooms.list[roomId];
    if (room) {
      room.group.now.deleteAllMessages(roomId);
    }
  };

  // This function is used by the clients in order to change rooms
  self.signedIn.now.changeRoom = function (roomId, callback, quit) {
    var client = this,
        serv = self,
        newRoom = opeka.rooms.list[roomId],
        queueSystem = self.config.get('features:queueSystem'),
        queueFullUrl = self.config.get('features:queueFullUrl');

    // Special case when joining from the global Queue.
    // Use is already in the room, so fake an OK response.
    if (client.user.activeRoomId === roomId) {
      if (callback) {
        callback('OK', false, false);
      }
      return ;
    }

    // If the user was muted, unmute it.
    if (client.user.muted) {
      client.user.muted = false;
      client.now.localUnmute();
    }

    // If user is already in a different room, leave it.
    if (opeka.rooms.list[client.user.activeRoomId]) {
      var oldRoom = opeka.rooms.list[client.user.activeRoomId];

      self.roomRemoveUser(oldRoom.client.user.clientId, function (users) {
        opeka.user.sendUserList(oldRoom.group, oldRoom.id, users);
      });

      if (quit) {
        client.now.quitRoom(callback);
      }
      self.helperUpdateRoomCount(oldRoom.id);
    }

    // Trying to add the user, if this returns false the room is full or does not exists
    var addedUser;
    if (newRoom) {
      addedUser = newRoom.addUser(client.user, function(users) {
        opeka.user.sendUserList(newRoom.group, newRoom.id, users);
        opeka.user.sendActiveUser(client, newRoom.id, users[client.user.clientId]);
      });
    }

    if (addedUser === 'OK') {
      client.user.activeRoomId = roomId;
      client.user.activeQueueRoomId = null;
      newRoom.group.now.roomUserJoined(newRoom.id, client.user.nickname);
    }
    else {
      if (queueSystem) {
        if (newRoom.queueSystem === 'private') {
          client.user.activeRoomId = null;
          client.user.activeQueueRoomId = roomId;
        }
      }
      else {
        // Remove the user from the queue again.
        if (newRoom.queueSystem === 'private') {
          newRoom.queue.splice(addedUser, 1);
          addedUser = false;
        }
      }
    }

    if (callback) {
      callback(addedUser, queueFullUrl, newRoom.queueSystem);
    }

    self.updateUserStatus(self.everyone.now);
    self.helperUpdateRoomCount(roomId);
  };

  // Get the number you have in the queue.
  self.everyone.now.roomGetQueueNumber = function (roomId, callback) {
    var room = opeka.rooms.list[roomId],
        index = room.getUserQueueNumber(this.user.clientId);
    callback(index);
  };

  // Remove the user from queue - can only remove yourself.
  self.everyone.now.removeUserFromQueue = function (roomId, clientId) {
    if (this.user.clientId === clientId) {
      var oldRoom = opeka.rooms.list[roomId];
      oldRoom.removeUserFromQueue(clientId);
      self.everyone.now.updateQueueStatus(roomId);
    }
  };

  // Remove the user from room - can only remove yourself.
  self.everyone.now.removeUserFromRoom = function (roomId, clientId) {
    if (this.user.clientId === clientId) {
      var room = opeka.rooms.list[roomId];
      // Remove the user.
      self.removeUserFromRoom(room, clientId, function (users) {
        opeka.user.sendUserList(room.group, room.id, users);
        self.updateUserStatus(self.everyone.now);
      });
      self.helperUpdateRoomCount(roomId);
    }
  };

  self.everyone.now.sendMessageToRoom = function (roomId, messageText) {
    var room = opeka.rooms.list[roomId],
        user = this.user;

    // Verify that whether the user is a councellor, so we can set a
    // flag on the message.
    self.councellors.hasClient(user.clientId, function (isCouncellor) {
      var messageObj = {
        date: new Date(),
        message: messageText,
        messageId: uuid(),
        sender: {
          clientId: user.clientId,
          isCouncellor: isCouncellor,
          name: user.nickname,
        }
      };

      // Send the message if the sender is in the room.
      room.group.hasClient(user.clientId, function (inRoom) {
        if (inRoom && !user.muted) {
          room.group.now.receiveMessage(messageObj);
        }
      });
    });
  };

  /**
   * When a client connects, let him know how many others are online.
   *
   * The client not counted as online until it calls clientReady.
   */
  self.everyone.on("connect", function () {
    var socket = this.socket,
        banInfo = opeka.ban.checkIP(socket.handshake.address.address, self.config.get('ban:salt'));

    if (banInfo.isBanned) {
      self.logger.warning('User ' + this.user.clientId + ' tried to connect with banned address ' + banInfo.digest);
      this.now.isBanned = true;

      // Close the socket after now.js has had its chance to synch.
      setTimeout(function () {
        socket.disconnect();
      }, 500);
    }

    self.updateUserStatus(this.now);
  });

  /**
   * When a client disconnects, we need to clean up after him.
   *
   * This includes closing open chats, letting others know he was
   * disconnected, etc.
   */
  self.everyone.on("disconnect", function () {
    var client = this, oldRoom;

    self.logger.info('User disconnected.', client.user.clientId);

    // We need to wait a single tick before updating the online counts,
    // since there's a bit of delay before they are accurate.
    process.nextTick(function () {

      // Remove the user from any rooms he might be in.
      _.map(opeka.rooms.list, function (room) {
        self.removeUserFromRoom(room, client.user.clientId);
      });

      // Leave the active room, if it is defined and it still exists.
      if (opeka.rooms.list[client.user.activeRoomId]) {
        oldRoom = opeka.rooms.list[client.user.activeRoomId];

        self.removeUserFromRoom(oldRoom, client.user.clientId, function(users) {
          // self.sendSystemMessage(client.user.nickname + " left the room.", oldRoom.name);
          opeka.user.sendUserList(oldRoom.group, oldRoom.id, users);
        });

        client.user.activeRoomId = null;
      }

      // Remove user from queue on disconnect.
      if (opeka.rooms.list[client.user.activeQueueRoomId]) {
        oldRoom = opeka.rooms.list[client.user.activeQueueRoomId];
        oldRoom.removeUserFromQueue(client.user.clientId);
        self.everyone.now.updateQueueStatus(oldRoom.id);
      }

      // Loop through all the global queues and remove user from them if present.
      _.forEach(opeka.queues.list, function (queue) {
        _.forEach(queue.queue, function (user, index) {
          if (user.clientId === client.user.clientId) {
            queue.queue.splice(index, 1);
          }
        });
      });

      self.updateUserStatus(self.everyone.now);
    });
  });

// -------- HELPERS -----------

  /**
   * Function used in order to send a system message.
   */
  self.sendSystemMessage = function(messageToSend, to) {
    var messageObj = {
      date: new Date(),
      message: messageToSend,
      system: true
    };
    to.now.receiveMessage(messageObj);
  };

  // Utility function to remove a user from a room.
  self.removeUserFromRoom = function(room, clientId, callback) {
    var removedUser = self.everyone.users[clientId];

    if (removedUser) {
      self.everyone.users[clientId].user.activeRoomId = null;
    }

    room.removeUser(clientId, function (users, queueClientId, removedUserNickname) {
      // The user has been removed from the queue and should join the chat.
      if (queueClientId) {
        self.everyone.users[queueClientId].now.changeRoom(room.id);
        self.everyone.users[queueClientId].now.roomJoinFromQueue(room.id);
        self.everyone.now.updateQueueStatus(room.id);
      }

      // Notify the chat room if we know who left.
      if (removedUserNickname) {
        room.group.now.roomUserLeft(room.id, removedUserNickname);
      }

      // Call the callback.
      if (callback) {
        callback(users);
      }
    });
  };

  self.helperUpdateRoomCount = function(roomId) {
    var room = opeka.rooms.list[roomId];
    if (room) {
      room.group.count(function (count) {
        self.everyone.now.updateRoomMemberCount(roomId, count);
        opeka.rooms.list[roomId].memberCount = count;
      });
    }
  }

  return self;
}

module.exports = opeka;
module.exports.Server = Server;

