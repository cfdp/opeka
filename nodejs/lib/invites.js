/**
 * @file
 * Code for managing chat queues.
 */
"use strict";

var _ = require('underscore'),
  uuid = require('node-uuid'),
  util = require("util"),
  drupal = require("drupal"),
  format = require('date-format'),
  opeka = {
    user: require("./user"),
  },
  inviteList = {};


// The main queue object.
var Invite = function (data) {
  var self = this;

  self.construct = function () {
    for (var key in data) {
      self[key] = data[key];
    }

    self.id = self.iid;

    util.log('Invite returned: ' + self.name);

    return self;
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.iid,
      name: self.name,
      time: format('dd/MM/yyyy hh:mm', new Date(self.time * 1000)),
      invitee: self.invitee,
      email: self.email,
      counselor: self.counselor,
      comment: self.comment,
      status: self.status,
    };
  };

  self.addToList = function () {
    drupal.db.query('SELECT * FROM opeka_invite WHERE iid = ? LIMIT 0, 1', [self.id], function (err, result, fields) {
      if (result) {
        result.forEach(function (row) {
          inviteList[row.token] = new Invite(row);
          util.log('Invite added to list: ' + row.name);
        });
      }
    });
  };

  return self.construct();
};

// Provide a list of queues for the client.
var clientData = function () {
  var invites = _.map(inviteList, function (invite) {
    return invite.clientData();
  });

  invites = _.sortBy(invites, function (invite) {
    return invite.time;
  });

  return invites;
};

var loadAll = function () {
  drupal.db.query('SELECT * FROM opeka_invite WHERE time > UNIX_TIMESTAMP() - 60 *60 * 24', [], function (err, result, fields) {
    if (result) {
      result.forEach(function (row) {
        util.log('Invite loaded to list: ' + row.name);
        inviteList[row.token] = new Invite(row);
      });
    }
  });
};

module.exports = {
  Invite: Invite,
  list: inviteList,
  clientData: clientData,
  loadAll: loadAll
};
