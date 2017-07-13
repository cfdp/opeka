/**
 * Main opeka module.
 *
 * This contains the core of the Opeka code encapsulated in the Server
 * object, so you can instance it from your own code if need be.
 */
"use strict";

// Load all our dependencies
// and the chatOpen setting indicating if the chat service is open for clients or not

var _ = require("underscore"),
  async = require("async"),
  crypto = require('crypto'),
  fs = require('fs'),
  path = require('path'),
  dnode = require('dnode'),
  shoe = require('shoe'),
  io = require('socket.io'),
  ecstatic = require('ecstatic'),
  util = require("util"),
  uuid = require('node-uuid'),
  validator = require('validator'),
  opeka = {
    ban: require('./ban'),
    groups: require("./groups"),
    queues: require('./queues'),
    rooms: require('./rooms'),
    invites: require('./invites'),
    statistics: require('./statistics'),
    user: require('./user'),
    Client: require('./client'),
    chatOpen: false
  };

function Server(config, logger) {
  var self = this;

  self.construct = function () {
    var queues = config.get('queues');
    self.config = config;
    self.logger = logger;

    self.browser_script_path = path.normalize(path.join(__dirname, '../static/connect.js'));

    var static_dir = path.normalize(path.join(__dirname, '../static'));
    // Configure the main web server.
    self.server = self.createServer(self.config, ecstatic({'root': static_dir}));

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
    var sock = shoe(function (stream) {
      var d = dnode(function (remote, conn) {
        var client = new opeka.Client(self, stream, remote, conn);
        return client.getServerSideMethods()
      });
      d.pipe(stream).pipe(d);
    });
    sock.install(self.server, '/opeka');

    self.io_server = io(self.server);

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

    // When a socket.io user connects, tell them about current room status
    // When a socket.io user connects, tell them about current room status
    self.io_server.on("connection", function (socket) {
      // Make getDirectSignInURL available through the io_socket server as well
      socket.on("getDirectSignInURL", function (roomType, callback) {
        // Fake the clientid since it's used in calculating the nonce
        var bindObj = {
          'clientId': "faked:" + parseInt(Math.random() * 1000).toString()
        };

        return self.everyone.serverMethods['getDirectSignInURL'].call(
          bindObj, roomType, callback
        );
      });
      self.broadcastChatStatus(socket);
    });

  };

  /**
   * Create a server instance, HTTP or HTTPS depending on config.
   */
  self.createServer = function (config, callback) {
    if (config.get('server:https:enabled')) {
      var https_opts = {
        cert: fs.readFileSync(self.config.get('server:https:cert')),
        key: fs.readFileSync(self.config.get('server:https:key'))
      };
      var ca_path = config.get('server:https:ca-bundle');
      if (ca_path) {
        var ca_bundle = [];
        var chain = fs.readFileSync(ca_path, "utf-8");
        chain = chain.split(/\n/);
        var buf = [];
        _.each(chain, function (line) {
          buf.push(line);
          if (line.match(/-END CERTIFICATE-/)) {
            ca_bundle.push(buf.join("\n"));
            buf = []
          }
        });
        https_opts['ca'] = ca_bundle;
      }
      return require('https').createServer(https_opts, callback);
    }

    return require('http').createServer(callback);
  };

  self.broadcastChatStatus = function (target) {
    // Default target is everyone
    if (!target) {
      target = self.io_server.sockets;
    }
    self.updateUserStatus({
      'remote': function (dummy, results) {
        target.emit('chat_status', results);
      }
    })
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
      if (results && context && _.isFunction(context.remote)) {
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
              name: room.name,
              id: room.id
            };
            roomList.push(roomData);
          }
        });

        results.roomsList = roomList;
        results.queues = queues;
        results.queueList = queueList;
        results.queueSystem = self.config.get('features:queueSystem');
        results.fullRoomLink = self.config.get('features:fullRoomLink');
        results.chatPageURL = self.config.get('chatPage');
        results.accessCodeEnabled = self.config.get('features:accessCodeEnabled');
        results.screeningQuestions = self.config.get('features:screeningQuestions');
        results.chatOpen = opeka.chatOpen;

        context.remote('updateStatus', results);
      }
    });
  };

  /**
   * Adds messages to given room history.
   *
   * @param room
   *   Room object.
   *
   * @param messageObj
   *   Message object.
   */
  self.addMsgToHistory = function (room, messageObj) {
    if (room !== undefined && self.config.get('features:chatHistory')) {
      if (messageObj.date === undefined) {
        messageObj.date = new Date();
      }
      room.messages.push(messageObj);
    }
  };

  // The following methods require dnode to be instantiated, so we need
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
    // Support user re-signin.
    var oldClient;
    if (clientUser.clientId) {
      oldClient = opeka.groups.getClient(clientUser.clientId);
      if (oldClient){
        self.logger.info("Reconnected user: ", clientUser.clientId, ' -> ', this.clientId);
      }
      delete(clientUser.clientId);
    }

    var client = this,
      accessCode = self.config.get('accessCode'),
      accessCodeEnabled = self.config.get('features:accessCodeEnabled'),
      clientData = {
        'isSignedIn': true,
        'clientId': client.clientId
      },
      nicknameRange = {min: 1, max: 25},
      genderRange = {min: 1, max: 25},
      ageRange = {min: 0, max: 99};

    self.logger.info("Drupal user ID:", clientUser.uid);

    opeka.user.authenticate(clientUser, accessCodeEnabled, accessCode, function (err, account) {
      if (err) {
        self.logger.info('Authentication failed: ' + err.message);
        client.remote('accessDenied', client.clientId);
        return;
      }

      // Check whether the user is required to be logged into Drupal
      if (self.config.get("features:requireDrupalLogin") && !account.uid) {
        self.logger.info('User without drupal login tried to access the chat.');
        client.remote('loginRequiredMessage', client.clientId);
        return;
      }

      // Add the user to the signedIn group.
      self.signedIn.addUser(client.clientId);


      // Expose the drupal client drupal uid if they provided one and we're configured to do so
      if (self.config.get('features:exposeDrupalUIDs') && account.uid) {
        if (!clientUser.want_to_be_anonymous) {
          client.drupal_uid = account.uid
        }
      }

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

        // Store the location information for later use, if they have been defined.
        if (clientUser.address) {
          var add = clientUser.address.split(", ");
          client.city = add[0];
          client.state = add[1];
        }

        client.remote('receiveRoomList', opeka.rooms.clientData());
      }

      client.remote('receiveQueueList', opeka.queues.clientData());

      client.remote('receiveInviteList', opeka.invites.clientData());

      // Store the account and nickname for later use.
      client.account = account;
      // Validate user input to prevent abuse (e.g. very long usernames)
      // @todo: find better way of handling invalid input and log abuse attempts
      if ((clientUser.nickname != null) && validator.isLength(clientUser.nickname, nicknameRange)) {
        client.nickname = clientUser.nickname;
      }
      else {
        client.nickname = "Anonymous";
      }
      if ((clientUser.gender != null) && validator.isLength(clientUser.gender, genderRange)) {
        client.gender = clientUser.gender;
      }
      else {
        client.gender = "";
      }
      if ((clientUser.age != null) && validator.isInt(clientUser.age, ageRange)) {
        client.age = clientUser.age;
      }
      else {
        client.age = "";
      }
      // Is the screening module enabled? If screening questions haven't been defined explicitly, set variable to null
      if (clientUser.screening.question) {
        client.screening = clientUser.screening;
      }
      else {
        client.screening = null;
      }

      client.accessCode = clientUser.accessCode;


      // Update online users count for all clients.
      self.updateUserStatus(self.everyone);

      // Copy original input data
      _.extend(clientData, clientUser);

      // Only copy safe values from the account-data to the callback object
      _.each(
        ['canGenerateBanCode', 'isAdmin', 'language', 'name', 'nickname', 'sid', 'uid', 'hideTypingMessage', 'allowPauseAutoScroll', 'viewChatHistory'],
        function (k) {
          if (k in account) {
            clientData[k] = account[k]
          }
        }
      );

      if (oldClient){
        oldClient.onReconnect(client);
      }

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

    // Check if the requested room type is valid
    if ((roomType !== "pair") && (roomType !== "group")) {
      console.log('Bad Request: invalid roomType');
      callback('Bad Request: invalid roomType');
      return;
    }

    self.signInNonces[nonce] = {
      date: rightNow,
      roomType: roomType
    };

    callback(null, signInURL + '#signIn/' + nonce + '/' + roomType);
  });


  // Called by the Counsellors in order to create a new room.
  self.councellors.addServerMethod('createInvite', function (attributes, callback) {
    var invite = new opeka.invites.Invite(attributes);
    invite.addToList();

    if (callback) {
      callback(null, invite.clientData());
    }

    self.councellors.remote('inviteCreated', invite.clientData());

    self.logger.info('Invitation ' + invite.name + ' (' + invite.id + ') created.');
  });

  /**
   * Get room by invite token (if exists).
   */
  self.everyone.addServerMethod('getInviteRoomByToken', function (token, callback) {
    var autoPause = self.config.get('features:automaticPausePairRooms'),
      inviteId = null,
      roomId = null,
      roomFound = null,
      cancelled = false;

    self.logger.info('Search invite by token ' + token);

    _.forEach(opeka.invites.list, function (invite) {
      if (invite.token === token) {
        self.logger.info('Invite ' + inviteId + ' is found by token ' + token);
        inviteId = invite.id;
        if (!invite.status) {
          cancelled = true;
        }
      }
    });

    if (inviteId && !cancelled) {
      _.forEach(opeka.rooms.list, function (room) {
        self.logger.info('Room: ' + room.id + ', invite: ' + room.invite);
        if (room.invite && room.invite == inviteId) {
          self.logger.info('Room ' + room.id + ' is found for invite ' + inviteId);
          // Check if room is full, so it is possible to auto join.
          if (!room.isFull() && (autoPause !== true || (!room.paused || room.maxSize > 2))) {
            self.logger.info('Room ' + room.id + ' is can be entered.');
            roomFound = room.clientData();
          }
        }
      });
    }
    else if (cancelled) {
      self.logger.info('Attempt to accept cancelled invite ' + inviteId);
    }
    else {
      self.logger.info('No invite is found by token ' + token);
    }

    if (callback) {
      callback(roomFound);
    }
  });

  /**
   * Get room by ID (if exists).
   */
  self.everyone.addServerMethod('getRoomById', function (roomId, callback) {
    var autoPause = self.config.get('features:automaticPausePairRooms'),
      roomFound = null;

    _.forEach(opeka.rooms.list, function (room) {
      if (room.id && room.id == roomId) {
        // Check if room is full, so it is possible to auto join.
        if (!room.isFull() && (autoPause !== true || (!room.paused || room.maxSize > 2))) {
          roomFound = room.clientData();
        }
      }
    });
    if (callback) {
      callback(roomFound);
    }
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
  self.everyone.addServerMethod('getGlobalQueuePosition', function (queueId, autoJoin, callback) {
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
    _.forEach(opeka.rooms.list, function (room) {
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
      else {
        self.logger.info('@debug: User did not get a room (reserveRoomSpot)');
      }
    }
    else {
      self.logger.info('@debug: User did not have a valid signin-nonce (reserveRoomSpot)');
    }
  });

  self.everyone.addServerMethod('chatOpen', function (callback) {
    callback(opeka.chatOpen);
  });

  self.everyone.addServerMethod('getFeatures', function (callback) {
    callback(self.config.get('features'));
  });

  // Allow the councellors to pause a room.
  self.councellors.addServerMethod('pauseRoom', function (roomId, callback) {
    //var context = this;
    var room = opeka.rooms.list[roomId];

    if (room.paused) {
      self.logger.error('Brugeren ' + this.clientId + ' forsøgte at sætte rummet ' + roomId + ' på pause, selvom det allerede var på pause.');
      callback("Fejl, pausefunktion: Rummet er allerede sat på pause.");
      return;
    }

    room.paused = true;
    self.everyone.remote('roomUpdated', roomId, {paused: true});
    self.sendSystemMessage('[Pause]: Chat has been paused.', room.group, room);
    // Update the room counts and chat status for all users
    opeka.rooms.updateRoomCounts();
    self.updateUserStatus(self.everyone);

    if (callback) {
      callback();
    }
    self.broadcastChatStatus();
  });

  // Allow the everyone to update writingMessage.
  self.everyone.addServerMethod('writingMessage', function (roomId, callback) {
    var client = this,
      room = opeka.rooms.list[client.activeRoomId];
    if (room && _.has(room, 'users')) {

      var userInRoom = room.users[client.clientId];
      if (!_.isEmpty(userInRoom)) {
        userInRoom.writes = roomId.status;
      }
      var writers = _.where(room.users, {'writes': true});
      writers = _.map(writers, function (keys, value) {
        return keys.name;
      });

      self.sendWritesMessage(writers, room.group);
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
    self.everyone.remote('roomUpdated', roomId, {paused: false});
    self.sendSystemMessage('[Pause]: Chat is available again.', room.group, room);
    // Update the room counts and chat status for all users
    opeka.rooms.updateRoomCounts();
    self.updateUserStatus(self.everyone);
    // When unpausing a pair room that uses a queue - get the next in queue.
    if (room.maxSize === 2 && !room.isFull() && room.queueSystem !== 'private') {
      var queue = opeka.queues.list[room.queueSystem],
        queueUserID = queue.getUserFromQueue(), queueClient;
      if (queueUserID) {
        queueClient = self.everyone.getClient(queueUserID);
        if (queueClient) {
          queueClient.remote('changeRoom', room.id);
          queueClient.remote('roomJoinFromQueue', room.id);
        }
      }
      self.everyone.remote('updateQueueStatus', room.id);
    }
    callback();
    self.broadcastChatStatus();
  });

  // Function used by the counselors to ban a user from the chat.
  self.councellors.addServerMethod('banUser', function (clientId, banCode, callback) {
    if (opeka.ban.validCode(banCode)) {
      opeka.groups.getClient(clientId, function () {
        var client = this,
          stream = client.stream,
          ip;

        if (stream.headers['x-real-ip']) {
          ip = stream.headers['x-real-ip'];
        }
        else {
          ip = stream.remoteAddress;
        }

        if (!ip) {
          return;
        }

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

  // Function used by admins to open or close the chat.
  self.banCodeGenerator.addServerMethod('toggleChat', function (callback) {
    callback(self.toggleChat());
  });

  // Function used by the counselors to kick an user out of a room.
  self.councellors.addServerMethod('kick', function (clientId, messageText, roomId) {
    // Get room.
    var room = opeka.rooms.list[roomId],
      roomGroup = room.group,
      client = self.everyone.getClient(clientId);
    // Tell that the user is being removed.
    if (client) {
      self.addMsgToHistory(room, {message: messageText, system: true});
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
    if (mutedClient) {
      mutedClient.muted = true;
    }
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
  self.everyone.addServerMethod('whisper', function (clientId, messageText) {
    var whisperClientId = this.clientId,
      whisperName = this.nickname,
      recipient = self.everyone.getClient(clientId),
      recieverName = recipient.nickname,
      date = new Date();

    // Check if we're allowed to whiser to the
    if (!self.councellors.getClient(whisperClientId) && !this.whisperPartners[clientId]) {
      self.sendSystemMessage("You are not allowed to whisper to user " + recieverName, this);
      return;
    }

    // Allow the recipient to whisper back
    recipient.whisperPartners[whisperClientId] = true;

    // Send to user being whispered.
    recipient.remote('roomRecieveWhisper', clientId, messageText, whisperName, true, date);

    // Send to counselor who did the whispering.
    this.remote('roomRecieveWhisper', whisperClientId, messageText, recieverName, false, date);
  });

  // Called by the Counsellors in order to create a new room.
  self.councellors.addServerMethod('createRoom', function (attributes, callback) {
    attributes.uid = this.account.uid;
    if (attributes.name.length > 0) {
      var room = new opeka.rooms.Room(attributes),
        roomClientData = room.clientData();

      if (callback) {
        callback(null, roomClientData);
      }

      // Send the new complete room list to connected users.
      if (room.private) {
        self.councellors.remote('roomCreated', roomClientData);
      } else {
        self.everyone.remote('roomCreated', roomClientData);
      }

      self.logger.info('Room ' + room.name + ' (' + room.id + ') created.');

      self.updateUserStatus(self.everyone);

    } else {
      callback("Error creating room: room name too short.");
    }
    self.broadcastChatStatus();
  });

  // This function is called by the Counsellors in order to delete a room from the system
  self.councellors.addServerMethod('deleteRoom', function (roomId, finalMessage) {
    var room = opeka.rooms.list[roomId],
      lastRoom = true,
      counselor = this,
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
      // Set the activeRoomId for the counselor to null
      counselor.activeRoomId = null;
      opeka.rooms.remove(roomId);
      self.everyone.remote('roomDeleted', roomId, finalMessage);

      self.updateUserStatus(self.everyone);

      self.broadcastChatStatus();
    } else {
      // @todo: the line below throws an error (see issue #37)
      // this.remote('displayError', "Error deleting room: a room with the specified ID does not exist.");
      self.logger.warning('@debug deleteRoom: Room could not be deleted by counselor.');
    }
  });

  self.councellors.addServerMethod('changeRoomSize', function (roomId, newSize) {
    if (_.isNumber(newSize) && roomId != null) {
      newSize = Math.round(newSize);
      var room = opeka.rooms.list[roomId];
      if (room && newSize != room.maxSize && newSize > 0) {
        room.maxSize = newSize;
        self.updateUserStatus(self.everyone);
        self.broadcastChatStatus();
        self.sendSystemMessage("Room size changed to " + newSize, room.group, room);
      }
    }
  });

  self.councellors.addServerMethod('cancelInvite', function (inviteId) {
    if (inviteId != null) {
      _.each(opeka.invites.list, function (invite, delta) {
        if (invite.id == inviteId) {
          var invite = opeka.invites.list[delta];
          invite.status = 0;
          self.logger.info('Cancelled invite ' + inviteId);
          self.councellors.remote('inviteCancelled', inviteId);
        }
      });
    }
  });

  /* Function used in order to delete all messages of a single user */
  self.councellors.addServerMethod('deleteAllMsg', function (clientId) {
    var room = opeka.rooms.list[this.activeRoomId];
    if (room) {
      room.group.remote('localDeleteAllMsg', clientId);
    }
  });

  /* Function used in order to delete a single message */
  self.councellors.addServerMethod('roomDeleteMessage', function (roomId, messageId) {
    var room = opeka.rooms.list[roomId];

    if (room) {
      // Remove the message from the history.
      for (var n in room.messages) {
        if (room.messages[n].messageId !== undefined && room.messages[n].messageId == messageId) {
          room.messages.splice(n, 1);
          break;
        }
      }

      room.group.remote('messageDeleted', roomId, messageId);
    }
  });

  // Get the number you have in the queue.
  self.councellors.addServerMethod('triggerDeleteAllMessages', function (roomId) {
    var room = opeka.rooms.list[roomId];
    if (room) {
      room.messages = [];
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

    // Set the chat start time
    client.chatStart_Min = Math.round((new Date()).getTime() / 60000);
    // Reset list of whisper partners
    client.whisperPartners = {};
    self.logger.info('Login: User chat start: ', client.chatStart_Min);

    // add the chat session data for client to the db
    if (!client.account.isAdmin) {
      opeka.statistics.save(client.age, client.gender, client.screening);
    }

    // Special case when joining from the global Queue.
    // User is already in the room, so fake an OK response.
    if (client.activeRoomId === roomId) {
      if (callback) {
        callback('OK', false, false);
      }
      return;
    }

    // If the user was muted, unmute it.
    if (client.muted) {
      client.muted = false;
      client.remote('localUnmute');
    }

    // If user is already in a different room, leave it.
    if (opeka.rooms.list[client.activeRoomId]) {
      var oldRoom = opeka.rooms.list[client.activeRoomId];

      if (client.clientId !== undefined) {
        self.removeUserFromRoom(oldRoom.id, client.clientId, function (users) {
          opeka.user.sendUserList(oldRoom.group, oldRoom.id, users);
        });
        self.logger.info('@debug changeRoom: User was removed from different room');
      }

      if (quit) {
        client.remote('quitRoom', callback);
      }
      self.helperUpdateRoomCount(oldRoom.id);
    }

    // Trying to add the user, if this returns false the room is full or does not exists
    var addedUser;
    if (newRoom) {
      addedUser = newRoom.addUser(client, function (users) {
        opeka.user.sendUserList(newRoom.group, newRoom.id, users);
        opeka.user.sendActiveUser(client, newRoom.id, users[client.clientId]);
      });
    }

    if (addedUser === 'OK') {
      client.activeRoomId = roomId;
      client.activeQueueRoomId = null;

      self.addMsgToHistory(newRoom, {
        message: '@user has joined the room.',
        system: true,
        args: {'@user': client.nickname}
      });

      newRoom.group.remote('roomUserJoined', newRoom.id, client.nickname, client.account.isAdmin);
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
    self.broadcastChatStatus();
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
  self.everyone.addServerMethod('removeUserFromRoom', function (roomId, clientId, activeRoomId, chatStart_Min) {
    if (this.clientId === clientId) {
      var room = opeka.rooms.list[roomId],
        autoPause = self.config.get('features:automaticPausePairRooms');

      // Set room on pause if the room is a pair room.
      if (autoPause === true && room.maxSize === 2 && room.paused !== true) {
        room.paused = true;
        self.everyone.remote('roomUpdated', room.id, {paused: true});
        self.sendSystemMessage('[Pause]: Chat has been paused.', room.group, room);
      }

      // Remove the user.
      self.removeUserFromRoom(room, clientId, activeRoomId, chatStart_Min, function (users) {
        opeka.user.sendUserList(room.group, room.id, users);
        self.updateUserStatus(self.everyone);
      });
      self.helperUpdateRoomCount(roomId);
    }
  });

  self.everyone.addServerMethod('sendMessageToRoom', function (roomId, messageText) {
    var room = opeka.rooms.list[roomId],
      client = this;

    // Verify whether the user is a councellor, so we can set a
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
          self.addMsgToHistory(room, messageObj);
          room.group.remote('receiveMessage', messageObj);
        }
      });
    });
  });

  /**
   * Make sure user is properly removed from room
   */
  self.everyone.addServerMethod('cleanAfterChat', function (clientId, callback) {
    var user = this,
      room;
    // If the user is leaving a room, make sure he is removed properly
    if (user.activeRoomId) {
      room = opeka.rooms.list[user.activeRoomId];
      if (room && (user.clientId === clientId)) {
        self.logger.info('@debug: Cleaned up after chat - user.activeRoomId ' + user.activeRoomId + ' clientId ' + user.clientId);

        // @todo - make sure to shut down the room if there are only clients left &&
        // noSoloClientsAllowed is true...
        self.removeUserFromRoom(room, user.clientId, user.activeRoomId);
        // Update the server status
        self.updateUserStatus(self.everyone);
        opeka.user.sendUserList(room.group, room.id, room.users);
      }
    }
    // Call the callback.
    if (callback) {
      callback();
    }
  });

  /**
   * When a client disconnects, we need to clean up after him.
   *
   * This includes closing open chats, letting others know he was
   * disconnected, etc.
   */
  self.handleConnectionClosed = function (client) {
    var clientId = client.clientId,
      activeRoomId = client.activeRoomId,
      chatStart_Min = client.chatStart_Min,
      queueLeft;

    if (client.account !== undefined) {
      if (client.account.isAdmin === true) {
        self.logger.info('Admin user disconnected.', client.clientId);
      }
      else {
        self.logger.info('Regular user disconnected.', client.clientId);
        if (client.activeRoomId) {
          self.logger.info('Disconnected user had activeRoomId: ', client.activeRoomId);
        }
      }
    }
    else {
      // User is not signed in, no reason logging this
    }

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
        if (room !== undefined) {
          if (room.removeUserFromQueue(clientId)) {
            self.everyone.remote('updateQueueStatus', room.id);
          }
        }

        // Try to remove user from room.
        self.removeUserFromRoom(room, clientId, activeRoomId, chatStart_Min, function (users) {
          if (users) {
            opeka.user.sendUserList(room.group, room.id, users);
            // Try to remove the room if the disconnected user is the last counselor since
            // no anonymous users should be left without counselor if soloClientsAllowed is false
            if (client.account.isAdmin && !room.counsellorPresent && !room.soloClientsAllowed) {
              self.logger.warning('Last admin user disconnected - shutting down room. Counselor id: ', client.clientId);
              //Inform the remaining users that the room is closing down
              if (client.activeRoomId) {
                opeka.rooms.remove(client.activeRoomId);
                self.everyone.remote('roomDeleted', client.activeRoomId, "Beklager, men rådgiveren mistede internetforbindelsen. Du er velkommen til at logge på igen.");
              }
            }
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
  self.sendSystemMessage = function (messageToSend, to, room) {
    var messageObj = {
      date: new Date(),
      message: messageToSend,
      system: true
    };
    self.addMsgToHistory(room, messageObj);
    to.remote('receiveMessage', messageObj);
  };

  /**
   * Function used in order to send "User is typing" message.
   */
  self.sendWritesMessage = function (messageToSend, to) {
    var messageObj = {
      writers: messageToSend
    };
    to.remote('receiveWritesMessage', messageObj);
  };

  // Utility function to remove a user from a room.
  self.removeUserFromRoom = function (room, clientId, activeRoomId, chatStart_Min, callback) {
    var autoPause = self.config.get('features:automaticPausePairRooms'),
      removedUser = self.everyone.getClient(clientId),
      chatEnd_Min,
      chatDuration,
      checkPause = false;

    // Set room on pause if the room is a pair room.
    if (removedUser) {
      chatStart_Min = removedUser.chatStart_Min;
      removedUser.activeRoomId = null;
      checkPause = true;
    }
    else {
      // In this case we don't have a valid reference to a signed in client (happens when
      // client closes / refreshes the browser window)
      // - also from the snippet/chatwidget. The chat should only pause if the user is leaving an
      // active room.
      self.logger.info('User logout: No valid reference to client.');
      if (typeof room !== 'undefined') {
        checkPause = (activeRoomId === room.id);
      }
      else {
        checkPause = false;
        self.logger.warning('@debug removeUserFromRoom: room undefined.');
      }
    }

    // Calculate the duration of the chat session of the user being removed
    if (chatStart_Min) {
      chatEnd_Min = Math.round((new Date()).getTime() / 60000);
      chatDuration = chatEnd_Min - chatStart_Min;
      self.logger.info('User logout: Chat duration (minutes): ', chatDuration);
    }

    if (room) {
      if (checkPause && (autoPause === true) && (room.maxSize === 2) && !room.paused) {
        room.paused = true;
        self.everyone.remote('roomUpdated', room.id, {paused: true});
        self.sendSystemMessage('[Pause]: Chat has been paused.', room.group, room);
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
          self.addMsgToHistory(room, {
            message: '@user has left the room. Chat duration: @chatDuration minutes.',
            system: true,
            args: {'@user': removedUserNickname, '@chatDuration': chatDuration}
          });
          room.group.remote('roomUserLeft', room.id, removedUserNickname, chatDuration);

          //Update typing message if user left.
          var writers = _.where(room.users, {'writes': true});
          writers = _.map(writers, function (keys, value) {
            return keys.name;
          });
          self.sendWritesMessage(writers, room.group);
        }

        // Call the callback.
        if (callback) {
          callback(users);
        }
      });
    }

    self.broadcastChatStatus();
  };

  self.helperUpdateRoomCount = function (roomId) {
    var room = opeka.rooms.list[roomId];
    if (room) {
      room.group.count(function (count) {
        self.everyone.remote('updateRoomMemberCount', roomId, count);
        opeka.rooms.list[roomId].memberCount = count;
      });
    }
  };

  self.toggleChat = function () {
    if (opeka.chatOpen) {
      opeka.chatOpen = false;
    }
    else {
      opeka.chatOpen = true;
    }
    // Update the server status
    self.updateUserStatus(self.everyone);
    self.broadcastChatStatus();
    //return opeka.chatOpen;
  };

  return self;
}

module.exports = opeka;
module.exports.Server = Server;
