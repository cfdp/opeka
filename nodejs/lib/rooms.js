/**
 * @file
 * Code for managing chat rooms.
 */
var nowjs = require("now"),
    uuid = require('node-uuid');
    rooms = {},
    public_roomOrder = [], //list of only the public rooms
    all_roomOrder = []; //list of all the rooms
    

/**
 * Create a new room.
 *
 * We don't expose the Room object itself to the rest of Node, so we are
 * sure all new rooms are created through this function, and thus,
 * properly registered.
 */
function create(name, maxSize, priv, callback) {
  var roomId = uuid(),
      room = new Room(roomId, name, maxSize, priv);

  rooms[roomId] = room;
  if (priv) all_roomOrder.push(roomId);
  else {
    all_roomOrder.push(roomId);	
    public_roomOrder.push(roomId);	
  }
  
  //Update room list
  if (callback) callback(this.clientSideList_all(), this.all_roomOrder, this.clientSideList_public(), this.public_roomOrder);

  return room;
}

/**
 * Get a room from the list.
 */
function get(roomId) {
  return rooms[roomId];
}

/**
 * Remove a room from the system.
 */
function remove(roomId, callback){
  var room = rooms[roomId];
  if (room){
	room.removeAllUsers();
    var idx = all_roomOrder.indexOf(roomId);
	all_roomOrder.splice(idx, 1);
	
	//If the room is not private we have to delete it also from the public room list
	if (!room.private){
	  var idx = public_roomOrder.indexOf(roomId);
	  public_roomOrder.splice(idx, 1);
	}
	rooms[roomId] = null;
	
	//update room list
    if (callback) callback(this.clientSideList_all(), this.all_roomOrder, this.clientSideList_public(), this.public_roomOrder);
  }
}

/**
 * Get a list of public rooms, containing room metadata safe to send to the client.
 */
function clientSideList_public() {
  var roomList = {};
  public_roomOrder.forEach(function (roomId, index) {
    roomList[roomId] = rooms[roomId].getInfo();
  });

  return roomList;
}

/**
 * Get a list of all rooms, containing room metadata safe to send to the client.
 */
function clientSideList_all() {
  var roomList = {};
  all_roomOrder.forEach(function (roomId, index) {
    roomList[roomId] = rooms[roomId].getInfo();
  });

  return roomList;
}

/**
 * The room manager keeps track of a chatroom and who's in it.
 *
 * It also protects the room's group-object from prying eyes.
 */
function Room(roomId, name, maxSize, priv) {
  var self = this;
  self.id = roomId; //id of the room
  self.name = name; //name of the room
  self.maxSize = maxSize; //max size of the room
  self.group = nowjs.getGroup(roomId); //nowjs group for the room
  self.counsellorGroup = nowjs.getGroup("counsellors-"+roomId); //group populated with all the cousellors in the room
  self.private = priv; //flag that indicates if the room is private
  self.users = []; //list of users
  self.usersIdx = {}; //mapping ClientID = Index of the user in self.users

  /* Function used in order to see if a room is full */
  self.isFull = function() {
	if (self.maxSize && self.group.count >= self.maxSize)
	  return true;
	else return false;
  }

  /**
   * Add an user to the group.
   */
  self.addUser = function (user, callback) {
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.
    if ((!self.maxSize || self.group.count < self.maxSize) && user) {
	  var index = self.users.push(user) - 1;
	  self.usersIdx[user.clientId] = index;
      self.group.addUser(user.clientId);
	  
	  //Start the timer in order to retrieve at the end the duration of the chat
	  if (user.account.isAdmin)
	    self.counsellorGroup.addUser(user.clientId);
	  else self.chatDurationStart_Min = Math.round((new Date()).getTime() / 60000);
	  
	  //Update user list for the admins
	  if (callback){
		try{
		  callback(self.users);
		}catch(ignore){
			//this is ignored since we have an exception if no counselor are in the room. We should discuss this eventuality...			
		}
      }
      return true;
    }
    return false;
  };

  /**
   * Remove user from group.
   */
  self.removeUser = function (clientId, callback) {
	var idx = self.usersIdx[clientId];
	if (idx){
	  try {
	    self.users[idx].now.activeRoomId = null;
	  }catch(ignored){
		//if we have an exception here means that the user is disconnected, thus we do not mind about the activeRoomId
	  }finally{
	    self.users.splice(idx, 1);
		self.group.removeUser(clientId);
		self.usersIdx[clientId] = null;
		self.counsellorGroup.removeUser(clientId);
		if(callback) {
          try{
			callback(self.users);
	      }catch(ignored){
			//this is ignored since we have an exception if no counselor are in the room. We should discuss this eventuality...
		  }
		}
	  }
    }
  };

  /**
   * Return the current group metadata in an object that is safe to send
   * to the client side.
   */
  self.getInfo = function () {
    return {
      id: self.id,
      name: self.name,
      maxSize: self.maxSize,
	  private: self.private
    };
  };

  /**
   * Remove all users from the room.
   */
  self.removeAllUsers = function(){
	for (var user in self.users)
	  self.removeUser(user.clientId);
	self.users = [];
  };

  return self;
}

module.exports = {
  create: create,
  remove: remove,
  get: get,
  public_roomOrder: public_roomOrder,
  all_roomOrder: all_roomOrder,
  clientSideList_public: clientSideList_public,
  clientSideList_all: clientSideList_all
};

