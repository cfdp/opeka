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
  $.get(Drupal.settings.opeka.path + '/templates/backend.tmpl.html', function(templates) {
    // Inject all the loaded templates at the end of the document.
    $('body').append(templates);

    // Replace the placeholder with the backend interface.
    $("#opeka-placeholder").replaceWith($("#opeka_backend_tmpl").tmpl());

    // When we're done setting up, let the server know.
    now.clientReady(Drupal.settings.opeka.user, function () {
      $(window).trigger('opekaBackendReady');
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

