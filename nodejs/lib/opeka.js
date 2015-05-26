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
    fs = require('fs'),
    path = require('path'),
    dnode = require('dnode'),
    shoe = require('shoe'),
    util = require("util"),
    uuid = require('node-uuid'),
    opeka = {
      ban: require('./ban'),
      groups: require("./groups"),
      queues: require('./queues'),
      rooms: require('./rooms'),
      user: require('./user'),
      Client: require('./client')
    };

function Server(config, logger) {
  var self = this;

  self.construct = function () {
    var queues = config.get('queues');
    self.config = config;
    self.logger = logger;

    self.browser_script_path = path.normalize(path.join(__dirname, '../static/connect.js'));

    // Configure the main web server.
    self.server = self.createServer(self.config, function (req, res) {
      // TODO: Preload the file content when running in production?
      var js_content = fs.readFileSync(self.browser_script_path);
      if(req.url == '/connect.js') {
        res.writeHead(200, {
          'Content-Type': "text/javascript",
          'Content-Length': js_content.length
        });
        res.write(js_content);
        res.end();
      } else {
        res.writeHead(200);
        res.write('Welcome to Opeka.');
        res.end();
      }
    });

    // Log that the server is now listening.
    self.server.listen(self.config.get('server:port'), function () {
      logger.info('Opeka chat server listening on port ' + self.config.get('server:port'));

      // Now the server is running, we no longer need root privileges, so
      // lets drop them if we have them.
      if (process.getuid() === 0) {
        process.setgid(self.config.get('server:group') || 'nogroup');
        process.setuid(self.config.get('server:user') || 'nobody');

        logger.info('Dropped privileges, now running as UID ' + process.getuid());
      }
    });

    // Keep track of valid sign in nonces.
    self.signInNonces = {};

    // Initialise dnode on our server object.
    var sock = shoe(function(stream) {
      var d = dnode(function(remote, conn)  {
        var client = new opeka.Client(self, stream, remote, conn);
        return client.getServerSideMethods()
      });
      d.pipe(stream).pipe(d);
    });
    sock.install(self.server, '/opeka');

    // Create groups for councellors and guests.
    self.everyone = opeka.groups.getGroup('everyone');
    self.councellors = opeka.groups.getGroup('councellors');
    self.guests = opeka.groups.getGroup('guests');
    self.signedIn = opeka.groups.getGroup('signedIn');
    self.banCodeGenerator = opeka.groups.getGroup('banCodeGenerator');

    // Create the queues from the settings.
    if (_.isArray(queues)) {
      _.forEach(queues, function (queue) {
        return new opeka.queues.Queue({
          name: queue.name,
          id: queue.id,
          active: true
        });
      });
    }
  };

  /**
   * Create a server instance, HTTP or HTTPS depending on config.
   */
  self.createServer = function (config, callback) {
    if (config.get('server:https:enabled')) {
      return require('https').createServer({
        cert: fs.readFileSync(self.config.get('server:https:cert')),
        key: fs.readFileSync(self.config.get('server:https:key'))
      }, callback);
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
        var roomList = [],
            queueList = {},
            queues = false;

        _.each(results.roomsList.list, function (room) {
          if (room.queueSystem !== 'private') {
            var queue = opeka.queues.list[room.queueSystem];
            queueList[room.queueSystem] = {name: queue.name, inQueue: queue.countUsers()};
            queues = true;
          }
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
        results.queues = queues;
        results.queueList = queueList;
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
  self.everyone.addServerMethod('signIn', function (clientUser, callback) {
    var client = this,
        clientData = {
          'isSignedIn': true,
          'clientId': client.clientId
        };

    opeka.user.authenticate(clientUser, function (err, account) {
      if (err) {
        throw err;
      }

      // Add the user to the signedIn group.
      self.signedIn.addUser(client.clientId);

      if (account.canGenerateBanCode) {
        self.banCodeGenerator.addUser(client.clientId);
        self.logger.info('User that can generate ban codes signed in.', client.clientId);
      }
      if (account.isAdmin) {
        self.councellors.addUser(client.clientId);

        self.logger.info('Admin user signed in.', client.clientId);

        client.remote('receiveRoomList', opeka.rooms.clientData(true));
      }
      else {
        self.guests.addUser(client.clientId);
        // The following is done in order to put each user in a single group.
        // In this way we are able to give to the counselors the ability to whisper
        opeka.groups.getGroup(client.clientId).addUser(client.clientId);

        self.logger.info('User signed in.', client.clientId);

        // Store the location information for later use, if they have been defined.
        if (clientUser.address) {
          var add = clientUser.address.split(", ");
          client.city = add[0];
          client.state = add[1];
        }

        client.remote('receiveRoomList', opeka.rooms.clientData());
      }

      client.remote('receiveQueueList', opeka.queues.clientData());

      // Store the account and nickname for later use.
      client.account = account;
      client.nickname = clientUser.nickname;
      client.gender = clientUser.gender;
      client.age = clientUser.age;

      // Update online users count for all clients.
      self.updateUserStatus(self.everyone);

      // Copy original input data
      _.extend(clientData, clientUser);

      // Only copy safe values from the account-data to the callback object
      _.each(
        ['canGenerateBanCode', 'isAdmin', 'language', 'name', 'nickname', 'sid', 'uid'],
        function(k) {
          if(k in account) {
            clientData[k] = account[k]
          }
        }
      );

      if (callback) {
        callback(clientData);
      }
    });
  });

  // Give the client a URL where he can sign in and go directly to a
  // room of the requested type.
  self.everyone.addServerMethod('getDirectSignInURL', function (roomType, callback) {
    var rightNow = new Date(),
        nonce = crypto.createHash('sha256').update(this.clientId + rightNow.getTime()).digest('hex'),
        signInURL = self.config.get('chatPage');

    self.signInNonces[nonce] = {
      date: rightNow,
      roomType: roomType
    };

    callback(signInURL + '#signIn/' + nonce);
  });

// -------- GLOBAL QUEUE FUNCTIONS START -----------

  // Called by the Counsellors in order to create a new room.
  self.councellors.addServerMethod('createQueue', function (attributes, callback) {
    if (attributes.name.length > 0) {
      if (attributes.active === undefined) {
        attributes.active = true;
      }
      var queue = new opeka.queues.Queue(attributes);

      if (callback) {
        callback(null, queue.clientData());
      }

      // Send the new complete room list to connected users.
      //self.councellors.remote('queueCreated', room.clientData());

      self.logger.info('Queue ' + queue.name + ' (' + queue.id + ') created.');

    } else {
      callback("Error creating room: room name too short.");
    }
  });

  // Get the position of a user in queue.
  self.everyone.addServerMethod('getGlobalQueuePosition', function(queueId, autoJoin, callback) {
    var autoPause = self.config.get('features:automaticPausePairRooms'),
        queue = opeka.queues.list[queueId],
        position,
        rooms = 0,
        roomId = null;
    if (queue) {
      position = queue.getPosition(this.clientId);
      if (position === 0 && autoJoin) {
        position = queue.addToQueue(this) + 1;
      }
    }
    // If we auto join - we should try to get the roomId of an open room.
    _.forEach(opeka.rooms.list, function(room) {
      if (room.queueSystem === queueId) {
        rooms += 1;
        // Check if room is full, so it is possible to auto join.
        if (!room.isFull() && (autoPause !== true || (!room.paused || room.maxSize > 2))) {
          roomId = room.id;
        }
      }
    });
    // If we found the room id we should leave the queue again.
    if (roomId && autoJoin) {
      queue.removeUserFromQueue(this.clientId);
    }
    if (callback) {
      callback(position, rooms, roomId);
    }
  });

  // Remove the user from queue - can only remove yourself.
  self.everyone.addServerMethod('removeUserFromGlobalQueue', function (queueId, clientId) {
    if (this.clientId === clientId) {
      var queue = opeka.queues.list[queueId],
          roomId = null;
      queue.removeUserFromQueue(clientId);
      self.updateUserStatus(self.everyone);
      // Get a room that is attached to the queue and mark is as it has
      // updated queue status. This is a small hack to reuse code.
      _.forEach(opeka.rooms.list, function (room) {
        if (room.queueSystem === queueId) {
          roomId = room.id;
        }
      });
      self.everyone.remote('updateQueueStatus', roomId);
    }
  });

// -------- GLOBAL QUEUE FUNCTIONS END -----------


  // Once the user has a direct sign in nonce, he has the ability to
  // reserve his spot in a room.
  self.everyone.addServerMethod('reserveRoomSpot', function (nonce, callback) {
    var room, roomType;

    if (self.signInNonces[nonce]) {
      roomType = self.signInNonces[nonce].roomType;

      room = opeka.rooms.getOpenRoom(roomType);

      if (room) {
        room.reserveSpot(this.clientId);
        callback(room.id);
      }
    }
  });

  self.everyone.addServerMethod('getFeatures', function (callback) {
    callback(self.config.get('features'));
  });

  // Allow the councellors to pause a room.
  self.councellors.addServerMethod('pauseRoom', function (roomId, callback) {
    //var context = this;
    var room = opeka.rooms.list[roomId];

    if (room.paused) {
      self.logger.error('User ' + this.clientId + ' tried to pause room ' + roomId + ' that was already paused.');
      callback("Error Pause: the room has already been paused.");
      return;
    }

    room.paused = true;
    self.everyone.remote('roomUpdated', roomId, { paused: true });
    self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
    if (callback) {
      callback();
    }
  });

  // Allow the councellors to unpause a room.
  self.councellors.addServerMethod('unpauseRoom', function (roomId, callback) {
    //var context = this;
    var room = opeka.rooms.list[roomId],
        client = this;

    if (!room.paused) {
      self.logger.error('User ' + client.clientId + ' tried to unpause room ' + roomId + ' that was not paused.');
      callback("Error Unpause: the room has not been paused.");
      return;
    }

    room.paused = false;
    self.everyone.remote('roomUpdated', roomId, { paused: false });
    self.sendSystemMessage('[Pause]: Chat is available again.', room.group);
    // When unpausing a pair room that uses a queue - get the next in queue.
    if (room.maxSize === 2 && !room.isFull() && room.queueSystem !== 'private') {
      var queue = opeka.queues.list[room.queueSystem],
          queueUserID = queue.getUserFromQueue(), queueClient;
      if (queueUserID) {
        queueClient = self.everyone.getClient(queueUserID);
        if(queueClient) {
          queueClient.remote('changeRoom', room.id);
          queueClient.remote('roomJoinFromQueue', room.id);
        }
      }
      self.everyone.remote('updateQueueStatus', room.id);
    }
    callback();
  });

  // Function used by the counselors to ban a user from the chat.
  self.councellors.addServerMethod('banUser', function (clientId, banCode, callback) {
    if (opeka.ban.validCode(banCode)) {
      opeka.groups.getClient(clientId, function () {
        var client = this,
            stream = client.stream,
            ip = stream.remoteAddress;

        if (!ip) { return; }

        // Register the ban.
        opeka.ban.create(ip, self.config.get('ban:salt'));

        // Mark banned user's session as banned.
        this.remote('setIsBanned', true);

        // Close the socket so the banned user is disconnected, after
        // the connection has had its chance to sync.
        setTimeout(function () {
          stream.end();
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
  });

  // Function used by admins to get a ban code.
  self.banCodeGenerator.addServerMethod('getBanCode', function (callback) {
    callback(opeka.ban.getCode());
  });

  // Function used by the counselors to kick an user out of a room.
  self.councellors.addServerMethod('kick', function (clientId, messageText, roomId) {
    // Get room.
    var room = opeka.rooms.list[roomId],
        roomGroup = room.group,
        client = self.everyone.getClient(clientId);
    // Tell that the user is being removed.
    if (client) {
      roomGroup.remote('roomUserKicked', roomId, clientId, messageText, client.nickname);
    }
    // Remove the user.
    self.removeUserFromRoom(room, clientId, roomId, function (users) {
      opeka.user.sendUserList(room.group, room.id, users);
    });

    self.updateUserStatus(self.everyone);
    self.helperUpdateRoomCount(roomId);
  });

  /* Function used in order to mute a single user */
  self.councellors.addServerMethod('mute', function (roomId, clientId) {
    var room = opeka.rooms.list[roomId],
        roomGroup = opeka.groups.getGroup(roomId),
        userData = room.users[clientId],
        councillor = this,
        mutedClient = roomGroup.getClient(clientId);

    // Mute the user.
    mutedClient.muted = true;
    userData.muted = true;

    // Tell the councellors about the muted user.
    opeka.user.sendUserList(room.counsellorGroup, room.id, room.users);

    // Tell the user that he was muted.
    roomGroup.remote('roomUserMuted', roomId, clientId, userData, councillor.nickname);
  });

  /* Function used in order to unmute a single user */
  self.councellors.addServerMethod('unmute', function (roomId, clientId) {
    var room = opeka.rooms.list[roomId],
        roomGroup = opeka.groups.getGroup(roomId),
        userData = room.users[clientId],
        councillor = this,
        mutedClient = roomGroup.getClient(clientId);

    // Unmute the user.
    mutedClient.muted = false;
    userData.muted = false;

    // Tell the councellors about the unmuted user.
    opeka.user.sendUserList(room.counsellorGroup, room.id, room.users);

    // Tell the user that he was unmuted.
    roomGroup.remote('roomUserUnmuted', roomId, clientId, userData, councillor.nickname);
  });

  /* Function used by the counselors in order to whisper to an user */
  self.councellors.addServerMethod('whisper', function (clientId, messageText) {
    var whisperClientId = this.clientId,
        whisperName = this.nickname,
        recipient = self.everyone.getClient(clientId),
        recieverName = recipient.nickname,
        date = new Date();

    // Send to user being whispered.
    recipient.remote('roomRecieveWhisper', clientId, messageText, whisperName, true, date);

    // Send to counselor who did the whispering.
    this.remote('roomRecieveWhisper', whisperClientId, messageText, recieverName, false, date);
  });

  // Called by the Counsellors in order to create a new room.
  self.councellors.addServerMethod('createRoom', function (attributes, callback) {
    attributes.uid = this.account.uid;
    if (attributes.name.length > 0) {
      var room = new opeka.rooms.Room(attributes);

      if (callback) {
        callback(null, room.clientData());
      }

      // Send the new complete room list to connected users.
      if (room.private) {
        self.councellors.remote('roomCreated', room.clientData());
      } else {
        self.everyone.remote('roomCreated', room.clientData());
      }

      self.logger.info('Room ' + room.name + ' (' + room.id + ') created.');

      self.updateUserStatus(self.everyone);
    } else {
      callback("Error creating room: room name too short.");
    }
  });

  // This function is called by the Counsellors in order to delete a room from the system
  self.councellors.addServerMethod('deleteRoom', function (roomId, finalMessage) {
    var room = opeka.rooms.list[roomId],
        lastRoom = true,
        queue;

    if (room) {
      queue = opeka.queues.list[room.queueSystem];
      // Since deleting the room also flushes the queue, we need to give
      // message in case of the room being last before the room is deleted.
      if (room.queueSystem !== 'private') {
        // Check to see if this was the last room for a queue that was deleted.
        // If so, flush the queue and give notification to the users.
        _.forEach(opeka.rooms.list, function (loopRoom) {
          if (room.queueSystem === loopRoom.queueSystem && room.id !== loopRoom.id) {
            lastRoom = false;
          }
        });
        // Last room, flush the queue which will trigger notification.
        if (lastRoom) {
          queue = opeka.queues.list[room.queueSystem];
          if (queue) {
            queue.flushQueue(self.everyone.members);
          }
        }
      }
      self.logger.info('Room ' + room.name + ' (' + roomId + ') deleted.');

      opeka.rooms.remove(roomId);
      self.everyone.remote('roomDeleted', roomId, finalMessage);

      self.updateUserStatus(self.everyone);

    } else {
      this.remote('displayError', "Error deleting room: a room with the specified ID does not exist.");
    }
  });

  /* Function used in order to delete all messages of a single user */
  self.councellors.addServerMethod('deleteAllMsg', function (clientId) {
    var room = opeka.rooms.get(this.activeRoomId);
    if (room) {
      room.group.remote('localDeleteAllMsg', clientId);
    }
  });

  /* Function used in order to delete a single message */
  self.councellors.addServerMethod('roomDeleteMessage', function (roomId, messageId) {
    var room = opeka.rooms.list[roomId];

    if (room) {
      room.group.remote('messageDeleted', roomId, messageId);
    }
  });

  // Get the number you have in the queue.
  self.councellors.addServerMethod('triggerDeleteAllMessages', function (roomId) {
    var room = opeka.rooms.list[roomId];
    if (room) {
      room.group.remote('deleteAllMessages', roomId);
    }
  });

  // This function is used by the clients in order to change rooms
  self.signedIn.addServerMethod('changeRoom', function (roomId, callback, quit) {
    var client = this,
        //serv = self,
        newRoom = opeka.rooms.list[roomId],
        queueSystem = self.config.get('features:queueSystem'),
        queueFullUrl = self.config.get('features:queueFullUrl');

    // Special case when joining from the global Queue.
    // Use is already in the room, so fake an OK response.
    if (client.activeRoomId === roomId) {
      if (callback) {
        callback('OK', false, false);
      }
      return ;
    }

    // If the user was muted, unmute it.
    if (client.muted) {
      client.muted = false;
      client.remote('localUnmute');
    }

    // If user is already in a different room, leave it.
    if (opeka.rooms.list[client.activeRoomId]) {
      var oldRoom = opeka.rooms.list[client.activeRoomId];

      self.roomRemoveUser(oldRoom.client.clientId, function (users) {
        opeka.user.sendUserList(oldRoom.group, oldRoom.id, users);
      });

      if (quit) {
        client.remote('quitRoom', callback);
      }
      self.helperUpdateRoomCount(oldRoom.id);
    }

    // Trying to add the user, if this returns false the room is full or does not exists
    var addedUser;
    if (newRoom) {
      addedUser = newRoom.addUser(client, function(users) {
        opeka.user.sendUserList(newRoom.group, newRoom.id, users);
        opeka.user.sendActiveUser(client, newRoom.id, users[client.clientId]);
      });
    }

    if (addedUser === 'OK') {
      client.activeRoomId = roomId;
      client.activeQueueRoomId = null;
      newRoom.group.remote('roomUserJoined', newRoom.id, client.nickname);
    }
    else {
      if (queueSystem) {
        if (newRoom.queueSystem === 'private') {
          client.activeRoomId = null;
          client.activeQueueRoomId = roomId;
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

    self.updateUserStatus(self.everyone);
    self.helperUpdateRoomCount(roomId);
  });

  // Get the number you have in the queue.
  self.everyone.addServerMethod('roomGetQueueNumber', function (roomId, callback) {
    var room = opeka.rooms.list[roomId],
        index = room.getUserQueueNumber(this.clientId);
    callback(index);
  });

  // Remove the user from queue - can only remove yourself.
  self.everyone.addServerMethod('removeUserFromQueue', function (roomId, clientId) {
    if (this.clientId === clientId) {
      var oldRoom = opeka.rooms.list[roomId];
      oldRoom.removeUserFromQueue(clientId);
      self.everyone.remote('updateQueueStatus', roomId);
      self.updateUserStatus(self.everyone);
    }
  });

  // Remove the user from room - can only remove yourself.
  self.everyone.addServerMethod('removeUserFromRoom', function (roomId, clientId) {
    if (this.clientId === clientId) {
      var room = opeka.rooms.list[roomId],
          autoPause = self.config.get('features:automaticPausePairRooms');

      // Set room on pause if the room is a pair room.
      if (autoPause === true && room.maxSize === 2 && room.paused !== true) {
        room.paused = true;
        self.everyone.remote('roomUpdated', room.id, { paused: true });
        self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
      }

      // Remove the user.
      self.removeUserFromRoom(room, clientId, room.id, function (users) {
        opeka.user.sendUserList(room.group, room.id, users);
        self.updateUserStatus(self.everyone);
      });
      self.helperUpdateRoomCount(roomId);
    }
  });

  self.everyone.addServerMethod('sendMessageToRoom', function (roomId, messageText) {
    var room = opeka.rooms.list[roomId],
        client = this;

    // Verify that whether the user is a councellor, so we can set a
    // flag on the message.
    self.councellors.hasClient(client.clientId, function (isCouncellor) {
      var messageObj = {
        date: new Date(),
        message: messageText,
        messageId: uuid(),
        sender: {
          clientId: client.clientId,
          isCouncellor: isCouncellor,
          name: client.nickname,
        }
      };

      // Send the message if the sender is in the room.
      room.group.hasClient(client.clientId, function (inRoom) {
        if (inRoom && !client.muted) {
          room.group.remote('receiveMessage', messageObj);
        }
      });
    });
  });

  /**
   * When a client disconnects, we need to clean up after him.
   *
   * This includes closing open chats, letting others know he was
   * disconnected, etc.
   */
  self.handleConnectionClosed = function (client) {
    var clientId = client.clientId,
        queueLeft;

    self.logger.info('User disconnected.', client.clientId);

    // We need to wait a single tick before updating the online counts,
    // since there's a bit of delay before they are accurate.
    process.nextTick(function () {
      // Loop through all the global queues and remove user from them if present.
      Object.keys(opeka.queues.list).forEach(function (key) {
        var queue = opeka.queues.list[key];
        if (queue.removeUserFromQueue(clientId)) {
          queueLeft = queue;
        }
      });

      // Remove the user from any rooms he might be in.
      Object.keys(opeka.rooms.list).forEach(function (key) {
        var room = opeka.rooms.list[key];
        // Need to call updateQueueStatus on a room belonging to the queue
        // that the user left.
        if (queueLeft && queueLeft.id === room.queueSystem) {
          self.everyone.remote('updateQueueStatus', room.id);
          queueLeft = null;
        }
        // Try to remove user from room queue.
        if (room.removeUserFromQueue(clientId)) {
          self.everyone.remote('updateQueueStatus', room.id);
        }
        // Try to remove user from room.
        self.removeUserFromRoom(room, clientId, client.activeRoomId, function(users) {
          if (users) {
            opeka.user.sendUserList(room.group, room.id, users);
            client.activeRoomId = null;
          }
        });
      });

      self.updateUserStatus(self.everyone);
    });
  };

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
    to.remote('receiveMessage', messageObj);
  };

  // Utility function to remove a user from a room.
  self.removeUserFromRoom = function(room, clientId, activeRoomId, callback) {
    // Set room on pause if the room is a pair room.
    var autoPause = self.config.get('features:automaticPausePairRooms'),
        removedUser = self.everyone.getClient(clientId);

    if (removedUser) {
      if (autoPause === true && room.maxSize === 2 && room.paused !== true) {
        room.paused = true;
        self.everyone.remote('roomUpdated', room.id, { paused: true });
        self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
      }
      self.everyone.getClient(clientId).activeRoomId = null;
    }
    // In this case we don't have a valid reference to a signed in client (happens when client closes/refreshes the app)
    // - also from the snippet/chatwidget. The chat should only pause if the user is leaving an
    // active room.
    else if (autoPause === true && room.maxSize === 2 && !room.paused && activeRoomId) {
      room.paused = true;
      self.everyone.remote('roomUpdated', room.id, { paused: true });
      self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
    }

    room.removeUser(clientId, function (users, queueClientId, removedUserNickname) {
      // The user has been removed from the queue and should join the chat.
      if (queueClientId) {
        self.everyone.getClient(queueClientId).remote('changeRoom', room.id);
        self.everyone.getClient(queueClientId).remote('roomJoinFromQueue', room.id);
        self.everyone.remote('updateQueueStatus', room.id);
      }

      // We always need to update the room count after a user has tried to
      // leave the queue
      self.helperUpdateRoomCount(room.id);

      // Notify the chat room if we know who left.
      if (removedUserNickname) {
        room.group.remote('roomUserLeft', room.id, removedUserNickname);
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
        self.everyone.remote('updateRoomMemberCount', roomId, count);
        opeka.rooms.list[roomId].memberCount = count;
      });
    }
  };

  return self;
}

module.exports = opeka;
module.exports.Server = Server;
