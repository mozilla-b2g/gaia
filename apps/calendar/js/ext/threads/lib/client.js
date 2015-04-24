
'use strict';

/**
 * Dependencies
 */

var thread = require('./thread-global');
var Emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Client;

/**
 * Global 'manager' channel
 * @type {BroadcastChannel}
 */
var manager = new BroadcastChannel('threadsmanager');

/**
 * Simple logger
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console, '[client]') : function() {};

/**
 * Extend `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

function Client(service, options) {
  if (!(this instanceof Client)) return new Client(service, options);
  debug('initialize', service, options);
  this.contract = options && options.contract;
  this.thread = options && options.thread;
  this.id = utils.uuid();

  this.requestQueue = [];
  this.requests = {};

  this.connecting = false;
  this.connected = false;

  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.messages = new utils.Messages(this, this.id, [
    'response',
    'broadcast',
    'connected'
  ]);

  // If this client is directly linked to the thread
  // then listen for messages directly from that thread
  manager.addEventListener('message', this.messages.handle);
  if (this.thread) this.thread.on('message', this.messages.handle);

  this.connect();
}

Client.prototype.connect = function() {
  if (this.connected) return Promise.resolve();
  if (this.connecting) return this.connecting.promise;
  debug('connect');

  // Create a pipe ready for the
  // service to send messages down
  this.service.channel = new BroadcastChannel(this.id);
  this.service.channel.onmessage = this.messages.handle;

  // If the client has a handle on the
  // thread we can connect to it directly,
  // else we go through the manager proxy.
  if (this.thread) this.connectViaThread();
  else this.connectViaManager();

  this.connecting = utils.deferred();
  return this.connecting.promise;
};

Client.prototype.connectViaThread = function() {
  debug('connect via thread');
  this.thread.getService(this.service.name).then(function(service) {
    debug('got service', service);

    // Post a 'connect' request directly
    // to the thread bypassing the manager
    this.thread.postMessage(this.messages.create('connect', {
      recipient: service.id,
      data: {
        client: this.id,
        service: service.name,
        contract: this.contract
      }
    }));
  }.bind(this));
};

/**
 * Broadcasts a 'connect' message on the
 * manager channel to indicate that a
 * client wants to connect with a
 * particular service.
 *
 * This message will either be handled
 * by a manager that handles this service
 * name, or a prexisting service of this name.
 *
 * NOTE: Potentially if the is more than
 * one service of the same name running
 * the client could end up connecting
 * to the wrong service.
 *
 * Right now this produces quite a lot of noise
 * as every Service and every Manager will
 * respond to to messages on the 'threadsmanager'
 * channel.
 *
 * @private
 */
Client.prototype.connectViaManager = function() {
  debug('connect via manager');
  manager.postMessage(this.messages.create('connect', {
    recipient: '*',
    data: {
      service: this.service.name,
      client: this.id
    },
  }));
};

Client.prototype.onconnected = function(service) {
  debug('connected', service);
  var deferred = this.connecting;

  this.service.id = service.id;
  this.connecting = false;
  this.connected = true;

  this.flushRequestQueue();
  thread.connection('outbound');
  deferred.resolve();
};

Client.prototype.disconnect = function() {
  debug('disconnect');
  return this.request('disconnect', this.id)
    .then(function(r) { return this.ondisconnected(r); }.bind(this));
};

Client.prototype.request = function(type, data) {
  debug('request', type, data);
  var deferred = utils.deferred();

  // If the client isn't yet connected,
  // add the request to a queue to be
  // flushed once a connection is made.
  if (!this.connected) {
    this.requestQueue.push({
      deferred: deferred,
      arguments: arguments
    });

    debug('request queued until connected');
    return deferred.promise;
  }

  var requestId = utils.uuid();
  var message = this.messages.create('request', {
    recipient: this.service.id,
    data: {
      type: type,
      id: requestId,
      client: this.id,
      data: data
    }
  });

  this.requests[requestId] = deferred;
  this.service.channel.postMessage(message);
  return deferred.promise;
};

Client.prototype.onresponse = function(response) {
  debug('on response', response);
  var request = response.request;
  var promise = this.requests[request.id];
  if (!promise) return;

  var result = response.result;
  var method = {
    'fulfilled': 'resolve',
    'rejected': 'reject'
  }[result.state];

  // The value resided under a different
  // key depending on whether the promise
  // was 'rejected' or 'resolved'
  var value = result.value || result.reason;
  promise[method](value);

  // Clean up
  delete this.requests[request.id];
};

Client.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');

  // Ping the service one last time to let it
  // know that we've disconnected client-side
  this.service.channel.postMessage(this.messages.create('disconnected', {
    recipient: this.service.id,
    data: this.id
  }));

  this.service.channel.close();
  delete this.service.channel;
  delete this.service.id;
  this.connected = false;
  thread.disconnection('outbound');
};

Client.prototype.method = function(method) {
  var args = [].slice.call(arguments, 1);
  debug('method', method, args);
  return this.request('method', {
    name: method,
    args: args
  });
};

Client.prototype.flushRequestQueue = function() {
  debug('flush waiting calls');
  var request;
  while ((request = this.requestQueue.shift())) {
    var resolve = request.deferred.resolve;
    resolve(this.request.apply(this, request.arguments));
  }
};
