// Getting the basic connection parameters from the URL
opekaGetURLParameter = function (name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

var opekaBaseURL = opekaGetURLParameter("base_url") || "http://dev.demo"; // @todo: use drupal js settings
var opekaPort = opekaGetURLParameter("port") || "3000"; // @todo: use drupal js settings
var opekaClientURL = opekaGetURLParameter("client_url") || null; // used for popup widget

(function ($, Drupal, undefined) {

  var poll;
  var timeout = 50; // 5 seconds timeout

  /**
   * Testing if now.js script is being loaded - if not, stop trying
   */
  poll = function () {
    setTimeout(function () {
      timeout--;
      if (typeof now !== 'undefined') {
        // External source now.js loaded, time to load the chat status
        var chatstatus_script = document.createElement("script");
        chatstatus_script.type = "text/javascript";
        // @todo: use drupal js settings base_url
        chatstatus_script.src = "/sites/all/modules/custom/opeka/widgets/js/chatstatus.js";
        document.body.appendChild(chatstatus_script);
        return;
      }
      else if (timeout > 0) {
        poll();
        $('body').removeClass('chat-closed chat-open').addClass('chat-busy');
        $('.status-tab').text(Drupal.t("Fetching status..."));
        $('.login-button .chat').text(Drupal.t("Start chat"));
      }
      else {
        // External source now.js failed to load, stop trying...
        $('body').removeClass('chat-busy chat-open').addClass('chat-closed');
        $('.status-tab').text(Drupal.t("The chat is closed"));
        window.stop();
        console.log(Drupal.t("now.js could not be loaded. Check if the Node server is running and verify port number."));
        return;
      }
    }, 50);
  };

  poll();

  // Appending the now.js script to the DOM
  $(document).ready(function() {
    var now_script = document.createElement("script");
    now_script.type = "text/javascript";
    now_script.src = opekaBaseURL + ":" + opekaPort + "/nowjs/now.js";
    document.body.appendChild(now_script);
  });

})(jQuery, Drupal);