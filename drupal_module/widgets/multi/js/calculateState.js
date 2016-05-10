/**
 * This script makes the wrapper multi widget reflect the states of the embedded
 * chat widgets.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
 */
(function ($) {
  window.addEventListener("message", receiveMessage, false);
  var chatStates = {}, // Object holding the state of the embedded chat services
    validOrigins = ['https://demo.curachat.com','https://dev.demo','https://dev.ch' ], // Add the valid URLs of the embedded services, eg. ['https://demo.curachat.com','https://demo2.curachat.com']
    opekaMultiWidgetState = 'chat-closed';

  /**
   * Recieves status messages from the embedded chat services, checks for valid origin
   * and calls calculateWidgetState
   *
   * @param {Object} event
   */
  function receiveMessage(event) {
    console.log(event);

    if (validOrigins.indexOf(event.origin) !== -1) {
      // Update status of the messaging chat
      chatStates[event.origin] = event.data;
      calculateMultiWidgetState();
    } else {
      // The origin is not valid
      console.log("Bad window");
      return;
    }
  }

  /**
  * Calculates the state of the multi widget and applies a CSS class accordingly
  */
  function calculateMultiWidgetState() {
    if (searchObject('Open')) {
      // We have an active chat
      opekaMultiWidgetState = 'chat-open';

    } else if (searchObject('Occupied')) {
      // We have occupied chats...
      opekaMultiWidgetState = 'chat-busy';
    } else {
      // All chats are closed
      opekaMultiWidgetState = 'chat-closed';
    }
    $('body').removeClass('chat-closed chat-busy chat-open').addClass(opekaMultiWidgetState);
  }

  /**
  * Search the chatStates object for a certain value
  * @param {String} needle. The value to search for
  * @returns {Boolean} Returns true if the value was found, else false
  */
  function searchObject(needle) {
    for (var key in chatStates) {
      if (chatStates.hasOwnProperty(key)) {
        if (chatStates[key] == needle) {
          return true;
        }
      }
    }
    // The key wasn't found
    return false;
  }
}(jQuery));
