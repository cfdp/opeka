/**
 * Created by jubk on 5/20/15.
 */

var _ = require("underscore"),
    Groups = {},
    clients = {},
    registeredGroups = {},
    everyone;


/****************************************************************
 * Group class                                                  *
 ****************************************************************/

/**
 * Represents a group
 * @param name - the name of the group
 * @constructor
 */
Group = function(name) {
    var self = this;

    self.construct = function() {
        self.name = name;
        self.serverMethods = {};
        self.members = {};

        return self;
    };

    /**
     * Add a user to a group
     * @param clientId - the client id of the user to add
     * @returns {boolean} - true if successful, false otherwise
     */
    self.addUser = function(clientId) {
        if(clients[clientId]) {
            self.members[clientId] = true;
            return true;
        }

        return false;
    };

    /**
     * Remove a user from a group
     * @param clientId - the client id of the user to remove
     * @returns {boolean} - true if successful, false otherwise
     */
    self.removeUser = function(clientId) {
        return (delete self.members[clientId] || false);
    };

    /**
     * Get the client specified by the client Id. Will return
     * @param clientId -
     * @returns {*} - will return null if the client is not part of the
     *                or if the client has been unregistered
     */
    self.getClient = function(clientId) {
        if(self.members[clientId]) {
            return clients[clientId];
        } else {
            return null;
        }
    };

    /**
     * Adds a server-side method to the group
     * @param name - the name of the method
     * @param fn - a function representing the method
     */
    self.addServerMethod = function(name, fn) {
        self.serverMethods[name] = fn;
    };

    /**
     * Run the remote method specified by the funtionName on all members of the group
     * @param {string} methodName - the method to be called at the remote end
     * @param [...] arguments to be passed to the remote method
     */
    self.remote = function(methodName) {
        var args = arguments;
        // Loop through member clientIds, fetch the client for each one
        // and call the method on the client object.
        _.each(_.keys(this.members), function(clientId) {
            var client = self.getClient(clientId);
            if(client) {
                client.remote.apply(client, args);
            }
        });
    };

    self.count = function(callback) {
        var count = 0;
        _.each(self.members, function(v) {
            if(v) {
                count++
            }
        });
        callback(count);
    }

    self.hasClient = function(clientId, callback) {
        var result = self.members[clientId] ? true : false;
        callback(result);
        return result;
    }

    return self.construct();
};

/**
 * Fetches the group specified by the given name, or creates a new empty one and returns that.
 * @param {string} name
 * @returns {Group}
 */
Groups.getGroup = function(name) {
    if(!name) {
        throw(new Error("You must specify a name when creating a group"))
    }
    var group = registeredGroups[name];
    if(!group) {
        group = new Group(name);
        registeredGroups[name] = group;
    }
    return group;
};

// Create the everyone group that all active clients will be member of
everyone = Groups.getGroup("everyone");


/**
 * Register a client and add it to the everyone group
 * @param client
 */
Groups.registerClient = function(client) {
    clients[client.clientId] = client;
    Groups.buildServerSideAPI(client);
    everyone.addUser(client.clientId);
};

/**
 * Gets a client by id
 * @param clientId - the id of the client
 * @returns {*} - returns null if the specified client is not found
 */
Groups.getClient = function(clientId) {
    return clientId ? clients[clientId] : null;
};

/**
 * Unregister a client and remove it from all groups
 * @param client
 */
Groups.unregisterClient = function(client) {
    var id = client.clientId;
    delete clients[id];
    _.each(_.values(registeredGroups), function(g) {
        g.removeUser(id);
    });
};

/**
 * Builds the set of methods that are to be remotely exposed to clients.
 * @param client
 *
 * Ensures that methods will be called with the client object as "this" and
 * that the client does not access methods that they do not have access to.
 */
Groups.buildServerSideAPI = function(client) {
    var methods = client.serverSideMethods;
    _.each(_.values(registeredGroups), function(grp) {
        if(grp.name === "everyone") {
            // Methods available for everyone does not need to be validated
            _.each(grp.serverMethods, function(fn, name) {
                methods[name] = function() { fn.apply(client, arguments) };
            })
        } else {
            _.each(grp.serverMethods, function(fn, name) {
                methods[name] = function() {
                    if(!grp.getClient(client.clientId)) {
                        client.remote(
                            'displayError',
                            "You do not have permission to access to the method '" + name + "'"
                        );
                        return;
                    }
                    fn.apply(client, arguments)
                };
            })
        }
    });
};

module.exports = Groups;