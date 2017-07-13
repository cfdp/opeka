var shoe = require('shoe'),
    dnode = require('dnode');

/* global jQuery, Opeka, Drupal */

(function($) {
  Opeka.serverJSLoaded = true;
  $(function() {

    Opeka.numReconnects = 0;
    var maxReconnects = Drupal.settings.opeka.reconnect ? (Drupal.settings.opeka.max_reconnects || 10) : false;

    connect();

    function connect(){
      var server_url = Drupal.settings.opeka.dnode_endpoint ||
        'http://localhost:3000/opeka';
      var stream = shoe(server_url);
      var d = dnode(Opeka.clientSideMethods);
      d.on("remote", Opeka.onConnect);
      d.on("end", (maxReconnects && Opeka.numReconnects < maxReconnects) ? reconnect : Opeka.onDisconnect);
      d.pipe(stream).pipe(d);
    }

    function reconnect() {
      console.log('Reconnecting ' + (++Opeka.numReconnects));
      Opeka.onReconnect();
      setTimeout(connect, Drupal.settings.opeka.reconnect_interval || 2000);
    }
  });
})(jQuery);
