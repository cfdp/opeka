/**
 * Helpers for user validation and authentication.
 */
"use strict";

var _ = require("underscore"),
    util = require("util"),
    drupal = require("drupal");

// Authenticate a user logging on to the chat server.
module.exports.authenticate = function (clientUser, accessCodeEnabled, accessCode, callback) {
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
          drupal.user.access('generate opeka chat ban codes', account, function (err, canGenerateBanCode) {
            account.canGenerateBanCode = canGenerateBanCode;
            callback(null, account);
          });
        });
      });
    });
  }
  // Otherwise, we need to check if the accessCode feature is enabled
  else {
    var account = {};
    account.isAdmin = false;

    // If the accessCode functionality is activated, make sure the right access code is given
    if (accessCodeEnabled === true && clientUser.accessCode !== accessCode) {
      callback(true);
      throw 'Wrong or no access code given on signIn form';
    }

    callback(null, account);
  }
};

// Filters the user data and remove personal/security sensitive data and
// create a new user object.
module.exports.filterData = function (client) {
  return {
    age: client.age,
    chatStart_Min: client.chatStart_Min,
    chatEnd_Min: client.chatEnd_Min,
    clientId: client.clientId,
    gender: client.gender,
    isAdmin: client.isAdmin,
    muted: client.muted,
    name: client.nickname || client.account.name
  };
};

// Send the user list of a room to client-side.
module.exports.sendUserList = function (context, roomId, users) {
  context.remote('receiveUserList', roomId, users);
};

// Send the active user object to a room.
module.exports.sendActiveUser = function (context, roomId, user) {
  context.remote('receiveActiveUser', roomId, user);
};
