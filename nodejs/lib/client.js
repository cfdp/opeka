/**
 * Created by jubk on 5/21/15.
 */
var _ = require('underscore'),
    groups = require('./groups'),
    uuid = require('node-uuid'),
    ban = require('./ban'),
    rooms = require('./rooms'),
    util = require("util");


/**
 * Represents a client instance
 * @param server - the server the client is connected to
 * @param stream - the stream used for the connection
 * @param remote - the remote object used to call client-side methods
 * @param conn - the connection object from dnode
 * @constructor
 */
var Client = function(server, stream, remote, conn) {
    var self = this;

    self.construct = function() {
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

        self.activeRoomId = null;
        self.activeQueueRoomId = null;

        self.drupal_uid = null;

        self.allowPauseAutoScroll = null;

        self.viewChatHistory = null;

        self.screening = null;

        groups.registerClient(self);
        conn.on('ready', function() {
            self.onConnectionReady();
        });

        conn.on('end', function() {
            self.onConnectionClosed();
        });

        return self;
    };

    self.getServerSideMethods = function() {
        return self.serverSideMethods;
    };

    self.getClientSideMethods = function() {
        return self.clientSideMethods;
    };

    self.onConnectionReady = function() {
        var stream = self.stream,
            server = self.server,
            ip = null,
            banInfo = null;

        if (stream.headers['x-real-ip']) {
          ip = stream.headers['x-real-ip'];
        }
        else {
          ip = stream.remoteAddress;
        }

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

    self.onConnectionClosed = function() {
        groups.unregisterClient(self);
        self.server.handleConnectionClosed(self);

        // Break relations to objects that might be troublesome to garbage collect
        self.server = null;
        self.stream = null;
        self.clientSideMethods = null;
        self.conn = null;
    };

    self.onReconnect = function(newClient) {
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

    self.remote = function(functionName) {
        // Copy arguments to writeable array
        args = [];
        _.each(arguments, function(v) { args.push(v) });

        // Remove first arg
        args.shift();

        var fn;
        if(self.clientSideMethods && (fn = self.clientSideMethods[functionName])) {
            return fn.apply(self, args);
        } else {
            self.server.logger.warning(
                "Tried to call method '" + functionName + "' for user " +
                self.clientId + ", but the method does not exist on the client side."
            );
            return false;
        }

    };

    return self.construct();
};

module.exports = Client;
