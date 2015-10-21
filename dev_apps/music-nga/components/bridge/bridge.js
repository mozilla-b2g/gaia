(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var bridge = {
  'service': require('../src/service'),
  'client': require('../src/client'),
  _m: require('../src/message')
};

if ((typeof define)[0] != 'u') define([], () => bridge);
else self['bridge'] = bridge;

},{"../src/client":2,"../src/message":4,"../src/service":6}],2:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 * @ignore
 */

var createPort = require('./message/port-adaptors');
var Emitter = require('./emitter');
var message = require('./message');
var uuid = require('./utils').uuid;

/**
 * Exports
 * @ignore
 */

module.exports = Client;

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Client]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * A Client is a remote interface
 * to a Service within a given endpoint.
 *
 * See {@tutorial What's an endpoint?}
 * for more information on 'endpoints'.
 *
 * @example
 *
 * var endpoint = document.querySelector('iframe');
 * var client = bridge.client('my-service', endpoint);
 *
 * @constructor
 * @param {String} service The service name to connect to
 * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
 * @param {Number} [timeout] Override default response timeout
 * The context/thread this service can be found in.
 * @public
 */
function Client(service, endpoint, timeout) {
  if (!(this instanceof Client)) return new Client(service, endpoint, timeout);

  // Parameters can be passed as single object
  if (typeof service == 'object') {
    endpoint = service.endpoint;
    timeout = service.timeout;
    service = service.service;
  }

  this.id = uuid();
  this.service = service;
  this.timeout = timeout;

  // Keep a reference to the original endpoint
  // so that it's not garbage collected (Workers)
  this.endpoint = endpoint || this.endpoint;
  if (!this.endpoint) throw error(1);

  this.setPort(this.endpoint);
  this.pending = new Set();

  this.receiver = message.receiver(this.id)
    .on('_push', this.onPush.bind(this));

  debug('initialized', service);
}

Client.prototype = {

  /**
   * Connect with the Service. Called
   * automatically internally, so
   * only required if you have
   * perposely called .disconnect().
   *
   * @public
   */
  connect: function() {
    debug('connect');
    if (this.connected) return this.connected;
    debug('connecting...', this.service);

    var mc = new MessageChannel();
    this.channel = mc.port1;
    this.channel.start();

    var data = {
      clientId: this.id,
      service: this.service
    };

    return this.connected = this.message('_connect')
      .set('transfer', [mc.port2])
      .set('data', data)
      .listen(mc.port1)
      .send()
      .then(response => {
        debug('connected', response);

        // Check if the response came back on
        // the MessageChannel. If it did then
        // update the endpoint so that all
        // subsequent messaging uses this channel.
        var usingChannel = response.event.target === this.channel;
        if (usingChannel) this.setPort(this.channel);
        else {
          this.channel.close();
          delete this.channel;
        }

        // Begin listening so that Clients can
        // respond to service pushed messages
        this.receiver.listen(this.port);
      })

      // In the event of message timeout we
      // upgrade the message to something more
      // informative. console.error() is used to
      // makesure the message is seen even when
      // the user hasn't registered a .catch() handler.
      .catch(err => {
        var msg = err && err.message;
        if (msg == 'timeout') {
          err = error(2, this.service);
          console.error(err.message);
        }

        throw err;
      });
  },

  /**
   * Disconnect from the `Service`.
   *
   * @public
   */
  disconnect: function(options) {
    if (!this.connected) return Promise.resolve();
    debug('disconnecting ...');

    var config = {
      noRespond: options && options.noRespond,
      data: this.id
    };

    this.cancelPending();

    return this.message('_disconnect')
      .set(config)
      .send()
      .then(() => this.onDisconnected());
  },

  /**
   * Call a method on the connected Service.
   *
   * @example
   *
   * client.method('greet', 'wilson').then(result => {
   *   console.log(result); //=> 'hello wilson'
   * });
   *
   * // my-service.js:
   *
   * service.method('greet', name => {
   *   return 'hello ' + name;
   * });
   *
   * @param  {String} name The method name
   * @param  {...*} [args] Arguments to send
   * @return {Promise}
   */
  method: function(name, ...args) {
    return this.connect()
      .then(() => {
        debug('method', name);
        return this.message('_method')
          .set({
            recipient: this.service,
            data: {
              name: name,
              args: args
            }
          })
          .send();
      })

      // Only send back the response value
      .then(response => response.value)

      // In the event of message timeout we
      // upgrade the message to something more
      // informative. console.error() is used to
      // make sure the message is seen even when
      // the user hasn't registered a .catch() handler.
      .catch(err => {
        var msg = err && err.message;
        if (msg == 'timeout') {
          err = error(3, name);
          console.error(err.message);
        }

        throw err;
      });
  },

  /**
   * Use a plugin with this Client.
   * See {@tutorial Writing plugins}.
   *
   * @example
   *
   * client.plugin(megaPlugin);
   *
   * @param  {Function} fn The plugin
   * @return {this} for chaining
   * @public
   */
  plugin: function(fn) {
    fn(this, {
      'Emitter': Emitter,
      'uuid': uuid
    });

    return this;
  },

  /**
   * A wrapper around Message that
   * ensures pending messages are
   * noted and the Client's endpoint
   * is predefined.
   *
   * @param  {String} type The message type
   * @return {Message}
   * @private
   */
  message(type) {
    debug('create message', type);

    var msg = message(type)
      .set('port', this.port)
      .set('timeout', this.timeout)
      .on('response', () => this.pending.delete(msg))
      .on('cancel', () => this.pending.delete(msg));

    this.pending.add(msg);
    return msg;
  },

  /**
   * Cancel any message that we have
   * not recieved a response from yet.
   *
   * @private
   */
  cancelPending() {
    debug('cancel pending');
    this.pending.forEach(msg => { msg.cancel();});
    this.pending.clear();
  },

  /**
   * Returns a Promise that resolves
   * once all pending messages have
   * responded.
   *
   * @private
   * @return {Promise}
   */
  pendingResponded() {
    var responded = [];
    this.pending.forEach(msg => responded.push(msg.responded));
    return Promise.all(responded);
  },

  /**
   * Emits a event when a 'push' Message
   * is recieved from the Service.
   *
   * @private
   * @param  {Message} message The pushed message
   */
  onPush(message) {
    debug('on push', message.data);
    this._emit(message.data.type, message.data.data);
  },

  // Needs testing!
  onDisconnected() {
    delete this.connected;
    this.pendingResponded().then(() => {
      debug('disconnected');
      if (this.channel) this.channel.close();
      this._emit('disconnected');
    });
  },

  /**
   * Set the port which all messages
   * will be sent over. This can differ
   * to the endpoint if we successfully
   * upgrade transport to MessageChannel.
   *
   * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
   */
  setPort(endpoint) {
    debug('set port');
    this.port = createPort(endpoint);
  },

  /**
   * Destroy the Client. Waits from all
   * pending Messages to have responded.
   *
   * @example
   *
   * client.destroy().then(() => ...);
   *
   * @public
   * @return {Promise}
   */
  destroy: function() {
    return this.disconnect()
      .then(() => {
        if (this.destroyed) return;
        debug('destroy');
        this.destroyed = true;
        this.receiver.destroy();
        this._off();

        // Wipe references
        this.port
          = this.endpoint
          = this.receiver
          = null;
      });
  },

  _on: Emitter.prototype.on,
  _off: Emitter.prototype.off,
  _emit: Emitter.prototype.emit
};

/**
 * Listen to a Service .broadcast() or .push().
 *
 * Services get notified whenever a Client
 * starts listening to a particular event.
 *
 * @example
 *
 * client
 *   .on('importantevent', data => ...)
 *   .on('thingchanged', thing => ...);
 *
 * @param  {String} name The event name
 * @param  {Function} fn Callback function
 * @return {this} for chaining
 * @public
 */
Client.prototype.on = function(name, fn) {
  this.connect().then(() => {
    debug('bind on', name);
    Emitter.prototype.on.call(this, name, fn);
    this.message('_on')
      .set('noRespond', true)
      .set('data', {
        name: name,
        clientId: this.id
      })
      .send(this.port);
  });

  return this;
};

/**
 * Unlisten to a Service event.
 *
 * @example
 *
 * client
 *   .off('importantevent') // remove all
 *   .off('thingchanged', onThingChanged); // remove one
 *
 * @this Client
 * @param  {String} name The event name
 * @param  {Function} fn Callback function
 * @return {this} for chaining
 * @public
 */
Client.prototype.off = function(name, fn) {
  this.connect().then(() => {
    Emitter.prototype.off.call(this, name, fn);
    this.message('_off')
      .set('noRespond', true)
      .set('data', {
        name: name,
        clientId: this.id
      })
      .send(this.port);
  });

  return this;
};

var cp = Client.prototype;
cp['destroy'] = cp.destroy;
cp['plugin'] = cp.plugin;
cp['method'] = cp.method;
cp['connect'] = cp.connect;
cp['disconnect'] = cp.disconnect;
cp['on'] = cp.on;
cp['off'] = cp.off;

/**
 * Creates new `Error` from registery.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */

function error(id, ...args) {
  /*jshint maxlen:false*/
  var help = 'Either the target endpoint is not alive or the Service is not `.listen()`ing.';
  return new Error({
    1: 'an endpoint must be defined',
    2: `Unable to establish a connection with "${args[0]}". ${help}`,
    3: `Method "${args[0]}" didn't get a response. ${help}`
  }[id]);
}

},{"./emitter":3,"./message":4,"./message/port-adaptors":5,"./utils":7}],3:[function(require,module,exports){
'use strict';

/**
 * Exports
 * @ignore
 */

module.exports = Emitter;

/**
 * Simple logger
 *
 * @type {Function}
 * @private
 */

var debug = 0 ? console.log.bind(console, '[Emitter]') : () => {};

/**
 * Create new `Emitter`
 *
 * @class Emitter
 */

function Emitter(host) {
  if (host) return Object.assign(host, Emitter.prototype);
}

Emitter.prototype = {

  /**
   * Add an event listener.
   *
   * It is possible to subscript to * events.
   *
   * @param  {String}   type
   * @param  {Function} callback
   * @return {this} for chaining
   */

  on: function(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
    return this;
  },

  /**
   * Remove an event listener.
   *
   * @example
   *
   * emitter.off('name', fn); // remove one callback
   * emitter.off('name'); // remove all callbacks for 'name'
   * emitter.off(); // remove all callbacks
   *
   * @param  {String} [type]
   * @param  {Function} [callback]
   * @return {this} for chaining
   */

  off: function(type, callback) {
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
      }
    }
    return this;
  },

  /**
   * Emit an event.
   *
   * @example
   *
   * emitter.emit('name', { some: 'data' });
   *
   * @param  {String} type
   * @param  {*} [data]
   * @return {this} for chaining
   */

  emit: function(type, data) {
    debug('emit', type, data);
    if (this._callbacks) {
      var fns = this._callbacks[type] || [];
      fns = fns.concat(this._callbacks['*'] || []);
      for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
    }
    return this;
  }
};

