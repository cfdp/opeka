/**
 * @file
 * Code for managing user reports.
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
  reportList = {};


// The main report object.
var Report = function (data) {
  var self = this;

  self.construct = function () {
    for (var key in data) {
      self[key] = data[key];
    }

    self.id = self.rid;

    logger.info('Reports returned: ' + self.id);

    return self;
  };

  // Return the current group metadata in an object that is safe to send
  // to the client side.
  self.clientData = function () {
    return {
      id: self.rid,
      name: self.name,
      time: self.time,
      counselor_name: self.counselor_name,
      client_alias: self.client_alias,
      comment: self.comment,
      status: self.status,
    };
  };

  self.saveIPandUserAgent = function (callback) {
    drupal.db.query('SHOW TABLES LIKE ?', ['opeka_report_user'], function (err, result) {
      var reportedClient,
          loginTime,
          ip, 
          agent,
          remotePort;

      if (result) {
        reportedClient = opeka.groups.getClient(self.client_id);

        // @todo: check if the ip updates after a reconnect!
        if (!reportedClient || !reportedClient.connectionData) {
          callback('Could not save user report: The reported client could not be found on the server!');
        }
        ip = reportedClient.connectionData.ip || null;
        agent = reportedClient.connectionData.agent || null;
        remotePort = reportedClient.connectionData.remotePort || null;
        loginTime = reportedClient.chatStartMin*60 || null;

        saveData(self.id, ip, agent, remotePort, loginTime, function(err, result) {
          if (err) {
            callback(err);
            return;
          }
          callback(null, result);
        });
      }
      else {
        callback(err);
      }
    });
  };

  return self.construct();
};

// Provide a list of Reports for the client.
var clientData = function () {
  var reports = _.map(ReportList, function (report) {
    return report.clientData();
  });

  reports = _.sortBy(reports, function (report) {
    return report.time;
  });

  return reports;
};

// Add the chat duration to the database.
var saveData = function (id, ip, userAgent, remotePort, loginTime, callback) {
  drupal.db.query('UPDATE opeka_report_user SET ip_address = ?, user_agent = ?, remote_port = ?, login_dates = ? WHERE rid = ?', [ip, userAgent, remotePort, loginTime, id], function (err, result) {
    if (result) {
      logger.info('Report user: Saved additional client data to DB.');
      callback(null, result);
    }
    else {
      callback(err);
    }
  });
}


module.exports = {
  Report: Report,
  list: reportList,
  clientData: clientData,
};
