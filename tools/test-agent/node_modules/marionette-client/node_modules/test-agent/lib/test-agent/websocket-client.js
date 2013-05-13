//depends on TestAgent.Responder
(function() {
  'use strict';

  var isNode = typeof(window) === 'undefined',
      Responder;

  if (!isNode) {
    if (typeof(window.TestAgent) === 'undefined') {
      window.TestAgent = {};
    }

    Responder = TestAgent.Responder;
  } else {
    Responder = require('./responder');
  }

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
  function Client(options) {
    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
    Responder.call(this);

    this.proxyEvents = ['open', 'close', 'message'];
    this._proxiedEvents = {};

    if (isNode) {
      this.Native = require('ws');
    } else {
      this.Native = (window.WebSocket || window.MozWebSocket);
    }

    this.on('open', this._setConnectionStatus.bind(this, true));
    this.on('close', this._setConnectionStatus.bind(this, false));

    this.on('close', this._incrementRetry.bind(this));
    this.on('message', this._processMessage.bind(this));
    this.on('open', this._clearRetries.bind(this));
  };

  Client.RetryError = function RetryError() {
    Error.apply(this, arguments);
  };

  Client.RetryError.prototype = Object.create(Error.prototype);

  Client.prototype = Object.create(Responder.prototype);

  /**
   * True when connection is opened.
   * Used to ensure messages are not sent
   * when connection to server is closed.
   *
   * @type Boolean
   */
  Client.prototype.connectionOpen = false;

  //Retry
  Client.prototype.retry = false;
  Client.prototype.retries = 0;
  Client.prototype.retryLimit = Infinity;
  Client.prototype.retryTimeout = 3000;

  Client.prototype.start = function start() {
    var i, event, fn;

    if (this.socket && this.socket.readyState < 2) {
      // don't open a socket is one is already open.
      return;
    }

    if (this.retry && this.retries >= this.retryLimit) {
      throw new Client.RetryError(
        'Retry limit has been reach retried ' + String(this.retries) + ' times'
      );
    }

    if (this.socket) {
      this.close();
    }

    this.socket = new this.Native(this.url);

    for (i = 0; i < this.proxyEvents.length; i++) {
      event = this.proxyEvents[i];
      fn = this._proxiedEvents[event] = this._proxyEvent.bind(this, event);
      this.socket.addEventListener(event, fn, false);
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
    if (this.connectionOpen) {
      this.socket.send(this.stringify(event, data));
    }
  };

  /**
   * Closes connection to the server
   */
  Client.prototype.close = function close(event, data) {
    var event;

    for (event in this._proxiedEvents) {
      this.socket.removeEventListener(event, this._proxiedEvents[event], false);
    }

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

  /**
   * Sets connectionOpen.
   *
   * @param {Boolean} type connection status.
   */
  Client.prototype._setConnectionStatus = _setConnectionStatus;
  function _setConnectionStatus(type) {
    this.connectionOpen = type;
  }

  if (isNode) {
    module.exports = Client;
  } else {
    window.TestAgent.WebsocketClient = Client;
  }

}());