var p = Emitter.prototype;
p['off'] = p.off;
p['on'] = p.on;

},{}],4:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 * @ignore
 */

var createPort = require('./port-adaptors');
var Emitter = require('../emitter');
var utils = require('../utils');
var defer = utils.deferred;
var uuid = utils.uuid;

/**
 * Exports
 * @ignore
 */

exports = module.exports = type => new Message(type);
exports.receiver = (id, n) => new Receiver(id, n);
exports.Receiver = Receiver;
exports.Message = Message;

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Message]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Default response timeout.
 * @type {Number}
 * @private
 */
var TIMEOUT = 1000;

/**
 * Initialize a new `Message`
 *
 * @class Message
 * @borrows Emitter#on as #on
 * @borrows Emitter#off as #off
 * @borrows Emitter#emit as #emit
 * @param {String} type Message type
 */
function Message(type) {
  this.cancelled = false;
  this.listeners = [];
  this.deferred = defer();
  this.onMessage = this.onMessage.bind(this);
  this.onTimeout = this.onTimeout.bind(this);
  if (typeof type === 'object') this.setupInbound(type);
  else this.setupOutbound(type);
  debug('initialized', type);
}

Message.prototype = {
  setupOutbound(type) {
    this.id = uuid();
    this.type = type;
    this.sent = false;
    this.recipient = '*';
  },

  setupInbound (e) {
    debug('inbound');
    this.hasResponded = false;

    // When an Endpoint is created from an event
    // target we know it's ready to recieve messages.
    this.setSourcePort(e.source || e.target);

    // Keep a reference to the MessageEvent
    this.event = e;

    // Mixin the properties of the original message
    Object.assign(this, e.data);
  },

  setSourcePort(endpoint) {
    debug('set source', endpoint.constructor.name);
    this.sourcePort = createPort(endpoint, { ready: true });
    return this;
  },

  set: function(key, value) {
    debug('set', key, value);
    if (typeof key == 'object') Object.assign(this, key);
    else this[key] = value;
    return this;
  },

  serialize() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      recipient: this.recipient,
      noRespond: this.noRespond
    };
  },

  preventDefault() {
    debug('prevent default');
    this.defaultPrevented = true;
  },

  /**
   * Send the message to an endpoint.
   *
   * @param  {(Iframe|Window|Worker|MessagePort)} endpoint
   * @return {Promise}
   */
  send: function(endpoint) {
    debug('send', this.type);
    if (this.sent) throw error(1);
    var serialized = this.serialize();
    var expectsResponse = !this.noRespond;

    // A port is resolved from either a predefined
    // port, or an endpoint given as first argument
    this.port = endpoint ? createPort(endpoint) : this.port;
    if (!this.port) throw error(3);

    // If we're expecting a response listen
    // on the port else resolve promise instantly
    if (expectsResponse) {
      this.listen(this.port);
      this.setResponseTimeout();
    } else this.deferred.resolve();

    this.port.postMessage(serialized, this.getTransfer());
    debug('sent', serialized);
    return this.deferred.promise;
  },

  /**
   * Set the response timeout.
   *
   * When set to `false` no timeout
   * is installed.
   *
   * @private
   */
  setResponseTimeout() {
    if (this.timeout === false) return;
    var ms = this.timeout || TIMEOUT;
    this._timer = setTimeout(this.onTimeout, ms);
  },

  /**
   * Clear the response timeout.
   *
   * @private
   */
  clearResponseTimeout() {
    clearTimeout(this._timer);
  },

  getTransfer() {
    return this.transfer || this.event && this.event.ports;
  },

  onMessage(e) {
    var valid = !!e.data.response
      && e.data.id === this.id
      && !this.cancelled;

    if (valid) this.onResponse(e);
  },

  onTimeout() {
    debug('response timeout', this.type);
    if (!this.silentTimeout) this.deferred.reject(error(4));
    this.teardown();
  },

  listen(thing) {
    debug('add response listener', thing);
    var port = createPort(thing);
    port.addListener(this.onMessage);
    this.listeners.push(port);
    return this;
  },

  unlisten() {
    debug('remove response listeners');
    this.listeners.forEach(port => port.removeListener(this.onMessage));
    this.listeners = [];
  },

  /**
   * Cancel a pending Message.
   *
   * @example
   *
   * var msg = message('foo')
   *
   * msg.send(new Worker('my-worker.js'))
   *   .then(response => {
   *     // this will never run
   *   })
   *
   * msg.cancel();
   *
   * @public
   */
  cancel: function() {
    this.teardown();
    this.cancelled = true;
    this.emit('cancel');
  },

  teardown() {
    this.clearResponseTimeout();
    this.unlisten();
  },

  /**
   * Respond to a message.
   *
   * @example
   *
   * receiver.on('hello', message => {
   *   message.respond('world');
   * });
   *
   * @public
   * @param  {*} [result] Data to send back with the response
   */
  respond: function(result) {
    debug('respond', result);

    if (this.hasResponded) throw error(2);
    if (!this.sourcePort) return;
    if (this.noRespond) return;

    var self = this;
    this.hasResponded = true;

    // Repsond with rejection when result is an `Error`
    if (result instanceof Error) reject(result);

    // Call the handler and make
    // sure return value is a promise.
    // If the returned value is unclonable
    // then the send() method will throw,
    // the .catch() will reject in this case.
    Promise.resolve(result)
      .then(resolve, reject)
      .catch(reject);

    function resolve(value) {
      debug('resolve', value);
      respond({
        type: 'resolve',
        value: value
      });
    }

    function reject(err) {
      var msg = err && err.message || err;
      debug('reject', msg);
      respond({
        type: 'reject',
        value: msg
      });
    }

    function respond(response) {
      self.response = response;
      self.sourcePort.postMessage({
        id: self.id,
        response: response
      }, self.transfer);

      debug('responded with:', response);
    }
  },

  /**
   * Forward a `Message` onto another endpoint.
   *
   * The `silentTrue` option prevents the
   * message request timing out should
   * the response come back via an
   * alternative route.
   *
   * @param  {(HTMLIframeElement|MessagePort|Window)} endpoint
   * @public
   */
  forward: function(endpoint) {
    debug('forward');
    return this
      .set('silentTimeout', true)
      .send(endpoint)
      .then(result => this.respond(result.value));
  },

  onResponse(e) {
    debug('on response', e.data);
    var response = e.data.response;
    var type = response.type;
    var value = type == 'reject'
      ? response.value
      : response;

    response.event = e;
    this.response = response;
    this.teardown();

    this.deferred[this.response.type](value);
    this.emit('response', response);
  }
};

