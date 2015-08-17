'use strict';

/**
 * Dependencies
 * @ignore
 */

var uuid = require('./utils').uuid;
var message = require('./message');
var Receiver = message.Receiver;

/**
 * Exports
 * @ignore
 */

module.exports = Service;

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Service]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Extends `Receiver`
 * @ignore
 */

Service.prototype = Object.create(Receiver.prototype);

/**
 * A `Service` is a collection of methods
 * exposed to a `Client`. Methods can be
 * sync or async (using Promises).
 *
 * @example
 *
 * bridge.service('my-service')
 *   .method('ping', param => 'pong: ' + param)
 *   .listen();
 *
 * @class Service
 * @extends Receiver
 * @param {String} name The service name
 * @public
 */
function Service(name) {
  if (!(this instanceof Service)) return new Service(name);
  message.Receiver.call(this, name); // call super

  this.clients = {};
  this.methods = {};

  this
    .on('_disconnect', this.onDisconnect.bind(this))
    .on('_connect', this.onConnect.bind(this))
    .on('_method', this.onMethod.bind(this))
    .on('_off', this.onOff.bind(this))
    .on('_on', this.onOn.bind(this));

  this.destroy = this.destroy.bind(this);
  debug('initialized', name, self.createEvent);
}

/**
 * Define a method to expose to Clients.
 * The return value of the result of a
 * returned Promise will be sent back
 * to the Client.
 *
 * @example
 *
 * bridge.service('my-service')
 *
 *   // sync return value
 *   .method('myMethod', function(param) {
 *     return 'hello: ' + param;
 *   })
 *
 *   // or async Promise
 *   .method('myOtherMethod', function() {
 *     return new Promise(resolve => {
 *       setTimeout(() => resolve('result'), 1000);
 *     });
 *   })
 *
 *   .listen();
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {this} for chaining
 */
Service.prototype.method = function(name, fn) {
  this.methods[name] = fn;
  return this;
};

/**
 * Broadcast's an event from a `Service`
 * to connected `Client`s.
 *
 * The third argument can be used to
 * target selected clients by their
 * `client.id`.
 *
 * @example
 *
 * service.broadcast('my-event', { some: data }); // all clients
 * service.broadcast('my-event', { some: data }, [ clientId ]); // one client
 *
 * @memberof Service
 * @param  {String} type The message type/name
 * @param  {*} [data] Data to send with the event
 * @param  {Array} [only] A select list of clients to message
 * @return {this}
 */
Service.prototype.broadcast = function(type, data, only) {
  debug('broadcast', type, data, only);

  this.eachClient(client => {
    if (only && !~only.indexOf(client.id)) return;
    debug('broadcasting to', client.id);
    this.push(type, data, client.id, { noRespond: true });
  });

  return this;
};

/**
 * Push message to a single connected Client.
 *
 * @example
 *
 * client.on('my-event', data => ...)
 *
 * ...
 *
 * service.push('my-event', { some: data}, clientId)
 *   .then(() => console.log('sent'));
 *
 * @public
 * @param  {String} type
 * @param  {Object} data
 * @param  {String} clientId The Id of the Client to push to
 * @param  {Object} options Optional parameters
 * @param  {Boolean} options.noResponse Tell the Client not to respond
 *   (Promise resolves instantly)
 * @return {Promise}
 */
Service.prototype.push = function(type, data, clientId, options) {
  var noRespond = options && options.noRespond;
  var client = this.getClient(clientId);
  return message('_push')
    .set({
      recipient: clientId,
      noRespond: noRespond,
      data: {
        type: type,
        data: data
      }
    }).send(client.port);
};

Service.prototype.eachClient = function(fn) {
  for (var id in this.clients) fn(this.clients[id]);
};

Service.prototype.getClient = function(id) {
  return this.clients[id];
};

/**
 * @fires Service#before-connect
 * @fires Service#connected
 * @param  {Message} message
 * @private
 */
Service.prototype.onConnect = function(message) {
  debug('connection attempt', message.data, this.name);
  var data = message.data;
  var clientId = data.clientId;

  if (!clientId) return;
  if (data.service !== this.name) return;
  if (this.clients[clientId]) return;

  // before hook
  this.emit('before-connect', message);
  if (message.defaultPrevented) return;

  // If the transport used support 'transfer' then
  // a MessageChannel port will have been sent.
  var ports = message.event.ports;
  var channel = ports && ports[0];

  // If the 'connect' message came with
  // a channel, update the source port
  // so response message goes directly.
  if (channel) {
    message.setSourcePort(channel);
    this.listen(channel);
    channel.start();
  }

  this.addClient(clientId, message.sourcePort);
  message.respond();

  this.emit('connected', clientId);
  debug('connected', clientId);
};

