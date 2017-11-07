/**
 * Created by jubk on 5/21/15.
 */
var _ = require('underscore'),
  groups = require('./groups'),
  uuid = require('node-uuid'),
  ban = require('./ban'),
  rooms = require('./rooms'),
  user = require('./user.js'),
  util = require("util");


/**
 * Represents a client instance
 * @param server - the server the client is connected to
 * @param stream - the stream used for the connection
 * @param remote - the remote object used to call client-side methods
 * @param conn - the connection object from dnode
 * @constructor
 */
var Client = function (server, stream, remote, conn) {
  var self = this;

  self.construct = function () {
    self.clientId = uuid();

    self.server = server;
    self.stream = stream;
    self.clientSideMethods = remote;

    self.conn = conn;

    self.serverSideMethods = {};

    self.account = {};

    self.whisperPartners = {};

    self.nickname = null;
    self.gender = null;
    self.age = null;
    self.accessCode = null;
    self.city = null;
    self.state = null;

    self.chatStart_Min = null;
    self.connectionData = {
      online: null,
      pingSent: null,
      pingReceived: null,
      pingTimerId: null,
      reconnectLimit: server.config.get('features:reconnectLimit'),
      disconnectLimit: server.config.get('features:disconnectLimit'),
    };

    self.activeRoomId = null;
    self.activeQueueRoomId = null;

    self.drupal_uid = null;

    self.allowPauseAutoScroll = null;

    self.viewChatHistory = null;

    self.screening = null;

    groups.registerClient(self);
    conn.on('ready', function () {
      self.onConnectionReady();
    });

    conn.on('end', function () {
      self.onConnectionClosed();
    });

    return self;
  };

  self.getServerSideMethods = function () {
    return self.serverSideMethods;
  };

  self.getClientSideMethods = function () {
    return self.clientSideMethods;
  };

  self.onConnectionReady = function () {
    var stream = self.stream,
      server = self.server,
      ip = null,
      banInfo = null;

    if (stream.headers['x-real-ip']) {
      ip = stream.headers['x-real-ip'];
    } else {
      ip = stream.remoteAddress;
    }

    server.logger.info("Connection ready for user with IP ", ip);

    banInfo = ban.checkIP(ip, server.config.get('ban:salt'));

    if (banInfo.isBanned) {
      server.logger.warning('User ' + self.clientId + ' tried to connect with banned address ' + banInfo.digest);
      self.remote('setIsBanned', true);

      // Close the socket after data has been synced.
      setTimeout(function () {
        stream.end();
      }, 500);
    };
    currentTime = (new Date()).getTime();
    self.connectionData.pingSent = currentTime;
    self.connectionData.pingReceived = currentTime;
    self.connectionData.online = true;

    self.connectionData.pingTimerId = setInterval(function () {
      self.pingClient();
    }, 5000);

    server.updateUserStatus(self);
  };

  self.onConnectionClosed = function () {
    groups.unregisterClient(self);
    if (self.server) {
      self.server.handleConnectionClosed(self);
    }
    else {
      console.error('could not close connection for clientId = ' + self.clientId + ' - self.server undefined.');
    }
    // Break relations to objects that might be troublesome to garbage collect
    self.server = null;
    self.stream = null;
    self.clientSideMethods = null;
    self.conn = null;
  };

  self.onReconnect = function (newClient) {
    util.log('Replacing user ' + self.clientId + ' with ' + newClient.clientId);
    for (var id in rooms.list) {
      rooms.list[id].replaceUser(self.clientId, newClient);
    }
    groups.unregisterClient(self);

    // Break relations to objects that might be troublesome to garbage collect
    self.server = null;
    self.stream = null;
    self.clientSideMethods = null;
    self.conn = null;
    self.activeRoomId = null;
  };

  self.pingClient = function () {
    self.connectionData.pingSent = (new Date()).getTime();
    self.remote('sendPingBack', self.connectionData.pingSent);
    self.detectOfflineStatus();
  };

  self.detectOfflineStatus = function () {
    var latency = self.connectionData.pingSent - self.connectionData.pingReceived;

    if (latency > self.connectionData.disconnectLimit) {
      clearInterval(self.connectionData.pingTimerId)
      // time to disconnect user
      self.updateClientOnlineState(false, true);
    }
    else if (latency > self.connectionData.reconnectLimit) {
      // update userlist with new client offline state
      self.updateClientOnlineState(false, false);
    }
  };

/**
 * Update client online state and disconnect them if disconnectLimit is passed
 *
 */
  self.updateClientOnlineState = function (newState, disconnect) {
    var currentClient,
        room;
    for (var id in rooms.list) {
      room = rooms.list[id];
      _.find(room.users,function(val){
          if (_.contains(val, self.clientId)) {
            currentClient = room.users[self.clientId];
            if (disconnect) {
              self.server.removeUserFromRoom(room, self.clientId, room.id, currentClient.chatStart_Min, function (err, users) {
                if (err) return console.warn(err);
                user.sendUserList(room.group, room.id, users);
                self.server.updateUserStatus(self.everyone);
              });
              return;
            }
            currentClient.online = newState;
            self.connectionData.online = newState;
            user.sendUserList(room.group, room.id, room.users);
            return;
          }
      });
    }
    console.warn('Tried to update client online state, but user not found in any room.');
  };

  self.remote = function (functionName) {
    // Copy arguments to writeable array
    args = [];
    _.each(arguments, function (v) {
      args.push(v)
    });

    // Remove first arg
    args.shift();

    var fn;
    if (self.clientSideMethods && (fn = self.clientSideMethods[functionName])) {
      return fn.apply(self, args);
    }
    else {
      console.warn(
        "Tried to call method '" + functionName + "' for user " +
        self.clientId + ", but the method does not exist on the client side."
      );
      return false;
    }
  };

  return self.construct();
};

module.exports = Client;