// Prevent ClosureCompiler
// mangling public methods
var mp = Message.prototype;
mp['forward'] = mp.forward;
mp['respond'] = mp.respond;
mp['preventDefault'] = mp.preventDefault;
mp['cancel'] = mp.cancel;
mp['send'] = mp.send;
mp['set'] = mp.set;

// Mixin Emitter methods
Emitter(Message.prototype);

/**
 * Initialize a new `Receiver`.
 *
 * @class Receiver
 * @extends Emitter
 * @param {String} name - corresponds to `Message.recipient`
 */
function Receiver(name) {
  this.name = name;
  this.ports = new Set();
  this.onMessage = this.onMessage.bind(this);
  this['listen'] = this['listen'].bind(this);
  this['unlisten'] = this['unlisten'].bind(this);
  debug('receiver initialized', name);
}

Receiver.prototype = {

  /**
   * Begin listening for inbound messages.
   *
   * @example
   *
   * // When no arguments are given
   * // messages will be listened for
   * // on the default global scope
   * .listen();
   *
   * // When an endpoint is out of reach
   * // BroadcastChannel can be used.
   * .listen(new BroadcastChannel('foo'));
   *
   * @param {(HTMLIframeElement|Worker|MessagePort|
   * BroadcastChannel|Window|Object)} [thing]
   * @public
   */
  listen: function(thing) {
    debug('listen');
    var _port = createPort(thing || self, { receiver: true });
    if (this.ports.has(_port)) return;
    _port.addListener(this.onMessage, this.listen);
    this.ports.add(_port);
    return this;
  },

  /**
   * Stop listening for inbound messages
   * on all endpoints listened to prior.
   *
   * @public
   */
  unlisten: function() {
    debug('unlisten');
    this.ports.forEach(port => {
      port.removeListener(this.onMessage, this.unlisten);
    });
  },

  /**
   * Callback to handle inbound messages.
   * @param  {MessageEvent} e
   * @private
   */
  onMessage(e) {
    if (!e.data.id) return;
    if (!e.data.type) return;
    if (!this.isRecipient(e.data.recipient)) return;
    debug('receiver on message', e.data);
    var message = new Message(e);

    // Before hook
    this.emit('message', message);
    if (message.defaultPrevented) return;

    try { this.emit(message.type, message); }
    catch (e) {
      message.respond(e);
      throw e;
    }
  },

  isRecipient(recipient) {
    return recipient == this.name
      || recipient == '*'
      || this.name == '*';
  },

  destroy: function() {
    this.unlisten();
    delete this.name;
    return this;
  }
};