/**
 * @fires Service#before-disconnect
 * @fires Service#disconnected
 * @param  {Message} message
 * @private
 */
Service.prototype.onDisconnect = function(message) {
  var client = this.clients[message.data];
  if (!client) return;

  // before hook
  this.emit('before-disconnect', message);
  if (message.defaultPrevented) return;

  this.removeClient(client.id);
  message.respond();

  this.emit('disconnected', client.id);
  debug('disconnected', client.id);
};

/**
 * @fires Service#before-method
 * @param  {Message} message
 * @private
 */
Service.prototype.onMethod = function(message) {
  debug('on method', message.data);
  this.emit('before-method', message);
  if (message.defaultPrevented) return;

  var method = message.data;
  var name = method.name;
  var result;

  var fn = this.methods[name];
  if (!fn) throw error(4, name);
  try { result = fn.apply(this, method.args); }
  catch (err) { result = err; }
  message.respond(result);
};

/**
 * @fires Service#on
 * @param  {Message} message
 * @private
 */
Service.prototype.onOn = function(message) {
  debug('on on', message.data);
  this.emit('on', message.data);
};

/**
 * @fires Service#off
 * @param  {Message} message
 * @private
 */
Service.prototype.onOff = function(message) {
  debug('on off');
  this.emit('off', message.data);
};

Service.prototype.addClient = function(id, port) {
  this.clients[id] = {
    id: id,
    port: port
  };
};

Service.prototype.removeClient = function(id) {
  delete this.clients[id];
};

/**
 * Use a plugin with this Service.
 * @param  {Function} fn Plugin function
 * @return {this} for chaining
 * @public
 */
Service.prototype.plugin = function(fn) {
  fn(this, { 'uuid': uuid });
  return this;
};

/**
 * Disconnect a Client from the Service.
 * @param  {Object} client
 * @private
 */
Service.prototype.disconnect = function(client) {
  this.removeClient(client.id);
  message('disconnect')
    .set({
      recipient: client.id,
      noRespond: true
    })
    .send(client.port);
};

/**
 * Destroy the Service.
 * @public
 */
Service.prototype.destroy = function() {
  delete this.clients;
  this.unlisten();
  this.off();
};

var sp = Service.prototype;
sp['broadcast'] = sp.broadcast;
sp['destroy'] = sp.destroy;
sp['method'] = sp.method;
sp['plugin'] = sp.plugin;

/**
 * Creates new `Error` from registery.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */
function error(id) {
  var args = [].slice.call(arguments, 1);
  return new Error({
    4: 'method "' + args[0] + '" doesn\'t exist'
  }[id]);
}

/**
 * Fires before the default 'connect' logic.
 * This event acts as a hook for plugin authors
 * to override default 'connect' behaviour.
 *
 * @example
 *
 * service.on('before-connect', message => {
 *   message.preventDefault();
 *   // alternative connection logic ...
 * });
 *
 * @event Service#before-connect
 * @param {Message} message - The connect message
 */

/**
 * Signals that a Client has connected.
 *
 * @example
 *
 * service.on('connected', clientId => {
 *   console.log('client (%s) has connected', clientId);
 * });
 *
 * @event Service#connected
 * @param {String} clientId - The id of the connected Client
 */

/**
 * Fires before the default 'disconnect' logic.
 * This event acts as a hook for plugin authors
 * to override default 'disconnect' behaviour.
 *
 * @example
 *
 * service.on('before-disconnect', message => {
 *   message.preventDefault();
 *   // alternative disconnection logic ...
 * });
 *
 * @event Service#before-disconnect
 * @param {Message} message - The disconnect message
 */

/**
 * Signals that a Client has disconnected.
 *
 * @example
 *
 * service.on('disconnected', clientId => {
 *   console.log('client (%s) has disconnected', clientId);
 * });
 *
 * @event Service#disconnected
 * @param {String} clientId - The id of the disconnected Client
 */

/**
 * Signals that a Client has begun
 * listening to a broadcast event.
 *
 * @example
 *
 * service.on('on', data => {
 *   console.log('client (%s) is listening to %s', data.clientId, data.name);
 * });
 *
 * @event Service#on
 * @type {Object}
 * @property {String} name - The broadcast name
 * @property {String} clientId - The id of the Client that started listening
 */

/**
 * Signals that a Client has stopped
 * listening to a broadcast event.
 *
 * @example
 *
 * service.on('off', data => {
 *   console.log('client (%s) stopped listening to %s', data.clientId, data.name);
 * });
 *
 * @event Service#off
 * @param {Object} data
 * @param {String} data.name - The broadcast name
 * @param {String} data.clientId - The id of the Client that stopped listening
 */
