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
  self.councellorCount = 0;
  self.userCount = 0;

  // Create a simple server that responds via HTTP.
  self.server = require('http').createServer(function(req, response) {
    response.writeHead(200);
    response.write('Welcome to Opeka.');
    response.end();
  });
  self.server.listen(self.httpPort);

  // Initialise Now.js on our server object.
  var everyone = nowjs.initialize(self.server);

  /**
   * This function is called by the client when he's ready to load the chat.
   *
   * This usually means after loading client-side templates and other
   * resources required for the safe operation of the chat.
   */
  everyone.now.clientReady = function (localUser, callback) {
    util.log(localUser.nickname + ' connected.');

    // When user joins, increment our counter and let the clients know.
    // (councellors not implemented yet).
    self.userCount += 1;
    everyone.now.updateOnlineCount(self.userCount, self.councellorCount);
  };

  /**
   * When a client disconnects, we need to clean up after him.
   *
   * This includes closing open chats, letting others know he was
   * disconnected, etc.
   */
  everyone.on("disconnect", function () {
    // When user disconnects, update the counts.
    self.userCount -= 1;
    everyone.now.updateOnlineCount(self.userCount, self.councellorCount);
  });
}

module.exports = opeka;
module.exports.Server = Server;

