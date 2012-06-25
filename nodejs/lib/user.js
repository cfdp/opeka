/**
 * Helpers for user validation and authentication.
 */
"use strict";

var _ = require("underscore"),
    drupal = require("drupal");

// Authenticate a user logging on to the chat server.
module.exports.authenticate = function (clientUser, callback) {
  // If the client claims he's logged in, validate that assertion.
  if (clientUser.sid && clientUser.uid) {
    // Validate the user's session.
    drupal.user.session_load(clientUser.sid, function (err, session) {
      if (err) { callback(err); }

      if (session.uid !== clientUser.uid) {
        throw 'Possible hacking attempt. sid/uid mismatch.';
      }

      // Load the user object from Drupal.
      drupal.user.load(session.uid, function (err, account) {
        if (err) { callback(err); }
        drupal.user.access('administer opeka chat', account, function (err, isAdmin) {
          account.isAdmin = isAdmin;
          callback(null, account);
        });
      });
    });
  }
  // Otherwise, there's little to authenticate.
  else {
    var account = {};
    account.isAdmin = false;

    callback(null, account);
  }
};

// Filters the user data and remove personal/security sensitive data and
// create and new user object.
module.exports.filterData = function (user) {
  return {
    age: user.age,
    clientId: user.clientId,
    gender: user.gender,
    isAdmin: user.isAdmin,
    muted: user.muted,
    name: user.nickname || user.account.name
  };
};

// Send the user list of a room to client-side.
module.exports.sendUserList = function (context, roomId, users) {
  context.now.receiveUserList(roomId, users);
};

// Send the active user object to a room.
module.exports.sendActiveUser = function (context, roomId, user) {
  context.now.receiveActiveUser(roomId, user);
};
