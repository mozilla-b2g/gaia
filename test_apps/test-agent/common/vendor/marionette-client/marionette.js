(function(exports) {
  'use strict';

  if (typeof(exports.TestAgent) === 'undefined') {
    exports.TestAgent = {};
  }

  /**
   * Constructor
   *
   * @param {Object} list of events to add onto responder.
   */
  var Responder = exports.TestAgent.Responder = function Responder(events) {
    this.events = {};

    if (typeof(events) !== 'undefined') {
      this.addEventListener(events);
    }
  };

  /**
   * Stringifies request to websocket
   *
   *
   * @param {String} command command name.
   * @param {Object} data object to be sent over the wire.
   * @return {String} json object.
   */
  Responder.stringify = function stringify(command, data) {
    return JSON.stringify([command, data]);
  };

  /**
   * Parses request from WebSocket.
   *
   * @param {String} json json string to translate.
   * @return {Object} ex: { event: 'test', data: {} }.
   */
  Responder.parse = function parse(json) {
    var data;
    try {
      data = (json.forEach) ? json : JSON.parse(json);
    } catch (e) {
      throw new Error("Could not parse json: '" + json + '"');
    }

    return {event: data[0], data: data[1]};
  };

  Responder.prototype = {
    parse: Responder.parse,
    stringify: Responder.stringify,

    /**
     * Events on this instance
     *
     * @type Object
     */
    events: null,

    /**
     * Recieves json string event and dispatches an event.
     *
     * @param {String|Object} json data object to respond to.
     * @param {String} json.event event to emit.
     * @param {Object} json.data data to emit with event.
     * @param {Object} [params] option number of params to pass to emit.
     * @return {Object} result of WebSocketCommon.parse.
     */
    respond: function respond(json) {
      var event = Responder.parse(json),
          args = Array.prototype.slice.call(arguments).slice(1);

      args.unshift(event.data);
      args.unshift(event.event);

      this.emit.apply(this, args);

      return event;
    },

    //TODO: Extract event emitter logic

    /**
     * Adds an event listener to this object.
     *
     *
     * @param {String} type event name.
     * @param {Function} callback event callback.
     */
    addEventListener: function addEventListener(type, callback) {
      var event;

      if (typeof(callback) === 'undefined' && typeof(type) === 'object') {
        for (event in type) {
          if (type.hasOwnProperty(event)) {
            this.addEventListener(event, type[event]);
          }
        }

        return this;
      }

      if (!(type in this.events)) {
        this.events[type] = [];
      }

      this.events[type].push(callback);

      return this;
    },

    /**
     * Adds an event listener which will
     * only fire once and then remove itself.
     *
     *
     * @param {String} type event name.
     * @param {Function} callback fired when event is emitted.
     */
    once: function once(type, callback) {
      var self = this;
      function onceCb() {
        callback.apply(this, arguments);
        self.removeEventListener(type, onceCb);
      }

      this.addEventListener(type, onceCb);

      return this;
    },

    /**
     * Emits an event.
     *
     * Accepts any number of additional arguments to pass unto
     * event listener.
     *
     * @param {String} eventName name of the event to emit.
     * @param {Object} [arguments] additional arguments to pass.
     */
    emit: function emit() {
      var args = Array.prototype.slice.call(arguments),
          event = args.shift(),
          eventList,
          self = this;

      if (event in this.events) {
        eventList = this.events[event];

        eventList.forEach(function(callback) {
          callback.apply(self, args);
        });
      }

      return this;
    },

    /**
     * Removes all event listeners for a given event type
     *
     *
     * @param {String} event event type to remove.
     */
    removeAllEventListeners: function removeAllEventListeners(name) {
      if (name in this.events) {
        //reuse array
        this.events[name].length = 0;
      }

      return this;
    },

    /**
     * Removes a single event listener from a given event type
     * and callback function.
     *
     *
     * @param {String} eventName event name.
     * @param {Function} callback same instance of event handler.
     */
    removeEventListener: function removeEventListener(name, callback) {
      var i, length, events;

      if (!(name in this.events)) {
        return false;
      }

      events = this.events[name];

      for (i = 0, length = events.length; i < length; i++) {
        if (events[i] && events[i] === callback) {
          events.splice(i, 1);
          return true;
        }
      }

      return false;
    }

  };

  Responder.prototype.on = Responder.prototype.addEventListener;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));

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
(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  var Native;

  if (typeof(window) === 'undefined') {
    Native = require('../XMLHttpRequest').XMLHttpRequest;
  } else {
    Native = XMLHttpRequest;
  }

  function Xhr(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Xhr.prototype = {
    xhrClass: Native,
    method: 'GET',
    async: true,
    waiting: false,

    headers: {
      'Content-Type': 'application/json'
    },
    data: {},

    _seralize: function _seralize() {
      if (this.headers['Content-Type'] === 'application/json') {
        return JSON.stringify(this.data);
      }
      return this.data;
    },

    /**
     * Aborts request if its in progress.
     */
    abort: function abort() {
      if (this.xhr) {
        this.xhr.abort();
      }
    },

    /**
     * Sends request to server.
     *
     * @param {Function} callback success/failure handler.
     */
    send: function send(callback) {
      var header, xhr;

      if (typeof(callback) === 'undefined') {
        callback = this.callback;
      }

      xhr = this.xhr = new this.xhrClass();
      xhr.open(this.method, this.url, this.async);

      for (header in this.headers) {
        if (this.headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, this.headers[header]);
        }
      }

      xhr.onreadystatechange = function onReadyStateChange() {
        var data, type;
        if (xhr.readyState === 4) {
          data = xhr.responseText;
          type = xhr.getResponseHeader('content-type');
          type = type || xhr.getResponseHeader('Content-Type');
          if (type === 'application/json') {
            data = JSON.parse(data);
          }
          this.waiting = false;
          callback(data, xhr);
        }
      }.bind(this);

      this.waiting = true;
      xhr.send(this._seralize());
    }
  };

  exports.Marionette.Xhr = Xhr;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  function Abstract(options) {
    this._sendQueue = [];
    this._responseQueue = [];
  }

  Abstract.prototype = {

    /**
     * Timeout for commands
     *
     * @type Numeric
     */
    timeout: 10000,

    /**
     * Waiting for a command to finish?
     *
     * @type Boolean
     */
    _waiting: true,

    /**
     * Is system ready for commands?
     *
     * @type Boolean
     */
    ready: false,

    /**
     * Connection id for the server.
     *
     * @type Numeric
     */
    connectionId: null,

    /**
     * Sends remote command to server.
     * Each command will be queued while waiting for
     * any pending commands. This ensures order of
     * response is correct.
     *
     *
     * @param {Object} command remote command to send to marionette.
     * @param {Function} callback executed when response comes back.
     */
    send: function send(cmd, callback) {
      if (!this.ready) {
        throw new Error('connection is not ready');
      }

      if (typeof(callback) === 'undefined') {
        throw new Error('callback is required');
      }

      this._responseQueue.push(callback);
      this._sendQueue.push(cmd);

      this._nextCommand();

      return this;
    },

    /**
     * Connects to a remote server.
     * Requires a _connect function to be defined.
     * Example:
     *
     *    MyClass.prototype._connect = function _connect(){
     *      //open a socket to marrionete accept response
     *      //you *must* call _onDeviceResponse with the first
     *      //response from marionette it looks like this:
     *      //{ from: 'root', applicationType: 'gecko', traits: [] }
     *      this.connectionId = result.id;
     *    }
     *
     * @param {Function} callback \
     *  executes after successfully connecting to the server.
     */
    connect: function connect(callback) {
      this.ready = true;
      this._responseQueue.push(function(data) {
        this.applicationType = data.applicationType;
        this.traits = data.traits;
        callback();
      }.bind(this));
      this._connect();
    },

    /**
     * Destroys connection to server
     *
     * Will immediately close connection to server
     * closing any pending responses.
     */
    close: function() {
      this.ready = false;
      this._responseQueue.length = 0;
      if (this._close) {
        this._close();
      }
    },

    /**
     * Checks queue if not waiting for a response
     * Sends command to websocket server
     *
     * @private
     */
    _nextCommand: function _nextCommand() {
      var nextCmd;
      if (!this._waiting && this._sendQueue.length) {
        this._waiting = true;
        nextCmd = this._sendQueue.shift();
        this._sendCommand(nextCmd);
      }
    },

    /**
     * Handles responses from devices.
     * Will only respond to the event if the connectionId
     * is equal to the event id and the client is ready.
     *
     * @param {Object} data response from server.
     * @private
     */
    _onDeviceResponse: function _onDeviceResponse(data) {
      var cb;
      if (this.ready && data.id === this.connectionId) {
        this._waiting = false;
        cb = this._responseQueue.shift();
        cb(data.response);

        this._nextCommand();
      }
    }

  };

  exports.Marionette.Drivers.Abstract = Abstract;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  if (typeof(TestAgent) === 'undefined') {
    TestAgent = require('test-agent/lib/test-agent/websocket-client').TestAgent;
  }

  var Abstract;

  if (typeof(window) === 'undefined') {
    Abstract = require('./abstract').Marionette.Drivers.Abstract;
  } else {
    Abstract = Marionette.Drivers.Abstract;
  }

  function Websocket(options) {
    Abstract.call(this, options);

    this.client = new TestAgent.WebsocketClient(options);
    this.client.on('device response', this._onDeviceResponse.bind(this));
  }

  Websocket.prototype = Object.create(Abstract.prototype);

  /**
   * Sends a command to the websocket server.
   *
   * @param {Object} command remote marionette command.
   * @private
   */
  Websocket.prototype._sendCommand = function _sendCommand(cmd) {
    this.client.send('device command', {
      id: this.connectionId,
      command: cmd
    });
  };

  /**
   * Opens a connection to the websocket server and creates
   * a device connection.
   *
   * @param {Function} callback sent when initial response comes back.
   */
  Websocket.prototype._connect = function connect() {
    var self = this;

    this.client.start();

    this.client.once('open', function wsOpen() {

      //because I was lazy and did not implement once
      function connected(data) {
        self.connectionId = data.id;
      }

      self.client.once('device ready', connected);
      self.client.send('device create');

    });

  };

  /**
   * Closes connection to marionette.
   */
  Websocket.prototype._close = function close() {
    if (this.client && this.client.close) {
      this.client.close();
    }
  };

  exports.Marionette.Drivers.Websocket = Websocket;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
(function(exports) {

  var Abstract, Xhr;

  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  if (typeof(window) === 'undefined') {
    Abstract = require('./abstract').Marionette.Drivers.Abstract;
    Xhr = require('../xhr').Marionette.Xhr;
  } else {
    Abstract = Marionette.Drivers.Abstract;
    Xhr = Marionette.Xhr;
  }

  Httpd.Xhr = Xhr;

  function Httpd(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = options;
    }

    Abstract.call(this);

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  var proto = Httpd.prototype = Object.create(Abstract.prototype);

  /**
   * Location of the http server that will proxy to marionette
   *
   * @type String
   */
  proto.proxyUrl = '/marionette';

  /**
   * Port that proxy should connect to.
   *
   * @type Numeric
   */
  proto.port = 2828;

  /**
   * Server proxy should connect to.
   *
   *
   * @type String
   */
  proto.server = 'localhost';

  /**
   * Sends command to server for this connection
   *
   * @this
   * @param {Object} command remote marionette command.
   */
  proto._sendCommand = function _sendCommand(command) {
    this._request('PUT', command, function() {
      //error handling?
    });
  };


  /**
   * Sends DELETE message to server to close marionette connection.
   * Aborts all polling operations.
   */
  proto._close = function _close() {

    if (this._pollingRequest) {
      this._pollingRequest.abort();
      this._pollingRequest = null;
    }

    this._request('DELETE', null, function() {
      //handle close errors?
    });
  };

  /**
   * Opens connection for device.
   * @this
   */
  proto._connect = function _connect() {
    var auth = {
      server: this.server,
      port: this.port
    };

    this._request('POST', auth, function(data, xhr) {
      var deviceResponse = this._onQueueResponse.bind(this);
      if (xhr.status === 200) {
        this.connectionId = data.id;
        this._pollingRequest = this._request('GET', deviceResponse);
      } else {
        //throw error
      }
    }.bind(this));
  };

  /**
   * Creates xhr request
   *
   *
   * @this
   * @param {String} method http method like 'POST' or 'GET'.
   * @param {Object} data optional.
   * @param {Object} callback after xhr completes \
   * receives parsed data as first argument and xhr object as second.
   * @return {Marionette.Xhr} xhr wrapper.
   */
  proto._request = function _request(method, data, callback) {
    var request, url;

    if (typeof(callback) === 'undefined' && typeof(data) === 'function') {
      callback = data;
      data = null;
    }

    url = this.proxyUrl;

    if (this.connectionId !== null) {
      url += '?' + String(this.connectionId) + '=' + String(Date.now());
    }

    request = new Xhr({
      url: url,
      method: method,
      data: data || null,
      callback: callback
    });

    request.send();

    return request;
  };

  /**
   * Handles response to multiple messages.
   * Requeues the _pollingRequest on success
   *
   *    {
   *      messages: [
   *        { id: 1, response: {} },
   *        ....
   *      ]
   *    }
   *
   * @this
   * @param {Object} queue list of messages.
   * @param {Marionette.Xhr} xhr xhr instance.
   */
  proto._onQueueResponse = function _onQueueResponse(queue, xhr) {
    var self = this;

    if (xhr.status !== 200) {
      throw new Error('XHR responded with code other then 200');
    }

    //TODO: handle errors
    if (queue && queue.messages) {
      queue.messages.forEach(function(response) {
        self._onDeviceResponse(response);
      });
    }

    //when we close the object _pollingRequest is destroyed.
    if (this._pollingRequest) {
      this._pollingRequest.send();
    }
  };


  exports.Marionette.Drivers.HttpdPolling = Httpd;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  function Element(id, client) {
    this.id = id;
    this.client = client;
  }

  Element.prototype = {

    /**
     * Sends remote command processes the result.
     * Appends element id to each command.
     *
     * @param {Object} command marionette request.
     * @param {String} responseKey key in the response to pass to callback.
     * @param {Function} callback callback function receives the result of
     *                            response[responseKey] as its first argument.
     *
     * @return {Object} self.
     */
    _sendCommand: function(command, responseKey, callback) {
      if (!command.element) {
        command.element = this.id;
      }

      this.client._sendCommand(command, responseKey, callback);
      return this;
    },

    /**
     * Finds a single child of this element.
     *
     * @param {String} query search string.
     * @param {String} method search method.
     * @param {Function} callback element callback.
     * @return {Object} self.
     */
    findElement: function findElement(query, method, callback) {
      this.client.findElement(query, method, this.id, callback);
      return this;
    },

    /**
     * Finds a all children of this element that match a pattern.
     *
     * @param {String} query search string.
     * @param {String} method search method.
     * @param {Function} callback element callback.
     * @return {Object} self.
     */
    findElements: function findElement(query, method, callback) {
      this.client.findElements(query, method, this.id, callback);
      return this;
    },

    /**
     * Shortcut method to execute
     * a function with this element as first argument.
     *
     *
     * @param {Function|String} script remote script.
     * @param {Function} callback callback when script completes.
     */
    scriptWith: function scriptWith(script, callback) {
      this.client.executeScript(script, [this], callback);
    },

    /**
     * Checks to see if two elements are equal
     *
     * @param {String|Marionette.Element} element element to test.
     * @param {Function} callback called with boolean.
     * @return {Object} self.
     */
    equals: function equals(element, callback) {

      if (element instanceof this.constructor) {
        element = element.id;
      }

      var cmd = {
        type: 'elementsEqual',
        elements: [this.id, element]
      };
      this.client._sendCommand(cmd, 'value', callback);
      return this;
    },

    /**
     * Gets attribute value for element.
     *
     * @param {String} attr attribtue name.
     * @param {Function} callback gets called with attribute's value.
     * @return {Object} self.
     */
    getAttribute: function getAttribute(attr, callback) {
      var cmd = {
        type: 'getElementAttribute',
        name: attr
      };

      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Sends typing event keys to element.
     *
     *
     * @param {String} string message to type.
     * @param {Function} callback boolean success.
     * @return {Object} self.
     */
    sendKeys: function sendKeys(string, callback) {
      var cmd = {
        type: 'sendKeysToElement',
        value: string
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Clicks element.
     *
     * @param {Function} callback boolean result.
     * @return {Object} self.
     */
    click: function click(callback) {
      var cmd = {
        type: 'clickElement'
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Gets text of element
     *
     *
     * @param {Function} callback text of element.
     * @return {Object} self.
     */
    text: function text(callback) {
      var cmd = {
        type: 'getElementText'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Gets value of element
     *
     *
     * @param {Function} callback value of element.
     * @return {Object} self.
     */
    value: function value(callback) {
      var cmd = {
        type: 'getElementValue'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Clears element.
     *
     *
     * @param {Function} callback value of element.
     * @return {Object} self.
     */
    clear: function clear(callback) {
      var cmd = {
        type: 'clearElement'
      };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Checks if element is selected.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    selected: function selected(callback) {
      var cmd = {
        type: 'isElementSelected'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Checks if element is enabled.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    enabled: function enabled(callback) {
      var cmd = {
        type: 'isElementEnabled'
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Checks if element is displayed.
     *
     *
     * @param {Function} callback boolean argument.
     * @return {Object} self.
     */
    displayed: function displayed(callback) {
      var cmd = {
        type: 'isElementDisplayed'
      };
      return this._sendCommand(cmd, 'value', callback);
    }

  };

  exports.Marionette.Element = Element;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  var Element;

  if (exports.Marionette.Element) {
    Element = exports.Marionette.Element;
  } else if (typeof(window) === 'undefined') {
    Element = require('./element').Marionette.Element;
  }

  var key;
  var searchMethods = {
    CLASS: 'class name',
    SELECTOR: 'css selector',
    ID: 'id',
    NAME: 'name',
    LINK_TEXT: 'link text',
    PARTIAL_LINK_TEXT: 'partial link text',
    TAG: 'tag name',
    XPATH: 'xpath'
  };

  function isFunction(value) {
    return typeof(value) === 'function';
  }

  function Client(driver, options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }
    this.driver = driver;
    this.defaultCallback = options.defaultCallback || false;
  }

  Client.prototype = {

    CHROME: 'chrome',
    CONTENT: 'content',

    /**
     * Actor id for instance
      *
     *
     * @type String
     */
    actor: null,

    /**
     * Session id for instance.
     *
     * @type String
     */
    session: null,

    /**
     * Sends a command to the server.
     * Adds additional information like actor and session
     * to command if not present.
     *
     *
     * @param {Function} cb executed when response is sent.
     */
    send: function send(cmd, cb) {
      if (!cmd.to) {
        cmd.to = this.actor || 'root';
      }

      if (this.session) {
        cmd.session = cmd.session || this.session;
      }

      if (!cb && this.defaultCallback) {
        cb = this.defaultCallback();
      }

      this.driver.send(cmd, cb);

      return this;
    },

    /**
     * Sends request and formats response.
     *
     *
     * @param {Object} command marionette command.
     * @param {String} responseKey the part of the response to pass \
     *                             unto the callback.
     * @param {Object} callback wrapped callback.
     */
    _sendCommand: function(command, responseKey, callback) {
      var self = this;

      callback = (callback || this.defaultCallback);
      this.send(command, function(data) {
        var value = self._transformResultValue(data[responseKey]);
        callback(value);
      });
      return this;
    },

    /**
     * Finds the actor for this instance.
     *
     * @private
     * @param {Function} callback executed when response is sent.
     */
    _getActorId: function _getActorId(callback) {
      var self = this, cmd;

      cmd = { type: 'getMarionetteID' };

      return this._sendCommand(cmd, 'id', function(actor) {
        self.actor = actor;
        if (callback) {
          callback(actor);
        }
      });
    },

    /**
     * Starts a remote session.
     *
     * @private
     * @param {Function} callback optional.
     */
    _newSession: function _newSession(callback) {
      var self = this;

      function newSession(data) {
        callback = (callback || self.defaultCallback);
        self.session = data.value;
        if (callback) {
          callback(data);
        }
      }

      this.send({ type: 'newSession' }, newSession);
    },

    /**
     * Finds actor and creates connection to marionette.
     * This is a combination of calling getMarionetteId and then newSession.
     *
     * @param {Function} callback executed when session is started.
     */
    startSession: function startSession(callback) {
      var self = this;
      return this._getActorId(function() {
        //actor will not be set if we send the command then
        self._newSession(callback);
      });
    },

    /**
     * Destroys current session.
     *
     *
     * @param {Function} callback executed when session is destroyed.
     */
    deleteSession: function destroySession(callback) {
      var cmd = { type: 'deleteSession' },
          self = this;

      this._sendCommand(cmd, 'ok', function(value) {
        self.driver.close();
        (callback || self.defaultCallback)(value);
      });

      return this;
    },

    /**
     * Callback will receive the id of the current window.
     *
     * @param {Function} callback executed with id of current window.
     * @return {Object} self.
     */
    getWindow: function getWindow(callback) {
      var cmd = { type: 'getWindow' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Callback will receive an array of window ids.
     *
     *
     * @param {Function} callback executes with an array of ids.
     */
    getWindows: function getWindows(callback) {
      var cmd = { type: 'getWindows' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Switches context of marionette to specific window.
     *
     *
     * @param {String} id window id you can find these with getWindow(s).
     * @param {Function} callback called with boolean.
     */
    switchToWindow: function switchToWindow(id, callback) {
      var cmd = { type: 'switchToWindow', value: id };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Switches context of window.
     *
     * @param {String} context either: 'chome' or 'content'.
     * @param {Function} callback receives boolean.
     */
    setContext: function setContext(content, callback) {
      if (content !== this.CHROME && content !== this.CONTENT) {
        throw new Error('content type must be "chrome" or "content"');
      }

      var cmd = { type: 'setContext', value: content };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Sets the script timeout
     *
     *
     *
     * @param {Numeric} timeout max time in ms.
     * @param {Function} callback executed with boolean status.
     * @return {Object} self.
     */
    setScriptTimeout: function setScriptTimeout(timeout, callback) {
      var cmd = { type: 'setScriptTimeout', value: timeout };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * setSearchTimeout
     *
     * @param {Numeric} timeout max time in ms.
     * @param {Function} callback executed with boolean status.
     * @return {Object} self.
     */
    setSearchTimeout: function setSearchTimeout(timeout, callback) {
      var cmd = { type: 'setSearchTimeout', value: timeout };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Gets url location for device.
     *
     * @param {Function} callback receives url.
     */
    getUrl: function getUrl(callback) {
      var cmd = { type: 'getUrl' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Refreshes current window on device.
     *
     * @param {Function} callback boolean success.
     * @return {Object} self.
     */
    refresh: function refresh(callback) {
      var cmd = { type: 'refresh' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives browser to a url.
     *
     * @param {String} url location.
     * @param {Function} callback executes when finished driving browser to url.
     */
    goUrl: function goUrl(url, callback) {
      var cmd = { type: 'goUrl', value: url };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives window forward.
     *
     *
     * @param {Function} callback receives boolean.
     */
    goForward: function goForward(callback) {
      var cmd = { type: 'goForward' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives window back.
     *
     *
     * @param {Function} callback receives boolean.
     */
    goBack: function goBack(callback) {
      var cmd = { type: 'goBack' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Logs a message on marionette server.
     *
     *
     * @param {String} message log message.
     * @param {String} level arbitrary log level.
     * @param {Function} callback receives boolean.
     * @return {Object} self.
     */
    log: function log(msg, level, callback) {
      var cmd = { type: 'log', level: level, value: msg };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Retrieves all logs on the marionette server.
     * The response from marionette is an array of arrays.
     *
     *    device.getLogs(function(logs){
     *      //logs => [
     *        [
     *          'msg',
     *          'level',
     *          'Fri Apr 27 2012 11:00:32 GMT-0700 (PDT)'
     *        ]
     *      ]
     *    });
     *
     *
     * @param {Function} callback receive an array of logs.
     */
    getLogs: function getLogs(callback) {
      var cmd = { type: 'getLogs' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Executes a remote script will block.
     * Script is *not* wrapped in a function.
     *
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Array} [timeout] optional args for timeout.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeJsScript: function executeJsScript(script, args, timeout, callback) {
      if (typeof(timeout) === 'function') {
        callback = timeout;
        timeout = null;
      }
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }

      timeout = (typeof(timeout) === 'boolean') ? timeout : true;

      return this._executeScript({
        type: 'executeJSScript',
        value: script,
        timeout: timeout,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Executes a remote script will block.
     * Script is wrapped in a function.
     *
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeScript: function executeScript(script, args, callback) {
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }
      return this._executeScript({
        type: 'executeScript',
        value: script,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Executes a remote script will block.
     * Script is wrapped in a function and will be executed asynchronously.
     *
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeAsyncScript: function executeAsyncScript(script, args, callback) {
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }
      return this._executeScript({
        type: 'executeAsyncScript',
        value: script,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Finds element.
     *
     * @param {String} type type of command to send like 'findElement'.
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with element uuid(s).
     */
    _findElement: function _findElement(type, query, method, id, callback) {
      var cmd, self = this;

      if (isFunction(id)) {
        callback = id;
        id = undefined;
      }

      if (isFunction(method)) {
        callback = method;
        method = undefined;
      }

      callback = callback || this.defaultCallback;

      cmd = {
        type: type || 'findElement',
        using: method || 'css selector',
        value: query,
        element: id
      };

      if (this.searchMethods.indexOf(cmd.using) === -1) {
        throw new Error(
          'invalid option for using: \'' + cmd.using + '\' use one of : ' +
          this.searchMethods.join(', ')
        );
      }

      //proably should extract this function into a private
      return this._sendCommand(cmd, 'value', function processElements(result) {
        var element;
        if (result instanceof Array) {
          element = [];
          result.forEach(function(el) {
            element.push(new Element(el, self));
          });
        } else {
          element = new Element(result, self);
        }
        callback(element);
      });
    },

    /**
     * Finds element.
     *
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with element uuid.
     */
    findElement: function findElement() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('findElement');
      return this._findElement.apply(this, args);
    },

    /**
     * Finds elements.
     *
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with an array of element uuids.
     */
    findElements: function findElements() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('findElements');
      return this._findElement.apply(this, args);
    },


    /**
     * Converts an function into a string
     * that can be sent to marionette.
     *
     * @param {Function|String} fn function to call on the server.
     * @return {String} function string.
     */
    _convertFunction: function _convertFunction(fn) {
      if (typeof(fn) === 'function') {
        var str = fn.toString();
        return 'return (' + str + '.apply(this, arguments));';
      }
      return fn;
    },

    /**
     * Processes result of command
     * if an {'ELEMENT': 'uuid'} combination
     * is returned a Marionette.Element
     * instance will be created and returned.
     *
     *
     * @param {Object} value original result from server.
     * @return {Object|Marionette.Element} processed result.
     */
    _transformResultValue: function _transformResultValue(value) {
      if (value && typeof(value.ELEMENT) === 'string') {
        return new Element(value.ELEMENT, this);
      }
      return value;
    },

    /**
     * Prepares arguments for script commands.
     * Formats Marionette.Element's sod
     * marionette can use them in script commands.
     *
     *
     * @param {Array} arguments list of args for wrapped function.
     * @return {Array} processed arguments.
     */
    _prepareArguments: function _prepareArguments(args) {
      if (args.map) {
        return args.map(function(item) {
          if (item instanceof Element) {
            return {'ELEMENT': item.id };
          }
          return item;
        });
      } else {
        return args;
      }
    },

    /**
     * Executes a remote string of javascript.
     * the javascript string will be wrapped in a function
     * by marionette.
     *
     *
     * @param {Object} options objects of execute script.
     * @param {String} options.type command type like 'executeScript'.
     * @param {String} options.value javascript string.
     * @param {String} options.args arguments for script.
     * @param {Boolean} options.timeout timeout only used in 'executeJSScript'.
     * @param {Function} callback executes when script finishes.
     * @return {Object} self.
     */
    _executeScript: function _executeScript(options, callback) {
      var timeout = options.timeout,
          self = this,
          cmd = {
            type: options.type,
            value: this._convertFunction(options.value),
            args: this._prepareArguments(options.args || [])
          };

      if (timeout === true || timeout === false) {
        cmd.timeout = timeout;
      }

      return this._sendCommand(cmd, 'value', callback);
    }

  };


  //gjslint: ignore
  var proto = Client.prototype;
  proto.searchMethods = [];

  for (key in searchMethods) {
    if (searchMethods.hasOwnProperty(key)) {
      Client.prototype[key] = searchMethods[key];
      Client.prototype.searchMethods.push(searchMethods[key]);
    }
  }

  exports.Marionette.Client = Client;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
