/**
 * Helpers for user validation and authentication.
 */
"use strict";

var _ = require("underscore"),
util = require("util"),
drupal = require("drupal");

// Authenticate a user logging on to the chat server.
module.exports.authenticate = function (authData, callback) {
  // If the client claims he's logged in, validate that assertion.
  util.log("User authenticating, Drupal sid: " + authData.clientUser.sid);
  util.log("User authenticating, Drupal uid: " + authData.clientUser.uid);

  if (authData.clientUser.sid && authData.clientUser.uid) {
    // Validate the user's session.
    drupal.user.session_load(authData.clientUser.sid, function (err, session) {
      if (err) {
        util.log("Error: Could not load user session.");
        callback(err);
        return;
      }

      // Strict numerical comparison.
      if (parseInt(session.uid) !== parseInt(authData.clientUser.uid)) {
        throw 'Possible hacking attempt. sid/uid mismatch.';
      }

      // Load the user object from Drupal.
      drupal.user.load(session.uid, function (err, account) {
        if (err) {
          util.log("Error: Could not load user object.");
          callback(err);
          return;
        }
        drupal.user.access('administer opeka chat', account, function (err, isAdmin, permissions) {
          account.isAdmin = isAdmin;
          if (permissions) {
            account.permissions = permissions;
          }
          drupal.user.access('generate opeka chat ban codes', account, function (err, canGenerateBanCode) {
            account.canGenerateBanCode = canGenerateBanCode;
            drupal.user.access('pause opeka chat autoscroll', account, function (err, allowPauseAutoScroll) {
              account.allowPauseAutoScroll = allowPauseAutoScroll;
              drupal.user.access('hide typing message', account, function (err, hideTypingMessage) {
                account.hideTypingMessage = hideTypingMessage;
                drupal.user.access('access chat history', account, function (err, viewChatHistory) {
                  account.viewChatHistory = viewChatHistory;
                  callback(null, account);
                });
              });
            });
          });
        });
      });
    });
  }
  // @todo: Fix accessCode functionality
  else {
    var account = {};
    account.isAdmin = false;
    callback("There was an error validating credentials. Please contact support");
    return;
  }
};

// Filters the user data and remove personal/security sensitive data and
// create a new user object.
module.exports.filterData = function (client) {
  return {
    age: client.age,
    chatStartMin: client.chatStartMin,
    ChatEndMin: client.ChatEndMin,
    clientId: client.clientId,
    colorId: client.colorId,
    gender: client.gender,
    screening: client.screening,
    isAdmin: client.isAdmin,
    hideTypingMessage: client.hideTypingMessage,
    muted: client.muted,
    allowPauseAutoScroll: client.allowPauseAutoScroll,
    viewChatHistory: client.viewChatHistory,
    name: client.nickname || client.account.name,
    drupal_uid: client.drupal_uid,
    picture_path: client.picture_path,
    groupId: client.groupId
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
