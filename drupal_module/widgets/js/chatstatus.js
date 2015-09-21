var Opeka = Opeka || {};

(function (Drupal, Opeka, $, undefined) {
  
  Drupal.behaviors.opeka = {
    attach: function (context, settings) {
      // Setting the variables
      var chatStatus = {},
          io_socket = null,
          opekaClientURL = Drupal.settings.opeka.client_url || null,
          opekaBaseURL = location.protocol + '//' + location.hostname || "https://localhost:3000",
          roomType = "pair",
          textStrings = {
            buttonAvailable : Drupal.t("Start chat"),
            buttonOccupied : Drupal.t("Occupied"),
            buttonClosed : Drupal.t("Closed"),
            statusFetching : Drupal.t("Fetching chat status..."),
            statusClosed : Drupal.t("The chat is closed at the moment"),
            statusOccupied: Drupal.t("The chat is occupied"),
            statusAvailable: Drupal.t("The chat is available"),
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

        // Updates the actual status text.
        var updateDisplay = function (attributes) {
         //For debugging...
          var debugchat = false;
          if (debugchat) {
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusClosed);
            chatButton.text(textStrings.buttonClosed);
            chatLink = false;
            return;
          }

          // If chat is open and there are active one-to-one rooms (chat open).
          if (chatStatus.chatOpen && chatStatus.rooms && chatStatus.rooms.pair.active > 0) {
            body.removeClass('chat-closed chat-busy').addClass('chat-open');
            statusTab.text(textStrings.statusAvailable);
            chatLink = true;
            chatButton.text(textStrings.buttonAvailable);
            if (opekaClientURL) {
              opekaChatPopup("Activate");
            }
          }
          // The chat app is not initialized yet
          else if ($.isEmptyObject(chatStatus)) {
            body.removeClass('chat-closed chat-open').addClass('chat-busy');
            statusTab.text(textStrings.statusFetching);
            chatLink = false;
            chatButton.text(textStrings.buttonOccupied);
          }
          // If not, it might be busy? Check if chat app is turned on (chat busy).
          else if (chatStatus.chatOpen) {
            body.removeClass('chat-closed chat-open').addClass('chat-busy');
            statusTab.text(textStrings.statusOccupied);
            chatLink = false;
            chatButton.text(textStrings.buttonOccupied);
            if (opekaClientURL) {
              opekaChatPopup("Deactivate");
            }
          }
          // The chat app not turned on or is not initialized / unreachable.
          else if (chatStatus === 'undefined' || !chatStatus.chatOpen){
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusClosed);
            chatLink = false;
            chatButton.text(textStrings.buttonClosed);
            if (opekaClientURL) {
              opekaChatPopup("Deactivate");
            }
            console.log('Opeka chat app is not turned on or chatStatus is undefined, chatStatus: ', chatStatus);
          }
          // If all fails - probably the server is down...
          else {
            body.removeClass('chat-busy chat-open').addClass('chat-closed');
            statusTab.text(textStrings.statusClosed);
            chatLink = false;
            chatButton.text(textStrings.buttonClosed);
            if (opekaClientURL) {
              opekaChatPopup("Deactivate");
            }
            console.log('Opeka chat app error. Server might be down. chatStatus: ', chatStatus);
          }

         };

        // When the document is ready, update the status, and bind the event
        // to have it update automatically later.
        $(window).on('opekaChatStatusUpdate', updateDisplay);

        // When the user clicks the button (and a chat room is vacant), ask the chat server to join a room.
        // If chatLink is false, the chat isn't ready and no link is provided
        chatButton.click(function () {
          if (!chatLink) {
            return;
          }
          if (!$.browser.opera){
            var w = openWindow('_blank', opekaBaseURL+'/opeka', 600, 700);
          } else {
            window.parent.location = opekaBaseURL+'/chat-on-opera';
          }

          var callback = function(signInURL) {
            // Close window if chat is unavailable
            if (!(chatStatus.rooms && chatStatus.rooms.pair.active > 0) && !(chatStatus.rooms && chatStatus.rooms.pair.full > 0)) {
              w.close();
            }
            // Check if it is a group chat
            else if ($(body).hasClass("group")) {
              roomType = "group";
              w.location = chatStatus.chatPageURL;
            }
            else {
              w.location = signInURL;
            }
          };

          io_socket.emit("getDirectSignInURL", roomType, function(result) {
            callback("/opeka" + result.substr(result.indexOf("#")));
          });
        });
      });
      
      /* Build pop-up window */
      function openWindow(window_name,file_name,width,height) {
        parameters = "width=" + width;
        parameters = parameters + ",height=" + height;
        parameters = parameters + ",status=no";
        parameters = parameters + ",resizable=no";
        parameters = parameters + ",scrollbars=no";
        parameters = parameters + ",menubar=no";
        parameters = parameters + ",toolbar=no";
        parameters = parameters + ",directories=no";
        parameters = parameters + ",location=no";
        myWindow = window.open(file_name,window_name,parameters);
        return myWindow;
      };

       /* This will successfully queue a message to be sent to the parent window */
      function opekaChatPopup(popupAction) {
        parent.postMessage(popupAction, opekaClientURL);
      };
    },
  };
})(Drupal, Opeka, jQuery);