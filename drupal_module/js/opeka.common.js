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

var Opeka = { status: {}},
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
      'signIn/:nonce': 'signIn',
      'signIn/queues/:queueId': 'signInForQueue',
      'rooms/:roomId': 'room',
      'rooms': 'roomList',
      'queues/:queueId': 'queue',
      'queues': 'queueList',
      'feedback': 'feedbackPage'
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
    signIn: function (nonce) {
      var view = new Opeka.SignInFormView({
        nonce: nonce
      });

      if (nonce) {
        // Reserve our spot as soon as the Now server is able.
        now.ready(function () {
          now.reserveRoomSpot(nonce, function (roomId) {
            view.roomId = roomId;
          });
        });
      }

      Opeka.appViewInstance.replaceContent(view.render().el);
    },

    signInForQueue: function (queueId) {
      var view = new Opeka.SignInFormView({
        queueId: queueId
      });

      Opeka.appViewInstance.replaceContent(view.render().el);
    },

    roomList: function () {
      if (this.checkSignIn()) {
        var view = new Opeka.RoomListView({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      }
      // Need to make sure the chat view is not set.
      Opeka.chatView = null;
    },

    //@daniel
    //The feedback page
    feedbackPage: function () {
      //if (this.checkSignIn()) {
        var view = new Opeka.UserFeedback({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      //}
    },

    // The actual chatroom page.
    room: function (roomId) {
      var admin = _.isFunction(now.isAdmin),
          room = Opeka.roomList.get(roomId),
          sidebar,
          that = this;

      if (this.checkSignIn()) {
        if (!room) {
          this.navigate('404', { trigger: true });
        }

        Opeka.chatView = new Opeka.ChatView({
          admin: admin,
          inQueue: false,
          model: room
        });

        if (Opeka) {
          sidebar = new Opeka.ChatSidebarView({
            admin: admin,
            model: room
          });
        }

        // Render the view when the server has confirmed our room change.
        now.changeRoom(roomId, function (response, url, queueId) {
          if (response !== 'OK') {
            // response is false if no queue is used and room is full, redirect to url.
            if (response === false) {
              window.location = url;
              return;
            }
            else if (queueId === 'private') {
              Opeka.chatView.inQueue = response;
            }
          }
          if (queueId === 'private' || response === 'OK') {
            Opeka.appViewInstance.replaceContent(Opeka.chatView.render().el);
          }
          else {
            that.navigate('queues/' + queueId, {trigger: true});
          }

          if (sidebar) {
            Opeka.appViewInstance.$el.find('.sidebar').html(sidebar.render().el);
            Opeka.addRoomSizeToBody();
          }
        });
      }
    },

    queueList: function () {
      var admin = _.isFunction(now.isAdmin);
      if (admin) {
        var view = new Opeka.QueueListView({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      }
      // Need to make sure the chat view is not set.
      Opeka.chatView = null;
    },

    queue: function(queueId) {
      // Need to make sure the chat view is not set.
      Opeka.chatView = null;

      var queue = Opeka.queueList.get(queueId),
          that = this,
          sidebar;

      if (this.checkSignIn()) {
        if (!queue) {
          this.navigate('404', { trigger: true });
        }
        else {
          Opeka.queueView = new Opeka.QueueView({
            model: queue
          });

          now.getGlobalQueuePosition(queueId, true, function (position, rooms, roomId) {
            if (roomId && Opeka.roomList.get(roomId)) {
              that.navigate('rooms/' + roomId, {trigger: true});
            }
            else {
              Opeka.queueView.position = position;
              Opeka.queueView.rooms = rooms;
              Opeka.appViewInstance.replaceContent(Opeka.queueView.render().el);
              Opeka.appViewInstance.$el.find('.sidebar').html('');
            }
          });
        }

      }
    }
  });

  // Recieve the user list from the server.
  now.receiveUserList = function (roomId, userList) {
    var room = Opeka.roomList.get(roomId);

    if (room) {
      room.set('userList', userList);
    }
  };

  now.updateQueueStatus = function (roomId) {
    var room = Opeka.roomList.get(roomId);
    if (room && room.get('queueSystem') !== 'private') {
      if (Opeka.queueView && Opeka.queueView.model.id === room.get('queueSystem')) {
        now.getGlobalQueuePosition(room.get('queueSystem'), false, function (position, rooms, roomId) {
          Opeka.queueView.position = position;
          Opeka.queueView.rooms = rooms;
          Opeka.queueView.render();
        });
      }
    }
    // This will react for the private queue only - when the user is in the queue on the room page.
    else if (Opeka.chatView && Opeka.chatView.model.id === roomId && Opeka.chatView.inQueue !== false) {
      now.roomGetQueueNumber(roomId, function(index) {
        // Error, user is no longer in the queue, maybe he just joined the
        // room or an error happened.
        if (index === null) {
          var view = new Opeka.FatalErrorDialogView({
            message: Drupal.t('An error happened and you have lost the queue status, you can reload and join the queue again.'),
            title: Drupal.t('Error')
          });
          //view.render();
        }
        else {
          Opeka.chatView.inQueue = index;
          Opeka.chatView.render();
        }
      });
    }
  };

  // For when the server updates the status attributes.
  now.updateStatus = function (attributes) {
    // Update the status model and view if available.
    // It might not be loaded the first time this function is called.
    if (_.isFunction(Opeka.status.set)) {
      Opeka.status.set(attributes);

      // Update the status view if present.
      Opeka.statusViewInstance && Opeka.statusViewInstance.render();
    }
  };

  // Called by the server when the admin deletes a message.
  now.messageDeleted = function (roomId, messageId) {
    if (Opeka.chatView) {
      Opeka.chatView.messageDeleted(messageId);
    }
  };

  // Called by the server when an admin deletes all the messages.
  now.deleteAllMessages = function (roomId) {
    if (Opeka.chatView) {
      Opeka.chatView.deleteAllMessages();
    }
  };

  // Recieve the active user from the server.
  now.receiveActiveUser = function (roomId, user) {
    var room = Opeka.roomList.get(roomId);
    if (room) {
      room.set('activeUser', user);
    }
  };

  // Receive message from the server.
  now.receiveMessage = function (message) {
    if (Opeka.chatView) {
      Opeka.chatView.receiveMessage(message);
    }
  };

  // Set the member count for a room.
  now.updateRoomMemberCount = function (roomId, count) {
    var room = Opeka.roomList.get(roomId);
    if (room) {
      room.set('memberCount', count);
    }
  };

  // For when the server has an updated room list for us.
  now.receiveRoomList = function (rooms) {
    // This triggers a reset even on the RoomList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.roomList.reset(rooms);
  };

  // For when the server has an updated room list for us.
  now.receiveQueueList = function (queues) {
    // This triggers a reset even on the RoomList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.queueList.reset(queues);
  };

  // Add the new room to our local room list.
  now.roomCreated = function (room) {
    var roomIsAdded = Opeka.roomList.get(room.id);
    if (!roomIsAdded) {
      Opeka.roomList.add(room);
    }
  };

  // Reaction for when joining the room.
  now.roomJoinFromQueue = function (roomId) {
    var room = Opeka.roomList.get(roomId);
    if (room && room.get('queueSystem') !== 'private') {
      Opeka.router.navigate("rooms/" + roomId, {trigger: true});
    }
    else if (Opeka.chatView && Opeka.chatView.model.id === roomId) {
      Opeka.chatView.inQueue = false;
      Opeka.chatView.render();
    }
  };

  // Update the room with the changed attributes.
  now.roomUpdated = function (roomId, attributes) {
    var room = Opeka.roomList.get(roomId);

    if (room) {
      room.set(attributes);
    }
  };

  // Remove the room from the room list and show the final message to
  // any participants in that room.
  now.roomDeleted = function (roomId, finalMessage) {
    var room = Opeka.roomList.get(roomId), view;

    if (room) {
      // If we're in the room that's being deleted, show the final
      // message and go back to the room list.
      if (Opeka.chatView && Opeka.chatView.model.id === roomId) {
        view = new Opeka.DialogView({
          content: Backbone.View.prototype.make('p', 'message', finalMessage),
          title: Drupal.t('Chat ended')
        });

        view.render();

        Opeka.router.navigate("rooms", {trigger: true});
        // Remove the sidebar.
        Opeka.appViewInstance.$el.find('.sidebar').html('');
      }

      Opeka.roomList.remove(room);

    }
  };

  // Receive the whisper form an user.
  now.roomRecieveWhisper = function (clientId, messageText, nickname, receiver, date) {
    if (now.core.clientId === clientId) {
      // A user receiving the whisper.
      var messageObj = {
        receiver: receiver,
        message: messageText,
        whisper: true,
        sender: {
          name: nickname
        },
        date: date
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user joining the room.
  now.roomUserJoined = function (roomId, nickname, isAdmin) {
    if (Opeka.chatView && Opeka.chatView.model && Opeka.chatView.model.id === roomId) {
      // If the user logged into the room is admin and the joining user is a client, play a sound
      if (now.isAdmin && !isAdmin) {
        Opeka.userJoinedSound();
      }
      var messageObj = {
        message: Drupal.t('@user has joined the room.', { '@user': nickname }),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being kicked.
  now.roomUserKicked = function (roomId, clientId, message, user) {
    // If this client is being kicked, navigate to a different page and
    // use a FatalErrorDialog to force them to reload the page.
    if (now.core.clientId === clientId) {
      Opeka.router.navigate("rooms", {trigger: true});

      var view = new Opeka.FatalErrorDialogView({
        message: Drupal.t('You have been kicked from the chat with the following reason: @reason.', {'@reason': message}),
        title: Drupal.t('Kicked')
      });
      view.render();
    }
    else if (Opeka.chatView.model.id === roomId) {
      var messageObj = {
        message: Drupal.t('User @user was kicked from the chat.', { '@user': user }),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Respond to a queue being flushed.
  now.queueIsFlushed = function(clientId) {
    // The queue is flushed, navigate to a different page and
    // use a FatalErrorDialog to force them to reload the page.
    if (now.core.clientId === clientId) {
      Opeka.router.navigate("rooms", {trigger: true});

      var view = new Opeka.FatalErrorDialogView({
        message: Drupal.t('The chat that you were in queue for has closed and your position in the queue with it. You are welcome to join again when the chat reopens or join a different chat room or queue.'),
        title: Drupal.t('Chat and queue closed')
      });
      view.render();
    }
  }

  // Response to a user leaving the room.
  now.roomUserLeft = function (roomId, nickname) {
    if (Opeka.chatView.model.id === roomId) {
      var messageObj = {
        message: Drupal.t('@user has left the room.', { '@user': nickname }),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being muted.
  now.roomUserMuted = function (roomId, clientId, user, nickname) {
    var room = Opeka.roomList.get(roomId),
        messageObj = {};
    // Make sure we only mute the correct user and we got the room.
    if (now.core.clientId === clientId && room) {
      room.set('activeUser', user);
      if (Opeka.chatView.model.id === roomId) {
        messageObj = {
          message: Drupal.t('You have been muted by @user.', { '@user': nickname }),
          system: true,
          name: nickname
        };
        Opeka.chatView.receiveMessage(messageObj);
      }
    }
    else if (room && Opeka.chatView.model.id === roomId) {
      messageObj = {
        message: Drupal.t('@user have been muted.', { '@user': user.name }),
        system: true,
        name: nickname
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being unmuted.
  now.roomUserUnmuted = function (roomId, clientId, user, nickname, messageText) {
    var room = Opeka.roomList.get(roomId),
        messageObj = {};
    // Make sure we only unmute the correct user and we got the room.
    if (now.core.clientId === clientId && room) {
      room.set('activeUser', user);
      if (Opeka.chatView.model.id === roomId) {
        messageObj = {
          message: Drupal.t('You have been unmuted by @user.', { '@user': nickname }),
          system: true,
          name: nickname
        };
        Opeka.chatView.receiveMessage(messageObj);
      }
    }
    else if (room && Opeka.chatView.model.id === roomId) {
      messageObj = {
        message: Drupal.t('@user have been unmuted.', { '@user': user.name }),
        system: true,
        name: nickname
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Sign in to the chat app.
  Opeka.signIn = function (user, callback) {
    now.signIn(user, function () {
      var destination = 'rooms',
          footer;

      if (user.roomId) {
        destination = destination + '/' + user.roomId;
      }
      else if (user.queueId) {
        destination = 'queues' + '/' + user.queueId;
      }

      callback();
      Opeka.router.navigate(destination, {trigger: true});

      footer = new Opeka.ChatFooterView({
        banCodeGenerator: _.isFunction(now.getBanCode)
      });
      $('#opeka-app').find('.footer').append(footer.render().el);
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

  // Adds CSS class to the body element of the page
  // allows us to style group chats and pair room chats differently
  Opeka.addRoomSizeToBody = function() {
    // Start by clearing any classes from previous chat sessions
    if ($('body').hasClass('room-size-2')) {
      $('body').removeClass('room-size-2')
    }
    else if ($('body').hasClass('groupchat')) {
      $('body').removeClass('groupchat')
    }
    // Now add the right classes
    if ($('div#user-list-block').hasClass('room-size-2')){
      $('body').addClass('room-size-2');
    }
    else {
      $('body').addClass('groupchat');
    }
  }

  Opeka.userJoinedSound = function() {
    document.getElementById('audiotag1').play();
  }

  // Basic setup for the app when the DOM is loaded.
  $(function () {
    Opeka.compileTemplates();

    // We use a bare Backbone model for containing server status.
    // Helpful for Backbone views integration.
    Opeka.status = new Backbone.Model();

    Opeka.roomList = new Opeka.RoomList();
    Opeka.queueList = new Opeka.QueueList();

    Opeka.appViewInstance = new Opeka.AppView();
    Opeka.statusViewInstance = new Opeka.OnlineStatusView({
      model: Opeka.status
    });

    Opeka.appViewInstance.on('render', function(view) {
      view.$el.find('.footer').append(Opeka.statusViewInstance.render().el);
    });

    $('#opeka-app').html(Opeka.appViewInstance.render().el);
    
    // Handle disconnects.
    // If the connection is dropped, advise the user that he has to
    // reload the page.

    now.core.on('disconnect', function() {

      // If the user is banned, tell him to go away.
      if (now.isBanned) {
        view = new Opeka.BannedDialogView().render();
        return;
      }

      // Wait five seconds before showing the dialog, in case the
      // disconnect was caused by the user reloading the page.
      window.setTimeout(function () {
        var view = new Opeka.FatalErrorDialogView({
          message: Drupal.t('Your connection to the chat server was lost. Please reconnect. Contact support if problem persists.'),
          title: Drupal.t('Disconnected')
        }).render();
      }, 5000);
    });

    // Once the page is loaded, start our app.
    var nf = new Opeka.NotFoundRouter();
    Opeka.router = new Opeka.MainRouter();

    if (!now) {
      var view = new Opeka.FatalErrorDialogView({
        message: Drupal.t('The chat server seems to be offline. Please reload the page to try connecting again or contact support if the problem persists.'),
        title: Drupal.t('No connection server')
      });

      view.render();
    }

    Backbone.history.start();
  });

  // The now object is ready.
  now.ready(function() {
    now.getFeatures(function(features) {
      Opeka.features = features;
    });
  });
}(jQuery));
