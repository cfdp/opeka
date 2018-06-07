var shoe = require('shoe'),
    dnode = require('dnode');

/* global jQuery, Opeka, Drupal */

(function($) {
  Opeka.serverJSLoaded = true;
  $(function() {
    Opeka.initialize_from_drupal(shoe, dnode, Drupal.settings.opeka);
    var dnode_instance = Opeka.connect();
  });
})(jQuery);