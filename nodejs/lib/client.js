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

  // Connection states
  CREATED = 0;
  CONNECTED = 1;
  PENDING_TIMEOUT = 2;
  DISCONNECTED = 3;

  PING_INTERVAL = 5000;

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

    self.serverSideMethods = {
      methods: {},
      // This is a reference to the client the serverside methods will be
      // called on. It needs to be registered here in order to make it possible
      // for reconnected clients to take over an existing client.
      client: self,
    };

    self.account = {};

    self.whisperPartners = {};

    self.nickname = null;
    self.gender = null;
    self.age = null;
    self.accessCode = null;
    self.city = null;
    self.state = null;

    self.chatStart_Min = null;
    self.online = "not-connected";
    self.connectionData = {
      serverDisconnect: null,
      lastPingSent: 0,
      lastPingSuccess: null,
      pingDelay: null,
      reconnectLimit: server.config.get('features:reconnectLimit'),
      disconnectLimit: server.config.get('features:disconnectLimit'),
    };

    self.activeRoomId = null;
    self.activeQueueRoomId = null;

    self.drupal_uid = null;

    self.allowPauseAutoScroll = null;

    self.viewChatHistory = null;

    self.screening = null;
    self.now = (new Date()).getTime();

    self.changeState(CREATED);

    groups.registerClient(self);
    conn.on('ready', function () {
      self.onConnectionReady();
    });

    conn.on('end', function () {
      self.onConnectionClosed();
    });

    self.tickId = setInterval(function () { self.tick(); }, 1000);

    return self;
  };

  self.getServerSideMethods = function () {
    return self.serverSideMethods.methods;
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

    var currentTime = (new Date()).getTime();
    self.connectionData.lastPingSuccess = currentTime;
    self.connectionData.pingDelay = 0;

    self.changeState(CONNECTED);

    banInfo = ban.checkIP(ip, server.config.get('ban:salt'));

    if (banInfo.isBanned) {
      server.logger.warning('User ' + self.clientId + ' tried to connect with banned address ' + banInfo.digest);
      self.remote('setIsBanned', true);

      // Close the socket after data has been synced.
      setTimeout(function () {
        stream.end();
      }, 500);
    }

    server.updateUserStatus(self);
  };

  self.tick = function() {
    self.now = (new Date()).getTime();

    switch(self.state) {
      case CREATED:
        break;
      case CONNECTED:
        self.checkTimeout();
        break;
      case PENDING_TIMEOUT:
        self.checkDisconnect();
        break;
      case DISCONNECTED:
        break;
      default:
        break;
    }
  };

  self.changeState = function (newState) {
    self.state = newState;
    self.updateClientOnlineState();
    console.log('newState for ' + self.clientId + ' is: ', newState);
    switch(newState) {
      case CREATED:
        break;
      case CONNECTED:
        break;
      case PENDING_TIMEOUT:
        break;
      case DISCONNECTED:
        // update userlist with new client offline state
        groups.unregisterClient(self);
        if (self.server) {
          self.server.handleConnectionClosed(self);
        }
        else {
          console.error('could not close connection for clientId = ' + self.clientId + ' - self.server undefined.');
          return;
        }
        self.breakRelations();
        break;
      default:
        break;
    }
  };

  self.onConnectionClosed = function () {
    console.log(
      "Client disconnected: onConnectionClosed " + self.clientId
    );
    self.changeState(PENDING_TIMEOUT);
  };

  self.onReconnect = function (newClient) {
    self.clientSideMethods = newClient.clientSideMethods;
    self.serverSideMethods = newClient.serverSideMethods;
    self.serverSideMethods.client = self;
    self.stream = newClient.stream;
    self.conn = newClient.conn;
    self.server.logger.info(
      'onReconnect: ' + self.clientId + ' takes over ' +
      newClient.clientId + 's remote, stream and connection.'
    );
    self.changeState(CONNECTED);
    newClient.breakRelations();
    newClient.changeState(DISCONNECTED);
    newClient = null;
//    for (var id in rooms.list) {
//      rooms.list[id].replaceUser(self.clientId, newClient);
//    }
    //groups.unregisterClient(self);
    
    //self.breakRelations();
  };

  // Break relations to objects that might be troublesome to garbage collect
  self.breakRelations = function() {
    self.server = null;
    self.stream = null;
    self.clientSideMethods = null;
    self.serverSideMethods = null;
    self.conn = null;
    self.activeRoomId = null;
  };

  self.pingClient = function () {
    var pingSent = self.now;

    console.log("PING " + self.clientId + " " + pingSent);

    self.connectionData.lastPingSent = pingSent;

    self.remote('ping', pingSent, function(err, clientTime) {
      var pingDelay = (new Date()).getTime() - pingSent;
      console.log(
        "PONG " + self.clientId + " " + pingSent + ": " + pingDelay
      );
      // Ignore any PONG that arrives after PINGs older than the last
      // successful one.
      if(pingSent >= self.connectionData.lastPingSuccess) {
        self.connectionData.pingDelay = pingDelay;
        self.connectionData.lastPingSuccess = pingSent;
      }
    });
  };

  // Checks if the client connection has been idle for too long. Will also
  // issue a ping to the client every PING_INTERVAL.
  self.checkTimeout = function () {
    if(self.state != CONNECTED) {
      return;
    }
    if((self.now - self.connectionData.lastPingSent) >= PING_INTERVAL) {
      self.pingClient();
    }

    var sinceTimeout = self.now - self.connectionData.lastPingSuccess;

    if (sinceTimeout > self.connectionData.disconnectLimit) {
      console.log(
        'latency > disconnectLimit: Time to disconnect user ', self.clientId
      );
      self.changeState(PENDING_TIMEOUT);
    }
  };

  self.checkDisconnect = function () {
    if(self.state != PENDING_TIMEOUT) {
      return;
    }
    var sinceTimeout = self.now - self.connectionData.lastPingSuccess;
    if (sinceTimeout > self.connectionData.disconnectLimit) {
      console.log(
        "Client disconnected: sinceTimeout > disconnectLimit for " + self.clientId
      );
      self.changeState(DISCONNECTED);
    }
  };

