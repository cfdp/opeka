/**
 * Created by jubk on 5/21/15.
 */
var _ = require('underscore'),
    groups = require('./groups'),
    uuid = require('node-uuid'),
    ban = require('./ban');

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

        self.nickname = null;
        self.gender = null;
        self.age = null;
        self.city = null;
        self.state = null;

        self.activeRoomId = null;
        self.activeQueueRoomId = null;

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
            banInfo = ban.checkIP(stream.remoteAddress, server.config.get('ban:salt'));

        if (banInfo.isBanned) {
            server.logger.warning('User ' + self.clientId + ' tried to connect with banned address ' + banInfo.digest);
            self.remote('setIsBanned', true);

            // Close the socket after data has been synced.
            setTimeout(function () {
                stream.disconnect();
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

    self.remote = function(functionName) {
        // Copy arguments to writeable array
        args = [];
        _.each(arguments, function(v) { args.push(v) });

        // Remove first arg
        args.shift()

        var fn = self.clientSideMethods[functionName];
        if(fn) {
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
