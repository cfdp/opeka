var shoe = require('shoe'),
    dnode = require('dnode');

/* global jQuery, Opeka, Drupal */

(function($) {
  Opeka.serverJSLoaded = true;
  $(function() {

    Opeka.numReconnects = 0;
    var maxReconnects = Drupal.settings.opeka.reconnect ? (Drupal.settings.opeka.max_reconnects || 10) : false,
      reconnectInterval = Drupal.settings.opeka.reconnect_interval || 5000,
      disconnectLimit = reconnectInterval * maxReconnects,
      checkOnlineTimerId = null;

    connect();

    function connect(){
      var server_url = Drupal.settings.opeka.dnode_endpoint ||
        'http://localhost:3000/opeka';
      var stream = shoe(server_url);
      var d = dnode(Opeka.clientSideMethods);
      d.on("remote", Opeka.onConnect);
      d.on("end", (maxReconnects && Opeka.numReconnects < maxReconnects) ? reconnect : Opeka.onDisconnect);
      d.pipe(stream).pipe(d);
      // Fallback checking if we are really connected to the server
      if (Drupal.settings.opeka.reconnect) {
        if (checkOnlineTimerId) {
          clearInterval(checkOnlineTimerId);
        }
        checkOnlineTimerId = window.setInterval(checkOnlineState, reconnectInterval);
      }
    }

    function reconnect() {
      console.log('Reconnecting ' + (++Opeka.numReconnects));
      Opeka.onReconnect();
      setTimeout(connect, reconnectInterval);
    }

    function checkOnlineState() {
      var currentTime = (new Date()).getTime();
      var delay = currentTime - Opeka.lastPingreceived;

      if (delay > disconnectLimit) {
        console.warn('No connection to server, show fatal error dialog.');
        clearInterval(checkOnlineTimerId);
        Opeka.onDisconnect();
      }
      else if (delay > reconnectInterval) {
        Opeka.onReconnect();
      }
    }
  });
})(jQuery);
