// Handles baning of users.
"use strict";

var crypto = require("crypto"),
    drupal = require("drupal");

// In-memory cache of current bans.
var bans = {};

// Check if an IP adress is banned.
module.exports.checkIP = function (ip, salt) {
  var shasum = crypto.createHash('sha512');

  shasum.update(salt, 'utf-8');
  shasum.update(ip, 'utf-8');

  var digest = shasum.digest('hex');

  return {
    digest: digest,
    isBanned: !!bans[digest],
  };
};

// Load all current bans from the database.
module.exports.loadAll = function () {
  drupal.db.query('SELECT ip_hash FROM opeka_bans WHERE expiry IS NULL OR expiry > UNIX_TIMESTAMP()', [], function (err, result, fields) {
    result.forEach(function (row) {
      bans[row.ip_hash] = true;
    });
  });
};
