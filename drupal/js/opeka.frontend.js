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
    $("#opeka-placeholder").replaceWith($("#opeka_frontend_tmpl").tmpl());

    // Set up the admin interface.
    var frontendWrapper = $("#opeka-frontend");
        connectForm = frontendWrapper.find('.connect-interface');
        roomForm = frontendWrapper.find('.online-interface');

    // Configure the connect button click event to make os ready to chat.
    connectForm.find('.connect').click(function (event) {
      var clientData = {};

      // Disable the button to prevent multiple presses.
      $(this).attr("disabled", true);

      // Pass along the nickname the user entered.
	  clientData.nickname = connectForm.find('#nickname').val().trim() || 'Anonym';
	  clientData.age = connectForm.find('#age').val().trim() || '0';
	  clientData.gender = connectForm.find('#gender').val() || 'N';

      // When the connect button is pressed, mark the client as ready.
      // When we're done setting up, let the server know.
      now.clientReady(clientData, function () {
        // Hide the connect interface.
        connectForm.fadeOut();

        // Show the chat interface.
        roomForm.fadeIn();

        // Trigger the hashChange event, so if the user came to the page
        // with a room in the URL, it opens now.
        $(window).trigger('hashchange');
      });

      event.preventDefault();
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

