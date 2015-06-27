'use strict';

/**
 * Dependencies
 */

var ChildThread = require('./child-thread');
var Messenger = require('./messenger');

/**
 * Exports
 */

module.exports = Manager;

/**
 * Simple logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Manager]') : function() {};

/**
 * Global 'manager' channel
 *
 * @type {BroadcastChannel}
 */

var channel = new BroadcastChannel('threadsmanager');

/**
 * Initialize a new `Manager`
 *
 * @param {Object} descriptors Service descriptors
 */

function Manager(descriptors) {
  if (!(this instanceof Manager)) return new Manager(descriptors);
  this._ = new ManagerPrivate(descriptors);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ManagerPrototype = Manager.prototype;

/**
 * Destroy the manager and any
 * threads it's spawned.
 *
 * @public
 */

ManagerPrototype.destroy = function() {
  this._.destroy();
};

/**
 * Hidden `Manager` methods and state.
 *
 * @param {Object} descriptors
 */

function ManagerPrivate(descriptors) {
  this.id = 'threadsmanager';
  this.registry = {};
  this.threads = {};

  this.messenger = new Messenger(this.id, '[Manager]')
    .handle('connect', this.onconnect, this);

  channel.addEventListener('message', this.messenger.parse);
  this.register(descriptors);
  debug('intialized');
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ManagerPrivatePrototype = ManagerPrivate.prototype;

/**
 * Destroy the `Manager`.
 *
 * @private
 */

ManagerPrivatePrototype.destroy = function() {
  debug('destroy');
  if (this.destroyed) return;
  channel.removeEventListener('message', this.messenger.parse);
  this.destroyThreads();
  delete this.registry;
  delete this.threads;
  this.destroyed = true;
};

/**
 * Destroy all threads this Manager created.
 *
 * @private
 */

ManagerPrivatePrototype.destroyThreads = function() {
  debug('destroy threads');
  for (var src in this.threads) this.destroyThread(this.threads[src]);
};

/**
 * Register service descriptors.
 *
 * @param  {Object} descriptors
 * @private
 */

ManagerPrivatePrototype.register = function(descriptors) {
  debug('register', descriptors);
  for (var name in descriptors) {
    descriptors[name].name = name;
    this.registry[name] = descriptors[name];
  }
};

/**
 * Run when a client attempts to connect.
 *
 * If a contract is found in the service
 * descriptor we pass it to the service
 * along with the connect request.
 *
 * @param  {Object} data {service,client,contract}
 * @private
 */

ManagerPrivatePrototype.onconnect = function(request) {
  debug('on connect');
  var data = request.data;
  var descriptor = this.registry[data.service];

  if (!descriptor) return debug('"%s" not managed here', data.service);

  var self = this;
  var client = data.client;
  var contract = descriptor.contract;
  var thread = this.getThread(descriptor);

  request.respond(
    thread.getService(descriptor.name)
      .then(function(service) {
        return self.connect(client, service, contract);
      })
  );
};

/**
 * Connect a Client to a Service.
 *
 * @param  {String} client   Client ID
 * @param  {Object} service  {id,name}
 * @param  {Object} contract (optional)
 * @return {Promise}
 */

ManagerPrivatePrototype.connect = function(client, service, contract) {
  debug('connect', service, client, contract);
  return this.messenger.request(channel, {
    type: 'connect',
    recipient: service.id,
    data: {
      client: client,
      service: service.name,
      contract: contract
    }
  });
};

/**
 * Get a thread for a given service
 * descriptor. If there is no existing
 * thread we create one.
 *
 * @param  {Object} descriptor  Service descriptor
 * @return {ChildThread}
 */

ManagerPrivatePrototype.getThread = function(descriptor) {
  debug('get thread', descriptor);
  var thread = this.threads[descriptor.src];
  return thread || this.createThread(descriptor);
};

/**
 * Create a new `ChildThread` for
 * the given `Service` descriptor.
 *
 * @param  {Object} descriptor
 * @return {ChildThread}
 */

ManagerPrivatePrototype.createThread = function(descriptor) {
  debug('create thread', descriptor);
  var thread = new ChildThread(descriptor);
  var self = this;

  this.threads[thread.src] = thread;
  thread.on('redundant', function fn() {
    thread.off('redundant', fn);
    self.destroyThread(thread);
  });

  return thread;
};

/**
 * Destroy a thread.
 *
 * @param  {ChildThread} thread
 */

ManagerPrivatePrototype.destroyThread = function(thread) {
  debug('destroy thread');
  thread.destroy();
  delete this.threads[thread.src];
};
