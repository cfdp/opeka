/**
 * @file
 * Code for accessing drupal configuration
 */
"use strict";

var drupal = require("drupal"),
    PHPUnserialize = require('php-unserialize'),
    async = require("async"),
    _ = require("underscore");

module.exports.get_value = function (key, cb) {
    drupal.db.query(
        'SELECT value FROM variable WHERE name = ? LIMIT 0, 1',
        [key],
        function (err, result, fields) {
            if(err) { return cb(err); }
            if (result && result[0]) {
                var val = result[0].value !== null ?
                          PHPUnserialize.unserialize(
                            result[0].value.toString()
                          ) :
                          result[0].value;
                return cb(null, val);
            }
            cb("Drupal configuration for key " + key + "not found");
        }
    );
};

module.exports.load_multiple = function(keylist, cb) {
    var todo = {};
    _.each(keylist, function(key) {
        todo[key] = function(callback) {
            module.exports.get_value(key, callback);
        };
    });
    async.series(todo, cb);
};