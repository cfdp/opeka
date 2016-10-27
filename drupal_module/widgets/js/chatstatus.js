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
          textStrings = {
            buttonAvailable : Drupal.t("Start chat"),
            buttonOccupied : Drupal.t("Occupied"),
            buttonClosed : Drupal.t("Closed"),
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
            body = $('body');
        
        var roomType = "pair";
        
        // The group class is added to the body tag by requesting the widget URL and appending /group at the end
        // e.g. https://demo.curachat.com/opeka-widgets/header/group
        if (body.hasClass("group")) { roomType = "group"; }
        
        // Set the temporary status text
        statusTab.text(textStrings.statusFetching);
        chatButton.text(textStrings.statusFetching);

        // Update status text if no connection could be made to server after 10 sec
        function checkConnection(){
          if (!io_socket.connected) {
            console.log('Error: No connection to Opeka chat server');
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
          
          switch(roomType) {
            case "pair":
              // If chat is open and there are available one-to-one rooms (chat open).
              if (chatStatus.chatOpen && chatStatus.rooms && chatStatus.rooms.pair.active > 0) {
                body.removeClass('chat-closed chat-busy').addClass('chat-open');
                statusTab.text(textStrings.statusAvailable_pair);
                chatLink = true;
                chatButton.text(textStrings.buttonAvailable);
                if (opekaClientURL) {
                  opekaChatPopup("Open");
                }
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
              }
              else {
                calculatePassiveState();
              }
              break;
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
            if (opekaClientURL) {
              opekaChatPopup("Occupied");
            }
          }
          // The chat app not turned on or is not initialized / unreachable.
          else if (chatStatus === 'undefined' || !chatStatus.chatOpen){
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings["statusClosed_"+roomType]);
            chatLink = false;
            chatButton.text(textStrings.buttonClosed);
            if (opekaClientURL) {
              opekaChatPopup("Closed");
            }
          }
          // If all fails - probably the server is down...
          else {
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusError);
            chatLink = false;
            chatButton.text(textStrings.buttonError);
            if (opekaClientURL) {
              opekaChatPopup("Closed");
            }
            console.log('Opeka chat app error. Server might be down. chatStatus: ', chatStatus);
          }
        }

        // When the user clicks the button (and a chat room is vacant), ask the chat server to join a room.
        chatButton.click(function () {
          // If chatLink is false, the chat isn't ready and no link is provided
          if (!chatLink) {
            return;
          }

          var w = window.open(opekaBaseURL+'/opeka');

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
            case "group":
              w.location = chatStatus.chatPageURL;
              break;
           }

          var callback = function(err, signInURL) {
            if (err) {
              console.log('Opeka error: ' + err);
              w.location = opekaBaseURL+'/error';
              return;
            }
            // Double-check chat status - close window if chat is unavailable
            if (!(chatStatus.rooms && chatStatus.rooms.pair.active > 0) && !(chatStatus.rooms && chatStatus.rooms.pair.full > 0)) {
              console.log('Opeka error: chat unavailable ');
              w.close();
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
        parent.postMessage(popupAction, opekaClientURL);
      };
    },
  };
})(Drupal, Opeka, jQuery);
