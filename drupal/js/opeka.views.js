/*!
 * Copyright 2012 Cyberhus.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
/*global _, Backbone, Drupal, JST, now, Opeka, window */
(function ($) {
  "use strict";

  // The main container view, wrapper for most of the interface.
  Opeka.AppView = Backbone.View.extend({
    className: 'app-view',

    initialize: function (options) {
      _.bindAll(this);
    },

    render: function (content) {
      this.$el.html(JST.opeka_app_tmpl({
        content: content || Drupal.t('Loading chat…')
      }));

      // Trigger a render event on the view, so others may react.
      this.trigger('render', this);

      return this;
    },

    // Replace the main content of the app/page.
    replaceContent: function (newContent) {
      this.$el.children('.content').html(newContent);
    }
  });


  // The actual chat window.
  Opeka.ChatView = Backbone.View.extend({
    events: {
      "click .delete-message": "deleteMessage",
      "submit .message-form": "sendMessage",
      "submit .leave-queue-form": "leaveQueue",
      "submit .leave-room-form": "leaveRoom"
    },

    initialize: function (options) {
      _.bindAll(this);

      this.admin = options.admin;
      this.messages = [];
      this.inQueue = options.inQueue;

      this.model.on('change', this.render, this);

      return this;
    },

    formatTimestamp: function (date) {
      // Convert to date object if it is not one already.
      if (!_.isDate(date)) {
        date = new Date(date);
      }

      return date.toLocaleTimeString();
    },

    render: function () {
      if (!this.messages) { return this; }

      var activeUser = this.model.get('activeUser') || { muted: false },
          inQueueMessage = '',
          hideForm = false,
          formPresent = true;

      // If user is in the queue, show it to him.
      if (this.inQueue !== false) {
        inQueueMessage = Drupal.t('Chat room is full, you are currently in queue as number: @number. You can stay and wait until you can enter or leave the queue.', {'@number': this.inQueue + 1});
      }

      // Hide the send message form if room is paused, user is muted or
      // in queue.
      hideForm = !this.model.get('paused') && !activeUser.muted && this.inQueue === false;

      // Figure out if the message form is currently present.
      formPresent = this.$el.find(".message-form").length > 0;

      // For the first time the view is rendered, create some wrapper divs.
      if (this.$el.find('.chat-view-window').length === 0) {
        hideForm = 'show';
        this.$el.html('<div class="chat-view-window"></div><div class="chat-view-form"</div>');
      }

      // Always render the chat window.
      this.$el.find('.chat-view-window').html(JST.opeka_chat_tmpl({
        admin: this.admin,
        formatTimestamp: this.formatTimestamp,
        labels: {
          deleteMessage: Drupal.t('Delete'),
          whispered: Drupal.t('WHISPERED'),
          whisperedTo: Drupal.t('WHISPERED TO'),
        },
        messages: this.messages,
      }));

      // Conditionally render the message form.
      if (hideForm !== formPresent || this.inQueue !== false) {
        this.$el.find('.chat-view-form').html(JST.opeka_chat_form_tmpl({
          activeUser: activeUser,
          admin: this.admin,
          labels: {
            inQueueMessage: inQueueMessage,
            leaveQueueButton: Drupal.t('Leave queue'),
            leaveRoomButton: Drupal.t('Leave chat room'),
            placeholder: Drupal.t('Type message here…'),
            roomPaused: '[' + Drupal.t('The room is paused') + ']',
            userMuted: '[' + Drupal.t('You are muted') + ']',
            messageButton: Drupal.t('Send message')
          },
          inQueue: this.inQueue,
          room: this.model
        }));
      }

      return this;
    },

    // For when the delete button next to a message is pressed.
    deleteMessage: function (event) {
      var messageId = $(event.currentTarget).closest('li').attr('data-message-id');

      now.roomDeleteMessage(this.model.id, messageId);

      if (event) {
        event.preventDefault();
      }
    },

    // Delete all messages in a room.
    deleteAllMessages: function (event) {
      // Delete messages by setting them to an empty array.
      this.messages = [];
      this.render();
    },

    // Make the user leave the queue for a chat room.
    leaveQueue: function (event) {
      // Remove the user from the Queue.
      now.removeUserFromQueue(this.model.id, now.core.clientId);
      Opeka.router.navigate("rooms", {trigger: true});

      if (event) {
        event.preventDefault();
      }
    },

    // Make the user leave the chat room.
    leaveRoom: function (event) {
      // Special case for owner leaving the room.
      if (this.model.get('maxSize') === 2 && (Drupal.settings.opeka.user && this.model.get('uid') === Drupal.settings.opeka.user.uid)) {
        var dialog = new Opeka.RoomLeaveOwnPairRoomDialogView({
          roomId: this.model.id
        });
        dialog.render();
      }
      else {
        // Remove the user from the room.
        now.removeUserFromRoom(this.model.id, now.core.clientId);
        $(window).trigger('leaveRoom');
        Opeka.router.navigate("rooms", {trigger: true});
      }

      if (event) {
        event.preventDefault();
      }
    },

    // Called externally when a message is to be removed.
    messageDeleted: function (messageId) {
      this.messages = _.reject(this.messages, function (message) {
        return (message.messageId === messageId);
      });

      this.render();
    },

    receiveMessage: function (message) {
      if (!this.inQueue) {
        this.messages.push(message);
        this.render();
      }
    },

    sendMessage: function (event) {
      var message = this.$el.find('input.message').val();
      // Remove the message sent.
      this.$el.find('input.message').val('');
      if (message !== '') {
        now.sendMessageToRoom(this.model.id, message);
      }

      if (event) {
        event.preventDefault();
      }
    }
  });

  // Sidebar for the chat with user lists and admin options.
  Opeka.ChatSidebarView = Backbone.View.extend({
    className: 'opeka-chat-sidebar',

    events: {
      "click .clear-messages": "clearMessages",
      "click .delete-room": "deleteRoom",
      "click .kick-user": "kickUser",
      "click .mute-user": "muteUser",
      "click .pause-toggle": "pauseToggle",
      "click .unmute-user": "unmuteUser",
      "click .whisper": "whisper"
    },

    initialize: function (options) {
      var self = this;
      this.admin = options.admin;
      _.bindAll(this);

      this.model.on('change:userList', this.render, this);
      this.model.on('change:paused', this.render, this);
      $(window).bind('leaveRoom', function(){
        self.remove();
      });
    },

    render: function () {
      var pauseLabel = Drupal.t('Pause chat');
      if (this.model.get('paused')) {
        pauseLabel = Drupal.t('Unpause chat');
      }

      if (JST.opeka_chat_sidebar_tmpl) {
        this.$el.html(JST.opeka_chat_sidebar_tmpl({
          admin: this.admin,
          clientId: now.core.clientId,
          labels: {
            clearMessages: Drupal.t("Clear messages"),
            deleteRoom: Drupal.t('Delete room'),
            gender: { f: Drupal.t('woman'), m: Drupal.t('man') },
            kickUser: Drupal.t('Kick user'),
            muteUser: Drupal.t('Mute user'),
            pauseToggle: pauseLabel,
            placeholder: Drupal.t('No users'),
            unmuteUser: Drupal.t('Unmute user'),
            whisper: Drupal.t('Whisper')
          },
          room: this.model,
          users: this.model.get('userList')
        }));
      }

      return this;
    },

    clearMessages: function (event) {
      var view = new Opeka.RoomClearView({
        model: this.model
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    },

    deleteRoom: function (event) {
      var view = new Opeka.RoomDeletionView({
        model: this.model
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    },

    // For when the pause/unpause button is pressed.
    pauseToggle: function (event) {
      if (!this.model.get('paused')) {
        now.pauseRoom(this.model.id, function (err) {});
      } else {
        now.unpauseRoom(this.model.id, function (err) {});
      }

      if (event) {
        event.preventDefault();
      }
    },

    // For when a user needs to be kicked.
    kickUser: function (event) {
      var view = new Opeka.RoomKickUserView({
        clientId: $(event.currentTarget).closest('li').attr('data-client-id'),
        model: this.model
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    },

    // For when you need to mute a user.
    muteUser: function (event) {
      var clientId = $(event.currentTarget).closest('li').attr('data-client-id');
      now.mute(this.model.id, clientId);

      if (event) {
        event.preventDefault();
      }
    },

    // For when you need to unmute a user.
    unmuteUser: function (event) {
      var clientId = $(event.currentTarget).closest('li').attr('data-client-id');
      now.unmute(this.model.id, clientId);

      if (event) {
        event.preventDefault();
      }
    },

    // Open dialog to whisper to an user.
    whisper: function (event) {
      var view = new Opeka.RoomWhisperView({
        clientId: $(event.currentTarget).closest('li').attr('data-client-id'),
        model: this.model,
        name: $(event.currentTarget).closest('li').find('.name').text()
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    }

  });

  // Basic view for showing a jQuery UI dialog.
  Opeka.DialogView = Backbone.View.extend({
    className: "dialog-view",

    initialize: function (options) {
      _.bindAll(this);

      this.dialogOptions = {
        buttons: {},
        close: this.remove,
        draggable: false,
        modal: true,
        resizable: false,
        title: options.title,
      };

      // If the caller provided dialog options, merge them into our defaults.
      if (options.dialogOptions) {
        _.extend(this.dialogOptions, options.dialogOptions);
      }

      this.options = options;
      this.dialogElement = $(this.make('div', this.className));
    },

    addButton: function (title, callback) {
      this.dialogOptions.buttons[title] = callback;

      return this;
    },

    // Close dialog and remove view from DOM.
    remove: function () {
      $(this.el).remove();

      if (this.dialogElement){
        this.dialogElement.dialog("destroy").remove();
        this.dialogElement = null;
      }

      return this;
    },

    render: function () {
      this.dialogElement.html(this.options.content);
      this.dialogElement.appendTo(this.$el);
      this.dialogElement.dialog(this.dialogOptions);

      return this;
    }
  });

  // Message dialog lets the user know he's banned from the system.
  Opeka.BannedDialogView = Opeka.DialogView.extend({
    initialize: function (options) {
      // Make sure options is an object.
      options = options || {};

      // Leave the page when the dialog is closed.
      options.dialogOptions = {
        close: function () {
          window.location = '/';
        }
      };

      // Provide a default title.
      options.title = options.title || Drupal.t('You are banned.');

      // Provide a default message.
      options.message = options.message || Drupal.t('The IP address you are currently visiting the site from is banned from the chat system. You will not be able to participate in the chat.');

      options.content = this.make('p', { 'class': "message" }, options.message);

      // Call the parent initialize once we're done customising.
      return Opeka.DialogView.prototype.initialize.call(this, options);
    }
  });

  // Message dialog that forces the user to reload the page to continue.
  Opeka.FatalErrorDialogView = Opeka.DialogView.extend({
    initialize: function (options) {
      // Reload the page when the dialog is closed.
      options.dialogOptions = {
        close: function () {
          window.location.reload();
        }
      };

      options.content = this.make('p', { 'class': "message" }, options.message);

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      // Add a reload button that does the same.
      this.addButton(Drupal.t('Reload'), function () {
        window.location.reload();
      });

      return this;
    }
  });

  // Simple view displayed in the footer containing status for the chat.
  Opeka.OnlineStatusView = Backbone.View.extend({
    tagName: 'p',
    className: 'online-status-view',

    initialize: function (options) {
      _.bindAll(this);

      // Bind to the global status model.
      if (Opeka.status) {
        this.model = Opeka.status;
      }

      return this;
    },

    render: function () {
      // Don’t render if we don’t have a status.
      if (this.model.has('councellors') && this.model.has('guests')) {
        this.$el.html(JST.opeka_online_status_tmpl({
          content: Drupal.t('There are !guests guests and !councellors councellors online', {
              '!guests': '<span class="guests">' + this.model.get('guests') + '</span>',
              '!councellors': '<span class="councellors">' + this.model.get('councellors') + '</span>'
          })
        }));
      }

      return this;
    }
  });

  // Dialog to confirm the deletion of all messages.
  Opeka.RoomClearView = Opeka.DialogView.extend({
    initialize: function () {
      // Options passed to DialogView.
      var options = {};

      _.bindAll(this);

      // For when creating new room.
      if (!options.room) {
        options.content = JST.opeka_room_clear_tmpl({
          labels: {
            explanation: Drupal.t('Please confirm that all messages in this room should be deleted.'),
          }
        });
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Confirm clear messages')
        };

        options.dialogOptions.buttons[Drupal.t('Delete messages')] = this.clearMessages;
      }

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.clearMessages);

      return this;
    },

    clearMessages: function (event) {
      now.triggerDeleteAllMessages(this.model.id);
      this.remove();

      if (event) {
        event.preventDefault();
      }
    }
  });

  // Dialog to edit/create rooms with.
  Opeka.RoomDeletionView = Opeka.DialogView.extend({
    initialize: function () {
      // Options passed to DialogView.
      var options = {};

      _.bindAll(this);

      // For when creating new room.
      if (!options.room) {
        options.content = JST.opeka_room_delete_tmpl({
          labels: {
            explanation: Drupal.t('Please confirm the deletion of this room. You can provide a final message that will be shown to all participants when the room is closed.'),
            finalMessage: Drupal.t('Final message')
          }
        });
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Confirm deletion')
        };

        options.dialogOptions.buttons[Drupal.t('Delete room')] = this.deleteRoom;
      }

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.deleteRoom);

      return this;
    },

    deleteRoom: function (event) {
      var finalMessage = this.dialogElement.find('.final-message').val();

      now.deleteRoom(this.model.id, finalMessage);
      this.remove();

      if (event) {
        event.preventDefault();
      }
    }
  });

  // Dialog to edit/create rooms with.
  Opeka.RoomEditView = Opeka.DialogView.extend({
    initialize: function () {
      // Options passed to DialogView.
      var options = {};

      _.bindAll(this);

      // For when creating new room.
      if (!options.room) {
        options.content = JST.opeka_room_edit_tmpl({
          labels: {
            any: Drupal.t('Any'),
            dk: Drupal.t('Denmark'),
            name: Drupal.t('Name'),
            iPLocation: Drupal.t('IP location'),
            outDk: Drupal.t('Outside Denmark/Scandinavia'),
            privateRoom: Drupal.t('Private room?'),
            size: Drupal.t('Size limit'),
            users: Drupal.t('users')
          }
        });
        options.room = new Opeka.Room({});
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Create new room'),
          width: 400
        };

        options.dialogOptions.buttons[Drupal.t('Create room')] = this.saveRoom;
      }

      options.dialogOptions.buttons[Drupal.t('Discard changes')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      return this;
    },

    render: function () {
      Opeka.DialogView.prototype.render.call(this);

      this.dialogElement.find('form').submit(this.saveRoom);
    },

    // When the save room button is clicked.
    saveRoom: function (event) {
      var form = $(this.dialogElement).find('form'),
          values = {
            name: form.find('input.name').val(),
            maxSize: form.find('select.max-size').val(),
            ipLocation: form.find('select.ip-location').val(),
            private: form.find('input.private').attr('checked'),
          },
          view = this;

      this.options.room.save(values, {
        success: function (self, newRoom) {
          view.remove();
          Opeka.roomList.add(newRoom);
          Opeka.router.navigate("rooms/" + newRoom.id, {trigger: true});
        }
      });

      if (event) {
        event.preventDefault();
      }
    }
  });

  Opeka.RoomLeaveOwnPairRoomDialogView =  Opeka.DialogView.extend({
    initialize: function (options) {
      // Options passed to DialogView.
      var options = {
        roomId: options.roomId
      };

      _.bindAll(this);

      // For when creating new room.
      options.content = JST.opeka_room_own_pair_room_tmpl({
        labels: {
          explanation: Drupal.t('You are about to leave a pair room that you created - are you sure you want to do this?'),
        }
      });
      options.dialogOptions = {
        buttons: {},
        title: Drupal.t('Comfirm: leave room'),
        width: 400
      };
      options.dialogOptions.buttons[Drupal.t('Leave room')] = this.leaveRoom;
      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.cancel;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      return this;
    },

    cancel: function (event) {
      this.remove();

      if (event) {
        event.preventDefault();
      }
    },


    leaveRoom: function (event) {
      // Remove the user from the room.
      now.removeUserFromRoom(this.options.roomId, now.core.clientId);
      $(window).trigger('leaveRoom');
      Opeka.router.navigate("rooms", {trigger: true});
      this.remove();

      if (event) {
        event.preventDefault();
      }
    }
  });

  // List of rooms the user can enter.
  Opeka.RoomListView = Backbone.View.extend({
    events: {
      "click .create-room": "createRoom"
    },

    initialize: function (options) {
      _.bindAll(this);

      // Re-render our list whenever the roomList changes.
      Opeka.roomList.on('add', this.render);
      Opeka.roomList.on('change', this.render);
      Opeka.roomList.on('remove', this.render);
      Opeka.roomList.on('reset', this.render);

      return this;
    },

    render: function () {
      var roomList = Opeka.roomList,
          hidePairRooms = false,
          html = '';
      // Hide rooms with only two slots.
      if (Opeka.features && Opeka.features.hidePairRoomsOnRoomList) {
        hidePairRooms = true;
      }

      html = JST.opeka_room_list_tmpl({
        admin: _.isFunction(now.isAdmin),
        labels: {
          createRoom: Drupal.t('Create room'),
          placeholder: Drupal.t('No rooms created'),
        },
        hidePairRooms: hidePairRooms,
        rooms: roomList
      });

      if (hidePairRooms) {
        html += JST.opeka_pair_room_list_tmpl({
          admin: _.isFunction(now.isAdmin),
          rooms: roomList
        });
      }

      if (_.isFunction(now.isAdmin)) {
        html += JST.opeka_room_list_create_room_tmpl({
          labels: {
            createRoom: Drupal.t('Create room')
          }
        });
      }

      this.$el.html(html);

      return this;
    },

    // Open the dialog to create a new room.
    createRoom: function () {
      var dialog = new Opeka.RoomEditView();

      dialog.render();
    }
  });

  // Dialog for confirming that user should be kicked.
  Opeka.RoomKickUserView = Opeka.DialogView.extend({
    initialize: function (options) {
      this.clientId = options.clientId;

      _.bindAll(this);

      options.content = JST.opeka_kick_user_tmpl({
        labels: {
          kickMessage: Drupal.t('Kick message')
        }
      });

      options.dialogOptions = {
        buttons: {},
        title: Drupal.t('Confirm kick')
      };

      options.dialogOptions.buttons[Drupal.t('Kick user')] = this.kickUser;

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.kickUser);

      return this;
    },

    // Utility function for kicking the user.
    kickUser: function (event) {
      var form = $(this.dialogElement).find('form'),
          message = form.find('input.kick-message').val();

      // Kick the user.
      now.kick(this.clientId, message, this.model.id);
      this.remove();
      // Prevent event if needed.
      if (event) {
        event.preventDefault();
      }
    }

  });

  Opeka.RoomWhisperView = Opeka.DialogView.extend({
    initialize: function (options) {
      this.clientId = options.clientId;

      _.bindAll(this);

      options.content = JST.opeka_whisper_tmpl({
        labels: {
          whisperMessage: Drupal.t('Whisper message')
        }
      });

      options.dialogOptions = {
        buttons: {},
        title: Drupal.t('Whisper @name', {'@name': options.name})
      };

      options.dialogOptions.buttons[Drupal.t('Whisper')] = this.whisper;

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.whisper);

      return this;
    },

    // Utility function for kicking the user.
    whisper: function (event) {
      var form = $(this.dialogElement).find('form'),
          message = form.find('input.whisper-message').val();

      // Whisper the user.
      now.whisper(this.clientId, message);
      this.remove();
      // Prevent event if needed.
      if (event) {
        event.preventDefault();
      }
    }

  });

  // Sign-in form to get the chat started.
  Opeka.SignInFormView = Backbone.View.extend({
    events: {
      "click .connect": "preventDoublePost",
      "submit form": "signIn"
    },

    initialize: function (options) {
      this.nonce = options.nonce;

      _.bindAll(this);

      return this;
    },

    render: function () {
      var name = '';

      if (Drupal.settings.opeka.user && Drupal.settings.opeka.user.name) {
        name = Drupal.settings.opeka.user.name;
      }

      var form = JST.opeka_connect_form_tmpl({
        labels: {
          action: Drupal.t('Ready for chat…'),
          age: Drupal.t('Age'),
          gender: Drupal.t('Gender'),
          female: Drupal.t('Female'),
          male: Drupal.t('Male'),
          nick: Drupal.t('Nickname'),
          placeholder: Drupal.t('Anonymous')
        },
        name: name
      });

      this.$el.html(form);

      return this;
    },

    preventDoublePost: function () {
      this.$el.find('button')
        .attr("disabled", true)
        .text(Drupal.t('Starting chat…'));
    },

    signIn: function (event) {
      var user = Drupal.settings.opeka.user || {},
          view = this;

      user.nickname = this.$el.find('.nickname').val() || Drupal.t('Anonymous');
      user.age = this.$el.find('.age').val();
      user.gender = this.$el.find('.gender').val();
      user.roomId = this.roomId;

      Opeka.signIn(user, function () {
        view.$el.fadeOut();
      });

      if (event) {
        event.preventDefault();
      }
    }
  });

}(jQuery));
