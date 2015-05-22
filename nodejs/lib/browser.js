var shoe = require('shoe'),
    dnode = require('dnode');

/* global jQuery, Opeka, Drupal */

(function($) {
    $(function() {
        var server_url = Drupal.settings.opeka.dnode_endpoint ||
                         'http://localhost:3000/opeka';
        var stream = shoe(server_url);
        var d = dnode(Opeka.clientSideMethods);
        d.on("remote", function(remote) { Opeka.remote = remote; });
        d.pipe(stream).pipe(d);
    });
})(jQuery);