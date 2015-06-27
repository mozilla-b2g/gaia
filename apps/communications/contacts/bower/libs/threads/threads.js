(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.threads = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = {
  create: require('./lib/child-thread'),
  manager: require('./lib/manager'),
  service: require('./lib/service'),
  client: require('./lib/client')
};

},{"./lib/child-thread":2,"./lib/client":3,"./lib/manager":6,"./lib/service":8}],2:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 */

var Messenger = require('./messenger');
var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ChildThread]') : function() {};

/**
 * Extends `Emitter`
 */

ChildThread.prototype = Object.create(emitter.prototype);

/**
 * Wraps a reference to a 'thread'.
 *
 * Providing a means to send/recieve
 * messages to/from a 'thread'.
 *
 * Params:
 *
 *   - `src` {String}
 *   - `type` {String} ['window'|'worker'|'sharedworker']
 *   - `target` {HTMLIframeElement|Worker|SharedWorker}
 *   - `parentNode` {HTMLElement}
 *
 * @param {Object} params
 */

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  if (!knownType(params.type)) throw error(3, params.type);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.target = params.target ||  this.createTarget();
  this.threadId = undefined;
  this.services = {};

  this.onmessage = this.onmessage.bind(this);
  this.messenger = new Messenger(this.id, '[ChildThread]')
    .handle('redundant', this.onredundant, this)
    .handle('serviceready', this.onserviceready, this);

  this.listen();
  this.ready = this.checkReady();
  debug('initialized', this.type);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ChildThreadPrototype = ChildThread.prototype;

/**
 * Creates the actual target thread.
 *
 * @return {Worker|SharedWorker|HTMLIframeElement}
 */

ChildThreadPrototype.createTarget = function() {
  debug('create process');
  switch(this.type) {
    case 'worker': return new Worker(this.src);
    case 'sharedworker': return new SharedWorker(this.src);
    case 'window':
      if (utils.env() !== 'window') throw error(1);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.src = this.src;
      return iframe;
  }
};

/**
 * Attempts to get `Service` info from the target.
 *
 * @param  {String} name
 * @return {Object}
 */

ChildThreadPrototype.getService = function(name) {
  debug('get service when ready...', name);
  return this.ready.then(function() {
    return this._getService(name);
  }.bind(this));
};

/**
 * Returns the given service object,
 * or waits for a matching Service
 * to become ready.
 *
 * REVIEW: This logic could be bundled
 * inside `ThreadGlobal` and we could
 * instead send a 'getService' request
 * message to the thread when we don't
 * yet know about the asked `Service`.
 *
 * This would have to be done after 'ready'.
 *
 * @param  {String} name
 * @return {Promise}
 */

ChildThreadPrototype._getService = function(name) {
  debug('get service', name);
  var service = this.services[name];

  if (service) {
    debug('service already known');
    return Promise.resolve(service);
  }

  var deferred = utils.deferred();
  var self = this;

  this.on('serviceready', onServiceReady);

  function onServiceReady(service) {
    if (service.name !== name) return;
    debug('service ready', service.name);
    self.off('serviceready', onServiceReady);
    clearTimeout(timeout);
    deferred.resolve(service);
  }

  // Request will timeout when no service of
  // this name becomes ready within 4sec
  var timeout = setTimeout(function() {
    self.off('serviceready', onServiceReady);
    deferred.reject(error(2, name));
  }, 2000);

  return deferred.promise;
};

/**
 * Checks if the target's `ThreadGlobal` is 'ready'.
 *
 * We have a race of two approaches:
 *
 * 1. We attempt to ping the thread.
 * 2. We wait for the 'threadready' message.
 *
 * Approach 1. will occur when the thread is
 * already alive and kicking. Approach 2. will
 * occur when the thread is brand new and not
 * yet running.
 *
 * @return {Promise}
 */

ChildThreadPrototype.checkReady = function() {
  debug('check ready');
  var deferred = utils.deferred();
  var called = 0;
  var self = this;

  this.messenger.request(this, { type: 'ping' }).then(ready); // 1.
  this.messenger.handle('threadready', ready); // 2.

  function ready(thread) {
    if (called++) return;
    debug('thread ready', thread);
    self.messenger.unhandle('threadready');
    self.threadId = thread.id;
    self.services = thread.services;
    deferred.resolve();
  }

  return deferred.promise;
};