var rp = Receiver.prototype;
rp['listen'] = rp.listen;
rp['unlisten'] = rp.unlisten;
rp['destroy'] = rp.destroy;

// Mixin Emitter methods
Emitter(Receiver.prototype);

/**
 * Creates new `Error` from registry.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */
function error(id, ...args) {
  return new Error({
    1: '.send() can only be called once',
    2: 'response already sent for this message',
    3: 'a port must be defined',
    4: 'timeout'
  }[id]);
}

},{"../emitter":3,"../utils":7,"./port-adaptors":5}],5:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 * @ignore
 */

var deferred = require('../utils').deferred;

const MSG = 'message';

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[PortAdaptor]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Creates a
 * @param  {[type]} target  [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
module.exports = function create(target, options) {
  if (!target) throw error(1);
  if (isEndpoint(target)) return target;
  var type = target.constructor.name;
  var CustomAdaptor = adaptors[type];
  debug('creating port adaptor for', type);
  if (CustomAdaptor) return CustomAdaptor(target, options);
  return new PortAdaptor(target, options);
};

/**
 * The default adaptor.
 * @private
 */
function PortAdaptor(target) {
  debug('PortAdaptor');
  this.target = target;
}

var PortAdaptorProto = PortAdaptor.prototype = {
  constructor: PortAdaptor,
  addListener(callback) { on(this.target, MSG, callback); },
  removeListener(callback) { off(this.target, MSG, callback); },
  postMessage(data, transfer) { this.target.postMessage(data, transfer); }
};

/**
 * A registry of specific adaptors
 * for which the default port-adaptor
 * is not suitable.
 *
 * @type {Object}
 */
var adaptors = {

  /**
   * Create an HTMLIframeElement PortAdaptor.
   *
   * @param {HTMLIframeElement} iframe
   */
  HTMLIFrameElement(iframe) {
    debug('HTMLIFrameElement');
    var ready = windowReady(iframe);
    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => {
          iframe.contentWindow.postMessage(data, '*', transfer);
        });
      }
    };
  },

  /**
   * Create a BroadcastChannel port-adaptor.
   *
   * @param {Object} channel
   * @param {[type]} options [description]
   */
  BroadcastChannel(channel, options) {
    debug('BroadcastChannel', channel.name);
    var receiver = options && options.receiver;
    var ready = options && options.ready;
    var sendReady = () => {
      channel.postMessage('ready');
      debug('sent ready');
    };

    ready = ready || receiver
      ? Promise.resolve()
      : setupSender();

    if (receiver) {
      sendReady();
      on(channel, MSG, e => {
        if (e.data != 'ready?') return;
        sendReady();
      });
    }

    function setupSender() {
      debug('setup sender');
      var promise = deferred();

      channel.postMessage('ready?');
      on(channel, MSG, function fn(e) {
        if (e.data != 'ready') return;
        off(channel, MSG, fn);
        debug('BroadcastChannel: ready');
        promise.resolve();
      });

      return promise.promise;
    }

    return {
      target: channel,
      addListener: PortAdaptorProto.addListener,
      removeListener: PortAdaptorProto.removeListener,
      postMessage(data, transfer) {
        ready.then(() => channel.postMessage(data, transfer));
      }
    };
  },

  Window(win, options) {
    debug('Window');
    var ready = options && options.ready || win === self;
    ready = ready ? Promise.resolve() : windowReady(win);

    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => win.postMessage(data, '*', transfer));
      }
    };
  },

  SharedWorker(worker) {
    worker.port.start();
    return new PortAdaptor(worker.port);
  },

  SharedWorkerGlobalScope() {
    var ports = [];

    return {
      postMessage() {}, // noop
      addListener(callback, listen) {
        this.onconnect = e => {
          var port = e.ports[0];
          ports.push(port);
          port.start();
          listen(port);
        };

        on(self, 'connect', this.onconnect);
      },

      removeListener(callback, unlisten) {
        off(self, 'connect', this.onconnect);
        ports.forEach(port => {
          port.close();
          unlisten(port);
        });
      }
    };
  }
};

