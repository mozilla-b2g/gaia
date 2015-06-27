'use strict';

/**
 * Dependencies
 */

var thread = require('../thread-global');
var ClientStream = require('./stream');
var Messenger = require('../messenger');
var Emitter = require('../emitter');
var utils = require('../utils');

/**
 * Exports
 */

module.exports = Client;

/**
 * Global 'manager' channel
 *
 * @type {BroadcastChannel}
 */

var manager = new BroadcastChannel('threadsmanager');

/**
 * Simple logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Client]') : function() {};

/**
 * Extends `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

/**
 * Initialize a new `Client`.
 *
 * @param {String} service The service name
 * @param {Object} options
 * @param {ChildThread} options.thread
 * @param {Object} options.contract
 */

function Client(service, options) {
  if (!(this instanceof Client)) return new Client(service, options);
  this.contract = options && options.contract;
  this.thread = options && options.thread;

  this.id = utils.uuid();
  this._activeStreams = {};
  this._connected = false;

  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.messenger = new Messenger(this.id, 'client')
    .handle('streamevent', this.onstreamevent, this)
    .handle('broadcast', this.onbroadcast, this);

  this.connect();
  debug('initialized', service);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ClientPrototype = Client.prototype;

/**
 * Attempt to connect the `Client`
 * with its service.
 *
 * @return {Promise}
 * @public
 */

ClientPrototype.connect = function() {
  if (this.connected) return this.connected;
  debug('connecting...');
  var self = this;

  // Create a pipe ready for the
  // service to send messages down
  this.service.channel = new BroadcastChannel(this.id);
  this.service.channel.onmessage = this.messenger.parse;

  // If the client has a handle on the
  // thread we can connect to it directly,
  // else we go through the manager proxy.
  this.connected = this.thread
    ? this.connectViaThread()
    : this.connectViaManager();

  return this.connected.then(function(service) {
    debug('connected', service);
    self.service.id = service.id;
    thread.connection('outbound');
  });
};

/**
 * Attempt to connect directly with a
 * `Service` that lives inside a thread.
 *
 * @return {Promise}
 */

ClientPrototype.connectViaThread = function() {
  debug('connecting via thread...');
  var self = this;
  return this.thread.getService(self.service.name)
    .then(function(service) {
      debug('got service', service);
      self.thread.on('message', self.messenger.parse);
      return self.messenger.request(self.thread, {
        type: 'connect',
        recipient: service.id,
        data: {
          client: self.id,
          service: service.name,
          contract: self.contract
        }
      });
    })
    .then(function(service) {
      self.thread.off('message', self.messenger.parse);
      return service;
    });
};

/**
 * Broadcasts a 'connect' message on the
 * 'manager' channel to indicate that a
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

ClientPrototype.connectViaManager = function() {
  debug('connecting via manager...');
  var onmessage = this.messenger.parse;
  manager.addEventListener('message', onmessage);
  return this.messenger.request(manager, {
    type: 'connect',
    recipient: '*',
    data: {
      service: this.service.name,
      client: this.id
    }
  }).then(function(result) {
    manager.removeEventListener('message', onmessage);
    return result;
  });
};

/**
 * Disconnect with the `Service`.
 *
 * You must call this if the `Manager`
 * is to destroy threads. If a thread
 * has `Services` that have connected
 * `Client`s then it is 'in-use'.
 *
 * Once we recieve the responce, the service
 * is pinged one last time to let it know
 * that the client-side has disconnected.
 *
 * @return {Promise}
 */

ClientPrototype.disconnect = function() {
  debug('disconnect');
  if (!this.connected) return Promise.resolve();
  return this.request('disconnect', this.id)
    .then(function() {
      this.service.channel.close();
      delete this.service.channel;
      delete this.service.id;
      delete this.connected;
      thread.disconnection('outbound');
      debug('disconnected');
    }.bind(this));
};

/**
 * Make an outbound request to the `Service`.
 *
 * When the `Client` is not yet connected,
 * the request is added to a queue that
 * is flushed once a connection is made.
 *
 * @param  {String} type
 * @param  {Object} data
 * @return {Promise}
 */

ClientPrototype.request = function(type, data) {
  debug('request', type, data);
  return this.connect().then(function() {
    return this.messenger.request(this.service.channel, {
      type: type,
      recipient: this.service.id,
      data: data
    });
  }.bind(this));
};

/**
 * Triggered when a `Service` broadcasts
 * an event to all connected `Client`s.
 *
 * The event is emitted on the `Client`s
 * internal `Emitter` so users can
 * listen via `client.on('foo', ...)`
 *
 * @param  {Object} broadcast
 */

ClientPrototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

/**
 * Call a method on the service.
 *
 * Promise will be resolved when service
 * responds with the data or rejected
 * when service throws an error or
 * returns a rejected promise.
 *
 * @param {String} method Name of the method to be called
 * @param {*} [...rest] data to be passed to to the method
 * @returns {Promise}
 * @public
 */

ClientPrototype.method = function(method) {
  var args = [].slice.call(arguments, 1);
  debug('method', method, args);
  return this.request('method', {
    name: method,
    args: args
  });
};

/**
 * Call an action on the service.
 *
 * Used mainly for cases where service
 * needs to send data in chunks and/or
 * when you need to `cancel` the
 * action before it's complete.
 *
 * @param {String} method Name of the method to be called
 * @param {*} [...rest] data to be passed to to the method
 * @returns {ClientStream}
 * @public
 */

ClientPrototype.stream = function(method) {
  debug('stream', method, args);
  var args = [].slice.call(arguments, 1);
  var self = this;

  // Use an unique id to identify the
  // stream. We pass this value to the
  // service as well so we can map the
  // service and client streams.
  // They are different instances
  // that are 'connected' through
  // the bridge by this id.
  var id = utils.uuid();
  var stream = new ClientStream({
    id: id,
    client: this
  });

  this._activeStreams[id] = stream;
  this.request('stream', {
    name: method,
    args: args,
    id: id
  }).catch(function(err) {
    self.onstreamevent({
      type: 'abort',
      id: id,
      data: err
    });
  });

  return stream;
};

/**
 * Called every time the service calls
 * write/abort/close on the ServiceStream
 *
 * @param {Object} broadcast
 * @param {String} broadcast.id Stream ID
 * @param {String} broadcast.type Event type ('write', 'abort' or 'close')
 * @private
 */

ClientPrototype.onstreamevent = function(broadcast) {
  var id = broadcast.id;
  var type = broadcast.type;
  var stream = this._activeStreams[id];

  stream._[type](broadcast.data);
  if (type === 'abort' || type === 'close') {
    delete this._activeStreams[id];
  }
};
