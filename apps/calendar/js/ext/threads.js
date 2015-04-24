(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.threads = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = {
  create: require('./lib/child-thread'),
  manager: require('./lib/manager'),
  service: require('./lib/service'),
  client: require('./lib/client')
};

},{"./lib/child-thread":2,"./lib/client":3,"./lib/manager":5,"./lib/service":6}],2:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ChildThread]') : function() {};

/**
 * Error messages
 * @type {Object}
 */

const ERRORS = {
  1: 'iframes can\'t be spawned from workers',
  2: 'requst to get service timed out'
};

/**
 * Extends `Emitter`
 */

ChildThread.prototype = Object.create(emitter.prototype);

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.services = {};

  this.message = new utils.Messages(this, this.id, ['broadcast']);
  this.on('serviceready', this.onserviceready.bind(this));
  this.process = this.createProcess();
  this.listen();
  debug('initialized', this.type);
}

ChildThread.prototype.createProcess = function() {
  debug('create process');
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() !== 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildThread.prototype.getService = function(name, options) {
  debug('get service', name, options);

  var wait = (options && options.wait) || 4000;
  var service = this.services[name];
  if (service) return Promise.resolve(service);

  var deferred = utils.deferred();
  this.on('serviceready', function fn(service) {
    if (service.name !== name) return;
    debug('serviceready', service.name);
    this.off('serviceready', fn);
    clearTimeout(timeout);
    deferred.resolve(service);
  });

  // Request will timeout when no service of
  // this name becomes ready within the given wait
  var timeout = setTimeout(function() {
    deferred.reject(new Error(ERRORS[2]));
  }, wait);
  return deferred.promise;
};

ChildThread.prototype.postMessage = function(message) {
  switch(this.type) {
    case 'worker': this.process.postMessage(message); break;
    case 'sharedworker': this.process.port.postMessage(message); break;
    case 'window': this.process.contentWindow.postMessage(message, '*'); break;
  }
};

ChildThread.prototype.listen = function() {
  debug('listen (%s)', this.type);
  switch(this.type) {
    case 'worker':
      this.process.addEventListener('message', this.message.handle);
      break;
    case 'sharedworker':
      this.process.port.start();
      this.process.port.addEventListener('message', this.message.handle);
      break;
    case 'window':
      addEventListener('message', this.message.handle);
  }
};

ChildThread.prototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.process.removeEventListener('message', this.message.handle);
      break;
    case 'sharedworker':
      this.process.port.close();
      this.process.port.removeEventListener('message', this.message.handle);
      break;
    case 'window':
      removeEventListener('message', this.message.handle);
  }
};

ChildThread.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildThread.prototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.services[service.name] = service;
};

ChildThread.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildThread.prototype.destroyProcess = function() {
  debug('destroy thread (%s)');
  switch(this.type) {
    case 'worker': this.process.terminate(); break;
    case 'sharedworker': this.process.port.close(); break;
    case 'window': this.process.remove(); break;
  }
};

},{"./emitter":4,"./utils":8}],3:[function(require,module,exports){

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

},{"./emitter":4,"./thread-global":7,"./utils":8}],4:[function(require,module,exports){

/**
 * Exports
 */

module.exports = Emitter;

var debug = 0 ? console.log.bind(console, '[emitter]') : function(){};

function Emitter() {}

Emitter.prototype = {
  emit: function(type, data) {
    debug('emit', type, data);
    if (!this._callbacks) return;
    var fns = this._callbacks[type] || [];
    fns = fns.concat(this._callbacks['*'] || []);
    for (var i = 0; i < fns.length; i++) {
      fns[i].call(this, data, type);
    }
  },

  on: function(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
  },

  off: function(type, callback) {
    if (!this._callbacks) return;
    var typeListeners = this._callbacks[type];
    if (!typeListeners) return;
    var i = typeListeners.indexOf(callback);
    if (~i) typeListeners.splice(i, 1);
  }
};

},{}],5:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var ChildThread = require('./child-thread');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Manager;

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[Manager]') : function() {};
var channel = new BroadcastChannel('threadsmanager');

function Manager(descriptors) {
  if (!(this instanceof Manager)) return new Manager(descriptors);
  new ManagerInternal(descriptors);
}

