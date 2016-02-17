/**
 * Script for controlling the popup chat window
 * @todo: implement with parameter like foldoutController.js and as Drupal behaviors
 */

(function($) {
  var opekaChatURL = opekaPopupBaseURL + "/opeka-widgets/popup?client_url=" + opekaPopupClientURL;
  
  /* Check if there's any css files to add. The cssFiles global is initialized in embed.html */
  if (typeof opekaCssFiles !== 'undefined' && opekaCssFiles.length > 0) {
    // the array is defined and has at least one element
      $.each( opekaCssFiles, function( i, val ) {
        addOpekaPopupCss(opekaCssFiles[i][0], opekaCssFiles[i][1]);
      });
  }

  /* Add custom CSS file to HEAD */
  function addOpekaPopupCss(cssId, cssPath) {
    if (!document.getElementById(cssId))
    {
        var head  = document.getElementsByTagName('head')[0];
        var link  = document.createElement('link');
        link.id   = cssId;
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = opekaPopupBaseURL+cssPath+cssId;
        link.media = 'all';
        head.appendChild(link);
    }
  };

  // Insert Iframe element
  $( opekaPopupLocation ).append( '<div class="opeka-chat-popup-wrapper"><div id="opeka-chat-iframe"><iframe src="' + opekaChatURL + '" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" height="200"></iframe></div></div>' );

  // Add close button
  $( "#opeka-chat-iframe" ).prepend( "<button class='close opeka-chat-popup'>&times;</button>" );

  $(".opeka-chat-popup").click(function() {
    $("#opeka-chat-iframe").hide();
  });

  /**
   * RIGHT SIDE TAB POPUP ANIMATION
   */
  function popupController(popupAction){
    var pop_exp_w = 10;
    var pop_shr_w = -342;

    if ( popupAction === "Activate") {
      $("#opeka-chat-iframe").show();
      $("#opeka-chat-iframe").animate({
          right: pop_exp_w
        },1000);
      $(".opeka-chat-popup-wrapper").animate({
          width: 360
        },1000);
      }
    else if (popupAction === "Deactivate") {
      $("#opeka-chat-iframe").animate({
        right: pop_shr_w
      },1000);
      $(".opeka-chat-popup-wrapper").animate({
        width: 0
      },1000);
    }
  }

  /**
   * Receive activate or deactive messages from the iframe
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   */
  window.addEventListener("message", receiveMessage, false);

  function receiveMessage(event)
  {
    if (event.origin !== opekaPopupBaseURL) {
      console.log("Bad window");
      return;
    }
    else {
      popupController(event.data);
    }
  }
})(jQuery);