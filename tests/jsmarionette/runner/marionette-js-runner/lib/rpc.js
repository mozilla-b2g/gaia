'use strict';
var Promise = require('promise');
var uuid = require('uuid');
var errorIPC = require('./error_ipc');
var assert = require('assert');
var util = require('util');
var debug = require('debug')('marionette-js-runner:rpc');

var EventEmitter = require('events').EventEmitter;

/**

var rpc = new RPC(process.send.bind(process));

@constructor
@param {Function} send method to use.
*/
function RPC(send) {
  this.id = uuid.v4();
  this.objects = {};

  // Internal event handler.
  this._events = new EventEmitter();
  this.send = send;
}

RPC.prototype = {

  register: function(name, object) {
    debug('register', name);
    assert(!this.objects[name], 'cannot re-register name: ' + name);
    assert(typeof object === 'object', 'invalid object is a: ' + typeof obj);
    this.objects[name] = object;
  },

  /**
  Note this is currently unsafe action it may result in unfulfilled promises.
  */
  unregister: function(name) {
    delete this.objects[name];
  },

  /**
  Generate the client side for the RPC call.

  ```js
  var objClient = rpc.client('obj', ['doStuff']);

  objClient.doStuff().then(...)
  ```

  @param {String} name of the remote object.
  @param {Array<String>} methods which remote can handle.
  @return {Object} client rpc interface.
  */
  client: function(name, methods) {
    assert(typeof name === 'string', 'client name must be string');
    debug('create client', name, methods);

    var client = {
      $rpcConnected: true,

      description: util.format('[RPC Client] <%s>', name),
      toString: function() {
        return this.description;
      }
    };

    methods.forEach(function(method) {
      client[method] = (function() {
        if (!client.$rpcConnected) {
          return new Promise(function(accept, reject) {
            return reject(new Error(
              'Call on destroyed rpc object'
            ));
          });
        }

        var args = Array.prototype.slice.call(arguments);
        return this.request(name, method, args);
      }.bind(this));
    }, this);

    var markDestoyed = (function markDestoyed() {
      client.$rpcConnected = false;
      this.send(['rpc-unregister', name]);
    }.bind(this));

    var destroy = client.destroy;
    client.destroy = function() {
      // If the client happens to have a destroy method call that first!
      var p;
      if (destroy) {
        p = destroy.apply(this, Array.prototype.slice.call(arguments));
      } else {
        p = Promise.resolve();
      }
      markDestoyed();
      return p;
    };

    return client;
  },

  serialize: function(value) {
    if (value && value instanceof Error) {
      return errorIPC.serialize(value);
    }
    return value;
  },

  deserialize: function(value) {
    if (typeof value === 'object' && value.message && value.stack) {
      return errorIPC.deserialize(value);
    }
    return value;
  },

  request: function(name, method, args) {
    var id = uuid.v4();
    debug('issue request', name, method, id);

    return new Promise(function(accept, reject) {
      this.send([
        'rpc-request',
        this.id,
        {
          name: name,
          method: method,
          id: id,
          arguments: args.map(this.serialize.bind(this))
        }
      ]);

      this._events.once('response ' + id, function(payload) {
        debug('handle request', method, id, payload);
        switch (payload.result) {
          case 'resolved':
            return accept(this.deserialize(payload.value));
          case 'rejected':
            return reject(this.deserialize(payload.value));
          case 'rpc':
            return accept(this.client(
              payload.value.name, payload.value.spec.methods
            ));
          default:
            throw new Error('Unknown payload format: ' + payload);
        }
      }.bind(this));
    }.bind(this));
  },

  /**
  Used in conjunction with process.on('message') can handle RPC requests.

  RPC Payload format:

  Request:
  ```
  [
    'rpc-request',
    '<uuid>',
    {
      name: '<rpc name>',
      method: '<method>',
      id: '<id>',
      arguments: []
    }
  ]

  Response:
  ```
  [
    'rpc-response',
    '<uuid>',
    {
      id: '<id>',
      result: '(rejected | resolved)'
      value: <value>
    }
  ]

  Unregister:
  ```
  [
    'rpc-unregister',
    '<name>'
  ]
  ```

  @return {Function} handler suitable for process.on('message')
  */
  handle: function() {
    return function(msg) {
      if (!Array.isArray(msg)) {
        return;
      }
      var type = msg[0];
      var id = msg[1];
      var payload = msg[2];

      switch (type) {
        case 'rpc-request':
          return this.handleRequest(id, payload);
        case 'rpc-unregister':
          return this.unregister(id);
        case 'rpc-response':
          // Do not handle cases which do not belong to this rpc response.
          if (id !== this.id) {
            return;
          }
          return this.handleResponse(id, payload);
      }
    }.bind(this);
  },

  handleResponse: function(id, payload) {
    debug('handle response', id, payload);
    this._events.emit('response ' + payload.id, payload);
  },

  handleRequest: function(id, payload) {
    debug('handle request', id, payload);
    // object check first...
    var object = this.objects[payload.name];
    if (!object) {
      return this.send([
        'rpc-response',
        id,
        {
          id: payload.id,
          result: 'rejected',
          value: { message: 'Unknown object name: ' + payload.name }
        }
      ]);
    }

    // Ensure method name is there...
    if (!object[payload.method]) {
      return this.send([
        'rpc-response',
        id,
        {
          id: payload.id,
          result: 'rejected',
          value: {
            message: util.format(
              'Unknown method "%s" for object name: "%s"',
              payload.method,
              payload.name
            )
          }
        }
      ]);
    }

    // Finally run the method!
    object[payload.method].apply(object, payload.arguments)
      .then(function(value) {
        // if this object is an rpc object we send an id to reference the
        // object.
        if (value && typeof value === 'object' && value.$rpc) {
          var objectId = 'rpc-obj-' + uuid.v4();
          this.register(objectId, value);
          this.send([
            'rpc-response',
            id,
            {
              id: payload.id,
              result: 'rpc',
              value: { name: objectId, spec: value.$rpc }
            }
          ]);
          return;
        }

        this.send([
          'rpc-response',
          id,
          {
            id: payload.id,
            result: 'resolved',
            value: this.serialize(value || '')
          }
         ]);
      }.bind(this))
      .catch (function(err) {
        return this.send([
          'rpc-response',
          id,
          {
            id: payload.id,
            result: 'rejected',
            value: errorIPC.serialize(err)
          }
        ]);
      }.bind(this));
  }
};

module.exports = RPC;
