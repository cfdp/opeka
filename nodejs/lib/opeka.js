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
    util.log(clientUser.nickname + ' connected.');

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

  /**
   * This function is called by the Counselors in order to create a new room
   */
  self.councellors.now.createRoom = function (roomName, maxSize, callback) {
    var room = opeka.rooms.create(roomName, maxSize);

    util.log("Room created: " + roomName);
    self.everyone.now.receiveRooms(opeka.rooms.clientSideList(), opeka.rooms.roomOrder);

    if (callback) {
      callback(null, room);
    }
  };

  /**
  * This function is used by the clients in order to change rooms
  */
  self.everyone.now.changeRoom = function (roomId) {
    var newRoom = opeka.rooms.get(roomId);

    // If user is already in a different room, leave it.
    if (this.user.activeRoomId) {
      var oldRoom = opeka.room.get(this.user.activeRoomId);
      oldRoom.removeUser(this.user.clientId);

      oldRoom.group.now.receiveMessage({
        date: new Date(),
        message: this.user.nickname + " left the room.",
        system: true
      });

      this.user.activeRoomId = null;
    }

    if (newRoom) {
      newRoom.addUser(this.user.clientId);
      this.user.activeRoomId = roomId;

      newRoom.group.now.receiveMessage({
        date: new Date(),
        message: this.user.nickname + " joined the room “" + newRoom.name + "”.",
        system: true
      });
    }
  };

  self.everyone.now.sendMessageToRoom = function (roomId, messageText) {
    var room = opeka.rooms.get(roomId),
        messageObj = {
          date: new Date(),
          message: messageText,
          name: this.user.nickname
        };

    if (room && room.group.count) {
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

