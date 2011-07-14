/**
 * Main opeka module.
 *
 * This contains the core of the Opeka code encapsulated in the Server
 * object, so you can instance it from your own code if need be.
 */

// Load all our dependencies.
var drupal = require("drupal"),
    nowjs = require("now"),
    util = require("util"),
    fs = require("fs"),
    options = {
      key: fs.readFileSync('certs/server-key.pem'),
      cert: fs.readFileSync('certs/server-cert.pem')
    },
    uuid = require('node-uuid'),
    opeka = {
      rooms: require('./rooms'),
      user: require('./user')
    };


function Server(httpPort) {
  var self = this;
  self.httpPort = httpPort;

  // Create a simple server that responds via HTTPS.
    self.server = require('https').createServer(options, function(req, res) {
    res.writeHead(200);
    res.write('Welcome to Opeka.');
    res.end();
  });
  self.server.listen(self.httpPort);

  // Initialise Now.js on our server object.
  self.everyone = nowjs.initialize(self.server);

  self.councellors = nowjs.getGroup('councellors');
  self.guests = nowjs.getGroup("guests");

  /**
   * This function is called by the client when he's ready to load the chat.
   *
   * This usually means after loading client-side templates and other
   * resources required for the safe operation of the chat.
   */
  self.everyone.now.clientReady = function (clientUser, callback) {
    var client = this;
    util.log('user: '+clientUser.nickname + ' connected.');
    util.log('age: '+clientUser.age);
    util.log('gender: '+clientUser.gender);
    util.log('id: '+client.user.clientId);

    opeka.user.authenticate(clientUser, function (err, account) {
      if (err) {
        throw err;
      }

      // Add the user to the overall group he belongs in.
      // This is important, since it governs what methods he has access
      // to, so only councellors can create rooms, etc.
      if (account.isAdmin) {
        self.councellors.addUser(client.user.clientId);
      }
      else {
        self.guests.addUser(client.user.clientId);
		//The following is done in order to put each user in a single group.
		//In this way we are able to give to the counselors the ability to whisper
		nowjs.getGroup(client.user.clientId).addUser(client.user.clientId);
      }

      // Store the account and nickname for later use.
      client.user.account = account;
      client.user.nickname = clientUser.nickname;

      // Update online users count for all clients.
      self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);

      // Send the rooms to the newly connected client.
      client.now.receiveRooms(opeka.rooms.clientSideList(), opeka.rooms.roomOrder);

      callback(account);
    });
  };

  /* Function used by the counselors in order to whisper to an user */
  self.councellors.now.whisper = function (userId, messageText) {
	var group = nowjs.getGroup(userId),
	    messageObj = {
          date: new Date(),
          message: messageText,
          name: this.user.nickname +' - WHISPER'
        };
    try{
      group.now.receiveMessage(messageObj);
	  this.now.receiveMessage(messageObj);
	} catch (err) {
	    var messageObj2 = {
              date: new Date(),
              message: 'Whisper failed: User not online',
     	      system: true
            };
	    this.now.receiveMessage(messageObj2);
	}
  }

  /**
   * This function is called by the Counselors in order to create a new room
   */
  self.councellors.now.createRoom = function (roomName, maxSize, callback) {
	if ((roomName.length == 0 || maxSize <=0) && callback){
	  callback("Error creating room: size <= 0 or room name too short.",null);
	} else {
      var room = opeka.rooms.create(roomName, maxSize);

      util.log("Room created: " + roomName + " " + maxSize);
      self.everyone.now.receiveRooms(opeka.rooms.clientSideList(), opeka.rooms.roomOrder);

      if (callback) {
        callback(null, room);
      }
    }
  };

  /**
   * This function is called by the Counselors in order to delete a room from the system
   */
  self.councellors.now.deleteRoom = function (roomId) {
	var room = opeka.rooms.get(roomId);
	if (room != null) {
      //remove room from the system
	  opeka.rooms.remove(roomId);
      util.log("Room deleted: " + roomId);
      self.everyone.now.receiveRooms(opeka.rooms.clientSideList(), opeka.rooms.roomOrder);
      self.everyone.now.updateActiveRoom();
	}
  };

  /* Function used in order to delete all messages of a single user */
  self.councellors.now.deleteAllMsg = function (clientId) {
	var room = opeka.rooms.get(this.user.activeRoomId);
	if (room){
		room.group.now.localDeleteAllMsg(clientId);
		util.log("Deleting All: "+clientId);
	}
  }

  /* Function used in order to delete a single message */
  self.councellors.now.deleteMsg = function (msgId) {
	var room = opeka.rooms.get(this.user.activeRoomId);
	if (room){
		room.group.now.localDeleteMsg(msgId);
		util.log("Deleting: "+msgId);
	}
  }

  /* Function used mainly for testing */
  self.everyone.now.print = function(message) {
	util.log("Log: "+message);
  };

  /**
  * This function is used by the clients in order to change rooms
  */
  self.everyone.now.changeRoom = function (roomId, callback) {
    var newRoom = opeka.rooms.get(roomId);
	//check if the room is full
    if (newRoom.isFull())
      callback(true);

    // If user is already in a different room, leave it.
    if (opeka.rooms.get(this.user.activeRoomId)) {
      var oldRoom = opeka.rooms.get(this.user.activeRoomId);
      oldRoom.removeUser(this.user.clientId);

      oldRoom.group.now.receiveMessage({
        date: new Date(),
        message: this.user.nickname + " left the room.",
        system: true
      });

      this.user.activeRoomId = null;
    }

    if (newRoom && newRoom.addUser(this.user.clientId)) {
      this.user.activeRoomId = roomId;

      newRoom.group.now.receiveMessage({
        date: new Date(),
        message: this.user.nickname + " joined the room “" + newRoom.name + "”.",
        system: true
      });
    }
	callback(false);
  };

  self.everyone.now.sendMessageToRoom = function (roomId, messageText) {
    var room = opeka.rooms.get(roomId),
        messageObj = {
          date: new Date(),
          message: messageText,
          name: this.user.nickname,
		  messageId: uuid(),
		  senderId: this.user.clientId
        };
	util.log("msgid: "+messageObj.messageId);
    if (room && room.group.count && this.user.activeRoomId == roomId) {
      room.group.now.receiveMessage(messageObj);
    }
  };

  /**
   * When a client connects, let him know how many others are online.
   *
   * The client not counted as online until it calls clientReady.
   */
  self.everyone.on("connect", function () {
    this.now.updateOnlineCount(self.guests.count, self.councellors.count);
  });

  /**
   * When a client disconnects, we need to clean up after him.
   *
   * This includes closing open chats, letting others know he was
   * disconnected, etc.
   */
  self.everyone.on("disconnect", function () {
    // We need to wait a single tick before updating the online counts,
    // since there's a bit of delay before they are accurate.
    process.nextTick(function () {
      self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);
    });
  });
}

module.exports = opeka;
module.exports.Server = Server;

