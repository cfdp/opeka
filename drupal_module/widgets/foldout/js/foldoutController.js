/**
 * Script for controlling the foldout chat window, to be embedded on client site
 * @todo: implement as Drupal behaviors
 */
(function($) {
  var opekaChatURL = opekaFoldoutBaseURL + "/opeka-widgets/foldout?client_url=" + opekaFoldoutClientURL;
  
  /* Check if there's any css files to add. The cssFiles global is initialized in embed.html */
  if (typeof opekaCssFiles !== 'undefined' && opekaCssFiles.length > 0) {
    // the array is defined and has at least one element
      $.each( opekaCssFiles, function( i, val ) {
        addOpekaFoldoutCss(opekaCssFiles[i][0], opekaCssFiles[i][1]);
      });
  }

  /* Add custom CSS file to HEAD */
  function addOpekaFoldoutCss(cssId, cssPath) {
    if (!document.getElementById(cssId)) {
        var head  = document.getElementsByTagName('head')[0];
        var link  = document.createElement('link');
        link.id   = cssId;
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = cssPath+cssId;
        link.media = 'all';
        head.appendChild(link);
    }
  };

  // Insert Iframe element
  $( opekaFoldoutLocation ).append( '<div class="opeka-chat-foldout-wrapper"><div id="opeka-chat-iframe"><iframe src="' + opekaChatURL + '" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" height="200"></iframe></div></div>' );

  /**
   * Foldout animation
   */
  $(".opeka-chat-foldout-wrapper").hover(
    function() {
      $(this).stop(true,true).animate({
        right: 0
      },200);
    },
    function() {
      $(this).stop(true,true).animate({
        right: -260
      },200);
    }
  );

/*  function foldoutController(foldoutAction) {
    if ( popupAction === "Activate") {
      // @todo: some effect
    else if (popupAction === "Deactivate") {
      // @todo: some effect
    }
  }*/

  /**
   * Receive activate or deactive messages from the iframe
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   */
/*  window.addEventListener("message", receiveMessage, false);

  function receiveMessage(event)
  {
    if (event.origin !== opekaFoldoutBaseURL) {
      console.log("Bad window");
      return;
    }
    else {
      foldoutController(event.data);
    }
  }*/
})(jQuery);