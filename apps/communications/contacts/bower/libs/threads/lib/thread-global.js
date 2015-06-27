'use strict';

/**
 * Dependencies
 */

var Messenger = require('./messenger');
var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ThreadGlobal]') : function() {};

/**
 * Extend `Emitter`
 */

ThreadGlobal.prototype = Object.create(emitter.prototype);

/**
 * Initialize a new `ThreadGlobal`.
 *
 * @private
 */

function ThreadGlobal() {
  this.id = utils.uuid();
  this.type = utils.env();
  this.isRoot = isRoot();
  this.manager = new BroadcastChannel('threadsmanager');
  this.ports = [];
  this.services = {};
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  this.messenger = new Messenger(this.id, '[ThreadGlobal]')
    .handle('ping', this.onPing, this);

  this.onmessage = this.onmessage.bind(this);
  this.listen();
  this.ready();

  debug('initialized', this.id, this.type, this.isRoot);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ThreadGlobalPrototype = ThreadGlobal.prototype;

/**
 * Listens for incoming messages.
 *
 * @private
 */

ThreadGlobalPrototype.listen = function() {
  debug('listen');
  switch (this.type) {
    case 'sharedworker':
      addEventListener('connect', function(e) {
        debug('port connect');
        var port = e.ports[0];
        this.ports.push(port);
        port.onmessage = this.onmessage;
        port.start();
      }.bind(this));
    break;
    case 'worker':
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

/**
 * Ping the outside world to let them
 * know the thread is ready.
 *
 * @private
 */

ThreadGlobalPrototype.ready = function() {
  if (this.isRoot) return;
  debug('ready', this.id);
  this.messenger.push(this, {
    type: 'threadready',
    data: this.serialize()
  });
};

/**
 * Respond when the outside world asks
 * if we're ready.
 *
 * @private
 */

ThreadGlobalPrototype.onPing = function(request) {
  debug('on ping');
  request.respond(this.serialize());
};

/**
 * Return serialized state.
 *
 * @return {Object}
 */

ThreadGlobalPrototype.serialize = function() {
  return {
    id: this.id,
    services: this.services
  };
};

/**
 * When a message is sent to this thread
 * we re-emit the message internally.
 *
 * The thread-global abstracts away the
 * the complexity of message listening
 * so that `Service` can just do:
 *
 *   thread.on('message', ...);
 *
 * and not care what thread type
 * it's running in.
 *
 * @param  {Event} e
 * @private
 */

ThreadGlobalPrototype.onmessage = function(e) {
  debug('on message', e);
  this.messenger.parse(e);
  this.emit('message', e);
};

/**
 * Keeps a record of what services are
 * running inside this thread.
 *
 * This makes the assumption that
 *
 * TODO: If services are destroyed we
 * should remove it from this list.
 *
 * @param  {Service} service
 */

ThreadGlobalPrototype.serviceReady = function(service) {
  debug('service ready', service);
  if (this.services[service.name]) throw error(2, service.name);

  this.services[service.name] = {
    id: service.id,
    name: service.name
  };

  this.messenger.push(this, {
    type: 'serviceready',
    data: this.services[service.name]
  });
};

/**
 * Message the thread parent
 * (instanceof ChildThread) to
 * inform them of something that
 * has happened inside the thread.
 *
 * The Manager could have created
 * the `ChildThread` or it could
 * have been created manually by
 * the user.
 *
 * @param  {Message} message
 * @public
 */

ThreadGlobalPrototype.postMessage = function(message) {
  debug('postMessage (%s)', this.type, message);
  switch (this.type) {
    case 'worker':
      postMessage(message); break;
    case 'sharedworker':
      this.ports.forEach(function(port) { port.postMessage(message); });
      break;
    case 'window':
      window.parent.postMessage(message, '*'); break;
  }
};

/**
 * Increment the connection count.
 *
 * @param  {String} type  ['incoming','outgoing']
 */

ThreadGlobalPrototype.connection = function(type) {
  if (!(type in this.connections)) throw error(1, type);
  this.connections[type]++;
  debug('connection', type, this.connections[type]);
  this.check();
};

/**
 * Decrement the connection count.
 *
 * @param  {String} type  ['incoming','outgoing']
 */

ThreadGlobalPrototype.disconnection = function(type) {
  if (!(type in this.connections)) throw error(1, type);
  this.connections[type]--;
  debug('disconnection', type, this.connections[type]);
  this.check();
};

/**
 * Checks to see if the thread is
 * 'redundant', broadcasting an event
 * to notify the outside world if so.
 *
 * @private
 */

ThreadGlobalPrototype.check = function() {
  if (this.isRedundant()) {
    debug('redundant');
    this.messenger.push(this, { type: 'redundant' });
  }
};

/**
 * A thread is 'redundant' when it has
 * no clients and it's not a 'root'.
 *
 * @return {Boolean}
 */

ThreadGlobalPrototype.isRedundant = function() {
  return !this.isRoot && this.isDetached();
};

/**
 * A thread is 'detached' when
 * it has no clients.
 *
 * @return {Boolean}
 */

ThreadGlobalPrototype.isDetached = function() {
  return !this.connections.inbound;
};

/**
 * Utils
 */

/**
 * Detects if current context
 * is the 'root' window.
 *
 * @return {Boolean}
 */

function isRoot() {
  return inWindow() && window.parent === window;
}

/**
 * Detects if current context
 * is runnign in a Window.
 *
 * @return {Boolean}
 */

function inWindow() {
  return typeof window !== 'undefined';
}

/**
 * Handy `Error` factory.
 *
 * @param  {Number} id
 * @return {String}
 */

function error(id) {
  var args = [].slice.call(arguments, 1);
  return new Error({
    1: 'Unknown connection type: "' + args[0] + '"',
    2: 'Service "' + args[0] + '"already defined'
  }[id]);
}

/**
 * Export `ThreadGlobal` singleton
 */

module.exports = new ThreadGlobal();
