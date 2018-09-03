// Copyright 2012 Cyberhus.
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var Opeka = {
    'status': {},
    'clientSideMethods': {},
    'clientData': {
      'clientId': null,
      'isBanned': false,
      'isAdmin': false,
      'isSignedIn': false
    },
    // Placeholder for remote methods, will be set to the dnode remote object when connected
    'remote': null,
    'shoe': null,
    'dnode': null,
    // Boolean specifying whether the serverside Javascript loaded successfully
    'serverJSLoaded': false,
    'doorBellSound': null,
    'reconnectHandlers': false,
    'lastPingReceivedClientTime': null,
    'lastPingReceivedServerTime': null,
    'state': null,
    'initial_connections': 0,
    'use_reconnect': false,
    'max_reconnects': 10,
    'number_of_reconnects_tried': 0,
    'reconnect_interval': 5000,
    'connection_timeout': 6000,
    'reconnect_connections': [],
    'character_count': 100
  },
  // Initialise window.JST if it does not exist.
  JST = JST || {},
  Backbone = Backbone || {},
  Drupal = Drupal || {},

  // How many timeouts to expect per reconnect_interval
  // This value should be synchronized to the one in nodejs/lib/client.js
  TIMEOUTS_PER_INTERVAL = 2;

(function ($) {
  "use strict";

  // Loads reconnection values from Drupal configuration and calculates timeout
  // values.
  function updateReconnectTimes() {
    var settings = Drupal.settings.opeka || {};
    Opeka.max_reconnects = settings.reconnect_attempts || 3;
    Opeka.reconnect_interval = settings.reconnect_interval || 20000;
    Opeka.connection_timeout = parseInt(
      Opeka.reconnect_interval / TIMEOUTS_PER_INTERVAL
    );
  }

  // Catch-all router to provide a not found page if nothing else was matched.
  Opeka.NotFoundRouter = Backbone.Router.extend({
    routes: {
      '*path': 'notFound'
    },

    notFound: function (path) {
      var errorMessage = $('<p class="opeka-message error"></p>');

      errorMessage.append(Drupal.t('Page @path was not found.', {'@path': path}));

      // Replace the app body with our message
      $('#opeka-app').html(errorMessage);
    }
  });

  Opeka.MainRouter = Backbone.Router.extend({
    routes: {
      '': 'signIn',
      'signIn/groupChat': 'signIn',
      'signIn/:nonce(/:chatType)': 'signIn',
      'signIn/queues/:queueId': 'signInForQueue',
      'rooms/:roomId': 'room',
      'rooms': 'roomList',
      'queues/:queueId': 'queue',
      'queues': 'queueList',
      'invites': 'inviteList',
      'invites/:token': 'inviteRedirect',
      'feedback/:chatType': 'feedbackPage',
      'goodbye': 'goodbye'
    },

    // Check that the user is signed in, and if not, redirect to the
    // signIn page.
    checkSignIn: function () {
      if (!Opeka.clientData.isSignedIn) {
        this.navigate("", {trigger: true});
      }
      else {
        return true;
      }
    },

    // Chat sign in page.
    signIn: function (nonce, chatType) {
      var view = new Opeka.SignInFormView({
        nonce: nonce,
        chatType: chatType,
        model: Opeka.status
      });

      if (nonce) {
        // Reserve our spot as soon as the client is connected.
        $(Opeka).on('connected', function () {
          Opeka.remote.reserveRoomSpot(nonce, function (roomId) {
            view.roomId = roomId;
          });
        });
      }

      if (chatType) {
        // The chatType parameter can be set from the chat widget
        $('body').addClass(chatType);
      }

      Opeka.appViewInstance.replaceContent(view.render().el);
      Opeka.cleanAfterChat();

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
      // Need to make sure that chat view is removed and user has been properly removed from
      // rooms he might have visited (needed in case of browser back navigation)
      Opeka.cleanAfterChat();
    },

    // The feedback page
    feedbackPage: function (chatType) {
      var view = new Opeka.UserFeedback({
        chatType: chatType
      });

      Opeka.appViewInstance.replaceContent(view.render().el);
      Opeka.cleanAfterChat();
    },

    // The actual chatroom page.
    room: function (roomId) {
      var admin = Opeka.clientData.isAdmin,
        room = Opeka.roomList.get(roomId),
        sidebar,
        that = this;

      Drupal.settings.opeka.user.roomId = roomId;
      if (this.checkSignIn()) {
        // Try to load room (it might be private).
        if (!room) {
          if (Opeka.remote) {
            Opeka.remote.getRoomById(roomId, function (room) {
              if (room) {
                Opeka.roomList.add(room);
                that.room(roomId);
              }
              else {
                Drupal.settings.opeka.user.roomId = null;
                that.navigate('rooms', {trigger: true});
              }
            });
          }
          else {
            setTimeout(that.room(roomId), 100);
          }
          return;
        }

        Drupal.settings.opeka.user.roomId = null;

        Opeka.chatView = new Opeka.ChatView({
          admin: admin,
          inQueue: false,
          model: room
        });

        if (Opeka) {
          sidebar = new Opeka.ChatSidebarView({
            admin: admin,
            model: room,
            banCodeGenerator: Opeka.clientData.canGenerateBanCode
          });
        }

        // Render the view when the server has confirmed our room change.
        Opeka.remote.changeRoom(roomId, function (response, url, queueId) {
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
            Opeka.limitCharacters();
          }
          else {
            that.navigate('queues/' + queueId, {trigger: true});
          }

          if (sidebar) {
            Opeka.appViewInstance.$el.find('.sidebar').html(sidebar.render().el);
            Opeka.addRoomSizeToBody();
            Opeka.screeningPopoverClose();
          }
        });
      }
    },

    queueList: function () {
      var admin = Opeka.clientData.isAdmin;
      if (admin) {
        var view = new Opeka.QueueListView({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      }
      // Need to make sure the chat view is not set. @todo - needs testing
      Opeka.cleanAfterChat();
    },

    inviteList: function () {
      var admin = Opeka.clientData.isAdmin;
      if (this.checkSignIn() && admin && Drupal.settings.opeka && Drupal.settings.opeka.invite) {
        var view = new Opeka.InviteListView({});

        Opeka.appViewInstance.replaceContent(view.render().el);
      }
      // Need to make sure the chat view is not set. @todo - needs testing
      Opeka.cleanAfterChat();
    },

    inviteRedirect: function (token) {
      var self = this;
      if (Opeka.remote) {
        Opeka.remote.getInviteRoomByToken(token, function (room) {
          if (room) {
            if (room == 'cancelled') {
              self.navigate('rooms', {trigger: true});
              var view = new Opeka.DialogView({
                content: Backbone.View.prototype.make('p', 'message', Drupal.t('This chat has been cancelled by counselor.')),
                title: Drupal.t('Chat is cancelled')
              });

              view.render();
            }
            Opeka.roomList.add(room);
            Drupal.settings.opeka.user.roomId = room.id;
            if (self.checkSignIn()) {
              self.navigate('rooms/' + room.id, {trigger: true});
            }
          }
          else {
            // alert(Drupal.t('It seems your counselor is not available yet, try again in a few minutes'));
            self.navigate('rooms', {trigger: true});
            var view = new Opeka.DialogView({
              content: Backbone.View.prototype.make('p', 'message', Drupal.t('It seems your counselor is not available yet, try again in a few minutes.')),
              title: Drupal.t('Chat not available')
            });

            view.render();
          }
        });
      }
      else {
        setTimeout(function () {
          self.inviteRedirect(token);
        }, 100);
      }
    },

    queue: function (queueId) {
      // Need to make sure the chat view is not set. @todo - needs testing
      Opeka.cleanAfterChat();

      var queue = Opeka.queueList.get(queueId),
        that = this,
        sidebar;

      if (this.checkSignIn()) {
        if (!queue) {
          this.navigate('404', {trigger: true});
        }
        else {
          Opeka.queueView = new Opeka.QueueView({
            model: queue
          });

          Opeka.remote.getGlobalQueuePosition(queueId, true, function (position, rooms, roomId) {
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
    },

    goodbye: function () {
      var view = new Opeka.GoodbyeView({});

      Opeka.appViewInstance.replaceContent(view.render().el);

      // Need to make sure the chat view is not set.
      Opeka.cleanAfterChat();
    },
  });

  // Recieve the user list from the server.
  Opeka.clientSideMethods.receiveUserList = function (roomId, userList) {
    var room = Opeka.roomList.get(roomId);

    if (room) {
      room.set('userList', userList);
    }
  };

  Opeka.clientSideMethods.updateQueueStatus = function (roomId) {
    var room = Opeka.roomList.get(roomId);
    if (room && room.get('queueSystem') !== 'private') {
      if (Opeka.queueView && Opeka.queueView.model.id === room.get('queueSystem')) {
        Opeka.clientSideMethods.getGlobalQueuePosition(room.get('queueSystem'), false, function (position, rooms, roomId) {
          Opeka.queueView.position = position;
          Opeka.queueView.rooms = rooms;
          Opeka.queueView.render();
        });
      }
    }
    // This will react for the private queue only - when the user is in the queue on the room page.
    else if (Opeka.chatView && Opeka.chatView.model.id === roomId && Opeka.chatView.inQueue !== false) {
      Opeka.remote.roomGetQueueNumber(roomId, function (index) {
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
  Opeka.clientSideMethods.updateStatus = function (attributes) {
    // Update the status model and view if available.
    // It might not be loaded the first time this function is called.
    if (_.isFunction(Opeka.status.set)) {
      Opeka.status.set(attributes);

      // Update the status view if present.
      Opeka.statusViewInstance && Opeka.statusViewInstance.render();
    }
  };

  // Called by the server when the admin deletes a message.
  Opeka.clientSideMethods.messageDeleted = function (roomId, messageId) {
    if (Opeka.chatView) {
      Opeka.chatView.messageDeleted(messageId);
    }
  };

  // Called by the server when an admin deletes all the messages.
  Opeka.clientSideMethods.deleteAllMessages = function (roomId) {
    if (Opeka.chatView) {
      Opeka.chatView.deleteAllMessages();
    }
  };

  // Recieve the active user from the server.
  Opeka.clientSideMethods.receiveActiveUser = function (roomId, user) {
    var room = Opeka.roomList.get(roomId);
    if (room) {
      room.set('activeUser', user);
    }
  };

  // Receive message from the server.
  Opeka.clientSideMethods.receiveMessage = function (message) {
    if (Opeka.chatView) {
      Opeka.chatView.receiveMessage(message);
    }
  };

  // Receive typing message update from the server.
  Opeka.clientSideMethods.receiveWritesMessage = function (message) {
    if (Opeka.chatView) {
      Opeka.chatView.receiveWritesMessage(message);
    }
  };

  // Set the member count for a room.
  Opeka.clientSideMethods.updateRoomMemberCount = function (roomId, count) {
    var room = Opeka.roomList.get(roomId);
    if (room) {
      room.set('memberCount', count);
    }
  };

  // For when the server has an updated room list for us.
  Opeka.clientSideMethods.receiveRoomList = function (rooms) {
    // This triggers a reset even on the RoomList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.roomList.reset(rooms);
  };

  // For when the server has an updated queue list for us.
  Opeka.clientSideMethods.receiveQueueList = function (queues) {
    // This triggers a reset even on the queueList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.queueList.reset(queues);
  };

  // For when the server has an updated invites list for us.
  Opeka.clientSideMethods.receiveInviteList = function (invites) {
    // This triggers a reset even on the queueList instance, so any views
    // that use this list can listen to that for updates.
    Opeka.inviteList.reset(invites);
  };

  // For when the server has an updated invites list for us.
  Opeka.clientSideMethods.inviteCreated = function (newInvite) {
    // This triggers a reset even on the queueList instance, so any views
    // that use this list can listen to that for updates.
    var existing  = _.find(Opeka.inviteList.models, function (invite, delta) {
      return invite.id == newInvite.id;
    });
    if (!existing) {
      Opeka.inviteList.add(newInvite);
      Opeka.inviteList.trigger('change');
    }
  };

  // For when the server has an updated invites list for us.
  Opeka.clientSideMethods.inviteCancelled = function (inviteId) {
    // This triggers a reset even on the queueList instance, so any views
    // that use this list can listen to that for updates.
    _.each(Opeka.inviteList.models, function (invite, delta) {
      if (invite.id == inviteId) {
        Opeka.inviteList.models[delta].set('status', false);
      }
    });
    Opeka.inviteList.trigger('change');
  };

  // For when the server has an updated invites list for us.
  Opeka.clientSideMethods.inviteDeleted = function (inviteId) {
    // This triggers a reset even on the queueList instance, so any views
    // that use this list can listen to that for updates.
    _.each(Opeka.inviteList.models, function (invite, delta) {
      if (invite.id == inviteId) {
        delete(Opeka.inviteList.models[delta]);
      }
    });
    Opeka.inviteList.trigger('delete');
  };

  // Add the new room to our local room list.
  Opeka.clientSideMethods.roomCreated = function (room) {
    var roomIsAdded = Opeka.roomList.get(room.id);
    if (!roomIsAdded) {
      Opeka.roomList.add(room);
    }
  };

  // Reaction for when joining the room.
  Opeka.clientSideMethods.roomJoinFromQueue = function (roomId) {
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
  Opeka.clientSideMethods.roomUpdated = function (roomId, attributes) {
    var room = Opeka.roomList.get(roomId);

    if (room) {
      room.set(attributes);
    }
  };

  // Remove the room from the room list and show the final message to
  // any participants in that room.
  Opeka.clientSideMethods.roomDeleted = function (roomId, finalMessage) {
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

        Opeka.getExitRoute(room);

        // Remove the sidebar.
        Opeka.appViewInstance.$el.find('.sidebar').html('');
      }

      Opeka.roomList.remove(room);

    }
  };

  // Receive the whisper form an user.
  Opeka.clientSideMethods.roomRecieveWhisper = function (clientId, messageText, nickname, receiver, date) {
    if (Opeka.clientData.clientId === clientId) {
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
  Opeka.clientSideMethods.roomUserJoined = function (roomId, nickname, isAdmin) {
    if (Opeka.chatView && Opeka.chatView.model && Opeka.chatView.model.id === roomId) {
      // If the user logged into the room is admin and the joining user is a client, play a sound
      if (Opeka.clientData.isAdmin && !isAdmin) {
        Opeka.userJoinedSound();
      }
      var messageObj = {
        message: Drupal.t('@user has joined the room.', {'@user': nickname}),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being kicked.
  Opeka.clientSideMethods.roomUserKicked = function (roomId, clientId, message, user) {
    // If this client is being kicked, navigate to a different page and
    // use a FatalErrorDialog to force them to reload the page.
    if (Opeka.clientData.clientId === clientId) {
      var room = Opeka.roomList.get(roomId);

      Opeka.getExitRoute(room);

      var view = new Opeka.FatalErrorDialogView({
        message: Drupal.t('You have been kicked from the chat with the following reason: @reason.', {'@reason': message}),
        title: Drupal.t('Kicked')
      });
      view.render();
    }
    else if (Opeka.chatView.model.id === roomId) {
      var messageObj = {
        message: Drupal.t('User @user was kicked from the chat.', {'@user': user}),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Respond to a queue being flushed.
  Opeka.clientSideMethods.queueIsFlushed = function (clientId) {
    // The queue is flushed, navigate to a different page and
    // use a FatalErrorDialog to force them to reload the page.
    if (Opeka.clientData.clientId === clientId) {
      Opeka.router.navigate("rooms", {trigger: true});

      var view = new Opeka.FatalErrorDialogView({
        message: Drupal.t('The chat that you were in queue for has closed and your position in the queue with it. You are welcome to join again when the chat reopens or join a different chat room or queue.'),
        title: Drupal.t('Chat and queue closed')
      });
      view.render();
    }
  };

  // Response to a user leaving the room.
  Opeka.clientSideMethods.roomUserLeft = function (roomId, nickname, chatDuration) {
    if (Opeka.chatView && Opeka.chatView.model.id === roomId) {
      var messageObj = {
        message: Drupal.t('@user has left the room. Chat duration: @chatDuration minutes.', {'@user': nickname, '@chatDuration': chatDuration}),
        system: true
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being muted.
  Opeka.clientSideMethods.roomUserMuted = function (roomId, clientId, user, nickname) {
    var room = Opeka.roomList.get(roomId),
      messageObj = {};
    // Make sure we only mute the correct user and we got the room.
    if (Opeka.clientData.clientId === clientId && room) {
      room.set('activeUser', user);
      if (Opeka.chatView.model.id === roomId) {
        messageObj = {
          message: Drupal.t('You have been muted by @user.', {'@user': nickname}),
          system: true,
          name: nickname
        };
        Opeka.chatView.receiveMessage(messageObj);
      }
    }
    else if (room && Opeka.chatView.model.id === roomId) {
      messageObj = {
        message: Drupal.t('@user have been muted.', {'@user': user.name}),
        system: true,
        name: nickname
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  // Response to a user being unmuted.
  Opeka.clientSideMethods.roomUserUnmuted = function (roomId, clientId, user, nickname, messageText) {
    var room = Opeka.roomList.get(roomId),
      messageObj = {};
    // Make sure we only unmute the correct user and we got the room.
    if (Opeka.clientData.clientId === clientId && room) {
      room.set('activeUser', user);
      if (Opeka.chatView.model.id === roomId) {
        messageObj = {
          message: Drupal.t('You have been unmuted by @user.', {'@user': nickname}),
          system: true,
          name: nickname
        };
        Opeka.chatView.receiveMessage(messageObj);
      }
    }
    else if (room && Opeka.chatView.model.id === roomId) {
      messageObj = {
        message: Drupal.t('@user have been unmuted.', {'@user': user.name}),
        system: true,
        name: nickname
      };
      Opeka.chatView.receiveMessage(messageObj);
    }
  };

  Opeka.clientSideMethods.setIsBanned = function (isBanned) {
    Opeka.clientData.isBanned = isBanned;
  };

  // Response to a user when server responds with access denied
  Opeka.clientSideMethods.accessDenied = function (clientId) {
    var view = new Opeka.FatalErrorDialogView({
      message: Drupal.t("Sorry, something went wrong in the authentication process. Please contact support."),
      title: Drupal.t('Access denied.')
    });

    view.render();
  };

  // Response to a user not being logged in when required
  Opeka.clientSideMethods.loginRequiredMessage = function (clientId) {
    var view = new Opeka.FatalErrorDialogView({
      message: Drupal.t("To access the chat you must be logged in to the website. Please log in and try again."),
      title: Drupal.t('Login required')
    });

    view.render();
  };

  // Show error message
  Opeka.clientSideMethods.displayError = function (messageText) {
    var view = new Opeka.FatalErrorDialogView({
      message: Drupal.t(messageText),
      title: Drupal.t('Error')
    });

    view.render();
  };

  // The server pings client to determine connection status and latency
  Opeka.clientSideMethods.ping = function (serverTime, cb) {
    Opeka.lastPingReceivedServerTime = serverTime;
    // console.log('PING received, serverTime is ' + serverTime);
    Opeka.lastPingReceivedClientTime = (new Date()).getTime();
    // console.log('PING received, clientTime is ' + Opeka.lastPingReceivedClientTime);
    cb(null, Opeka.lastPingReceivedClientTime);
  };

   // If the client was offline too long, inform him and force a reload
  Opeka.clientSideMethods.reconnectTimeout = function () {
    console.log('reconnectTimeout called...');
    clearInterval(Opeka.checkOnlineTimerId);

    if (Opeka.shownFatalErrorDialog) {
      return;
    }
    $(window).unbind('beforeunload.opeka');
    $(Opeka).trigger("disconnected");
    Opeka.cleanAfterChat();
    Opeka.router.navigate("rooms", {trigger: true});
    Opeka.shownFatalErrorDialog = true;
    var view = new Opeka.FatalErrorDialogView({
      message: Drupal.t('Sorry, you were offline for too long. Please reload the page to reconnect.'),
      title: Drupal.t('Reconnect timeout')
    }).render();
  };

  /**
   * If the client user is leaving a pair room and hidePairRoomsOnRoomList is true
   * send him to the goodbye page
   */
  Opeka.getExitRoute = function (room) {
    var admin = Opeka.clientData.isAdmin;
    if (!admin && room.get('maxSize') === 2 && Opeka.features.hidePairRoomsOnRoomList === true) {
      Opeka.router.navigate("goodbye", {trigger: true});
    }
    else {
      Opeka.router.navigate("rooms", {trigger: true});
    }
  };

  Opeka.clientSideMethods.forceReload = function () {
    Opeka.changeState(Opeka.DISCONNECTED);
    Opeka.router.navigate("rooms", {trigger: true});
  };

  /**
   * Make sure user is properly removed from room
   */
  Opeka.cleanAfterChat = function () {
    // Need to make sure the chat view and sidebar is not set.
    Opeka.chatView = null;
    Opeka.appViewInstance.$el.find('.sidebar').html('');

    // Remove room size body class
    Opeka.removeRoomSizeClass();
    // We check if the user is signed in
    if (Opeka.clientData.isSignedIn) {
      Opeka.remote.cleanAfterChat(Opeka.clientData.clientId, function () {
        // If we need to take action depending on the results from the server,
        // it can be done here...
      });
    }
  };

  // Sign in to the chat app.
  Opeka.signIn = function (user, callback) {
    Opeka.remote.signIn(user, function (clientData) {
      // We attach the handler with 'one' to ensure we don't send stale data to the server
      $(Opeka).one('connected', function() {
        var matches = Backbone.history.getFragment().match(/^rooms\/(.*)$/);
        if (matches) {
          clientData.roomId = matches[1];
        }
        Opeka.signIn(clientData, function () {
          console.log('User re-signin.');
          $(window).bind('beforeunload.opeka', function () {
            return Drupal.t('Do you really want to leave this page?');
          });
        });
      });

      var destination = 'rooms',
        onlineStatus;

      // Update the clientside clientData object with new values from the server
      _.extend(Opeka.clientData, clientData);
      if (user.roomId && Opeka.roomList.models) {
        for (var delta in Opeka.roomList.models){
          if (Opeka.roomList.models[delta].id == user.roomId){
            destination = destination + '/' + user.roomId;
          }
        }
      }
      else if (user.queueId) {
        destination = 'queues' + '/' + user.queueId;
      }

      callback();

      Opeka.router.navigate(destination, {trigger: true});

      onlineStatus = new Opeka.ChatStatusView({
        model: Opeka.status
      });

      $('#navbar').find('.online-status').prepend(onlineStatus.render().el);
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
  Opeka.addRoomSizeToBody = function () {
    if ($("#room-size").data("room-size") == 2) {
      $('body').removeClass('room-size-2 groupchat').addClass('room-size-2');
    }
    else {
      $('body').removeClass('room-size-2 groupchat').addClass('groupchat');
    }
  };

  // Remove room size info from body tag
  Opeka.removeRoomSizeClass = function () {
    $('body').removeClass('room-size-2 groupchat');
  };

  // Handler for closing the screeningPopover upon click outside element    
  Opeka.screeningPopoverClose = function () {
    $('body').on('click', function (event) {
      var content;
      // if we are clicking somewhere off the button, hide the popover
      if (!$(event.target).closest('.screening-wrapper').length) {
        content = $('.screening-question');
        content.hide();
      }
    });
  };

  // Play a sound when a client joins the chat
  Opeka.userJoinedSound = function () {
    Opeka.doorBellSound.play();
  };

  // Enforce front-end limit on the number of characters in message
Opeka.limitCharacters = function () {

  $('#message-text-area').on("input", function(){
    var maxlength = Opeka.status.maxMessageLength || $(this).attr("maxlength"),
        currentLength = $(this).val().length,
        charsLeft;

    if ( currentLength >= maxlength ){
      $('#characters-remaining').show()
      .text(Drupal.t('Out of characters!'))
    } else {
      charsLeft = maxlength - currentLength;
      if (charsLeft < 30) {
        $('#characters-remaining').show()
        .text(Drupal.t('@charsLeft characters left.' , {'@charsLeft': charsLeft}));
      }
      else {
        $('#characters-remaining').hide();
      }
    }
  });
}
  // Basic setup for the app when the DOM is loaded.
  $(function () {
    var view;

    Opeka.CREATED = 1;
    Opeka.CONNECTING = 2;
    Opeka.CONNECTED = 3;
    Opeka.TRYING_RECONNECT = 4;
    Opeka.DISCONNECTED = 6;

    Opeka.changeState = function(newState) {
      var oldState = Opeka.state;
      switch(newState) {
        case Opeka.CREATED:
          Opeka.state = newState;
          break;
        case Opeka.CONNECTING:
          Opeka.state = newState;
          Opeka.startTicker();
          break;
        case Opeka.CONNECTED:
          Opeka.lastPingReceivedClientTime = (new Date()).getTime();
          if(oldState == Opeka.TRYING_RECONNECT) {
            Opeka.onReconnect();
          } else {
            Opeka.onConnect();
          }
          Opeka.state = newState;
          break;
        case Opeka.TRYING_RECONNECT:
          Opeka.state = newState;
          Opeka.onTryReconnect();
          break;
        case Opeka.DISCONNECTED:
          Opeka.state = newState;
          Opeka.onDisconnect();
          break;
        default:
          break;
      }
    };

    Opeka.changeState(Opeka.CREATED);

    Opeka.connect = function() {
      var stream = Opeka.shoe(Opeka.server_url);
      var d = Opeka.dnode(Opeka.clientSideMethods);

      d.on("remote", Opeka.onStreamConnected);
      d.on("end", Opeka.onStreamDisconnected);
      d.pipe(stream).pipe(d);

      if(Opeka.state == Opeka.CREATED) {
        Opeka.initial_connections += 1;
        d.connection_id = "initial_" + Opeka.initial_connections;
        Opeka.changeState(Opeka.CONNECTING);
      } else if(Opeka.state == Opeka.TRYING_RECONNECT) {
        d.connection_id = "reconnect_" + Opeka.number_of_reconnects_tried;
      }

      return d;
    };

    Opeka.initialize_from_drupal = function(shoe, dnode, drupal_settings) {
      Opeka.shoe = shoe;
      Opeka.dnode = dnode;
      Opeka.use_reconnect = drupal_settings.reconnect;
      if(drupal_settings.max_reconnects) {
        Opeka.max_reconnects = drupal_settings.max_reconnects;
      }
      if(drupal_settings.reconnect_interval) {
        Opeka.reconnect_interval = drupal_settings.reconnect_interval;
      }
      Opeka.server_url = drupal_settings.dnode_endpoint ||
        'http://localhost:3000/opeka';
    };

    Opeka.startTicker = function() {
      if(!Opeka.tickId) {
        Opeka.tickId = setInterval(
          function () { Opeka.tick(); },
          1000
        );
      }
    };

    Opeka.tick = function() {
      switch(Opeka.state) {
        case Opeka.CONNECTED:
          Opeka.checkTimeout();
          break;
        case Opeka.TRYING_RECONNECT:
          Opeka.onTryReconnect();
          break;
        default:
          break;
      }
    };

    Opeka.checkTimeout = function() {
      // While connected, check to see if we are timing out
      var currentTime = (new Date()).getTime();
      var delay = currentTime - Opeka.lastPingReceivedClientTime;

      if (delay > Opeka.connection_timeout) {
        console.log('Connection timed out after ', delay);
        Opeka.changeState(Opeka.TRYING_RECONNECT);
      }
    };

    Opeka.doorBellSound = new Howl({
      src: [Drupal.settings.opeka.client_login_sound]
    });
    Opeka.compileTemplates();

    // We use a bare Backbone model for containing server status.
    // Helpful for Backbone views integration.
    Opeka.status = new Backbone.Model();

    Opeka.roomList = new Opeka.RoomList();
    Opeka.queueList = new Opeka.QueueList();
    Opeka.inviteList = new Opeka.InviteList();

    Opeka.appViewInstance = new Opeka.AppView();
    Opeka.statusViewInstance = new Opeka.OnlineStatusView({
      model: Opeka.status
    });

    Opeka.appViewInstance.on('render', function (view) {
      $('#navbar').find('.online-status').prepend(Opeka.statusViewInstance.render().el);
    });

    $('#opeka-app').html(Opeka.appViewInstance.render().el);

    // Show / remove reconnect dialog
    Opeka.onTryReconnect = function () {
      var conn = Opeka.reconnect_connections,
          currentTime = (new Date()).getTime(),
          lastReconnectTime = Opeka.lastReconnectTime || 0,
          sinceLastAttempt = currentTime - lastReconnectTime;

      if(conn.length === 0 || (sinceLastAttempt >= Opeka.reconnect_interval)) {
        // Increase attempt counter and go to state DISCONNECTED if max number
        // of reconnect attemps has been reached.
        Opeka.number_of_reconnects_tried += 1;
        if(Opeka.number_of_reconnects_tried > Opeka.max_reconnects) {
          Opeka.changeState(Opeka.DISCONNECTED);
          return;
        }
        conn.push(Opeka.connect());
        console.log("Retry connections", conn);
        Opeka.lastReconnectTime = currentTime;
      }

      if (Opeka.shownReconnectingDialog || Opeka.shownFatalErrorDialog) {
        return;
      }
      Opeka.shownReconnectingDialog = true;
      Opeka.reconnectView = new Opeka.ReconnectingDialogView().render();
      if(Opeka.chatView) {
        Opeka.chatView.render();
      }
    };

    Opeka.onReconnect = function() {
        Opeka.shownReconnectingDialog = false;
        if(Opeka.reconnectView) {
          Opeka.reconnectView.remove();
        }
        // Sign the user in again to re-establish their permissions, adding
        // the clientId to the userdata sent to the server, so it can know
        // we are reconnecting.
        var  userdataWithClientId = _.extend(
          Drupal.settings.opeka.user,
          {'clientId': Opeka.clientData.clientId}
        );
        // Tell the server to reconnect us with the previous client. If this
        // succeeds the server will call the clientSideMethod "reconnectDone".
        Opeka.remote.reconnect(userdataWithClientId, function() {
          console.log("Server reconnected us!");
          Opeka.remote.getFeatures(function (features) {
            Opeka.features = features;
            // TODO: Show a message to the user about the connection being
            // reestablished?
          });
        });
    };

    // If the connection is dropped, try to reconnect if we have timed out
    // (and are configured to reconnect), else drop connection.
    Opeka.onStreamDisconnected = function() {
      if(Opeka.use_reconnect) {
        if(Opeka.state != Opeka.TRYING_RECONNECT) {
          Opeka.changeState(Opeka.TRYING_RECONNECT);
        }
      } else {
        Opeka.changeState(Opeka.DISCONNECTED);
      }
    };
    // This happens when the connection is finally terminated, after
    // any attempts to reconnect have failed. Can also be triggered by a
    // client-side or server-side teardown.
    Opeka.onDisconnect = function () {
      // If the user is banned, tell him to go away.
      if (Opeka.clientData.isBanned) {
        view = new Opeka.BannedDialogView().render();
        return;
      }

      // Wait five seconds before showing the dialog, in case the
      // disconnect was caused by the user reloading the page.
      window.setTimeout(function () {
        if (Opeka.shownFatalErrorDialog) {
          return;
        }
        // Remove any reconnectview that is currently being shown
        if(Opeka.reconnectView) {
          Opeka.reconnectView.remove();
        }
        Opeka.shownFatalErrorDialog = true;
        $(window).unbind('beforeunload.opeka');
        $(Opeka).trigger("disconnected");
        view = new Opeka.FatalErrorDialogView({
          message: Drupal.t(`Your connection to the chat server was lost. 
          Please reconnect. Contact support if problem persists.`),
          title: Drupal.t('Disconnected')
        }).render();
      }, 5000);
    };

    // Check whether the serverside javascript has loaded
    window.setTimeout(function () {
      if (!Opeka.serverJSLoaded) {
        $(window).unbind('beforeunload.opeka');
        view = new Opeka.FatalErrorDialogView({
          message: Drupal.t(`Your connection to the chat server was lost. 
          Please reconnect. Contact support if problem persists.`),
          title: Drupal.t('Disconnected')
        }).render();
      }
    }, 2000);


    // Once the page is loaded, start our app.
    var nf = new Opeka.NotFoundRouter();
    Opeka.router = new Opeka.MainRouter();

    Backbone.history.start();
  });

  // Set up connect handler.
  Opeka.onStreamConnected = function (remote, dnode_instance) {
    console.log("Stream connected for ", dnode_instance.connection_id);
    if(dnode_instance._reconnect_handled) {
      console.log("Skipping handled dnode instance", dnode_instance.connection_id);
      return;
    }
    // Register new remote method proxy.
    Opeka.remote = remote;

    // If we connected to a reconnect-attempt-stream, we need to cancel
    // other reconnect attempts.
    if(Opeka.state == Opeka.TRYING_RECONNECT) {
      // Try to close any other pending connection attemps. They need to be
      // closed while still in TRYING_RECONNECT as they otherwise would
      // cause the client to go back into TRYING_RECONNECT mode.
      console.log('Reconnect connection established!');

      // Destroy original dnode connection unless it is the one that
      // reconnected.
      if(Opeka.dnode_instance &&
         Opeka.dnode_instance.connection_id != dnode_instance.connection_id) {
        Opeka.dnode_instance._reconnect_handled = true;
        Opeka.dnode_instance.destroy();
      }
      // Destroy any dnode connections except for the one that reconnected.
      var attempts = Opeka.reconnect_connections;
      _.each(attempts, function(attempt) {
        console.log("Cleaning up old connection: ", attempt.connection_id, dnode_instance.connection_id);
        if(attempt.connection_id !== dnode_instance.connection_id) {
          attempt._reconnect_handled = true;
          attempt.destroy();
        }
      });
      Opeka.reconnect_connections = [];
    } else {
      console.log('Initial connection established!');
    }
    Opeka.dnode_instance = dnode_instance;
    Opeka.changeState(Opeka.CONNECTED);
  };

  Opeka.onConnect = function() {
    updateReconnectTimes();
    Opeka.number_of_reconnects_tried = 0;
    Opeka.remote.getFeatures(function (features) {
      Opeka.features = features;
    });
    $(Opeka).trigger("connected");
  };

}(jQuery));