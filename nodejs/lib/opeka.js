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
    util.log(clientUser.nickname + ' connected.');

    opeka.user.authenticate(clientUser, function (err, account) {
      if (err) {
        throw err;
      }

      // Add the user to the overall group he belongs in.
      // This is important, since it governs what methods he has access
      // to, so only councellors can create rooms, etc.
      if (clientUser.statusOnly){
        //In this case the user that is connected is only interested in the status of the chat.
        // This is 0 if not active, 1 if busy and 2 if open.
        client.now.receiveStatus(self.getCurrentStatus());

      } else if (account.isAdmin) {
        self.councellors.addUser(client.user.clientId);

        // Send the rooms to the newly connected client.
        client.now.receiveRooms(opeka.rooms.clientSideList_all(), opeka.rooms.all_roomOrder);
      }
      else {
        self.guests.addUser(client.user.clientId);
        //The following is done in order to put each user in a single group.
        //In this way we are able to give to the counselors the ability to whisper
        nowjs.getGroup(client.user.clientId).addUser(client.user.clientId);
        
        // Send the rooms to the newly connected client.
        client.now.receiveRooms(opeka.rooms.clientSideList_public(), opeka.rooms.public_roomOrder);

        // Store the location information for later use, if they have been defined.
        if (clientUser.address){
          var add = clientUser.address.split(", ");
          client.user.city = add[0];
          client.user.state = add[1];
        }
      }

      // Store the account and nickname for later use.
      client.user.account = account;
      client.user.nickname = clientUser.nickname;

      // Update online users count for all clients.
      self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);

	  if (callback)
      callback(account);
    });
  };

  /* Function used in order to pause a room */
  self.councellors.now.pause = function () {
    var admin = this;
    var room = opeka.rooms.get(admin.user.activeRoomId);
    
    //check that the room is not paused
    if (room.paused){
      admin.now.displayError("Error Pause: the room has already been paused.");
      return;
    }
    
    if (room && room.users.length > 1) {
      room.group.now.localMute();
      room.paused = true;
      self.sendSystemMessage('[Pause]: Chat has been paused.', room.group);
    } else {
      admin.now.displayError("Error Pause: the pause function is available only for group chat.");
    }
  };

  /* Function used in order to unpause a room */
  self.councellors.now.unpause = function () {
    var admin = this;
    var room = opeka.rooms.get(admin.user.activeRoomId);
    
    //check that the room is paused
    if (!room.paused){
      admin.now.displayError("Error Unpause: the room has not been paused.");
      return;
    }
    
    if(room && room.paused){
      room.group.now.localUnmute();
      room.paused = false;
      self.sendSystemMessage('[Pause]: Chat is available again.', room.group);
    }
  };

  /* Function used in order to unmute a single user */
  self.councellors.now.unmute = function (userId) {
    var admin = this;
    var group = nowjs.getGroup(userId);

    //checking if the user exists
    if (group.count == 0){
      admin.now.displayError("Error Unmuting: an user with the specified ID does not exists.");
      return;
    }

    //checking if the user is in the same room as the counsellor
    var room = opeka.rooms.get(admin.user.activeRoomId);
    var idx = room.usersIdx[userId];
    if (!idx){
      admin.now.displayError("Error Unmuting: the specified user is not in the same room as yours.");
      return;
    }

    //Checking if the user has been already muted
    if (!room.users[idx].muted){
      admin.now.displayError("Error Unmuting: the specified user is not muted.");
      return;
    }
    
    group.now.localUnmute();
    room.users[idx].muted = false;
    self.sendSystemMessage('[Mute]: You have unmuted user: '+room.users[idx].nickname, admin);
    self.sendSystemMessage('Warning: You have been unmuted.', group);
    };

    /* Function used in order to mute a single user */
    self.councellors.now.mute = function (userId){
    var admin = this;
    var group = nowjs.getGroup(userId);
    
    //checking if the user exists
    if (group.count == 0){
      admin.now.displayError("Error Muting: an user with the specified ID does not exists.");
      return;
    }
    
    //checking if the user is in the same room as the counsellor
    var room = opeka.rooms.get(admin.user.activeRoomId);
    var idx = room.usersIdx[userId];
    if (!idx){
      admin.now.displayError("Error Muting: the specified user is not in the same room as yours.");
      return;
    }
    
    //Checking if the user has been already muted
    if (room.users[idx].muted){
      admin.now.displayError("Error Muting: the specified user has already been muted.");
      return;
    }
    
    group.now.localMute();
    room.users[idx].muted = true;
    self.sendSystemMessage('[Mute]: You have muted user: '+room.users[idx].nickname, admin);
    self.sendSystemMessage('Warning: You have been muted.', group);
    };

    /* Function used by the counselors in order to kick an user out his room */
    self.councellors.now.kick = function (userId, messageText) {
    var group = nowjs.getGroup(userId);
    
    //checking if the user exists
    if (group.count == 0){
      this.now.displayError("Error kicking: an user with the specified ID does not exists.");
      return;
    }
    
    //checking if the user is in the same room as the counsellor
    var room = opeka.rooms.get(this.user.activeRoomId);
    var idx = room.usersIdx[userId];
    if (!idx){
      this.now.displayError("Error kicking: the specified user is not in the same room as yours.");
      return;
    }
    
    var nickname = this.user.nickname;
      group.now.changeRoom(null, null, true);
    group.now.displayWarning("You have been kicked out the room by "+nickname+" for the following reason: "+messageText);
      
    };

    /* Function used by the counselors in order to whisper to an user */
    self.councellors.now.whisper = function (userId, messageText) {
    var group = nowjs.getGroup(userId);

    //checking if the user exists
    if (group.count == 0){
      this.now.displayError("Error whispering: an user with the specified ID does not exists.");
      return;
    }
    
    //checking if the user is in the same room as the counsellor
    var room = opeka.rooms.get(this.user.activeRoomId);
    var idx = room.usersIdx[userId];
    if (!idx){
      this.now.displayError("Error whispering: the specified user is not in the same room as yours.");
      return;
    }
    
    var messageObj = {
        date: new Date(),
        message: messageText,
      whisper: true,
        name: this.user.nickname
      };
    
    //send whisper to both the user and the counsellor
      group.now.receiveMessage(messageObj);
    this.now.receiveMessage(messageObj);
    
  };

  /**
   * This function is called by the Counsellors in order to create a new room
   */
  self.councellors.now.createRoom = function (roomName, maxSize, priv, nat, callback) {
    if ((roomName.length == 0)){
      this.now.displayError("Error creating room: room name too short.");
      callback("err",null);
    } else {
      var room = opeka.rooms.create(roomName, maxSize, priv, nat, function(clientSideList_all, all_roomOrder, clientSideList_public, public_roomOrder){
		self.updateRoomList(clientSideList_all, all_roomOrder, clientSideList_public, public_roomOrder, priv);
      });

      if (callback) {
        callback(null, room);
      }
    }
  };

  /**
   * This function is called by the Counsellors in order to delete a room from the system
   */
  self.councellors.now.deleteRoom = function (roomId, finalMessage) {
    var room = opeka.rooms.get(roomId);
    if (room != null) {
      //send finalMessage
      if (room.group && room.group.count != 0){
      //if there are more than 1 user, for sure there will be one user that is not admin, then we have to send the final message
      if (room.group.count>1)
          room.group.now.client_finalMessage(this.user.nickname, finalMessage);
        //if chatDurationStart_Min is defined means that the room has been actually used by at least one user
        if (room.chatDurationStart_Min){
          var duration = Math.round((new Date()).getTime() / 60000) - room.chatDurationStart_Min;
          room.counsellorGroup.now.admin_finalMessage("Your Final Message has been:"+finalMessage+"\n The chat lasted for "+duration+" minute/s.");
        }else{
          room.counsellorGroup.now.admin_finalMessage("Room deleted. It has not been used.");		
        }
      }
    
      var priv = room.private;

        //remove room from the system
      opeka.rooms.remove(roomId, function(clientSideList_all, all_roomOrder, clientSideList_public, public_roomOrder){
      self.updateRoomList(clientSideList_all, all_roomOrder, clientSideList_public, public_roomOrder, priv);
      });
      
    }else{
      this.now.displayError("Error deleting room: a room with the specified ID does not exist.");
    }
    };

    /* Function used in order to delete all messages of a single user */
    self.councellors.now.deleteAllMsg = function (clientId) {
    var room = opeka.rooms.get(this.user.activeRoomId);
    if (room)
      room.group.now.localDeleteAllMsg(clientId);
    };

    /* Function used in order to delete a single message */
    self.councellors.now.deleteMsg = function (msgId) {
    var room = opeka.rooms.get(this.user.activeRoomId);
    if (room)
      room.group.now.localDeleteMsg(msgId);
    };

    /**
    * This function is used by the clients in order to change rooms
    */
    self.everyone.now.changeRoom = function (roomId, callback, quit) {
    var client = this;
    var serv = self;
    
      var newRoom = opeka.rooms.get(roomId);

    //if an user has been muted it has to be unmuted
    if (client.user.muted){
      client.user.muted = false;
      client.now.localUnmute();
    }
    
    //check if the room is full, if yes put the user in queue
    //     if (newRoom && newRoom.isFull() && callback){
    //       return callback(true);
    // }

      // If user is already in a different room, leave it.
      if (opeka.rooms.get(client.user.activeRoomId)) {
        var oldRoom = opeka.rooms.get(client.user.activeRoomId);
        oldRoom.removeUser(client.user.clientId, function(users){
        oldRoom.counsellorGroup.now.receiveUserList(users);
        });

      serv.sendSystemMessage(client.user.nickname + " left the room.", oldRoom.group);
    
      if (quit){
        client.now.quitRoom(callback);
        }
      }
      
    //trying to add the user, if this returns false the room is full or does not exists
    var addedUser;
    if (newRoom){
        addedUser = newRoom.addUser(client.user, function(users){
        newRoom.counsellorGroup.now.receiveUserList(users);
        });
    }

      if (addedUser == 'OK') {
        client.user.activeRoomId = roomId;
      serv.sendSystemMessage(client.user.nickname + " joined the room “" + newRoom.name + "”.", newRoom.group);
      
      if (newRoom.paused && !client.user.account.isAdmin){
      client.now.localMute();
        
      process.nextTick(function () {
        serv.sendSystemMessage("[Warning] The room is paused.", client);
        });
      }
      }

    if (callback)
      callback(addedUser);
    
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
    if (room && room.group.count && this.user.activeRoomId == roomId && !this.user.muted) {
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
    var client = this;
    // We need to wait a single tick before updating the online counts,
    // since there's a bit of delay before they are accurate.
    process.nextTick(function () {

      //leave the active room, if it is defined and it still exists
      if (opeka.rooms.get(client.user.activeRoomId)){
        var oldRoom = opeka.rooms.get(client.user.activeRoomId);
      
        oldRoom.removeUser(client.user.clientId, function(users){
        self.sendSystemMessage(client.user.nickname + " left the room.", oldRoom.group);
        oldRoom.counsellorGroup.now.receiveUserList(oldRoom.users);
      });

        client.user.activeRoomId = null;
      }

      self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);
    });
  });


