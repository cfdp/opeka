
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
  });//END AppView


  // The actual chat window.
  Opeka.ChatView = Backbone.View.extend({
    events: {
      "click .delete-message": "deleteMessage",
      "submit .message-form": "sendMessage",
      "keyup .form-text": "sendMessageonEnter",
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

      var activeUser = this.model.get('activeUser'),
          inQueueMessage = '',
          hideForm = false,
          formPresent = true;
      if (!activeUser) {
        activeUser = {muted:false};
      }
      
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
        this.$el.html('<div class="chat-view-window"></div><div class="chat-view-form"></div>');
      }


      // Always render the chat window.
      this.$el.find('.chat-view-window').html(JST.opeka_chat_tmpl({
        admin: this.admin,
        formatTimestamp: this.formatTimestamp,
        labels: {
          deleteMessage: Drupal.t('Delete'),
          whispered: Drupal.t('Whispered'),
          whisperedTo: Drupal.t('Whispered to'),
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
            mutehelptext: Drupal.t('When you are muted, you are not allowed to send any messages until the counselor decides to unmute you. You can see all the other messages and receive whispers.'),
            roomPaused: Drupal.t('The room is paused'),
            userMuted: Drupal.t('You are muted'),
            messageButton: Drupal.t('Send')
          },
          inQueue: this.inQueue,
          room: this.model
        }));
      }

      // @daniel
      // Keep the scrollbar at the bottom of the .chat-message-list
      var message_list = this.$el.find('.chat-message-list');
      message_list.scrollTop(message_list.prop("scrollHeight"));
      return this;
    },

    // For when the delete button next to a message is pressed.
    deleteMessage: function (event) {
      var view = new Opeka.RemoveSingleMessage({
        messageId: $(event.currentTarget).closest('li').attr('data-message-id'),
        model: this.model
      });

      view.render();

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
      
        //Opeka.router.navigate("rooms", {trigger: true});
        //@daniel
        //reroute the user to the feedback page
        Opeka.router.navigate("feedback", {trigger: true});
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

        // @daniel
        // Keep the scrollbar at the bottom of the .chat-message-list
        var message_list = this.$el.find('.chat-message-list');
        message_list.scrollTop(message_list.prop("scrollHeight"));
      }
    },

    sendMessage: function (event) {

      // @daniel
      // Replaced the input with a textarea to have multiple writing lines available
      var message = this.$el.find('textarea.message').val();
      // Remove the message sent and regain focus
      this.$el.find('textarea.message').val('').focus();
      
      if (message !== '') {
        now.sendMessageToRoom(this.model.id, message);
      }

      if (event) {
        event.preventDefault();
      }
    },

    // @daniel
    // Enable sending messages when pressing the ENTER(return) key
    sendMessageonEnter: function(event) {
      var message = this.$el.find('textarea.message').val();
      var code = (event.keyCode || event.which);
      
      // Listen for the key code
      if(code == 13) {
        
        // On pressing ENTER there is a new line element inserted in the textarea,
        // that we have to ignore and clear the value of the textarea
        if (message.length == 1) {
          this.$el.find('textarea.message').val('');
        }

        if (message !== '') {
          this.$el.find('.message-form').submit();
        }
      }

    }
  });// END ChatView

  // Sidebar for the chat with user lists and admin options.
  Opeka.ChatSidebarView = Backbone.View.extend({
    className: 'opeka-chat-sidebar',

    events: {
      "click .clear-messages": "clearMessages",
      "click .delete-room": "deleteRoom",
      "click .kick-user": "kickUser",
      "click .ban-user": "banUser",
      "click .mute-user": "muteUser",
      "click .pause-toggle": "pauseToggle",
      "click .unmute-user": "unmuteUser",
      "click .sidebar-block-heading": "sidebarBlocktoggle",
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
            banUser: Drupal.t('Ban user'),
            muteUser: Drupal.t('Mute user'),
            pauseToggle: pauseLabel,
            placeholder: Drupal.t('No users'),
            unmuteUser: Drupal.t('Unmute user'),
            whisper: Drupal.t('Whisper'),
            registrationform: Drupal.t('Registration form')
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
        model: this.model,
        name: $(event.currentTarget).closest('li').find('.name').text()
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    },

    //@daniel
    // For when a user needs to be banned.
    banUser: function (event) {
      var view = new Opeka.RoomBanUserView({
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

    // @daniel
    // For toggling visibility on chat room menu items
    sidebarBlocktoggle: function (event) {
      var head = $(event.currentTarget),
          body = head.next('.sidebar-block-content'),
          arrow = head.children('.arrow');
      
      body.toggle();

      if(arrow.hasClass('down')){
        arrow.removeClass('down').addClass('up');
      }else{
        arrow.removeClass('up').addClass('down');
      }
      
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

  });// END ChatSidebarView

  // Footer for the chat with generate ban code button.
  Opeka.ChatFooterView = Backbone.View.extend({
    className: 'opeka-chat-footer',

    events: {
      "click .generate-ban-code": "generateBanCode",
      "click .chat-toggle": "toggleChat"
    },

    initialize: function (options) {
      var self = this;
      this.banCodeGenerator = options.banCodeGenerator;
      this.chatOpen = Opeka.status.attributes.chatOpen;
      this.model.on('change:chatOpen', this.render, this);
      _.bindAll(this);

    },

    render: function () {
      if (JST.opeka_chat_footer_tmpl) {
        this.$el.html(JST.opeka_chat_footer_tmpl({
          banCodeGenerator: this.banCodeGenerator,
          chatOpen: Opeka.status.attributes.chatOpen,
          labels: {
            banCode: Drupal.t('Generate new ban code'),
            chatOpen: Drupal.t('Open chat'),
            chatClose: Drupal.t('Close chat')
          }
        }));
      }

      return this;
    },

    generateBanCode : function (event) {
      now.getBanCode(function(banCode) {
        var dialog = new Opeka.BanCodeDialogView({banCode: banCode});

        dialog.render();
      });

      if (event) {
        event.preventDefault();
      }
    },

    toggleChat: function (event) {
        now.toggleChat(function(newChatState) {
      });

      if (event) {
        event.preventDefault();
      }
    }
  });

  Opeka.QueueView = Backbone.View.extend({
    events: {
      "submit .leave-queue-form": "leaveQueue"
    },

    initialize: function (options) {
      _.bindAll(this);

      this.model.on('change', this.render, this);

      return this;
    },

    render: function () {
      var html;

      html = JST.opeka_queue_page_tmpl({
        labels: {
          leaveQueue: Drupal.t('Leave queue'),
          placeholder: Drupal.t('You are currently number @position in the queue. Number of rooms you can join from this queue: @rooms.', {'@position': this.position, '@rooms': this.rooms})
        }
      });

      this.$el.html(html);

      return this;

    },

    leaveQueue: function (event) {
      // Remove the user from the room.
      now.removeUserFromGlobalQueue(this.model.id, now.core.clientId);
      Opeka.router.navigate("rooms", {trigger: true});
      this.remove();

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
  });// END DialogView

  Opeka.BanCodeDialogView =  Opeka.DialogView.extend({
    initialize: function (options) {
      _.bindAll(this);

      options.dialogOptions = {
        buttons: {},
        title: Drupal.t('Ban code generated'),
        width: 400,
      };
      // Add the actual ban code.
      options.content = options.banCode;
      options.dialogOptions.buttons[Drupal.t('Close')] = this.close;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      return this;
    },

    close: function (event) {
      this.remove();

      if (event) {
        event.preventDefault();
      }
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
  });// END FatalErrorDialogView

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
  });// END OnlineStatusView

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
  });// END RoomClearView

  //Dialog to confirm the removal of a single message
  Opeka.RemoveSingleMessage = Opeka.DialogView.extend({
    initialize: function (options) {
      // Options passed to DialogView.
      //var options = {};
      this.messageId = options.messageId;
      _.bindAll(this);

      // For when creating new room.
      if (!options.room) {
        options.content = JST.opeka_room_clear_tmpl({
          labels: {
            explanation: Drupal.t('Please confirm that this message should be removed.'),
          }
        });
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Confirm removing this message')
        };

        options.dialogOptions.buttons[Drupal.t('Remove message')] = this.removeMessage;
      }

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.removeMessage);

      return this;
    },

    removeMessage: function (event) {
      
      now.roomDeleteMessage(this.model.id, this.messageId);

      this.remove();

      if (event) {
        event.preventDefault();
      }
    }
  });


  // Dialog to delete rooms with.
  Opeka.RoomDeletionView = Opeka.DialogView.extend({
    initialize: function () {
      // Options passed to DialogView.
      var options = {};

      _.bindAll(this);

      // For deleting a room.
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
  });// END RoomDeletionView

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
            name: Drupal.t('The name of the room is:'),
            iPLocation: Drupal.t('IP location'),
            outDk: Drupal.t('Outside Denmark/Scandinavia'),
            chatroomhelp: Drupal.t('This field is for the topic of a group chat'),
            privateQueue: Drupal.t('Private queue'),
            training: Drupal.t('For training'),
            queueSystem: Drupal.t('Queue system'),
            size: Drupal.t('Size limit'),
            users: Drupal.t('users')
          },
          queues: Opeka.queueList,
        });
        options.room = new Opeka.Room({});
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Create new room'),
          width: 500
        };

        options.dialogOptions.buttons[Drupal.t('Create new room')] = this.saveRoom;
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
            queueSystem: form.find('select.queue-system').val()
          },
          view = this;
      
      if (values.name == '') {
        values.name = 'Chatrum';
      }

      if (values.maxSize != 2) {
        if (values.name == 'Chatrum') {
          values.name = 'Grupperum';
        }
      } else {
        values.maxSize = 2;
      }

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
    },

  });

  // Dialog to create queues with.
  Opeka.QueueEditView = Opeka.DialogView.extend({
    initialize: function () {
      // Options passed to DialogView.
      var options = {};

      _.bindAll(this);

      // For when creating new room.
      if (!options.room) {
        options.content = JST.opeka_queue_edit_tmpl({
          labels: {
            name: Drupal.t('Name')
          }
        });
        options.queue = new Opeka.Queue({});
        options.dialogOptions = {
          buttons: {},
          title: Drupal.t('Create new queue'),
          width: 400
        };

        options.dialogOptions.buttons[Drupal.t('Create new queue')] = this.saveQueue;
      }

      options.dialogOptions.buttons[Drupal.t('Discard changes')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      return this;
    },

    render: function () {
      Opeka.DialogView.prototype.render.call(this);

      this.dialogElement.find('form').submit(this.saveQueue);
    },

    // When the save queue button is clicked.
    saveQueue: function (event) {
      var form = $(this.dialogElement).find('form'),
          values = {
            name: form.find('input.name').val(),
          },
          view = this;

      this.options.queue.save(values, {
        success: function (self, newQueue) {
          view.remove();
          Opeka.queueList.add(newQueue);
        },
      });

      if (event) {
        event.preventDefault();
      }
    }
  });

  Opeka.RoomLeaveOwnPairRoomDialogView =  Opeka.DialogView.extend({
    initialize: function (options) {
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
  });// END RoomEditView

  // List of rooms the user can enter.
  Opeka.RoomListView = Backbone.View.extend({
    events: {
      "click .create-room": "createRoom"
    },

    initialize: function (options) {
      _.bindAll(this);

      // Bind to the global status model.
      if (Opeka.status) {
        this.model = Opeka.status;
      }

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
          createRoom: Drupal.t('Create new room'),
          placeholder: Drupal.t('No rooms created'),
          queueLink: Drupal.t('Go to queue list'),
          enterRoom: Drupal.t('Enter'),
          fullRoomLinkText: Drupal.t('Busy'),
          fullRoomLink: Opeka.features.fullRoomLink,
          pausedRoomText: Drupal.t('Paused')
        },
        hidePairRooms: hidePairRooms,
        rooms: roomList
      });

      if (hidePairRooms) {
        html += JST.opeka_pair_room_list_tmpl({
          admin: _.isFunction(now.isAdmin),
          labels: {
            placeholder: Drupal.t('No rooms created'),
            enterRoom: Drupal.t('Enter')
          },
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
  });// END RoomListView

  //@daniel
  //Page to place the google form for user feedback  
  Opeka.UserFeedback = Backbone.View.extend({
    
    initialize: function (options) {
      _.bindAll(this);

      return this;
    },
    render: function () {
      this.$el.html(JST.opeka_user_feedback_tmpl({
        
        admin: _.isFunction(now.isAdmin),
        labels: {
          farewellMessage: Drupal.t('Thanks for using our chat!'),
          feedbackLinkText: Drupal.t('Open the feedback form.')
        }
      }));
      
      return this;
    }
  });// END UserFeedback

  Opeka.QueueListView = Backbone.View.extend({
    events: {
      "click .create-queue": "createQueue"
    },

    initialize: function (options) {
      _.bindAll(this);

      // Re-render our list whenever the roomList changes.
      Opeka.queueList.on('add', this.render);
      Opeka.queueList.on('change', this.render);
      Opeka.queueList.on('remove', this.render);
      Opeka.queueList.on('reset', this.render);

      return this;
    },

    render: function () {
      var queueList = Opeka.queueList,
          html = '';

      html = JST.opeka_queue_list_tmpl({
        labels: {
          createQueue: Drupal.t('Create new queue'),
          placeholder: Drupal.t('No queues created'),
          roomLink: Drupal.t('< Go back to room list')
        },
        queues: queueList
      });

      this.$el.html(html);

      return this;
    },

    // Open the dialog to create a new room.
    createQueue: function () {
      var dialog = new Opeka.QueueEditView();

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
          kickMessage: Drupal.t('Kick message'),
          kickHelpText: Drupal.t('@name will be removed from the room, but he/she will be able to log in again.',{'@name':options.name})
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

  });// END RoomKickUserView

  // Dialog for confirming that user should be banned.
  Opeka.RoomBanUserView = Opeka.DialogView.extend({
    initialize: function (options) {
      this.clientId = options.clientId;

      _.bindAll(this);

      options.content = JST.opeka_ban_user_tmpl({
        labels: {
          banCode: Drupal.t('Ban code'),
          banCodeDescription: Drupal.t('If a valid ban code is entered, user will be banned from the chat system.'),
          banMessage: Drupal.t('Ban message')
        }
      });

      options.dialogOptions = {
        buttons: {},
        title: Drupal.t('Confirm ban')
      };

      options.dialogOptions.buttons[Drupal.t('Ban user')] = this.banUser;

      options.dialogOptions.buttons[Drupal.t('Cancel')] = this.remove;

      // Call the parent initialize once we're done customising.
      Opeka.DialogView.prototype.initialize.call(this, options);

      this.dialogElement.delegate('form', 'submit', this.banUser);

      return this;
    },

    // Utility function for kicking the user.
    banUser: function (event) {
      var form = $(this.dialogElement).find('form'),
          banCode = $.trim(form.find('input.ban-code').val()),
          message = $.trim(form.find('input.ban-message').val()),
          view = this;

      // If a ban code was provided, try banning the user.
      if (banCode) {
        now.banUser(this.clientId, banCode, function (err) {
          if (err) {
            var dialog = new Opeka.DialogView({
              title: Drupal.t('Ban failed'),
              content: view.make('p', { 'class': "message" }, err)
            });

            dialog.addButton('Ok', function () { dialog.remove(); } );
            dialog.render();
          }
        });
      }

      // Kick the user.
      now.kick(this.clientId, message, this.model.id)

      // Prevent event if needed.
      if (event) {
        event.preventDefault();
      }

      // Remove the view when we're done.
      this.remove();
    }

  });

  Opeka.RoomWhisperView = Opeka.DialogView.extend({
    initialize: function (options) {
      this.clientId = options.clientId;

      _.bindAll(this);

      options.content = JST.opeka_whisper_tmpl({
        labels: {
          whisperMessage: Drupal.t('Whisper message'),
          whisperHelpText: Drupal.t('This message is only visible by @name',{'@name': options.name})
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

    // Utility function for whispering to the user.
    whisper: function (event) {
      var form = $(this.dialogElement).find('form'),

          //@daniel
          //replacing the input for the whisper dialog overlay with a textarea
          message = form.find('textarea.whisper-message').val();
          
      // Whisper the user.
      now.whisper(this.clientId, message);
      this.remove();
      // Prevent event if needed.
      if (event) {
        event.preventDefault();
      }
    }

  });// END RoomWhisperView

  // Sign-in form to get the chat started.
  Opeka.SignInFormView = Backbone.View.extend({
    events: {
      "click .connect": "preventDoublePost",
      "submit form": "signIn"
    },

    initialize: function (options) {
      this.nonce = options.nonce;
      this.queueId = options.queueId;

      _.bindAll(this);

      return this;
    },

    render: function () {
      var name = '';

      if (Drupal.settings.opeka.user && Drupal.settings.opeka.user.name) {

        //@daniel
        //Replace the Drupal username with rådgiver(counselor), not using the actual user name
        //name = Drupal.settings.opeka.user.name;
        name = Drupal.t('Counselor');
      }

      var form = JST.opeka_connect_form_tmpl({
        labels: {
          action: Drupal.t('Ready for chat'),
          age: Drupal.t('Age'),
          gender: Drupal.t('Gender'),
          female: Drupal.t('Female'),
          male: Drupal.t('Male'),
          nick: Drupal.t('Nickname'),
          placeholder: Drupal.t('Anonymous'),
        },
        name: name
      });

      this.$el.html(form);
	$('#block-block-1').hide();
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
      //@daniel
      //add a random number to each anonymous user to help in distinguishing them
      
      var x = Math.floor((Math.random()*50)+1);

      user.nickname = this.$el.find('.nickname').val() || Drupal.t('Anonymous'+x);""
      user.age = this.$el.find('.age').val();
      user.gender = this.$el.find('.gender').val();
      user.roomId = this.roomId;
      user.queueId = this.queueId;

      Opeka.signIn(user, function () {
        view.$el.fadeOut();
      });

      if (event) {
        event.preventDefault();
      }
    }
  });// END SignInFormView

}(jQuery));
