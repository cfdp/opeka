/**
 * @file
 * Code for managing chat rooms.
 */
var nowjs = require("now"),
    uuid = require('node-uuid');
    rooms = {},
    public_roomOrder = [],
    all_roomOrder = [];
    

/**
 * Create a new room.
 *
 * We don't expose the Room object itself to the rest of Node, so we are
 * sure all new rooms are created through this function, and thus,
 * properly registered.
 */
function create(name, maxSize, priv) {
  var roomId = uuid(),
      room = new Room(roomId, name, maxSize, priv);

  rooms[roomId] = room;
  if (priv) all_roomOrder.push(roomId);
  else {
    all_roomOrder.push(roomId);	
    public_roomOrder.push(roomId);	
  }

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
function remove(roomId){
  var room = rooms[roomId];
  if (room != null){
	room.removeAllUsers();
    var idx = all_roomOrder.indexOf(roomId);
	all_roomOrder.splice(idx, 1);
	
	if (!room.private){
	  var idx = public_roomOrder.indexOf(roomId);
	  public_roomOrder.splice(idx, 1);
	}
	
	rooms[roomId] = null;
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
  self.id = roomId;
  self.name = name;
  self.maxSize = maxSize;
  self.group = nowjs.getGroup(roomId);
  self.counsellorGroup = nowjs.getGroup("counsellors-"+roomId);
  self.private = priv;
  self.users = [];
  self.usersIdx = {};

  
  self.isFull = function() {
	if (self.maxSize && self.group.count >= self.maxSize)
	  return true;
	else return false;
  }

  /**
   * Add a user to the group.
   */
  self.addUser = function (user) {
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.
    if ((!self.maxSize || self.group.count < self.maxSize) && user) {
	  var index = self.users.push(user) - 1;
	  self.usersIdx[user.clientId] = index;
      self.group.addUser(user.clientId);
	  if (user.account.isAdmin)
	    self.counsellorGroup.addUser(user.clientId);
      return true;
    }
    return false;
  };

  /**
   * Remove user from group.
   */
  self.removeUser = function (clientId) {
	var idx = self.usersIdx[clientId];
	if (idx){
		self.users.splice(idx, 1);
	    self.group.removeUser(clientId);
		self.usersIdx[clientId] = null;
	    self.counsellorGroup.removeUser(clientId);
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
  clientSideList_all: clientSideList_all,
  clientSideList_public: clientSideList_public,
  public_roomOrder: public_roomOrder,
  all_roomOrder: all_roomOrder
};

