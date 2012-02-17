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
      this.roomId = options.roomId;
      this.messages = [];

      return this;
    },

    render: function () {
      if (!this.messages) { return this; }

      this.$el.html(JST.opeka_chat_tmpl({
        messages: this.messages
      }));

      return this;
    },

    receiveMessage: function (message) {
      this.messages.push(message);
      this.render();
    },

    sendMessage: function (event) {
      var message = this.$el.find('input.message').val();

      console.log('Sending message', message);

      now.sendMessageToRoom(this.roomId, message);

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
    },

    addButton: function (title, callback) {
      this.dialogOptions.buttons[title] = callback;

      return this;
    },

    // Close dialog and remove view from DOM.
    remove: function () {
      $(this.el).remove();

      if (this.dialogInstance){
        this.dialogInstance.dialog("destroy").remove();
        this.dialogInstance = null;
      }

      return this;
    },

    render: function () {
      this.dialogInstance = $(this.make('div', this.className, this.options.content));
      this.dialogInstance.appendTo(this.$el);
      this.dialogInstance.dialog(this.dialogOptions);

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

      this.$el.find('form').submit(this.saveRoom);
    },

    // When the save room button is clicked.
    saveRoom: function (event) {
      var form = $(this.dialogInstance).find('form'),
          values = {
            name: form.find('input.name').val(),
            maxSize: form.find('select.max-size').val(),
            ipLocation: form.find('select.ip-location').val(),
            private: form.find('input.private').val(),
          },
          view = this;

      this.options.room.save(values, {
        success: function () {
          this.remove();
        }
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
      var form = JST.opeka_connect_form_tmpl({
        nick: Drupal.t('Nickname'),
        placeholder: Drupal.t('Anonymous'),
        name: Drupal.settings.opeka.user.name || '',
        action: Drupal.t('Ready for chat…')
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
      var user = Drupal.settings.opeka.user,
          view = this;

      user.nickname = this.$el.find('#nickname').val();

      Opeka.signIn(user, function () {
        view.$el.fadeOut();
      });

      if (event) {
        event.preventDefault();
      }
    }

  });

}(jQuery));
