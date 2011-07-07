/**
 * Helpers for user validation and authentication.
 */

var drupal = require("drupal");

/**
 * Validate that the user sesion is valid and matches the uid provided.
 */
function validate_session(uid, sid, callback) {
}

/**
 * Authenticate a user logging on to the chat server.
 */
function authenticate(clientUser, callback) {
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
    account = {};
    account.isAdmin = false;

    callback(null, account);
  }
}

module.exports = {
  authenticate: authenticate
}