// -------- HELPERS -----------
  
  /* Function used in order to update the room list on both client and admin side*/
  self.updateRoomList = function (clientSideList_all, all_roomOrder, clientSideList_public, public_roomOrder, priv){
    if (self.councellors && self.councellors.count && self.councellors.count != 0)
	  self.councellors.now.receiveRooms(clientSideList_all, all_roomOrder);
    if (!priv && self.guests && self.guests.count && self.guests.count != 0)
	  self.guests.now.receiveRooms(clientSideList_public, public_roomOrder);
    self.everyone.now.updateActiveRoom();
  };

  /* Function used in order to send a system message*/
  self.sendSystemMessage = function(messageToSend, to){
    var messageObj = {
	  date: new Date(),
	  message: messageToSend,
	  system: true
    };
    to.now.receiveMessage(messageObj);
  };

  /* Function used in order to retrieve the status of the chat system*/ 
  self.getCurrentStatus = function(){
    if (opeka.rooms.public_roomOrder.length == 0){
      //No public room is active, the chat is not active
      return 0;
    } else {
      //check if any public room is not full
      found = false;
      public_roomOrder.forEach(function (roomId, index) {
        var room = opeka.rooms.get(roomId);

        if(room && !room.isFull()){
          //there are room that are not full, then the chat is available
          found = true;
          return;
        }
      });

      if (found) return 2;
      return 1;
    }
  };
}

module.exports = opeka;
module.exports.Server = Server;

