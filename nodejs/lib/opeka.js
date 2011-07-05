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
    opeka = {};


function Server(httpPort) {
  var self = this;
  self.httpPort = httpPort;

  // Create a simple server that responds via HTTP.
  self.server = require('http').createServer(function(req, response) {
    response.writeHead(200);
    response.write('Welcome to Opeka.');
    response.end();
  });
  self.server.listen(self.httpPort);

  // Initialise Now.js on our server object.
  self.everyone = nowjs.initialize(self.server);

  self.councellors = nowjs.getGroup('councellors');
  self.guests = nowjs.getGroup("guests");

  /**
   * This function is called by the client when he's ready to load the chat.
   *
   * This usually means after loading client-side templates and other
   * resources required for the safe operation of the chat.
   */
  self.everyone.now.clientReady = function (localUser, callback) {
    util.log(localUser.nickname + ' connected.');

    // Since we haven't implemented the backend yet, all users are added
    // to the guests group.
    self.guests.addUser(this.user.clientId);
    self.everyone.now.updateOnlineCount(self.guests.count, self.councellors.count);
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

