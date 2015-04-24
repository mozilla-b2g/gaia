
'use strict';

/**
 * Dependencies
 */

var thread = require('./thread-global');
var utils = require('./utils');

/**
 * exports
 */

module.exports = Service;

/**
 * Mini Logger
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console, '[service]') : function(){};

/**
 * Global broadcast channel that
 * the Manager can use to pair
 * a Client with a Service.
 *
 * @type {BroadcastChannel}
 */
var manager = new BroadcastChannel('threadsmanager');

/**
 * Known request types.
 *
 * @type {Array}
 */
const REQUEST_TYPES = [
  'method',
  'disconnect'
];

/**
 * Possible errors.
 *
 * @type {Object}
 */
const ERRORS = {
  1: 'method not defined in the contract',
  2: 'arguments.length doesn\'t match contract',
  3: 'unknown request type',
  4: 'method doesn\'t exist',
  5: 'arguments types don\'t match contract'
};

/**
 * Initialize a new `Service`
 *
 * @param {String} name
 */
function Service(name) {
  if (!(this instanceof Service)) return new Service(name);
  this.private = new ServicePrivate(this, name);
}

/**
 * Register a method that will be
 * exposed to all the clients.
 *
 * @param {String} name Method name
 * @param {Function} fn Implementation
 */
Service.prototype.method = function(name, fn) {
  this.private.addMethod(name, fn);
  return this;
};

/**
 * Register a contract that will be used
 * to validate method calls and events.
 *
 * @param {Object} contract
 */
Service.prototype.contract = function(contract) {
  this.private.setContract(contract);
  return this;
};

/**
 * Broadcast message to all the clients.
 *
 * @param {String} type Event name.
 * @param {*} data Payload to be transmitted.
 */
Service.prototype.broadcast = function(type, data) {
  this.private.broadcast(type, data);
  return this;
};

/**
 * All the logic is contained inside
 * this 'private' class. Public methods
 * on `Service` proxy to `ServicePrivate`.
 *
 * @param {Service} service
 * @param {String} name
 */
function ServicePrivate(service, name) {
  debug('initialize', name);

  this.public = service;
  this.id = utils.uuid();
  this.name = name;
  this.contract = null;
  this.methods = {};
  this.channels = {};

  // Create a message factory that outputs
  // messages in a standardized format.
  this.message = new utils.Messages(this, this.id, [
    'connect',
    'disconnected',
    'request'
  ]);

  this.listen();

  // Don't declare service ready until
  // any pending tasks in the event-loop
  // have completed. Namely any pending
  // 'connect' events for `SharedWorkers`.
  // If we broadcast the 'serviceready'
  // event before the thread-parent has
  // 'connected', it won't be heard.
  setTimeout(function() { this.ready(); }.bind(this));
  debug('initialized', this.name);
}

/**
 * Call the corresponding method and
 * respond with a 'serialized' promise.
 *
 * @param  {Object} request
 */
ServicePrivate.prototype.onrequest = function(request) {
  debug('on request', request);
  var type = request.type;
  var data = request.data;
  var self = this;

  // Check to insure this is a known request type
  if (!~REQUEST_TYPES.indexOf(type)) return reject(ERRORS[3]);

  // Call the handler and make
  // sure return value is a promise
  Promise.resolve()
    .then(function() { return this['on' + type](data); }.bind(this))
    .then(resolve, reject);

  function resolve(value) {
    self.respond(request, {
      state: 'fulfilled',
      value: value
    });
  }

  function reject(err) {
    debug('reject', err);
    self.respond(request, {
      state: 'rejected',
      reason: err.message || err
    });
  }
};

/**
 * Called when a client calls
 * a service's method.
 *
 * @param  {Object} method
 * @return {*}
 */
ServicePrivate.prototype.onmethod = function(method) {
  debug('method', method.name);
  var fn = this.methods[method.name];
  if (!fn) throw new Error(ERRORS[4]);
  this.checkMethodCall(method);
  return fn.apply(this.public, method.args);
};

