//depends on TestAgent.Responder
(function(exports) {
  'use strict';

  if (typeof(exports.TestAgent) === 'undefined') {
    exports.TestAgent = {};
  }

  var Native, Responder, TestAgent;

  //Hack Arounds for node
  if (typeof(window) === 'undefined') {
    Native = require('ws');
    Responder = require('./responder').TestAgent.Responder;
  }

  TestAgent = exports.TestAgent;
  Responder = Responder || TestAgent.Responder;
  Native = (Native || WebSocket || MozWebSocket);

  //end

  /**
   * Creates a websocket client handles custom
   * events via responders and auto-reconnect.
   *
   * Basic Options:
   *  - url: websocekt endpoint (for example: "ws://localhost:8888")
   *
   * Options for retries:
   *
   * @param {Object} options retry options.
   * @param {Boolean} option.retry (false by default).
   * @param {Numeric} option.retryLimit \
   *  ( number of retries before error is thrown Infinity by default).
   * @param {Numeric} option.retryTimeout \
   * ( Time between retries 3000ms by default).
   */
  var Client = TestAgent.WebsocketClient = function WebsocketClient(options) {
    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
    Responder.call(this);

    this.proxyEvents = ['open', 'close', 'message'];

    this.on('close', this._incrementRetry.bind(this));
    this.on('message', this._processMessage.bind(this));
    this.on('open', this._clearRetries.bind(this));
  };

  Client.RetryError = function RetryError() {
    Error.apply(this, arguments);
  };

  Client.RetryError.prototype = Object.create(Error.prototype);

  Client.prototype = Object.create(Responder.prototype);
  Client.prototype.Native = Native;

  //Retry
  Client.prototype.retry = false;
  Client.prototype.retries = 0;
  Client.prototype.retryLimit = Infinity;
  Client.prototype.retryTimeout = 3000;

  Client.prototype.start = function start() {
    var i, event;

    if (this.retry && this.retries >= this.retryLimit) {
      throw new Client.RetryError(
        'Retry limit has been reach retried ' + String(this.retries) + ' times'
      );
    }

    this.socket = new this.Native(this.url);

    for (i = 0; i < this.proxyEvents.length; i++) {
      event = this.proxyEvents[i];
      this.socket.addEventListener(event, this._proxyEvent.bind(this, event));
    }

    this.emit('start', this);
  };

  /**
   * Sends Responder encoded event to the server.
   *
   * @param {String} event event to send.
   * @param {String} data object to send to the server.
   */
  Client.prototype.send = function send(event, data) {
    this.socket.send(this.stringify(event, data));
  };

  /**
   * Closes connection to the server
   */
  Client.prototype.close = function close(event, data) {
    this.socket.close();
  };

  Client.prototype._incrementRetry = function _incrementRetry() {
    if (this.retry) {
      this.retries++;
      setTimeout(this.start.bind(this), this.retryTimeout);
    }
  };

  Client.prototype._processMessage = function _processMessage(message) {
    if (message.data) {
      message = message.data;
    }
    this.respond(message, this);
  };

  Client.prototype._clearRetries = function _clearRetries() {
    this.retries = 0;
  };

  Client.prototype._proxyEvent = function _proxyEvent() {
    this.emit.apply(this, arguments);
  };

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
