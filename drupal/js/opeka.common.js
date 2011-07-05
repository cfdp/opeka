/**
 * @file
 * Opeka nowjs integration code shared between backend and frontend.
 */

var opeka = {};

(function ($) {
  /**
   * For when the server updates the online counts.
   */
  now.updateOnlineCount = function (users, councellors) {
    $('#opeka-online-status')
      .find('.users').text(users).end()
      .find('.councellors').text(councellors).end();
  }
})(jQuery);