/**
 * Update client online state and disconnect them if disconnectLimit is passed
 *
 */
  self.updateClientOnlineState = function () {
    var old_online_state = self.online;
    switch(self.state) {
      case CREATED:
        self.online = "connecting";
        break;
      case CONNECTED:
        self.online = "online";
        break;
      case PENDING_TIMEOUT:
        self.online = "timing-out";
        break;
      case DISCONNECTED:
        self.online = "disconnected";
        break;
      default:
        self.online = "online";
    }
    // If state was changed, make sure other clients are notified
    if(old_online_state != self.online) {
      var removeFromRooms = (self.online === "disconnected");

      _.find(rooms.list, function(room) {
        if (_.contains(_.keys(room.users), self.clientId)) {
          currentClient = room.users[self.clientId];
          // If user was disconnected, just remove them.
          if (removeFromRooms) {
            self.server.removeUserFromRoom(
              room, self.clientId, room.id,
              currentClient.chatStart_Min,
              function (err, users) {
                if (err) return console.warn(err);
                user.sendUserList(room.group, room.id, users);
                self.server.updateUserStatus(self.everyone);
              }
            );
            return true;
          }
          // Notify users in the same room as the changed user that their
          // connection status has changed.
          user.sendUserList(room.group, room.id, room.users);
          return true;
        }
      });
    }
  };

  self.remote = function (functionName) {
    // Copy arguments to writeable array
    args = [];
    _.each(arguments, function (v) {
      args.push(v);
    });

    // Remove first argument
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

Client.CREATED = CREATED;
Client.CONNECTED = CONNECTED;
Client.PENDING_TIMEOUT = PENDING_TIMEOUT;
Client.DISCONNECTED = DISCONNECTED;

module.exports = Client;
