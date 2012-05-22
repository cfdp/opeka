/*!
 * Copyright 2012 Cyberhus.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
/*global JST, now, Opeka */
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
      
      if (this.inQueue !== false) {
        inQueueMessage = Drupal.t('Chat room is full, you are currently in queue as number: @number. You can stay and wait until you can enter or leave the queue.', {'@number': this.inQueue + 1});
      }
      hideForm = !this.model.get('paused') && !activeUser.muted && this.inQueue === false;
      formPresent = this.$el.find(".message-form").length > 0;
      if (this.$el.find('.chat-view-window').length === 0) {
        hideForm = 'show';
        this.$el.html('<div class="chat-view-window"></div><div class="chat-view-form"></div>');
      }
      // Always render the chat window.
      this.$el.find('.chat-view-window').html(JST.opeka_chat_tmpl({
        admin: this.admin,
        formatTimestamp: this.formatTimestamp,
        labels: {
          deleteMessage: Drupal.t('')
        },
        messages: this.messages,
      }));

      if (hideForm !== formPresent || this.inQueue !== false) {
        this.$el.find('.chat-view-form').html(JST.opeka_chat_form_tmpl({
          activeUser: activeUser,
          admin: this.admin,
          labels: {
            inQueueMessage: inQueueMessage,
            leaveQueueButton: Drupal.t('Leave queue'),
            leaveRoomButton: Drupal.t('Leave chat room'),
            placeholder: Drupal.t('Type message here…'),
            roomPaused: Drupal.t('The room is paused'),
            messageButton: Drupal.t('Send')
          },
          inQueue: this.inQueue,
          room: this.model
        }));
      }

      // @daniel
      // Keep the scrollbar at the bottom of the .chat-message-list
      var message_list = this.$el.find('.chat-message-list');
      message_list.attr({scrollTop: message_list.attr("scrollHeight")});

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
      // Remove the user from the room.
      now.removeUserFromRoom(this.model.id, now.core.clientId);
      $(window).trigger('leaveRoom');

      //Opeka.router.navigate("rooms", {trigger: true});
      //@daniel
      //reroute the user to the feedback page
      Opeka.router.navigate("feedback", {trigger: true});

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
        message_list.attr({scrollTop: message_list.attr("scrollHeight")});
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
      "click .mute-user": "muteUser",
      "click .pause-toggle": "pauseToggle",
      "click .unmute-user": "unmuteUser",
      "click .sidebar-block-heading": "sidebarBlocktoggle",
      "click .whisper": "whisper"
    },

    initialize: function (options) {
      var self = this;
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
          clientId: now.core.clientId,
          labels: {
            clearMessages: Drupal.t("Clear messages"),
            deleteRoom: Drupal.t('Delete room'),
            gender: { f: Drupal.t('woman'), m: Drupal.t('man') },
            kickUser: Drupal.t('Kick'),
            muteUser: Drupal.t('Mute'),
            pauseToggle: pauseLabel,
            placeholder: Drupal.t('No users'),
            unmuteUser: Drupal.t('Unmute'),
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
    // For when you need to unmute a user.
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
      this.$el.html(JST.opeka_room_list_tmpl({
        createRoom:_.isFunction(now.createRoom),
        admin: _.isFunction(now.receiveUserList),
        labels: {
          createRoom: Drupal.t('Create room'),
          placeholder: (Opeka.roomList.size() < 1) ? Drupal.t('No rooms created') : '',
          enterRoom: Drupal.t('Enter')
        },
        rooms: Opeka.roomList,
      }));

      return this;
    },

    // Open the dialog to create a new room.
    createRoom: function () {
      var dialog = new Opeka.RoomEditView();

      dialog.render();
    }
  });// END RoomListView

  //@daniel
  //Page to place the link for user feedback  
  Opeka.UserFeedback = Backbone.View.extend({
    
    initialize: function (options) {
      _.bindAll(this);

      return this;
    },
    render: function () {
      this.$el.html(JST.opeka_user_feedback_tmpl({
        
        admin: _.isFunction(now.receiveUserList),
                
      }));
      
      return this;
    }
  });// END UserFeedback

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

  });// END RoomKickUserView

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
      _.bindAll(this);

      return this;
    },

    render: function () {
      var name = '';

      if (Drupal.settings.opeka.user && Drupal.settings.opeka.user.name) {
        
        //@daniel
        //Replace the Drupal username with rådgiver(counselor), not using the actual user name
        //name = Drupal.settings.opeka.user.name;
        name = 'Rådgiver';
      }

      var form = JST.opeka_connect_form_tmpl({
        labels: {
          action: Drupal.t('Ready for chat'),
          age: Drupal.t('Age'),
          gender: Drupal.t('Gender'),
          female: Drupal.t('Female'),
          male: Drupal.t('Male'),
          nick: Drupal.t('Nickname'),
          nick_tooltip: Drupal.t('Det er vigtigt at du skriver et navn i feltet for at I kan kende forskel på hinanden når I chatter. Hvis flere logger ind som "Anonym" vil man ikke kunne kende forskel.'),
          placeholder: Drupal.t('Type the name you want to have'),
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

      //@daniel
      //add a random number to each anonymous user to help in distinguishing them
      
      var x = Math.floor((Math.random()*50)+1);

      user.nickname = this.$el.find('.nickname').val() || Drupal.t('Anonymous'+x);""
      user.age = this.$el.find('.age').val();
      user.gender = this.$el.find('.gender').val();


      Opeka.signIn(user, function () {
        view.$el.fadeOut();
      });

      if (event) {
        event.preventDefault();
      }
    }

  });// END SignInFormView

}(jQuery));
