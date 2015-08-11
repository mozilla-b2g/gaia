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
 * var client = threads.client('my-service', endpoint);
 *
 * @constructor
 * @param {String} service The service name to connect to
 * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
 * @param {Number} [timeout] Override default response timeout
 * The context/thread this service can be found in.
 * @public
 */
function Client(service, endpoint, timeout) {
  if (!(this instanceof Client)) return new Client(service, endpoint);

  // Parameters can be passed as single object
  if (typeof service == 'object') {
    timeout = service.timeout;
    endpoint = service.endpoint;
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
      .on('response', () => this.pending.delete(msg))
      .on('cancel', () => this.pending.delete(msg));

    if (this.timeout) msg.set('timeout', this.timeout);
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
