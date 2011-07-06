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
	roomManager = require("./roomManager"),
    options = {
	  key: fs.readFileSync('certs/server-key.pem'),
	  cert: fs.readFileSync('certs/server-cert.pem')	
	},
    opeka = {};


function Server(httpPort) {
  var self = this;
  self.httpPort = httpPort;

  // Create a simple server that responds via HTTPS.
  self.server = require('https').createServer(options, function(req, res) {
	if (req.url == "/admin")
	{
	  	fs.readFile(__dirname+'/pages/admin_backend.html', function(err, _data){
			res.writeHead(200, {'Content-Type':'text/html'});
			res.write(_data);
	    	res.end();
	  	});
	}
	else
	{
	  	fs.readFile(__dirname+'/pages/client_frontend.html', function(err, _data){
			res.writeHead(200, {'Content-Type':'text/html'});
			res.write(_data);
	    	res.end();
	  	});
	}
  });
  self.server.listen(self.httpPort);

  // Initialise Now.js on our server object.
  self.everyone = nowjs.initialize(self.server);

  self.councellors = nowjs.getGroup('councellors');
  self.guests = nowjs.getGroup("guests");

  self.roomsMap = {}
  self.roomsArr = new Array();
  self.roomCount = 0;

  /**
   * This function is called by the client when he's ready to load the chat.
   *
   * This usually means after loading client-side templates and other
   * resources required for the safe operation of the chat.
   * OBS: This function is not used yet since it depends on Drupal
   */
  self.everyone.now.clientReady = function (localUser, callback) {
    util.log(localUser.nickname + ' connected.');
    console.log("Joined Joined Joined: " + this.now.name);
	
	//Add to guest group
    self.guests.addUser(this.user.clientId);
    self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);
  };

  /**
  * This function is called by the client when he's ready to load the chat.
   */
  self.everyone.now.newClientReady = function () {
    console.log("Joined: " + this.now.name);
    //Initialize the room variable
	this.now.room = null;
	//Print the available rooms
    self.everyone.now.receiveRooms(self.roomsArr);
  };
  
  /**
   * This function is called by the Counselors in order to create a new room
   */
  self.everyone.now.createRoom = function (roomName, maxSize) {
	var newRoom = new roomManager.room(roomName, maxSize);
	self.roomsMap[roomName] = newRoom;
	self.roomsArr[self.roomCount]  = newRoom;
	self.roomCount++;
    console.log("Room created: " + roomName);
    self.everyone.now.receiveRooms(self.roomsArr);
  };

   /**
    * This function is used by the clients in order to change rooms
    */
   self.everyone.now.changeRoom = function(newRoom){
	if (this.now.room != null){
		var group = nowjs.getGroup(this.now.room.name);
		group.removeUser(this.user.clientId);
		this.now.clearMessages();
		group.now.receiveMessage("**", this.now.name + " left the room.");
	}
	var newRoom = self.roomsMap[newRoom];
	if (newRoom != null){
	  	var group = nowjs.getGroup(newRoom.name);
		group.addUser(this.user.clientId);
		group.now.receiveMessage("**", this.now.name + " joined the room.");
	  	this.now.room = newRoom;
      	console.log(this.now.name + " joined " + this.now.room.name);
	  }else{
	  	this.now.receiveMessage("**", "ERROR! Room does not exists");		
	  }
	}

	self.everyone.now.distributeMessage = function(message){
	  nowjs.getGroup(this.now.room.name).now.receiveMessage(this.now.name, message);
	};


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

