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
