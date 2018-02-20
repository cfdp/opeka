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

(function ($) {
  "use strict";

  Opeka.Sync = function(method, model, options) {
    if (model instanceof Opeka.Room) {
      if (method === 'create') {
        Opeka.remote.createRoom(model.toJSON(), function (err, success) {
          if (err) {
            var errMsg = new Opeka.DialogView({
              content: err
            });

            errMsg.render();
          } else if (_.isFunction(options.success)) {
            options.success(success);
          }
        });
      // Read and update not supported yet.
      //} else if (method === 'read') {
      //} else if (method === 'update') {
      } else if (method === 'delete') {
        Opeka.remote.deleteRoom(model.id, options.message);
      }
    }
    else if (model instanceof Opeka.Queue) {
      if (method === 'create') {
        Opeka.remote.createQueue(model.toJSON(), function (err, success) {
          if (err) {
            var errMsg = new Opeka.DialogView({
              content: err
            });

            errMsg.render();
          } else if (_.isFunction(options.success)) {
            options.success(success);
          }
        });
      // Read, update and delete not supported yet.
      //} else if (method === 'read') {
      //} else if (method === 'update') {
      //} else if (method === 'delete') {
      }
    }
    else if (model instanceof Opeka.Invite) {
      if (method === 'create') {
        Opeka.remote.createInvite(model.toJSON(), function (err, success) {
          if (err) {
            var errMsg = new Opeka.DialogView({
              content: err
            });

            errMsg.render();
          } else if (_.isFunction(options.success)) {
            options.success(success);
          }
        });
      // Read, update and delete not supported yet.
      //} else if (method === 'read') {
      //} else if (method === 'update') {
      //} else if (method === 'delete') {
      }
    }
  };

  Opeka.Room = Backbone.Model.extend({
    sync: Opeka.Sync
  });

  Opeka.RoomList = Backbone.Collection.extend({
    model: Opeka.Room
  });

  Opeka.Queue = Backbone.Model.extend({
    sync: Opeka.Sync
  });

  Opeka.Invite = Backbone.Model.extend({
    sync: Opeka.Sync
  });

  Opeka.QueueList = Backbone.Collection.extend({
    model: Opeka.Queue
  });

  Opeka.InviteList = Backbone.Collection.extend({
    model: Opeka.Invite
  });

}(jQuery));
