/**
 * @file
 * Opeka nowjs integration code for the frontend.
 */

(function ($) {

/**
 * Prepare the client, load templates, etc. 
 */
opeka.prepare = function () {
  // Load the template file for rendering data from the server.
  $.get(Drupal.settings.opeka.path + '/templates/frontend.tmpl.html', function(templates) {
    // Inject all the loaded templates at the end of the document.
    $('body').append(templates);

    // Replace the placeholder with the frontend status interface.
    $("#opeka-placeholder").replaceWith($("#opeka_frontend_status_tmpl").tmpl());

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
};

/**
 * When the connection to Now.js is set up, prepare ourselves.
 */
now.ready(function() {
  opeka.prepare();
});

})(jQuery);

