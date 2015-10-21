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
