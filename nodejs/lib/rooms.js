/**
 * @file
 * Code for managing chat rooms.
 */
var nowjs = require("now"),
    uuid = require('node-uuid');
    rooms = {},
    roomOrder = [];

/**
 * Create a new room.
 *
 * We don't expose the Room object itself to the rest of Node, so we are
 * sure all new rooms are created through this function, and thus,
 * properly registered.
 */
function create(name, maxSize) {
  var roomId = uuid(),
      room = new Room(roomId, name, maxSize);

  rooms[roomId] = room;
  roomOrder.push(roomId);

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
    var idx = roomOrder.indexOf(roomId);
	roomOrder.splice(idx, 1);
	rooms[roomId] = null;
  }
}

/**
 * Get a room list, containing room metadata safe to send to the client.
 */
function clientSideList() {
  var roomList = {};
  roomOrder.forEach(function (roomId, index) {
    roomList[roomId] = rooms[roomId].getInfo();
  });

  return roomList;
}

/**
 * The room manager keeps track of a chatroom and who's in it.
 *
 * It also protects the room's group-object from prying eyes.
 */
function Room(roomId, name, maxSize) {
  var self = this;
  self.id = roomId;
  self.name = name;
  self.maxSize = maxSize;
  self.group = nowjs.getGroup(roomId);

  /**
   * Add a user to the group.
   */
  self.addUser = function (clientId) {
    // If we have both rooms and groups, check that we don't exceed the
    // room size (if set) before adding the person to the room.
    if ((!self.maxSize || self.group.count < self.maxSize) && clientId) {
      self.group.addUser(clientId);
      return true;
    }
    return false;
  };

  /**
   * Remove user from group.
   */
  self.removeUser = function (clientId) {
    self.group.removeUser(clientId);
  };

  /**
   * Return the current group metadata in an object that is safe to send
   * to the client side.
   */
  self.getInfo = function () {
    return {
      id: self.id,
      name: self.name,
      maxSize: self.maxSize
    };
  };

  /**
   * Remove all users from the room.
   */
  self.removeAllUsers = function(){
	var keys = [];
	for(var key in self.group._groupScopes){
	  keys.push(key);
	}
	
	for (var userId in keys){
		self.removeUser(userId);
	}
  };

  return self;
}

module.exports = {
  create: create,
  remove: remove,
  get: get,
  clientSideList: clientSideList,
  roomOrder: roomOrder,
};

