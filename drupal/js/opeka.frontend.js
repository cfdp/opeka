/**
 * @file
 * Opeka nowjs integration code for the frontend.
 */

var opeka = {};

/**
 * When the connection to Now.js is set up, report ourselves ready.
 */
now.ready(function() {
  // Hardcoded for testing purposes.
  var clientData = {
    nickname: 'Otto Testenheimer',
    age: 24,
    gender: 'female'
  }

  // When we're done setting up, let the server know.
  now.clientReady(clientData, function () {
    $(window).trigger('opekaFrontendReady');
  });
});