function ManagerInternal(descriptors) {
  this.id = 'threadsmanager';
  this.readMessages = new Array(10);
  this.processes = { id: {}, src: {} };
  this.pending = { connects: {} };
  this.activeServices = {};
  this.registry = {};

  this.messages = new utils.Messages(this, this.id, ['connect']);
  channel.addEventListener('message', this.messages.handle);

  this.register(descriptors);
  debug('intialized');
}

ManagerInternal.prototype.register = function(descriptors) {
  debug('register', descriptors);
  for (var name in descriptors) {
    descriptors[name].name = name;
    this.registry[name] = descriptors[name];
  }
};

ManagerInternal.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
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
ManagerInternal.prototype.onconnect = function(data) {
  debug('on connect', data);
  var descriptor = this.registry[data.service];

  if (!descriptor) return debug('"%s" not managed here', data.service);

  var contract = descriptor.contract;
  var client = data.client;

  this.getThread(descriptor)
    .getService(descriptor.name)
    .then(function(service) {
      return this.connect(service, client, contract);
    }.bind(this))
    .catch(function(e) { throw new Error(e); });
};

ManagerInternal.prototype.connect = function(service, client, contract) {
  debug('connect', service, client, contract);
  channel.postMessage(this.messages.create('connect', {
    recipient: service.id,
    data: {
      client: client,
      service: service.name,
      contract: contract
    }
  }));
};

ManagerInternal.prototype.onclientdisconnected = function(msg) {
  debug('on client disconnected', msg);
};

ManagerInternal.prototype.onclientconnected = function(msg) {
  debug('on client connected', msg);
};

ManagerInternal.prototype.getThread = function(descriptor) {
  debug('get thread', descriptor, this.processes);
  var process = this.processes.src[descriptor.src];
  return process || this.createThread(descriptor);
};