var windowReady = (function() {
  if (typeof window == 'undefined') return;
  var parent = window.opener || window.parent;
  var domReady = 'DOMContentLoaded';
  var windows = new WeakSet();

  // Side B: Dispatches 'load'
  // from the child window
  if (parent != self) {
    on(window, domReady, function fn() {
      off(window, domReady, fn);
      parent.postMessage('load', '*');
    });
  }

  // Side A: Listens for 'ready' in the parent window
  on(self, 'message', e => e.data == 'load' && windows.add(e.source));

  return target => {
    var win = target.contentWindow || target;

    // Ready if the target has previously announces itself ready
    if (windows.has(win)) return Promise.resolve();

    // Ready if the target is the parent window
    if (win == window.parent) return Promise.resolve();

    var def = deferred();
    debug('waiting for Window to be ready ...');
    on(window, 'message', function fn(e) {
      if (e.data == 'load' && e.source == win) {
        debug('Window ready');
        off(window, 'message', fn);
        def.resolve();
      }
    });
    return def.promise;
  };
})();

/**
 * Utils
 * @ignore
 */

function isEndpoint(thing) {
  return !!(thing && thing.addListener);
}

// Shorthand
function on(target, name, fn) { target.addEventListener(name, fn); }
function off(target, name, fn) { target.removeEventListener(name, fn); }

/**
 * Creates new `Error` from registery.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */
function error(id) {
  return new Error({
    1: 'target is undefined'
  }[id]);
}
},{"../utils":7}],6:[function(require,module,exports){
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

},{"./message":4,"./utils":7}],7:[function(require,module,exports){
'use strict';

/**
 * Create a UUID string.
 *
 * http://jsperf.com/guid-generation-stackoverflow
 *
 * @return {String}
 */

exports.uuid = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

exports.deferred = function() {
  var promise = {};
  promise.promise = new Promise((resolve, reject) => {
    promise.resolve = resolve;
    promise.reject = reject;
  });
  return promise;
};

},{}]},{},[1]);