/**
 * Abstracted .postMessage() to send
 * a message directly to the target.
 *
 * @param  {Object} message
 * @private
 */

ChildThreadPrototype.postMessage = function(message) {
  debug('post message', message);
  switch(this.type) {
    case 'worker': this.target.postMessage(message); break;
    case 'sharedworker': this.target.port.postMessage(message); break;
    case 'window':
      if (!this.target.contentWindow) return;
      this.target.contentWindow.postMessage(message, '*');
  }
};

/**
 * Listen for messages that *may*
 * have come from the target thread.
 *
 * For iframe targets we can't listen
 * directly to the target, so we have
 * to listen on `window`. We depend
 * on `Messenger` to filter out any
 * stuff that not intended for us.
 *
 * @private
 */

ChildThreadPrototype.listen = function() {
  debug('listen (%s)', this.type);
  switch(this.type) {
    case 'worker':
      this.target.addEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.target.port.start();
      this.target.port.addEventListener('message', this.onmessage);
      break;
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

/**
 * Remove target message listener.
 *
 * @private
 */

ChildThreadPrototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.target.removeEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.target.port.close();
      this.target.port.removeEventListener('message', this.onmessage);
      break;
    case 'window':
      removeEventListener('message', this.onmessage);
  }
};

/**
 * Parses raw message event through
 * `Messenger` and re-emits a public
 * 'message' event so that `Clients`
 * can listen for messages that may
 * be explicitly targeted at them.
 *
 * @param  {Event} e
 * @private
 */

ChildThreadPrototype.onmessage = function(e) {
  if (!this.fromTarget(e)) return;
  debug('on message', e.data.data);
  this.messenger.parse(e);
  this.emit('message', e);
};

/**
 * Check if message event comes from target.
 *
 * @param  {Event} e
 * @return {Boolean}
 */

ChildThreadPrototype.fromTarget = function(e) {
  return e.target === this.target
    || this.target.contentWindow === e.source
    || e.target === this.target.port;
};

/**
 * Whenever a `Sevice` becomes 'ready'
 * inside the target, a message will
 * be sent to us.
 *
 * We keep a list of known running `Services`.
 *
 * We emit the 'serviceready' event so that
 * the `.getService()` method knows when
 * to callback.
 *
 * TODO: Remove services from this list
 * if they are destroyed within the target
 * thread.
 *
 * @param  {Object} service
 */

ChildThreadPrototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.services[service.name] = service;
  this.emit('serviceready', service);
};

/**
 * The target will send a 'redundant'
 * message to the outside world once
 * it's service have no more Clients.
 *
 * We emit this event so that a `Manager`
 * or whomever created the `ChildThread`
 * can destroy it.
 *
 * @private
 */

ChildThreadPrototype.onredundant = function() {
  debug('redundant');
  this.emit('redundant');
};

/**
 * Destroy the Thread.
 *
 * We unbind *all* listeners that may have
 * attached themselves to events emitted
 * from this object.
 *
 * @public
 */

ChildThreadPrototype.destroy = function() {
  this.unlisten();
  this.destroyTarget();
  this.off();
};

/**
 * Destroy the actual thread instance.
 *
 * @private
 */

ChildThreadPrototype.destroyTarget = function() {
  debug('destroy thread (%s)');

  switch(this.type) {
    case 'worker': this.target.terminate(); break;
    case 'sharedworker': this.target.port.close(); break;
    case 'window': this.target.remove(); break;
  }

  // If we don't clear the reference
  // the browser can't always cleanup.
  // Sometimes `SharedWorkers` don't die.
  delete this.target;
};

/**
 * Utils
 */

/**
 * Checks if given type is known.
 *
 * @param  {String} type
 * @return {Boolean}
 */

function knownType(type) {
  return !!~[
    'window',
    'worker',
    'sharedworker'
  ].indexOf(type);
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
    1: 'iframes can\'t be spawned from workers',
    2: 'Request to get service "' + args[0] + '" timed out',
    3: 'type "' + args[0] + '" not recognized, must be: ' +
      '\'window\', \'worker\' or \'sharedworker\''
  }[id]);
}

},{"./emitter":5,"./messenger":7,"./utils":11}],3:[function(require,module,exports){
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

},{"../emitter":5,"../messenger":7,"../thread-global":10,"../utils":11,"./stream":4}],4:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 */