ManagerInternal.prototype.createThread = function(descriptor) {
  debug('create thread', descriptor);
  var process = new ChildThread(descriptor);
  this.processes.src[process.src] = process;
  this.processes.id[process.id] = process;
  return process;
};

},{"./child-thread":2,"./utils":8}],6:[function(require,module,exports){

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
 * @type {Array}
 */
const REQUEST_TYPES = [
  'method',
  'disconnect'
];

/**
 * Possible errors.
 * @type {Object}
 */
const ERRORS = {
  1: 'method not defined in the contract',
  2: 'arguments.length doesn\'t match contract',
  3: 'unknown request type',
  4: 'method doesn\'t exist',
  5: 'arguments types don\'t match contract'
};

function Service(name) {
  if (!(this instanceof Service)) return new Service(name);

  this._internal = new ServiceInternal(this, name);
}

/**
 * Register a method that will be exposed to all the clients.
 * @param {String} name Method name
 * @param {Function} fn Implementation
 */
Service.prototype.method = function(name, fn) {
  this._internal.methods[name] = fn;
  return this;
};

/**
 * Register a contract that will be used to validate method calls and events.
 * @param {Object} contract Contract object
 */
Service.prototype.contract = function(contract) {
  this._internal.setContract(contract);
  return this;
};

/**
 * Broadcast message to all the clients.
 * @param {String} type Event name.
 * @param {*} data Payload to be transmitted.
 */
Service.prototype.broadcast = function(type, data) {
  this._internal.broadcast(type, data);
  return this;
};

function ServiceInternal(external, name) {
  debug('initialize', name);

  this.external = external;
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
ServiceInternal.prototype.onrequest = function(request) {
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

ServiceInternal.prototype.onmethod = function(method) {
  debug('method', method.name);
  var fn = this.methods[method.name];
  if (!fn) throw new Error(ERRORS[4]);
  this.checkMethodCall(method);
  return fn.apply(this.external, method.args);
};

ServiceInternal.prototype.respond = function(request, result) {
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
ServiceInternal.prototype.ready = function() {
  debug('ready');
  thread.broadcast('serviceready', {
    id: this.id,
    name: this.name
  });
};

ServiceInternal.prototype.onconnect = function(data) {
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


ServiceInternal.prototype.ondisconnect = function(client) {
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

ServiceInternal.prototype.ondisconnected = function(client) {
  debug('disconnected', client);
  this.channels[client].close();
  delete this.channels[client];
};

ServiceInternal.prototype.setContract = function(contract) {
  if (!contract) return;
  this.contract = contract;
  debug('contract set', contract);
};

ServiceInternal.prototype.checkMethodCall = function(method) {
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
ServiceInternal.prototype.listen = function() {
  manager.addEventListener('message', this.message.handle);
  thread.on('message', this.message.handle);
};

ServiceInternal.prototype.broadcast = function(type, data) {
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

},{"./thread-global":7,"./utils":8}],7:[function(require,module,exports){

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[ThreadGlobal]') : function() {};

const ERRORS = {
  1: 'Unknown connection type'
};

/**
 * Extend `Emitter`
 */

ThreadGlobal.prototype = Object.create(emitter.prototype);

function ThreadGlobal() {
  this.id = getThreadId();
  this.type = utils.env();
  this.manager = new BroadcastChannel('threadsmanager');
  this.ports = [];
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  this.messages = new utils.Messages(this, this.id);
  this.onmessage = this.onmessage.bind(this);
  this.listen();

  debug('initialized', this.type);
}

ThreadGlobal.prototype.listen = function() {
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

ThreadGlobal.prototype.onmessage = function(e) {
  debug('on message', e);
  this.emit('message', e);
};

ThreadGlobal.prototype.broadcast = function(type, data) {
  this.postMessage(this.messages.create('broadcast', {
    recipient: this.id, // ChildThread ID
    data: {
      type: type,
      data: data
    }
  }));
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
ThreadGlobal.prototype.postMessage = function(message) {
  debug('postMessage (%s)', this.type, message);
  switch (this.type) {
    case 'worker':
      postMessage(message); break;
    case 'sharedworker':
      this.ports.map(function(port) { return port.postMessage(message); });
      break;
    case 'window':
      window.parent.postMessage(message, '*'); break;
  }
};

ThreadGlobal.prototype.connection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]++;
  debug('connection', type, this.connections[type]);
  this.check();
};

ThreadGlobal.prototype.disconnection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]--;
  debug('disconnection', type, this.connections[type]);
  this.check();
};

ThreadGlobal.prototype.check = function() {
  if (this.redundant()) {
    debug('redundant');
    this.broadcast('redundant');
  }
};

ThreadGlobal.prototype.isRoot = function() {
  return this.id === 'root';
};

ThreadGlobal.prototype.redundant = function() {
  return !this.isRoot() && this.detached();
};

ThreadGlobal.prototype.detached = function() {
  return !this.connections.inbound;
};

/**
 * Utils
 */

function getThreadId() {
  return utils.query(location.search).pid
    || (typeof window != 'undefined' && window.name)
    || 'root';
}

/**
 * Exports
 */

module.exports = new ThreadGlobal();

},{"./emitter":4,"./utils":8}],8:[function(require,module,exports){
'use strict';

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[utils]') : function() {};

exports.uuid = function (){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
};

exports.typesMatch = function (args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

exports.deferred = function () {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

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

exports.env = function() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[self.constructor.name] || 'unknown';
};

exports.message = {
  factory: function(sender) {
    return function Message(type, options) {
      options = options || {};
      return {
        type: type,
        id: exports.uuid(),
        sender: sender,
        recipient: options.recipient || '*',
        data: options.data
      };
    };
  },

  handler: function(uuid, types) {
    return function(e) {
      var message = e.data;
      var recipient = message.recipient;
      var type = message.type;
      var authorized = recipient === uuid || recipient === '*';
      if (!authorized) return;
      if (!~types.indexOf(type)) return;
      debug('onmessage', message);
      if (this['on' + type]) this['on' + type](message.data, e);
    };
  }
};

/**
 * Message
 */

exports.Messages = Messages;

function Messages(context, id, types) {
  this.context = context;
  this.id = id;
  this.types = types || [];
  this.history = new Array(10);
  this.handle = this.handle.bind(this);
}

Messages.prototype.handle = function(e) {
  var message = e.data;
  if (!this.handles(message)) return;
  if (!this.isRecipient(message)) return;
  if (this.hasRead(message)) return;
  this.context['on' + message.type](message.data, e);
  this.read(message);
};

Messages.prototype.handles = function(message) {
  return !!~this.types.indexOf(message.type);
};

Messages.prototype.isRecipient = function(message) {
  var recipient = message.recipient;
  return recipient === this.id || recipient === '*';
};

Messages.prototype.read = function(message) {
  this.history.push(message.id);
  this.history.shift();
};

Messages.prototype.hasRead = function(message) {
  return !!~this.history.indexOf(message.id);
};

Messages.prototype.create = function (type, options) {
  options = options || {};
  return {
    type: type,
    id: exports.uuid(),
    sender: this.id,
    recipient: options.recipient || '*',
    data: options.data
  };
};

},{}]},{},[1])(1)
});