var Opeka = Opeka || {};

(function (Drupal, Opeka, $, undefined) {
  
  Drupal.behaviors.opeka = {
    attach: function (context, settings) {
      // Setting the variables
      var chatStatus = {},
          io_socket = null,
          opekaClientURL = Drupal.settings.opeka.client_url || null,
          opekaBaseURL = location.protocol + '//' + location.hostname || "https://localhost:3000",
          pairChatName = Drupal.settings.opeka.pair_chat_name || Drupal.t("The 1-to-1 chat"),
          groupChatName = Drupal.settings.opeka.group_chat_name || Drupal.t("The group chat"),
          pairChatRoomListEntry = Drupal.settings.opeka.pairchat_room_list_entry || false,
          textStrings = {
            buttonAvailable : Drupal.t("The chat is open"),
            buttonOccupied : Drupal.t("The chat is occupied"),
            buttonClosed : Drupal.t("The chat is closed"),
            buttonError : Drupal.t("Error connecting."),
            statusFetching : Drupal.t("Connecting..."),
            statusClosed_pair : Drupal.t('@pairChatName is closed', {'@pairChatName': pairChatName}),
            statusClosed_group : Drupal.t('@groupChatName is closed', {'@groupChatName': groupChatName}),
            statusError : Drupal.t("Error: no connection to server."),
            statusOccupied_pair: Drupal.t("@pairChatName is occupied", {'@pairChatName': pairChatName}),
            statusOccupied_group : Drupal.t('@groupChatName is occupied', {'@groupChatName': groupChatName}),
            statusAvailable_pair: Drupal.t("@pairChatName is available", {'@pairChatName': pairChatName}),
            statusAvailable_group : Drupal.t('@groupChatName is available', {'@groupChatName': groupChatName}),
          };
      io_url = Drupal.settings.opeka.socket_io_url || 'https://localhost:3000/opeka';
      
      io_socket = io(io_url, {'reconnection': false});

      // The following callback is called by the server in order to
      // advertise its status.
      io_socket.on("chat_status", function(data) {
        chatStatus = data;
        $(window).trigger('opekaChatStatusUpdate', data);
      });

      // When the DOM is ready, set up the widget.
      $(function () {
        var statusTab = $('.status-tab'),
            chatButton = $('.login-button .chat'),
            chatLink = false,
            body = $('body'),
            roomType = "all",
            closeBtn = $(".opeka-chat-popup.close");

        // The group or pair class is added to the body tag by requesting the widget URL and appending e.g. /group at the end
        // e.g. https://demo.curachat.com/opeka-widgets/header/group
        if (body.hasClass("group")) {
          roomType = "group";
        }
        else if (body.hasClass("pair")) {
          roomType = "pair";
        }
        // Send close iframe message to parent window when button is clicked
        closeBtn.on( "click",  function() {
          var closeMsg = roomType+"-CloseIframe";
          opekaChatPopup(closeMsg);
        });
        
        // Set the temporary status text
        statusTab.text(textStrings.statusFetching);
        chatButton.text(textStrings.statusFetching);

        // Update status text if no connection could be made to server after 10 sec
        function checkConnection(){
          if (!io_socket.connected) {
            console.warn('Error: No connection to Opeka chat server');
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusError);
            chatButton.text(textStrings.buttonError);
          }
        }
        setTimeout( checkConnection, 10000 );
        
        // Updates the actual status text.
        var updateDisplay = function (attributes) {
         //For debugging set debugchat to true...
          var debugchat = false;
          if (debugchat) {
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusClosed);
            chatButton.text(textStrings.buttonClosed);
            chatLink = false;
            return;
          }
          console.log('roomtype ', roomType);
          switch(roomType) {
            case "pair":
              // If chat is open and there are available one-to-one rooms (chat open).
              if (chatStatus.chatOpen && chatStatus.rooms && chatStatus.rooms.pair.active > 0) {
                body.removeClass('chat-closed chat-busy').addClass('chat-open');
                statusTab.text(textStrings.statusAvailable_pair);
                chatLink = true;
                chatButton.text(textStrings.buttonAvailable);
                opekaChatPopup(roomType+"-Open");
              }
              else {
                calculatePassiveState();
              }
              break;
            // If chat is open and there are available group rooms (chat open).
            case "group":
              if (chatStatus.chatOpen && chatStatus.roomsList && chatStatus.roomsList.length && chatStatus.rooms.group.full == 0) {
                body.removeClass('chat-closed chat-busy').addClass('chat-open');
                statusTab.text(textStrings.statusAvailable_group);
                chatLink = true;
                chatButton.text(textStrings.buttonAvailable);
                opekaChatPopup(roomType+"-Open");
              }
              else {
                calculatePassiveState();
              }
              break;
            case "all":
              // If chat is open and there are available rooms of any kind (chat open).
              if (chatStatus.chatOpen && chatStatus.rooms && chatStatus.rooms.total.active > 0) {
                console.log('all');
                body.removeClass('chat-closed chat-busy').addClass('chat-open');
                statusTab.text(textStrings.statusAvailable_group);
                chatLink = true;
                chatButton.text(textStrings.buttonAvailable);
                opekaChatPopup(roomType+"-Open");
              }
              else {
                calculatePassiveState();
              }
            }
         };

        // When the document is ready, update the status, and bind the event
        // to have it update automatically later.
        $(window).on('opekaChatStatusUpdate', updateDisplay);
        
        /* Figure out the exact passive state of the chat and set properties */
        function calculatePassiveState() {
          // The chat app is not initialized yet
          if ($.isEmptyObject(chatStatus)) {
            body.removeClass('chat-closed chat-open').addClass('chat-busy');
            statusTab.text(textStrings.statusFetching);
            chatLink = false;
            chatButton.text(textStrings.buttonOccupied);
          }
          // If not, it might be busy? Check if chat app is turned on (chat busy).
          else if (chatStatus.chatOpen) {
            body.removeClass('chat-closed chat-open').addClass('chat-busy');
            statusTab.text(textStrings["statusOccupied_"+roomType]);
            chatLink = false;
            chatButton.text(textStrings.buttonOccupied);
            opekaChatPopup(roomType+"-Occupied");
          }
          // The chat app not turned on or is not initialized / unreachable.
          else if (chatStatus === 'undefined' || !chatStatus.chatOpen){
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings["statusClosed_"+roomType]);
            chatLink = false;
            chatButton.text(textStrings.buttonClosed);
            opekaChatPopup(roomType+"-Closed");
          }
          // If all fails - probably the server is down...
          else {
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusError);
            chatLink = false;
            chatButton.text(textStrings.buttonError);
            opekaChatPopup(roomType+"-Closed");
            console.warn('Opeka chat app error. Server might be down. chatStatus: ', chatStatus);
          }
        }

        // When the user clicks the button (and a chat room is vacant), ask the chat server to join a room.
        chatButton.click(function () {
          // If chatLink is false, the chat isn't ready and no link is provided
          if (!chatLink) {
            return;
          }

          var w = window.open(opekaBaseURL+'/opeka');

          if (pairChatRoomListEntry) {
            roomType = "pair-room-list-entry"
          }
          switch(roomType) {
            case "pair":
              io_socket.emit("getDirectSignInURL", roomType, function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(err, "/opeka" + result.substr(result.indexOf("#")));
                }
              });
              break;
            case "pair-room-list-entry":
            case "all":
            case "group":
              w.location = chatStatus.chatPageURL;
              break;
           }

          var callback = function(err, signInURL) {
            if (err) {
              console.warn('Opeka error: ' + err);
              w.location = opekaBaseURL+'/error';
              return;
            }
            else {
              // It's a pair chat
              w.location = signInURL;
            }
          };

        });
      });

       /* This will successfully queue a message to be sent to the parent window */
      function opekaChatPopup(popupAction) {
        if (opekaClientURL) {
          parent.postMessage(popupAction, opekaClientURL);
        }
      };
    },
  };
})(Drupal, Opeka, jQuery);