var Emitter = require('../emitter');
var utils = require('../utils');

/**
 * Exports
 */

module.exports = ClientStream;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ClientStream]') : function() {};

/**
 * Readable stream instance returned by
 * a `client.stream('methodName')` call.
 *
 * @param {Object} options
 * @param {String} options.id Stream Id, used to match client/service streams
 * @param {Client} options.client Client instance
 */

function ClientStream(options) {
  this._ = new ClientStreamPrivate(options);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ClientStreamPrototype = ClientStream.prototype;

/**
 * Promise that will be "resolved" when
 * stream is closed with success, and
 * "rejected" when service aborts
 * the action (abort == error).
 *
 * @type Promise
 */

Object.defineProperty(ClientStreamPrototype, 'closed', {
  get: function() { return this._.closed.promise; }
});

/**
 * Add a listener that will be called
 * every time the service broadcasts
 * a new chunk of data.
 *
 * @param {Function} callback
 */

ClientStreamPrototype.listen = function(callback) {
  debug('listen', callback);
  this._.emitter.on('write', callback);
};

/**
 * Removes 'data' listener
 *
 * @param {Function} callback
 */

ClientStreamPrototype.unlisten = function(callback) {
  debug('unlisten', callback);
  this._.emitter.off('write', callback);
};

/**
 * Notify the service that
 * action should be canceled
 *
 * @param {*} [reason] Optional data to be sent to service.
 */

ClientStreamPrototype.cancel = function(reason) {
  debug('cancel', reason);

  var canceled = utils.deferred();
  var client = this._.client;
  var id = this._.id;

  client.request('streamcancel', {
    id: id,
    reason: reason
  }).then(function(data) {
    delete client._activeStreams[id];
    canceled.resolve(data);
  }).catch(function(e) {
    // should delete the `_activeStreams`
    // reference even if it didn't succeed
    delete client._activeStreams[id];
    canceled.reject(e);
  });

  return canceled.promise;
};

/**
 * Initialize a new `ClientStreamPrivate`.
 *
 * @param {Object} options
 * @private
 */

function ClientStreamPrivate(options) {
  this.id = options.id;
  this.client = options.client;
  this.closed = utils.deferred();
  this.emitter = new Emitter();
  debug('initialized');
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ClientStreamPrivatePrototype = ClientStreamPrivate.prototype;

/**
 * Used internally by Client when
 * it receives an 'abort' event
 * from the service.
 *
 * @private
 */

ClientStreamPrivatePrototype.abort = function(reason) {
  debug('abort', reason);
  this.closed.reject(reason);
};

/**
 * Used internally by Client when
 * it receives a 'close' event
 * from the service.
 *
 * @private
 */

ClientStreamPrivatePrototype.close = function() {
  debug('close');
  this.closed.resolve();
};

/**
 * Used internally by Client when
 * it receives a 'write' event
 * from the service.
 *
 * @private
 */

ClientStreamPrivatePrototype.write = function(data) {
  debug('write', data);
  this.emitter.emit('write', data);
};

},{"../emitter":5,"../utils":11}],5:[function(require,module,exports){
'use strict';

/**
 * Exports
 */

module.exports = Emitter;

/**
 * Simple logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Emitter]') : function(){};

/**
 * Create new `Emitter`
 *
 * @constructor
 */

function Emitter() {}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var EmitterPrototype = Emitter.prototype;

/**
 * Add an event listener.
 *
 * It is possible to subscript to * events.
 *
 * @param  {String}   type
 * @param  {Function} callback
 * @return {Emitter} for chaining
 */

EmitterPrototype.on = function(type, callback) {
  debug('on', type, callback);
  if (!this._callbacks) this._callbacks = {};
  if (!this._callbacks[type]) this._callbacks[type] = [];
  this._callbacks[type].push(callback);
  return this;
};

/**
 * Remove an event listener.
 *
 * Example:
 *
 *   emitter.off('name', fn); // remove one callback
 *   emitter.off('name'); // remove all callbacks for 'name'
 *   emitter.off(); // remove all callbacks
 *
 * @param  {String} type (optional)
 * @param  {Function} callback (optional)
 * @return {Emitter} for chaining
 */

EmitterPrototype.off = function(type, callback) {
  debug('off', type, callback);
  if (this._callbacks) {
    switch (arguments.length) {
      case 0: this._callbacks = {}; break;
      case 1: delete this._callbacks[type]; break;
      default:
        var typeListeners = this._callbacks[type];
        if (!typeListeners) return;
        var i = typeListeners.indexOf(callback);
        if (~i) typeListeners.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit an event.
 *
 * Example:
 *
 *   emitter.emit('name', { some: 'data' });
 *
 * @param  {String} type
 * @param  {*} data
 * @return {Emitter} for chaining
 */

EmitterPrototype.emit = function(type, data) {
  debug('emit', type, data);
  if (this._callbacks) {
    var fns = this._callbacks[type] || [];
    fns = fns.concat(this._callbacks['*'] || []);
    for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
  }
  return this;
};

},{}],6:[function(require,module,exports){
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

},{"./child-thread":2,"./messenger":7}],7:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 */

var utils = require('./utils');

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[Messenger]') : function() {};

/**
 * Exports
 */

module.exports = Messenger;

/**
 * Instantiate a new `Messenger`.
 *
 * A Messenger is a common interface to
 * send and receive messages over a channel
 * that connects threads.
 *
 * It has no concept of `Client` or `Service`
 * it simply acts as a sender and reciever
 * of messages.
 *
 * @param {Number} id
 * @name {String} name (optional) passed to debug() logs
 */

function Messenger(id, name) {
  this.id = id;
  this.name = name;
  this.handlers = {};
  this.pending = {};
  this.history = new Array(10);
  this.parse = this.parse.bind(this);
  debug('initialized', this.name);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var MessengerPrototype = Messenger.prototype;

/**
 * Register a handler for a message type.
 *
 * NOTE: Only one handler per message type allowed.
 *
 * @param  {String}   type
 * @param  {Function} fn
 * @param  {Object}   ctx
 * @return {Messenger} for chaining
 */

MessengerPrototype.handle = function(type, fn, ctx) {
  this.handlers[type] = { fn: fn, ctx: ctx };
  return this;
};

/**
 * Unregister a handler for a message type.
 *
 * As we only accept one handler per message
 * type, a callback function is not required.
 *
 * @param  {String} type
 * @return {Messenger} for chaining
 */

MessengerPrototype.unhandle = function(type) {
  delete this.handlers[type];
  return this;
};

/**
 * Parses raw message event objects
 * an triggers handlers if validity
 * checks are passed.
 *
 * Users of `Message` should wire this
 * up to their Channel's `.onmessage`
 * callback.
 *
 * @param  {Event} e
 * @public
 */

MessengerPrototype.parse = function(e) {
  var message = e.data;

  if (!this.isRecipient(message)) return;
  if (this.hasRead(message)) return;

  debug('parse', this.name, e);
  var handler = this['on' + message.type];

  if (handler) {
    handler.call(this, e);
    this.read(message);
  }
};

/**
 * Request is used to send a message to
 * a channel and expects a response.
 *
 * The returned `Promise` will fulfill
 * with the value passed to `request.respond()`
 * by the first responding handler.
 *
 * @param  {Object} channel [BroadcastChannel, Window, ChildThread]
 * @param  {Object} params  {recipient, type, data}
 * @return {Promise}
 */

MessengerPrototype.request = function(channel, params) {
  debug('request', this.name, params);
  var deferred = utils.deferred();
  var id = utils.uuid();

  send(channel, {
    type: 'request',
    sender: this.id,
    recipient: params.recipient,
    data: {
      id: id,
      type: params.type,
      data: params.data
    }
  });

  this.pending[id] = deferred;
  return deferred.promise;
};

/**
 * Push is used to send a one-way message
 * to a channel and doesn't provide a
 * way to respond.
 *
 * @param  {Object} channel [BroadcastChannel,Window,ChildThread]
 * @param  {Object} params  {recipient,type,data}
 */

MessengerPrototype.push = function(channel, params) {
  debug('push', channel, params);
  send(channel, {
    type: 'push',
    sender: this.id,
    recipient: params.recipient,
    data: {
      type: params.type,
      data: params.data
    }
  });
};

/**
 * Handles incoming 'request' messages.
 *
 * It attempts to find a matching handler,
 * if found it calls it passing a `Request`
 * object that the handler can use to respond.
 *
 * In the event that a handler throws an
 * exception, this will be caught and
 * we .respond() on the handler's behalf.
 *
 * @param  {Event} e Raw message event.
 * @private
 */

MessengerPrototype.onrequest = function(e) {
  debug('on request', e);
  var request = new Request(e);
  var handler = this.handlers[request.type];

  if (!handler) return;

  try { handler.fn.call(handler.ctx, request); }
  catch (e) {
    request.respond(e);
    console.error(e); // Should this throw?
  }
};

/**
 * Handles incoming 'response' messages.
 *
 * Attempts to find a pending request
 * that matches the `requestId` of
 * the response. If found it resolves
 * or rejects the `Promise` based on
 * the response result.
 *
 * @param  {Event} e Raw message event
 * @private
 */

MessengerPrototype.onresponse = function(e) {
  debug('on response', this.name, response);
  var message = e.data;
  var response = message.data;
  var requestId = response.request;
  var promise = this.pending[requestId];

  if (!promise) return debug('no promise', this.pending);

  var result = response.result;
  var method = {
    'fulfilled': 'resolve',
    'rejected': 'reject'
  }[result.state];

  // The value resides under a different
  // key depending on whether the promise
  // was 'rejected' or 'resolved'
  var value = result.reason || result.value;
  promise[method](value);

  // Clean up
  delete this.pending[requestId];
};

/**
 * Handles incoming 'push' messages.
 *
 * Attempts to find a handler that matches
 * the push 'type' and calls it with the
 * data passed.
 *
 * The logic is a lot simpler than onrequest
 * and onresponse as `.push()` doesn't
 * expect a reply.
 *
 * We could kill `.push()` and use `.request()`
 * for everything, but that means that either
 * we'd have to send responses for all
 * messages (even when not required) or
 * we'd have to expire requests in
 * `this.pending`.
 *
 * Overall `.push()` is a more efficient
 * way to send messages.
 *
 * @param  {Event} e Raw message event
 */

MessengerPrototype.onpush = function(e) {
  var message = e.data;
  var push = message.data;
  debug('on push', push);
  var handler = this.handlers[push.type];
  if (handler) handler.fn.call(handler.ctx, push.data);
};

/**
 * Check if this messenger is an
 * intended recipient.
 *
 * @param  {Object}  message
 * @return {Boolean}
 */

MessengerPrototype.isRecipient = function(message) {
  var recipient = message.recipient;
  return recipient === this.id || recipient === '*';
};

/**
 * Keeping track of read messages means
 * that we'll never accidentally read
 * the same message twice.
 *
 * @param  {Object} message
 */

MessengerPrototype.read = function(message) {
  this.history.push(message.id);
  this.history.shift();
};

/**
 * Check if the message has already been read.
 *
 * @param  {Object}  message
 * @return {Boolean}
 */

MessengerPrototype.hasRead = function(message) {
  return !!~this.history.indexOf(message.id);
};

/**
 * Create a new `Request`.
 *
 * A request is an object that represents an
 * incoming request message. It provides
 * the receiver with an opportunity to
 * `.respond('result')`.
 *
 * Any message handlers that match an
 * incoming request `type` will be passed
 * one of these `Request` objects.
 *
 * @param {MessageEvent} e Raw message Event to parse
 */

function Request(e) {
  var message = e.data;
  var request = message.data;

  this.id = request.id;
  this.channel = e.source || e.target;
  this.sender = message.sender;
  this.type = request.type;
  this.data = request.data;
  this.responded = false;
}


/**
 * Respond to a request.
 *
 * The result passed to this function
 * will be sent back to the sender.
 *
 * If an `Error` is passed back the
 * pending `Promise` will be rejected
 * on the sender's end.
 *
 * @param  {*} result
 */

Request.prototype.respond = function(result) {
  debug('respond', result);
  if (this.responded) return;
  this.responded = true;

  var self = this;

  // Repsond with rejection when result is an `Error`
  if (result instanceof Error) reject(result);

  // Call the handler and make
  // sure return value is a promise.
  // If the returned value is unclonable
  // then the send() method will throw,
  // the .catch() will reject in this case.
  return Promise.resolve(result)
    .then(resolve, reject)
    .catch(reject);

  function resolve(value) {
    debug('resolved', value);
    respond({
      state: 'fulfilled',
      value: value
    });
  }

  function reject(err) {
    debug('rejected', err.message);
    respond({
      state: 'rejected',
      reason: err.message || err
    });
  }

  function respond(result) {
    send(self.channel, {
      type: 'response',
      recipient: self.sender,
      data: {
        request: self.id,
        result: result
      }
    });
  }
};

/**
 * Send a message via a particular channel.
 *
 * A 'channel' is an object with a `.postMessage`
 * method. In our case `iframe.contentWindow`,
 * `BroadCastChannel` or `ChildThread`.
 *
 * @param  {Object} channel
 * @param  {Object} params
 * @private
 */

function send(channel, params) {
  debug('send', channel, params);
  var isWindow = channel.constructor.name === 'Window';
  var message = {
    type: params.type,
    id: utils.uuid(),
    recipient: params.recipient || '*',
    sender: params.sender,
    data: params.data
  };

  // Window and BroadcastChannel take different arguments
  if (isWindow) channel.postMessage(message, '*');
  else channel.postMessage(message);
}

},{"./utils":11}],8:[function(require,module,exports){
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

},{"../messenger":7,"../thread-global":10,"../utils":11,"./stream":9}],9:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 */

var Messenger = require('../messenger');

/**
 * Exports
 */

module.exports = ServiceStream;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ServiceStream]') : function() {};

/**
 * Writable Stream instance passed to the
 * `service.stream` implementation
 *
 * @param {Object} options
 * @param {String} options.id Stream ID used to sync client and service streams
 * @param {BroadcastChannel} options.channel Channel used to postMessage
 * @param {String} options.serviceId ID of the service
 * @param {String} options.clientId ID of client that should receive message
 */

function ServiceStream(options) {
  this._ = new ServiceStreamPrivate(this, options);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ServiceStreamPrototype = ServiceStream.prototype;

/**
 * Services that allows clients to
 * cancel the operation before it's
 * complete should override the
 * `stream.cancel` method.
 *
 * @param {*} [reason] Data sent from client about the cancellation
 * @returns {(Promise|*)}
 */

ServiceStreamPrototype.cancel = function(reason) {
  var err = new TypeError('service should implement stream.cancel()');
  return Promise.reject(err);
};

/**
 * Signal to client that action was
 * aborted during the process, this
 * should be used as a way to
 * communicate errors.
 *
 * @param {*} [data] Reason of failure
 * @returns {Promise}
 */

ServiceStreamPrototype.abort = function(data) {
  debug('abort', data);
  return this._.post('abort', 'aborted', data);
};

/**
 * Sends a chunk of data to the client.
 *
 * @param {*} data Chunk of data to be sent to client.
 * @returns {Promise}
 */

ServiceStreamPrototype.write = function(data) {
  debug('write', data);
  return this._.post('write', 'writable', data);
};

/**
 * Closes the stream, signals that
 * action was completed with success.
 *
 * According to whatwg streams spec,
 * WritableStream#close() doesn't send data.
 *
 * @returns {Promise}
 */

ServiceStreamPrototype.close = function() {
  debug('close');
  return this._.post('close', 'closed');
};

/**
 * Initialize a new `ClientStreamPrivate`.
 *
 * @param {ServiceStream} target
 * @param {Object} options
 * @private
 */

function ServiceStreamPrivate(target, options) {
  this.target = target;
  this.id = options.id;
  this.channel = options.channel;
  this.client = options.clientId;
  this.state = 'writable';
  this.messenger = new Messenger(options.serviceId, '[ServiceStream]');
  debug('initialized', target, options);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ServiceStreamPrivatePrototype = ServiceStreamPrivate.prototype;

/**
 * Validate the internal state to avoid
 * passing data to the client when stream
 * is already 'closed/aborted/canceled'.
 *
 * Returns a Stream to simplify the 'cancel'
 * & 'post' logic since they always need
 * to return promises.
 *
 * @param {String} actionName
 * @param {String} state
 * @returns {Promise}
 * @private
 */

ServiceStreamPrivatePrototype.validateState = function(actionName, state) {
  if (this.state !== 'writable') {
    var msg = 'Can\'t ' + actionName + ' on current state: ' + this.state;
    return Promise.reject(new TypeError(msg));
  }

  this.state = state;
  return Promise.resolve();
};

/**
 * Validate the current state and
 * call cancel on the target stream.
 *
 * Called by the Service when client
 * sends a 'streamcancel' message.
 *
 * @param {*} [reason] Reason for cancelation sent by the client
 * @returns {Promise}
 * @private
 */

ServiceStreamPrivatePrototype.cancel = function(reason) {
  return this.validateState('cancel', 'canceled').then(function() {
    return this.target.cancel(reason);
  }.bind(this));
};

/**
 * Validate the current state and post message to client.
 *
 * @param {String} type 'write', 'abort' or 'close'
 * @param {String} state 'writable', 'aborted' or 'closed'
 * @param {*} [data] Data to be sent to the client
 * @returns {Promise}
 * @private
 */

ServiceStreamPrivatePrototype.post = function(type, state, data) {
  debug('post', type, state, data);
  return this.validateState(type, state).then(function() {
    debug('validated', this.channel);
    this.messenger.push(this.channel, {
      type: 'streamevent',
      recipient: this.client,
      data: {
        id: this.id,
        type: type,
        data: data
      }
    });
  }.bind(this));
};

},{"../messenger":7}],10:[function(require,module,exports){
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

},{"./emitter":5,"./messenger":7,"./utils":11}],11:[function(require,module,exports){
'use strict';

/**
 * Create a UUID string.
 *
 * http://jsperf.com/guid-generation-stackoverflow
 *
 * @return {String}
 */

exports.uuid = (function (){
  var l = [];
  for (var i=0; i<256; i++) { l[i] = (i<16?'0':'')+(i).toString(16); }
  return function () {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return l[d0&0xff]+l[d0>>8&0xff]+l[d0>>16&0xff]+l[d0>>24&0xff]+'-'+
      l[d1&0xff]+l[d1>>8&0xff]+'-'+l[d1>>16&0x0f|0x40]+l[d1>>24&0xff]+'-'+
      l[d2&0x3f|0x80]+l[d2>>8&0xff]+'-'+l[d2>>16&0xff]+l[d2>>24&0xff]+
      l[d3&0xff]+l[d3>>8&0xff]+l[d3>>16&0xff]+l[d3>>24&0xff];
  };
})();

/**
 * Check that the given arguments
 * match the given types.
 *
 * Example:
 *
 *   typesMatch([1, 'foo'], ['number', 'string']) //=> true
 *   typesMatch([1, 'foo'], ['string', 'number']) //=> false
 *
 * @param  {Array} args
 * @param  {Array} types
 * @return {Boolean}
 */

exports.typesMatch = function (args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

/**
 * Returns a Promise packaged
 * inside an object.
 *
 * This is convenient as we don't
 * have to have a load of callbacks
 * directly inside our funciton body.
 *
 * @return {Object}
 */

exports.deferred = function () {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

/**
 * Parses a url query string and
 * spits out a key/value object.
 *
 * Example:
 *
 *   query('?foo=bar').foo; //=> 'bar'
 *   query('?foo=bar&baz=bat').baz; //=> 'bat'
 *
 * @param  {String} string
 * @return {Object}
 */

exports.query = function(string) {
  var result = {};

  string
    .replace('?', '')
    .split('&')
    .forEach(function(param) {
      var parts = param.split('=');
      result[parts[0]] = parts[1];
    });

  return result;
};

/**
 * Returns type of environment
 * the current script is running in.
 *
 * @return {String}
 */

exports.env = function() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[self.constructor.name] || 'unknown';
};

},{}]},{},[1])(1)
});