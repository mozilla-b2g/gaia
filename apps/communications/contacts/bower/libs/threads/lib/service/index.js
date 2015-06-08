'use strict';

/**
 * Dependencies
 */

var thread = require('../thread-global');
var Messenger = require('../messenger');
var ServiceStream = require('./stream');
var utils = require('../utils');

/**
 * exports
 */

exports = module.exports = Service;
exports.Stream = ServiceStream; // for testing

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Service]') : function(){};

/**
 * Global broadcast channel that
 * the Manager can use to pair
 * a Client with a Service.
 *
 * @type {BroadcastChannel}
 */

var manager = new BroadcastChannel('threadsmanager');

/**
 * Initialize a new `Service`
 *
 * @param {String} name
 */

function Service(name) {
  if (!(this instanceof Service)) return new Service(name);
  this.name = name;
  this.private = new ServicePrivate(this);
  debug('initialized', this.name);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ServicePrototype = Service.prototype;

/**
 * Register a method that will be
 * exposed to all the clients.
 *
 * @param {String} name Method name
 * @param {Function} fn Implementation
 */

ServicePrototype.method = function(name, fn) {
  this.private.addMethod(name, fn);
  return this;
};

/**
 * Register a method that sends data through a writable stream.
 *
 * @param {String} name Method name
 * @param {Function} fn Implementation
 */

ServicePrototype.stream = function(name, fn) {
  this.private.addStream(name, fn);
  return this;
};

/**
 * Register a contract that will be used
 * to validate method calls and events.
 *
 * @param {Object} contract
 */

ServicePrototype.contract = function(contract) {
  this.private.setContract(contract);
  return this;
};

/**
 * Broadcast message to all the clients.
 *
 * @param {String} type Event name.
 * @param {*} data Payload to be transmitted.
 */

ServicePrototype.broadcast = function(type, data, clients) {
  this.private.broadcast(type, data, clients);
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

function ServicePrivate(service) {
  debug('initialize', service);

  this.public = service;
  this.name = service.name;
  this.id = utils.uuid();
  this.contract = null;
  this.methods = {};
  this.channels = {};
  this.streams = {};
  this.activeStreams = {};

  this.messenger = new Messenger(this.id, '[Service]')
    .handle('connect', this.onconnect, this)
    .handle('stream', this.onstream, this)
    .handle('streamcancel', this.onstreamcancel, this)
    .handle('method', this.onmethod, this)
    .handle('disconnect', this.ondisconnect, this);

  this.listen();

  // Don't declare service ready until
  // any pending tasks in the event-loop
  // have completed. Namely any pending
  // 'connect' events for `SharedWorkers`.
  // If we broadcast the 'serviceready'
  // event before the thread-parent has
  // 'connected', it won't be heard.
  setTimeout(this.ready.bind(this));
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ServicePrivatePrototype = ServicePrivate.prototype;

/**
 * Called when a client calls
 * a service's method.
 *
 * @param  {Object} method
 * @return {*}
 */

ServicePrivatePrototype.onmethod = function(request) {
  debug('method', request.data);
  var method = request.data;
  var fn = this.methods[method.name];
  if (!fn) throw error(4, method.name);
  this.checkMethodCall(method);
  var result = fn.apply(this.public, method.args);
  request.respond(result);
};

/**
 * Called during `client.stream()`
 *
 * @param {Object} method
 * @param {String} method.name Name of the function to be executed
 * @param {String} method.id Stream Id, used to sync client and service streams
 * @param {Object} request Request object
 */

ServicePrivatePrototype.onstream = function(request) {
  debug('stream', request.data);
  var data = request.data;
  var fn = this.streams[data.name];
  var client = request.sender;

  if (!fn) throw error(6, data.name);

  var id = data.id;
  var stream = new ServiceStream({
    id: id,
    channel: this.channels[client],
    serviceId: this.id,
    clientId: client
  });

  this.activeStreams[id] = stream;

  // always pass stream object as first
  // argument to simplify the process
  fn.apply(this.public, [stream].concat(data.args));

  // stream doesn't return anything on purpose,
  // we create another stream object
  // on the client during request
  request.respond();
};

/**
 * Called when client requests for `streamcancel`
 *
 * @param {*} data Data sent from client (reason for cancelation).
 * @return {Promise}
 * @private
 */

ServicePrivatePrototype.onstreamcancel = function(request) {
  var data = request.data;
  var id = data.id;
  var stream = this.activeStreams[id];
  delete this.activeStreams[id];
  request.respond(stream._.cancel(data.reason));
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

ServicePrivatePrototype.ready = function() {
  debug('ready');
  thread.serviceReady(this);
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

ServicePrivatePrototype.onconnect = function(request) {
  var data = request.data;
  var client = data.client;
  var contract = data.contract;
  var service = data.service;

  if (!client) return;
  if (service !== this.name) return;
  if (this.channels[client]) return;

  debug('on connect', this.id, data);
  var channel = new BroadcastChannel(client);
  channel.onmessage = this.messenger.parse;
  this.channels[client] = channel;

  this.setContract(contract);
  thread.connection('inbound');
  debug('connected', client);

  request.respond({
    id: this.id,
    name: this.name
  });
};

/**
 * Responds to `Client` request to disconnect.
 *
 * All the cleanup is done after we have
 * sent the response as we need the
 * channel to send the message back.
 *
 * @param  {Request} request
 */

ServicePrivatePrototype.ondisconnect = function(request) {
  var client = request.data;

  // Check `Client` is known
  if (!this.channels[client]) return;
  debug('on disconnect', client);

  var deferred = utils.deferred();

  // TODO: Check there are no requests/methods
  // pending for this client, before disconnecting.

  deferred.resolve();

  deferred.promise.then(function() {
    return request.respond();
  }).then(function() {
    debug('disconnected', client);
    this.channels[client].close();
    delete this.channels[client];
    thread.disconnection('inbound');
  }.bind(this));
};

ServicePrivatePrototype.setContract = function(contract) {
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

ServicePrivatePrototype.addMethod = function(name, fn) {
  this.methods[name] = fn;
};


/**
 * Add a method to the stream registry.
 *
 * @param {String}   name
 * @param {Function} fn
 */

ServicePrivatePrototype.addStream = function(name, fn) {
  this.streams[name] = fn;
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

ServicePrivatePrototype.checkMethodCall = function(method) {
  debug('check method call', method);

  var name = method.name;
  var args = method.args;

  if (!this.contract) return;

  var signature = this.contract.methods[name];
  var e;

  if (!signature) e = error(1, name);
  else if (args.length !== signature.length) e = error(2, name, signature.length);
  else if (!utils.typesMatch(args, signature)) e = error(5);

  if (e) throw e;
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

ServicePrivatePrototype.listen = function() {
  manager.addEventListener('message', this.messenger.parse);
  thread.on('message', this.messenger.parse);
};

/**
 * Broadcast a message to all
 * connected clients.
 *
 * @param  {String} type
 * @param  {*} data to pass with the event
 * @param  {Array} (optional) array of client-ids to target
 */

ServicePrivatePrototype.broadcast = function(type, data, clients) {
  debug('broadcast', type, data);
  for (var client in this.channels) {
    if (clients && !~clients.indexOf(client)) continue;
    this.messenger.push(this.channels[client], {
      type: 'broadcast',
      recipient: client,
      data: {
        type: type,
        data: data
      }
    });
  }
};

/**
 * Utils
 */

function error(id) {
  /*jshint maxlen:false*/
  var args = [].slice.call(arguments, 1);
  return new Error({
    1: 'method "' + args[0] + '" not defined in the contract',
    2: 'expected method " ' + args[0] + '" to be called with ' + args[1]+ ' arguments',
    3: 'unknown request type: "' + args[0] + '"',
    4: 'method "' + args[0] + '" doesn\'t exist',
    5: 'arguments types don\'t match contract',
    6: 'stream "' + args[0] + '" doesn\'t exist',
  }[id]);
}
