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

      // Disable the button to prevent multiple presses.
      $(this).attr("disabled", true);

      // Pass along the nickname the user entered.
      user.nickname = connectForm.find('#nickname').val().trim() || 'Anonym';

      // When the connect button is pressed, mark the client as ready.
      // When we're done setting up, let the server know.
      now.clientReady(user, function () {
        // Hide the connect interface.
        connectForm.fadeOut();

        // Show the chat interface.
        roomForm.fadeIn();
		roomForm.find('.delete-room').click(function (event) {
	      event.preventDefault();
		  var roomId = roomForm.find('#del-room').val().trim();
		  if (roomId){
			now.deleteRoom(roomId);
			$('#del-room').val('');
 		  }
	    });
	
	  $("#opeka-send-whisper-message").live('click', function (event) {
		var userid = $('#opeka-whisper-message-user').val().trim();
	    var message = $('#opeka-whisper-message').val().trim();

	    if (userid && message) {
	      now.whisper(userid, message);
		  $('#opeka-whisper-message-user').val('');
		  $('#opeka-whisper-message').val('');
	    }

	    event.preventDefault();
	  });
	

        // Trigger the hashChange event, so if the user came to the page
        // with a room in the URL, it opens now.
        $(window).trigger('hashchange');
      });

      event.preventDefault();
    });

    // Configure the create room interface.
    roomForm.find('.create-room').click(function (event) {
      // When the room is created, show the chat interface.
      now.createRoom(roomForm.find('#room-name').val(), roomForm.find('#room-size').val(), function (err, room) {
        if (room) {
          now.changeRoom(room.id);
          $.bbq.pushState({room: room.id});
        }
      });
	  $('#room-name').val('');
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