/**
 * Respond to an unfulfilled
 * request from a client
 *
 * @param  {Object} request
 * @param  {*} result
 */
ServicePrivate.prototype.respond = function(request, result) {
  debug('respond', request.client, result);
  var channel = this.channels[request.client];
  channel.postMessage(this.message.create('response', {
    recipient: request.client,
    data: {
      request: request,
      result: result
    }
  }));
};

/**
 * Once the service is 'ready', we
 * postMessage out of the global
 * thread scope so that the parent
 * of the thread ('manager' or manual)
 * knows that they can proceed with
 * the connection request.
 *
 * @private
 */
ServicePrivate.prototype.ready = function() {
  debug('ready');
  thread.broadcast('serviceready', {
    id: this.id,
    name: this.name
  });
};

/**
 * Runs on an inbound connection
 * attempt from a client.
 *
 * A new dedicated `BroadcastChannel`
 * is opened for each client.
 *
 * A 'connected' message is sent down the
 * new client channel to confirm the
 * connection.
 *
 * @param  {Object} data
 */
ServicePrivate.prototype.onconnect = function(data) {
  var client = data.client;
  var contract = data.contract;
  var service = data.service;

  if (!client) return;
  if (service !== this.name) return;
  debug('on connect', this.id, data);
  if (this.channels[client]) return;

  var channel = new BroadcastChannel(client);
  channel.onmessage = this.message.handle;
  this.channels[client] = channel;

  this.setContract(contract);

  channel.postMessage(this.message.create('connected', {
    recipient: client,
    data: {
      id: this.id,
      name: this.name
    }
  }));

  thread.connection('inbound');
  debug('connected', client);
};


ServicePrivate.prototype.ondisconnect = function(client) {
  if (!client) return;
  if (!this.channels[client]) return;
  debug('on disconnect', client);

  var deferred = utils.deferred();

  // TODO: Check there are no requests/methods
  // pending for this client, before disconnecting.
  deferred.resolve();

  thread.disconnection('inbound');
  return deferred.promise;
};

ServicePrivate.prototype.ondisconnected = function(client) {
  debug('disconnected', client);
  this.channels[client].close();
  delete this.channels[client];
};

ServicePrivate.prototype.setContract = function(contract) {
  if (!contract) return;
  this.contract = contract;
  debug('contract set', contract);
};

/**
 * Add a method to the method registry.
 *
 * TODO: We should check the the
 * `name` and function signature
 * match anything defined in the
 * contract. Or perhaps this could
 * be done in `.setContract()`?
 *
 * @param {String}   name
 * @param {Function} fn
 */
ServicePrivate.prototype.addMethod = function(name, fn) {
  this.methods[name] = fn;
};

/**
 * Check a method call matches a registered
 * method and that the arguments passed
 * adhere to a defined contract.
 *
 * Throws an error when invalid.
 *
 * @param  {Object} method
 */
ServicePrivate.prototype.checkMethodCall = function(method) {
  debug('check method call', method);

  var name = method.name;
  var args = method.args;

  if (!this.contract) return;

  var signature = this.contract.methods[name];
  var e;

  if (!signature) e = ERRORS[1];
  else if (args.length !== signature.length) e = ERRORS[2];
  else if (!utils.typesMatch(args, signature)) e = ERRORS[5];

  if (e) throw new Error(e);
};

/**
 * Listens for incoming messsages from
 * the `thread` global and `manager` channel.
 *
 * `this.onmessage` filters out messages
 * that aren't intended for this instance.
 *
 * @private
 */
ServicePrivate.prototype.listen = function() {
  manager.addEventListener('message', this.message.handle);
  thread.on('message', this.message.handle);
};

/**
 * Broadcast a message to all
 * connected clients.
 *
 * @param  {String} type
 * @param  {*} data to pass with the event
 */
ServicePrivate.prototype.broadcast = function(type, data) {
  debug('broadcast', type, data);
  for (var client in this.channels) {
    this.channels[client].postMessage(this.message.create('broadcast', {
      recipient: client,
      data: {
        type: type,
        data: data
      }
    }));
  }
};
