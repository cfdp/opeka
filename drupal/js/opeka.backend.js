/**
 * @file
 * Opeka nowjs integration code for the frontend.
 */
/*global now, Opeka */

(function ($) {
  "use strict";

  // Used to check if is admin.
  now.isAdmin = function () {}

/*
// Method used in order to print the final message when the chat room has been closed.
now.admin_finalMessage = function(finalMessage){
  $('#final-message').html(finalMessage);
  $('#final-message').dialog();
};


// Prepare the client, load templates, etc.
opeka.prepare = function () {
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
*/
}(jQuery));
