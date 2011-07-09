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
    $("#opeka-placeholder").replaceWith($("#opeka_backend_tmpl").tmpl({
      user: Drupal.settings.opeka.user
    }));

    // Set up the admin interface.
    var backendWrapper = $("#opeka-backend");
        connectForm = backendWrapper.find('.connect-interface');
        roomForm = backendWrapper.find('.online-interface');

    // Configure the connect button click event to make os ready to chat.
    connectForm.find('.connect').click(function (event) {
      var user = Drupal.settings.opeka.user;

      $(this).attr("disabled", true);

      // Pass along the nickname the user entered.
      user.nickname = connectForm.find('#nickname').val();

      // When the connect button is pressed, mark the client as ready.
      // When we're done setting up, let the server know.
      now.clientReady(Drupal.settings.opeka.user, function () {
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

    // Configure the create room interface.
    roomForm.find('button').click(function (event) {
      // When the room is created, show the chat interface.
      now.createRoom(roomForm.find('#room-name').val(), null, function (err, room) {
        if (room) {
          now.changeRoom(room.id);
          $.bbq.pushState({room: room.id});
        }
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

