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
    'dnode': null,
    // Boolean specifying whether the serverside Javascript loaded successfully
    'serverJSLoaded': false,
    'doorBellSound': null
  },
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
            model: room
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
  }

  // Response to a user not entering the correct access code
  Opeka.clientSideMethods.accessDenied = function (clientId) {
    var view = new Opeka.FatalErrorDialogView({
      message: Drupal.t("Sorry, you did not enter the correct code."),
      title: Drupal.t('Wrong code.')
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

      var once = true;
      if (once){
        once = false;
        $(Opeka).on('connected', function() {
          var matches = Backbone.history.getFragment().match(/^rooms\/(.*)$/);
          if (matches) {
            clientData.roomId = matches[1];
          }
          Opeka.signIn(clientData, function () {
            console.log('User re-signin');
            $(window).bind('beforeunload.opeka', function () {
              return Drupal.t('Do you really want to leave this page?');
            });
          });
        });
      }

      var destination = 'rooms',
        footer;

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

      footer = new Opeka.ChatFooterView({
        model: Opeka.status,
        banCodeGenerator: Opeka.clientData.canGenerateBanCode
      });

      /**
       * @todo sometimes this function runs twice, it's going from user.authenticate function.
       * let's check if '.opeka-chat-footer' not created yet.
       */
      var footerblock = $('#opeka-app .footer');
      if (footerblock.find('.opeka-chat-footer').length) {
        footerblock.html(footer.render().el);
      }
      else {
        footerblock.append(footer.render().el);
      }

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

  // Basic setup for the app when the DOM is loaded.
  $(function () {
    var view;
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
      view.$el.find('.footer').append(Opeka.statusViewInstance.render().el);
    });

    $('#opeka-app').html(Opeka.appViewInstance.render().el);

    // If the connection is dropped, advise the user that he has to
    // reload the page.

    Opeka.onReconnect = function () {
      if (Opeka.shownReconnectingDialog) {
        return;
      }
      Opeka.shownReconnectingDialog = true;
      var view = new Opeka.ReconnectingDialogView().render();
      $(Opeka).on('connected disconnected', function () {
        Opeka.shownReconnectingDialog = false;
        view.remove();
      });
    };

    Opeka.onDisconnect = function () {

      // If the user is banned, tell him to go away.
      if (Opeka.clientData.isBanned) {
        view = new Opeka.BannedDialogView().render();
        return;
      }

      // Wait five seconds before showing the dialog, in case the
      // disconnect was caused by the user reloading the page.
      window.setTimeout(function () {
        $(Opeka).trigger("disconnected");
        $(window).unbind('beforeunload.opeka');
        view = new Opeka.FatalErrorDialogView({
          message: Drupal.t('Your connection to the chat server was lost. Please reconnect. Contact support if problem persists.'),
          title: Drupal.t('Disconnected')
        }).render();
      }, 5000);
    };

    // Check whether the serverside javascript has loaded
    window.setTimeout(function () {
      if (!Opeka.serverJSLoaded) {
        $(window).unbind('beforeunload.opeka');
        view = new Opeka.FatalErrorDialogView({
          message: Drupal.t('Your connection to the chat server was lost. Please reconnect. Contact support if problem persists.'),
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
  Opeka.onConnect = function (remote) {
    Opeka.remote = remote;
    Opeka.numReconnects = 0;
    Opeka.remote.getFeatures(function (features) {
      Opeka.features = features;
    });
    $(Opeka).trigger("connected");
  };

}(jQuery));
