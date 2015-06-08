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
