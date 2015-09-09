/* This script is called when the connection to the chat server (now.js) has been established */
(function ($, Drupal, undefined) {

  var chatStatus = {},
    textStrings = {
      buttonAvailable : Drupal.t("Start chat"),
      buttonOccupied : Drupal.t("Wait..."),
      buttonClosed : Drupal.t("Closed"),
      statusFetching : Drupal.t("Fetching chat status..."),
      statusClosed : Drupal.t("The chat is closed at the moment"),
      statusOccupied: Drupal.t("The chat is occupied"),
      statusAvailable: Drupal.t("The chat is available"),
    };

  // The following callback is called by the server in order to
  // advertise its status.
  now.updateStatus = function (attributes) {
    chatStatus = attributes;
    $(window).trigger('opekaChatStatusUpdate', [attributes]);
  };

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
      // The chat app not turned on or is not initialized / unreachable (no now.js).
      else if (chatStatus === 'undefined' || !chatStatus.chatOpen){
        body.removeClass('chat-busy chat-open').addClass('chat-closed');
        statusTab.text(textStrings.statusClosed);
        chatLink = false;
        chatButton.text(textStrings.buttonClosed);
        if (opekaClientURL) {
          opekaChatPopup("Deactivate");
        }
        //console.log('Opeka chat app is not turned on or chatStatus is undefined, chatStatus: ', chatStatus);
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
    $(window).bind('opekaChatStatusUpdate', updateDisplay);

    // When the user clicks the button (and a chat room is vacant), ask the chat server to join a room.
    chatButton.click(function () {
      if (!chatLink) {
        return;
      }
      if (!$.browser.opera){
        var w = openWindow('_blank', opekaBaseURL+'/opeka', 600, 700);
      } else {
        window.parent.location = opekaBaseURL+'/chat-on-opera';
      }

      now.getDirectSignInURL('pair', function (signInURL) {
      if (!(chatStatus.rooms && chatStatus.rooms.pair.active > 0) && !(chatStatus.rooms && chatStatus.rooms.pair.full > 0)) {
        w.close();
        //window.location = baseURL;
      }
      else {
        w.location = signInURL;
      }
      });
    });

    // Run updateDisplay once manually so we have the initial text
    // nailed down.
    updateDisplay();
  });
  
    // Build pop-up window
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

    vindue = window.open(file_name,window_name,parameters);
    return vindue;
  }
  
  /* This will successfully queue a message to be sent to the parent window */
  function opekaChatPopup(popupAction) {
    parent.postMessage(popupAction, opekaClientURL);
  }

/*  function receiveMessage(event)   {
    // Do we trust the sender of this message?  (might be
    // different from what we originally opened, for example).
    // This implementation does not receive messages from client, so this is not needed
    if (event.origin !== "insert validated client url here")
      return;
  }
  window.addEventListener("message", receiveMessage, false);*/

})(jQuery, Drupal);