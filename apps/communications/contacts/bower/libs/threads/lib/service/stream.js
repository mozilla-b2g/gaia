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
