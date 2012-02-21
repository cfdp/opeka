/**
 * @file
 * Opeka nowjs integration code for the frontend.
 */
/*global now, Opeka */

(function ($) {
  "use strict";

  // Recieve the user list from the server.
  now.receiveUserList = function (userlist){
    var userList = $("#chat-user-list");
    userList.find('.user').remove();

    if (userlist.length > 0) {
      userList.find('.placeholder').hide();
      $.each(userlist, function () {
        userList.append($("#opeka_user_list_item_tmpl").tmpl({
          user: this
        }));
      });
    } else {
      userList.find('.placeholder').show();
    }
  };

/*
// Method used in order to print the final message when the chat room has been closed.
now.admin_finalMessage = function(finalMessage){
  $('#final-message').html(finalMessage);
  $('#final-message').dialog();
};


// Recieve the room list from the server.
now.receiveRooms = function (rooms, roomOrder) {
  var public_roomList = $("#opeka-room-list");
  var private_roomList = $("#opeka-trial-room-list");
  var priv = false;
  var pub = false;
  opeka.rooms = rooms;

  public_roomList.find('.room').remove();
  private_roomList.find('.room').remove();

  if (roomOrder.length > 0) {
    public_roomList.find('.placeholder').hide();
    private_roomList.find('.placeholder').hide();
    $.each(roomOrder, function () {
      var roomId = this.toString();
      // Generate a list item with a link for each room.
      if (rooms[roomId].private) {
        if (!priv) {
          priv = true;
          private_roomList.append($("#opeka_room_list_item_tmpl").tmpl({
            roomUrl: $.param({room: roomId}),
            roomName: rooms[roomId].name
          }));
        } else if (!pub) {
          pub = true;
          public_roomList.append($("#opeka_room_list_item_tmpl").tmpl({
            roomUrl: $.param({room: roomId}),
            roomName: rooms[roomId].name
          }));
        }
      }
    });
  }
  else {
    public_roomList.find('.placeholder').show();
    private_roomList.find('.placeholder').show();
  }

  if (!priv) {
    private_roomList.find('.placeholder').show();
  }

  if (!pub) {
    public_roomList.find('.placeholder').show();
  }
};


// Prepare the client, load templates, etc.
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
    var backendWrapper = $("#opeka-backend"),
        connectForm = backendWrapper.find('.connect-interface'),
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
      var finalMessage = roomForm.find('#del-room-final-message').val().trim();
      if (roomId && finalMessage){
      now.deleteRoom(roomId, finalMessage);
      $('#del-room').val('');
      $('#del-room-final-message').val('');
      }
      });

        // Define function that has to be executed when the whisper button
      // is pressed
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

        // Define function that has to be executed when the kick button
      // is pressed
      $("#opeka-kick").live('click', function (event) {
      var userid = $('#opeka-kick-user').val().trim();
        var message = $('#opeka-kick-message').val().trim();

          if (userid && message) {
          now.kick(userid, message);
        $('#opeka-kick-user').val('');
        $('#opeka-kick-message').val('');
        }

          event.preventDefault();
      });


        // Define function that has to be executed when the delete message button
      // is pressed
      $("#opeka-delete").live('click', function (event) {
        var messageid = $('#opeka-delete-message').val().trim();

        if (messageid) {
          now.deleteMsg(messageid);
        $('#opeka-delete-message').val('');
        }

        event.preventDefault();
      });

        // Define function that has to be executed when the delete all messages button
      // is pressed
      $("#opeka-deleteall").live('click', function (event) {
        var clientid = $('#opeka-deleteall-messages').val().trim();

        if (clientid) {
          now.deleteAllMsg(clientid);
        $('#opeka-deleteall-messages').val('');
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
    var location = roomForm.find('#room-location').val();
    if (location === 'Any') { location = null; }
    if (location === 'Denmark') { location = ['Denmark']; }
    if (location === 'Scandinavia') { location = ['Sweden','Norway']; }

    now.createRoom(roomForm.find('#room-name').val(), roomForm.find('#room-size').val(), roomForm.find('#room_private_id').is(':checked'), location, function (err, room) {
      if (room) {
        now.changeRoom(room.id);
        $.bbq.pushState({room: room.id});
      }
    });

    $('#room-name').val('');
    event.preventDefault();
  });

  //configure the Bookmark List function
  $("#opeka-send-bookmark").live('click', function (event) {
  var message = $('#bookmark-list').val();

    if (opeka.activeRoomId && message) {
      now.sendMessageToRoom(opeka.activeRoomId, message);
    $('#opeka-chat-message').val('');
    }

    event.preventDefault();
  });

  //configure the pause interface
  $("#opeka-pause").live('click', function (event) {
    now.pause();
    event.preventDefault();
  });

  //configure the unpause interface
  $("#opeka-unpause").live('click', function (event) {
    now.unpause();
    event.preventDefault();
  });

  //configure the mute interface
  $("#opeka-mute").live('click', function (event) {
    var clientid = $('#opeka-mute-clientId').val().trim();

    if (clientid) {
      now.mute(clientid);
      $('#opeka-mute-clientId').val('');
    }

    event.preventDefault();
  });

  //configure the unmute interface
  $("#opeka-unmute").live('click', function (event) {
    var clientid = $('#opeka-unmute-clientId').val().trim();

    if (clientid) {
      now.unmute(clientid);
      $('#opeka-unmute-clientId').val('');
    }

    event.preventDefault();
  });


  });
};

// When the connection to Now.js is set up, prepare ourselves.
now.ready(function() {
  opeka.prepare();
});
*/
}(jQuery));
