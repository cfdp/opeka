/**
 * @file
 * Code for managing chat invites.
 */
"use strict";

var _ = require('underscore'),
  logger = require('./loginit'),
  drupal = require("drupal"),
  format = require('date-format'),
  PHPUnserialize = require('php-unserialize'),
  opeka = {
    user: require("./user"),
    groups: require("./groups"),
  },
  inviteList = {};


// The main invite object.
var Invite = function (data) {
  var self = this;

  self.construct = function () {
    for (var key in data) {
      self[key] = data[key];
    }

    self.id = self.iid;

    logger.info('Invite returned: ' + self.name);

    return self;
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.iid,
      name: self.name,
      time: self.time,
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
          logger.info('Invite added to list: ' + row.name);
        });
      }
    });
  };

  return self.construct();
};

// Provide a list of invites for the client.
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
  drupal.db.query('SELECT * FROM opeka_invite', [], function (err, result, fields) {
    if (result) {
      result.forEach(function (row) {
        logger.info('Invite loaded to list: ' + row.name);
        inviteList[row.token] = new Invite(row);
      });
    }
    scheduleCleanUp();
  });
};

var scheduleCleanUp = function () {
  drupal.db.query("SELECT value FROM variable WHERE name = 'opeka_invite_expire'", [], function (err, result, fields) {
    if (result) {
      result.forEach(function (row) {
        var interval = parseInt(PHPUnserialize.unserialize(row.value));
        if (interval) {
          var threshold = Math.floor(Date.now() / 1000) - interval * 3600;
          var toDelete = [], inviteId;
          _.each(inviteList, function (invite, token) {
            if (invite.time < threshold) {
              inviteId = invite.id;
              toDelete.push(inviteId);
              logger.info('Invite', inviteId, 'is marked for deletion (scheduled for ' + format('dd/MM/yyyy hh:mm', new Date(invite.time * 1000)) + ')');
              delete(inviteList[token]);
              opeka.groups.getGroup('councellors').remote('inviteCancelled', inviteId);
            }
          });
          if (toDelete.length) {
            drupal.db.query("DELETE FROM opeka_invite WHERE iid IN (?)", [toDelete], function (err, result, fields) {
              logger.info('Deleted invites from database:', toDelete.join(', '));
            });
          }
        }
      });
    }
  });
  // Re-check every 30 minutes.
  setTimeout(scheduleCleanUp, 1800000);
};

module.exports = {
  Invite: Invite,
  list: inviteList,
  clientData: clientData,
  loadAll: loadAll,
  scheduleCleanUp: scheduleCleanUp
};
