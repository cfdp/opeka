/**
 * @file
 * Opeka nowjs integration code shared between backend and frontend.
 */

var opeka = {};

(function ($) {
  /**
   * For when the server updates the online counts.
   */
  now.updateOnlineCount = function (guests, councellors) {
    $('#opeka-online-status')
      .find('.guests').text(guests).end()
      .find('.councellors').text(councellors).end();
  }
})(jQuery);

