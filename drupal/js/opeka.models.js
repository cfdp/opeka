/*!
 * Copyright 2012 Cyberhus.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
/*global now, Opeka */
(function ($) {
  "use strict";

  Opeka.Sync = function(method, model, options) {
    if (model instanceof Opeka.Room) {
      if (method === 'create') {
        now.createRoom(model.toJSON(), function (err, success) {
          if (err) {
            var errMsg = new Opeka.DialogView({
              content: err
            });

            errMsg.render();
          } else if (_.isFunction(options.success)) {
            options.success();
          }
        });
      // Read and update not supported yet.
      //} else if (method === 'read') {
      //} else if (method === 'update') {
      } else if (method === 'delete') {
        now.deleteRoom(model.id, options.message);
      }
    }
  };

  Opeka.ChatStatus = Backbone.Model.extend({});

  Opeka.Room = Backbone.Model.extend({
    sync: Opeka.Sync
  });

  Opeka.RoomList = Backbone.Collection.extend({
    model: Opeka.Room,
  });

}(jQuery));
