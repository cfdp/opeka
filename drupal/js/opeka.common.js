/*!
 * Copyright 2012 Cyberhus.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
/*global now */

var Opeka = { status: {} },
    // Initialise window.JST if it does not exist.
    JST = JST || {};

(function ($) {
  "use strict";

  // Catch-all router to provide a not found page if nothing else was matched.
  Opeka.NotFoundRouter = Backbone.Router.extend({
    routes: {
      '*path': 'notFound'
    },

    notFound: function (path) {
      var errorMessage = $('<p class="opeka-message error"></p>');

      errorMessage.append(Drupal.t('Page @path was not found.', { '@path': path }));

      // Replace the app body with our message
      $('#opeka-app').html(errorMessage);
    }
  });

  Opeka.MainRouter = Backbone.Router.extend({
    routes: {
      '': 'signIn',
      'rooms/:roomId': 'room',
      'rooms': 'roomList'
    },

    // Check that the user is signed in, and if not, redirect to the
    // signIn page.
    checkSignIn: function () {
      // All signed in users are supposed to have the changeRoom method.
      if (!_.isFunction(now.changeRoom)) {
        this.navigate("", {trigger: true});
      }
      else {
        return true;
      }
    },

    // Chat sign in page.
    signIn: function () {
      var view = new Opeka.SignInFormView({});

      Opeka.appViewInstance.replaceContent(view.render().el);
    },

    roomList: function () {
      if (this.checkSignIn()) {
        var view = new Opeka.RoomListView({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      }
    },

    // The actual chatroom page.
    room: function (roomId) {
      var room = Opeka.roomList.get(roomId);

      if (this.checkSignIn()) {
        if (!room) {
          this.navigate('404', { trigger: true });
        }

        Opeka.chatView = new Opeka.ChatView({
          admin: true,
          roomId: roomId
        });

        // Render the view when the server has confirmed our room change.
        now.changeRoom(roomId, function (response) {
          Opeka.appViewInstance.replaceContent(Opeka.chatView.render().el);
        });
      }
    }
  });

  // For when the server updates the status attributes.
  now.updateStatus = function (attributes) {
    // Update the status model and view if available.
    // It might not be loaded the first time this function is called.
    if (_.isFunction(Opeka.status.set)) {
      Opeka.status.set(attributes);

      Opeka.statusViewInstance.render();
    }
  };

  // For when the server has an updated room list for us.
  now.receiveRoomList = function (rooms) {
    // This triggers a reset even on the RoomList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.roomList.reset(rooms);
  };

  // Receive message from the server.
  now.receiveMessage = function (message) {
    if (Opeka.chatView) {
      Opeka.chatView.receiveMessage(message);
    }
  };

/*
  // Method used in order to print the final message when the chat room
  // has been closed.
  now.displayError = function (error) {
    $('#errors').html(error);
    $('#errors').dialog();
  };

  // Method used in order to effect a local removal of all the messages
  // of a single user.
  now.localDeleteAllMsg = function (clientId) {
    $('#chat-message-list').find("."+clientId).html('');
  };

  // Method used in order to effect a local removal of a single message.
  now.localDeleteMsg = function (msgId) {
    $('#chat-message-list').find("#" + msgId).html('');
  };

  //This method is used in order to leave a room
  now.quitRoom = function(callback){
    opeka.activeRoomId = null;
    opeka.closeChat();
    window.location.replace("#");

    if (callback) {
      callback();
    }
  };

  // This method is used in order to join a room
  now.joinRoom = function(roomId, callback){
    opeka.closeChat();
    opeka.activeRoomId = roomId;
    opeka.openChat(roomId);
    window.location.replace("#room="+roomId);
    if (callback) {
      callback();
    }
  };


  // This method is used in order to update the active room of the users
  // in case a counselor have deleted it.
  now.updateActiveRoom = function(){
  if (opeka.activeRoomId && !opeka.rooms[opeka.activeRoomId]){
        now.changeRoom(null);
        opeka.activeRoomId = null;
        opeka.closeChat();
  }
  };

  // Open the chat interface, if not open already.
  opeka.openChat = function (roomId) {
    // If the chat is open already or room was not found, do nothing.
    if (opeka.chatIsOpen || !opeka.rooms || !opeka.rooms[roomId]) { return; }

    var room = opeka.rooms[roomId];

    $('#chat-message-list')
      // Remove the existing chat messages.
      .children().remove().end();

    $('#opeka-chat').fadeIn();

    opeka.chatIsOpen = true;

    $('#opeka-chat').find('#th-room').html('Opeka Chat - Room: ' + room.name);
  };

  // Open the chat interface, if not open already.
  opeka.closeChat = function () {
    $('#opeka-chat').fadeOut();
    opeka.chatIsOpen = false;
  };

  // When the history state changes, check if we need to open/close a
  // room or similar changes.
  $(window).bind('hashchange', function(event) {
    var roomId = $.bbq.getState('room');

    // We have change to a chat room.
    if (roomId) {
      now.changeRoom(roomId, function(addingStatus){
        if (addingStatus === 'OK') {
          opeka.closeChat();
          opeka.activeRoomId = roomId;
          opeka.openChat(roomId);
        } else if(addingStatus < 0){
          now.displayError('You cannot join this room.');
          opeka.closeChat();
          window.location.replace("#");
        } else{
        now.displayError('You have been added to queue with position: '+addingStatus);
            opeka.closeChat();
        }
      });
    }
    else {
      if (opeka.activeRoomId) {
        now.changeRoom(null);
        opeka.activeRoomId = null;
        opeka.closeChat();
      }
    }
  });

  // Handle the send chat message for both admins and guests.
  $("#opeka-send-message").live('click', function (event) {
    var message = $('#opeka-chat-message').val().trim();

    if (opeka.activeRoomId && message) {
      now.sendMessageToRoom(opeka.activeRoomId, message);
    $('#opeka-chat-message').val('');
    }

    event.preventDefault();
  });
*/
  // Sign in to the chat app.
  Opeka.signIn = function (user, callback) {
    now.signIn(user, function () {
      callback();
      Opeka.router.navigate("rooms", {trigger: true});
    });
  };

  // Load templates from the page.
  Opeka.compileTemplates = function () {
    $('script[type="application/template"]').each(function () {
      if (!JST[this.id]) {
        JST[this.id] = _.template(this.innerHTML);
      }
    });
  };


  // Basic setup for the app when the DOM is loaded.
  $(function () {
    Opeka.compileTemplates();

    // We use a bare Backbone model for containing server status.
    // Helpful for Backbone views integration.
    Opeka.status = new Backbone.Model();

    Opeka.roomList = new Opeka.RoomList();

    Opeka.appViewInstance = new Opeka.AppView();
    Opeka.statusViewInstance = new Opeka.OnlineStatusView({
      model: Opeka.status
    });

    Opeka.appViewInstance.on('render', function(view) {
      view.$el.find('.footer').append(Opeka.statusViewInstance.render().el);
    });

    $('#opeka-app').html(Opeka.appViewInstance.render().el);

    // If the connection is dropped, advise the user that he has to
    // reload the page.
    now.core.on('disconnect', function() {
      // Wait five seconds before showing the dialog, in case the
      // disconnect was caused by the user reloading the page.
      window.setTimeout(function () {
        var view = new Opeka.FatalErrorDialogView({
          message: Drupal.t('Your connection to the chat server was lost. Please reconnect. Contact support if problem persists.'),
          title: Drupal.t('Disconnected')
        });

        view.render();
      }, 5000);
    });

    // Once the page is loaded, start our app.
    var nf = new Opeka.NotFoundRouter();
    Opeka.router = new Opeka.MainRouter();

    Backbone.history.start();
  });
}(jQuery));

