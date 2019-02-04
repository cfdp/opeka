/**
 * Created by jubk on 5/21/15.
 */
var _ = require('underscore'),
  useragent = require('useragent'),
  groups = require('./groups'),
  uuid = require('node-uuid'),
  ipcheck = require('./ipcheck'),
  rooms = require('./rooms'),
  user = require('./user.js'),

  // Connection states
  CREATED = 0,
  CONNECTED = 1,
  PENDING_TIMEOUT = 2,
  DISCONNECTED = 3,

  // If we haven't heard from clients in half the time of the reconnect interval
  // assume that they are timing out
  TIMEOUTS_PER_INTERVAL = 2,
  // Ping clients two times within each timeout interval
  PINGS_PER_TIMEOUT = 2,

  // Dynamic reconnect values, updated from Drupal configuration whenever
  // a client connects.
  reconnect_attempts = 10,
  reconnect_interval = 20000,
  client_timeout,
  ping_interval,
  disconnect_limit;

  function updateReconnectTimes() {
    client_timeout = parseInt(reconnect_interval / TIMEOUTS_PER_INTERVAL);
    ping_interval = parseInt(client_timeout / PINGS_PER_TIMEOUT);
    disconnect_limit = reconnect_attempts * reconnect_interval;
  }
  updateReconnectTimes();

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

    self.reported = null;
    self.chatStartMin = null;
    self.online = "not-connected";
    self.connectionData = {
      serverDisconnect: null,
      lastPingSent: 0,
      lastPingSuccess: null,
      pingDelay: null,
      pingDelayAvg: null,
      pingDelayArray: [],
      pingCount: 0,
      agent: "not-set",
      ip: null,
      remotePort: null
    };
    // Load configured reconnect values from Drupal's configuration, making
    // sure to update the server as well.
    self.server.reloadDrupalConfig(function(err, drupalconfig) {
      reconnect_attempts = drupalconfig.opeka_reconnect_attempts;
      reconnect_interval = drupalconfig.opeka_reconnect_interval;
      updateReconnectTimes();
    });
    
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
      ipBanInfo = null,
      agent = null,
      ipGeoDbKey = server.config.get('features:ipGeoDbKey'),
      allowedLocations = server.config.get('features:ipGeoLocations');

      self.connectionData.agent = agent = useragent.parse(stream.headers['user-agent']).toString();

    if (stream.headers['x-real-ip']) {
      ip = stream.headers['x-real-ip'];
    } else {
      ip = stream.remoteAddress;
    }
    self.connectionData.ip = ip;
    self.connectionData.remotePort = stream.remotePort;

    server.logger.info(
      "Connection ready for user with IP ", ip, "UA: ", agent ,"and clientId ", self.clientId
    );

    var currentTime = (new Date()).getTime();
    self.connectionData.lastPingSuccess = currentTime;
    self.connectionData.pingDelay = 0;

    self.changeState(CONNECTED);

    ipBanInfo = ipcheck.checkIP(ip, server.config.get('ban:salt'));

    if (ipBanInfo.isBanned) {
      server.logger.warning('User ' + self.clientId + ' tried to connect with banned address ' + ipBanInfo.digest);
      self.remote('setIsBanned', true);

      // Close the socket after data has been synced.
      setTimeout(function () {
        stream.end();
      }, 500);
    }

    if (ipGeoDbKey) {
      ipcheck.checkIPLocation(ip, ipGeoDbKey, allowedLocations, function(err, ipGeoInfo) {
        if (ipGeoInfo && ipGeoInfo.outsideGeoLimits) {
          server.logger.warning('User ' + self.clientId +
          ' tried to connect with address outside geo limits, country:' + ipGeoInfo.location); 
          self.remote('outsideGeoLimits', true);

          // Close the socket after data has been synced.
          setTimeout(function () {
            stream.end();
          }, 500);
        }
      });
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
          server.logger.debug('could not close connection for clientId = ' + self.clientId
          + ' - self.server undefined.');
          return;
        }
        self.breakRelations();
        break;
      default:
        break;
    }
  };

  self.onConnectionClosed = function () {
    server.logger.debug(
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
    self.connectionData = newClient.connectionData;

    server.logger.debug(
      'onReconnect: ' + self.clientId + ' takes over ' +
      newClient.clientId + 's remote, stream and connection. ' +
      'UA: ' + self.connectionData.agent
    );
    self.changeState(CONNECTED);
    newClient.breakRelations();
    newClient.changeState(DISCONNECTED);
    newClient = null;
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

    self.connectionData.lastPingSent = pingSent;

    self.remote('ping', pingSent, function(err, clientTime) {
      var pingDelay = (new Date()).getTime() - pingSent;

      // Ignore any PONG that arrives after PINGs older than the last
      // successful one.
      if(pingSent >= self.connectionData.lastPingSuccess) {
        self.connectionData.pingCount++;
        self.connectionData.pingDelay = pingDelay;
        self.connectionData.lastPingSuccess = pingSent;
        self.averagePingDelay(pingDelay);
      }
    });
  };

  // Calculate average delay of the last 5 succesful pings
  self.averagePingDelay = function (pingDelay) {
    if (self.connectionData.pingDelayArray.push(pingDelay) > 5) {
      self.connectionData.pingDelayArray.splice(0,1);
      self.connectionData.pingDelayAvg = self.connectionData.pingDelayArray.reduce(
        function(acc, val) {
          return acc + val; 
        }, 0
      ) / 5;
    }
  };

  // Checks if the client connection has been idle for too long. Will also
  // issue a ping to the client every PING_INTERVAL.
  self.checkTimeout = function () {
    if(self.state != CONNECTED) {
      return;
    }
    if((self.now - self.connectionData.lastPingSent) >= ping_interval) {
      self.pingClient();
    }

    var sincePingSuccess = self.now - self.connectionData.lastPingSuccess;

    if (sincePingSuccess > client_timeout) {
      server.logger.debug(
        'sincePingSuccess = ' + sincePingSuccess + ' > client_timeout = ' + client_timeout
        + ': Time to put user ' + self.clientId + ' into pending timeout'
      );
      self.changeState(PENDING_TIMEOUT);
    }
  };

  self.checkDisconnect = function () {
    if(self.state != PENDING_TIMEOUT) {
      return;
    }
    var sincePingSuccess = self.now - self.connectionData.lastPingSuccess;
    if (sincePingSuccess > disconnect_limit) {
      server.logger.info(
        "Client disconnected: sincePingSuccess (" + sincePingSuccess + " ms) > disconnect_limit for " +
        self.clientId + " avg. pingDelay = " + self.connectionData.pingDelayAvg + 
        " UA: " + self.connectionData.agent
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
    if (old_online_state != self.online) {
      var removeFromRooms = (self.online === "disconnected"),
          reconnected = (self.online === "online"),
          clientData;

      _.find(rooms.list, function(room) {
        if (_.contains(_.keys(room.users), self.clientId)) {
          currentClient = room.users[self.clientId];
          currentClient.online = self.online;
          // Check if the room still has an online counselor, if not, pause it.
          if (!room.hasCounselor()) {
            self.server.sendSystemMessage('Rådgiveren har mistet forbindelsen, vent mens vi genopretter den.',
            room.group, room);
            self.server.pauseRoom(room);
            server.logger.warning('Counselor lost connection. Pausing room.');
          }
          // If a user reconnects, make sure she gets the updated room status.
          if ((typeof self.clientSideMethods.roomUpdated === "function") && reconnected && room.paused) {
            self.clientSideMethods.roomUpdated(room.id, {paused: true});
          }
          // If user was disconnected, just remove them.
          if (removeFromRooms) {
            clientData = {
              'clientId': self.clientId,
              'activeRoomId': room.id,
              'chatStartMin': currentClient.chatStartMin,
              'stats_id': currentClient.stats_id
            };
            self.server.removeUserFromRoom(room.id, clientData,
              function (err, users) {
                if (err) return server.logger.error(err);
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

  /**
   * Forces a client reload, typically used to avoid stale data on
   * client side when clients reconnect after a server restart.
   */
  self.forceReload = function() {
    self.remote('forceReload');
    // @todo: do more to ensure the connection is closed?
    // Ending the stream causes the client to reconnect, so thats a nogo.
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
      server.logger.warning(
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
