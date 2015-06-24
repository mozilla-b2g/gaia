define(function(require, exports, module) {
'use strict';

var Responder = require('common/responder');
var debug = require('common/debug')('worker/thread');

function Thread(worker) {
  Responder.call(this);
  this.worker = worker;
  this.roles = {};

  this._initEvents();
}
module.exports = Thread;

Thread.prototype = {
  __proto__: Responder.prototype,

  send: function() {
    this.worker.postMessage(Array.prototype.slice.call(arguments));
  },

  addRole: function(name) {
    this.roles[name] = new Responder();
  },

  _remoteEmitter: function(id) {
    var self = this;
    return {
      emit: function emitRemote() {
        var args = Array.prototype.slice.call(arguments);
        self.worker.postMessage([id + ' stream'].concat(args));
      }
    };
  },

  _initEvents: function() {
    var self = this;

    debug('Will listen for messages from the main thread...');
    this.on('_dispatch', function(data) {
      // data.id
      // data.type
      // data.role
      // data.payload
      var callback = self._requestCallback.bind(
        self, data.id
      );

      if (data.role) {
        if (data.role in self.roles) {
          if (data.type && data.type === 'stream') {
            self.roles[data.role].respond(
              data.payload,
              self._remoteEmitter(data.id),
              callback
            );
          } else {
            self.roles[data.role].respond(
              data.payload, callback
            );
          }
        } else {
          // TODO: respond with error
          debug('ERROR: ' + data.role + ' is not available.');
        }
      } else {
        self.respond(data.payload, callback);
      }
    });
  },

  _wrapError: function(err) {
    var errorObject = {};

    errorObject.stack = err.stack || '';
    errorObject.message = err.message || err.toString();
    errorObject.type = err.type || 'Error';
    errorObject.constructorName = err.constructor.name || 'Error';

    if (err.name) {
      errorObject.name = err.name;
    }

    if (err.code) {
      errorObject.code = err.code;
    }

    return errorObject;
  },

  _requestCallback: function(id) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(id + ' end');

    if (args[1] instanceof Error) {
      args[1] = this._wrapError(args[1]);
    }

    this.worker.postMessage(args);
  },

  console: function console(name) {
    return {
      log: function() {
        return postMessage(['log', {
          name: name,
          message: Array.prototype.slice.call(arguments).join(', ')
        }]);
      },
      error: function() {
        return postMessage(['error', {
          name: name,
          message: Array.prototype.slice.call(arguments).join(', ')
        }]);
      }
    };
  }
};

});
