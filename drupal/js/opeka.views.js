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
  });


  // The actual chat window.
  Opeka.ChatView = Backbone.View.extend({
    events: {
      "submit .message-form": "sendMessage"
    },

    initialize: function (options) {
      _.bindAll(this);

      this.admin = options.admin;
      this.messages = [];

      this.model.on('change', this.render, this);

      return this;
    },

    render: function () {
      if (!this.messages) { return this; }

      this.$el.html(JST.opeka_chat_tmpl({
        messages: this.messages,
        room: this.model
      }));

      return this;
    },

    receiveMessage: function (message) {
      this.messages.push(message);
      this.render();
    },

    sendMessage: function (event) {
      var message = this.$el.find('input.message').val();

      now.sendMessageToRoom(this.model.id, message);

      if (event) {
        event.preventDefault();
      }
    }
  });

  // Sidebar for the chat with user lists and admin options.
  Opeka.ChatSidebarView = Backbone.View.extend({
    className: 'opeka-chat-sidebar',

    events: {
      "click .delete-room": "deleteRoom",
      "click .pause-toggle": "pauseToggle",
      "click .kick-user": "kickUser",
    },

    initialize: function (options) {
      _.bindAll(this);

      this.model.on('change:userList', this.render, this);
      this.model.on('change:paused', this.render, this);
    },

    render: function () {
      var pauseLabel = Drupal.t('Pause chat');
      if (this.model.get('paused')) {
        pauseLabel = Drupal.t('Unpause chat');
      }



      if (JST.opeka_chat_sidebar_tmpl) {
        this.$el.html(JST.opeka_chat_sidebar_tmpl({
          labels: {
            deleteRoom: Drupal.t('Delete room'),
            kickUser: Drupal.t('Kick user'),
            gender: { f: Drupal.t('woman'), m: Drupal.t('man') },
            placeholder: Drupal.t('No users'),
            pauseToggle: pauseLabel
          },
          room: this.model,
          users: this.model.get('userList')
        }));
      }

      return this;
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

    //
    kickUser: function (event) {
      var view = new Opeka.RoomKickUserView({
        clientId: $(event.currentTarget).closest('li').attr('data-client-id'),
        model: this.model
      });

      view.render();

      if (event) {
        event.preventDefault();
      }
    }
  });

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
          councellors: this.model.get('councellors'),
          guests: this.model.get('guests')
        }));
      }

      return this;
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
        options.content = JST.opeka_room_edit_tmpl();
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
            private: form.find('input.private').val(),
          },
          view = this;

      this.options.room.save(values, {
        success: function () { view.remove(); }
      });

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
      this.$el.html(JST.opeka_room_list_tmpl({
        createRoom:_.isFunction(now.createRoom),
        rooms: Opeka.roomList,
        placeholder: (Opeka.roomList.size() < 1) ? Drupal.t('No rooms created') : ''
      }));

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

      Opeka.signIn(user, function () {
        view.$el.fadeOut();
      });

      if (event) {
        event.preventDefault();
      }
    }

  });

}(jQuery));
