(function() {
  'use strict';

  var isNode = typeof(window) === 'undefined';

  if (!isNode) {
    if (typeof(window.TestAgent) === 'undefined') {
      window.TestAgent = {};
    }
  }

  /**
   * Constructor
   *
   * @param {Object} list of events to add onto responder.
   */
  function Responder(events) {
    this._$events = {};

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
    _$events: null,

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

      if (!(type in this._$events)) {
        this._$events[type] = [];
      }

      this._$events[type].push(callback);

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
        self.removeEventListener(type, onceCb);
        callback.apply(this, arguments);
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

      if (event in this._$events) {
        eventList = this._$events[event];

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
      if (name in this._$events) {
        //reuse array
        this._$events[name].length = 0;
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

      if (!(name in this._$events)) {
        return false;
      }

      events = this._$events[name];

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

  if (isNode) {
    module.exports = Responder;
  } else {
    window.TestAgent.Responder = Responder;
  }

}());

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
(function(global, module) {

  /**
   * Define a list of paths
   * this will only be used in the browser.
   */
  var paths = {};


  /**
   * Exports object is a shim
   * we use in the browser to
   * create an object that will behave much
   * like module.exports
   */
  function Exports(path) {
    this.path = path;
  }

  Exports.prototype = {

    /**
     * Unified require between browser/node.
     * Path is relative to this file so you
     * will want to use it like this from any depth.
     *
     *
     *   var Leaf = ns.require('sub/leaf');
     *
     *
     * @param {String} path path lookup relative to this file.
     */
    require: function exportRequire(path) {
      if (typeof(window) === 'undefined') {
        return require(require('path').join(__dirname, path));
      } else {
        return paths[path];
      }
    },

    /**
     * Maps exports to a file path.
     */
    set exports(val) {
      return paths[this.path] = val;
    },

    get exports() {
      return paths[this.path];
    }
  };

  /**
   * Module object constructor.
   *
   *
   *    var module = Module('sub/leaf');
   *    module.exports = function Leaf(){}
   *
   *
   * @constructor
   * @param {String} path file path.
   */
  function Module(path) {
    return new Exports(path);
  }

  Module.require = Exports.prototype.require;
  Module.exports = Module;
  Module._paths = paths;


  /**
   * Reference self as exports
   * which also happens to be the constructor
   * so you can assign items to the namespace:
   *
   *    //assign to Module.X
   *    //assume module.exports is Module
   *    module.exports.X = Foo; //Module.X === Foo;
   *    Module.exports('foo'); //creates module.exports object.
   *
   */
  module.exports = Module;

  /**
   * In the browser assign
   * to a global namespace
   * obviously 'Module' would
   * be whatever your global namespace is.
   */
  if (this.window)
    window.Marionette = Module;

}(
  this,
  (typeof(module) === 'undefined') ?
    {} :
    module
));
(function(module, ns) {

  var code, errorCodes, Err = {};

  Err.codes = errorCodes = {
   7: 'NoSuchElement',
   8: 'NoSuchFrame',
   9: 'UnknownCommand',
   10: 'StaleElementReference',
   11: 'ElementNotVisible',
   12: 'InvalidElementState',
   13: 'UnknownError',
   15: 'ElementIsNotSelectable',
   17: 'JavaScriptError',
   19: 'XPathLookupError',
   21: 'Timeout',
   23: 'NoSuchWindow',
   24: 'InvalidCookieDomain',
   25: 'UnableToSetCookie',
   26: 'UnexpectedAlertOpen',
   27: 'NoAlertOpenError',
   28: 'ScriptTimeout',
   29: 'InvalidElementCoordinates',
   30: 'IMENotAvailable',
   31: 'IMEEngineActivationFailed',
   32: 'InvalidSelector',
   500: 'GenericError'
  };

  Err.Exception = Error;
  //used over Object.create intentionally
  Err.Exception.prototype = new Error();

  for (code in errorCodes) {
    (function(code) {
      Err[errorCodes[code]] = function(obj) {
        var message = '',
            err = new Error();

        if (obj.status) {
          message += '(' + obj.status + ') ';
        }

        message += (obj.message || '');
        message += '\nRemote Stack:\n';
        message += obj.stacktrace || '<none>';

        this.message = message;
        this.type = errorCodes[code];
        this.name = this.type;
        this.fileName = err.fileName;
        this.lineNumber = err.lineNumber;

        if (err.stack) {
          // remove one stack level:
          if (typeof(Components) != 'undefined') {
            // Mozilla:
            this.stack = err.stack.substring(err.stack.indexOf('\n') + 1);
          } else if ((typeof(chrome) != 'undefined') ||
                     (typeof(process) != 'undefined')) {
            // Google Chrome/Node.js:
            this.stack = err.stack.replace(/\n[^\n]*/, '');
          } else {
            this.stack = err.stack;
          }
        }
      }
      Err[errorCodes[code]].prototype = new Err.Exception();
    }(code));
  }

  /**
   * Returns an error object given
   * a error object from the marionette client.
   * Expected input follows this format:
   *
   * Codes are from:
   * http://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
   *
   *    {
   *      message: "Something",
   *      stacktrace: "wentwrong@line",
   *      status: 17
   *    }
   *
   * @param {Object} obj remote error object.
   */
  Err.error = function exception(obj) {
    if (obj instanceof Err.Exception) {
      return obj;
    }

    if (obj.status in errorCodes) {
      return new Err[errorCodes[obj.status]](obj);
    } else {
      if (obj.message || obj.stacktrace) {
        return new Err.GenericError(obj);
      }
      return obj;
    }
  }

  module.exports = Err;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('error'), Marionette] :
    [module, require('./marionette')]
));
/**
@namespace
*/
(function(module, ns) {
  var Native;

  if (typeof(window) === 'undefined') {
    Native = require('../XMLHttpRequest').XMLHttpRequest;
  } else {
    Native = window.XMLHttpRequest;
  }

  /**
   * Creates a XHR wrapper.
   * Depending on the platform this is loaded
   * from the correct wrapper type will be used.
   *
   * Options are derived from properties on the prototype.
   * See each property for its default value.
   *
   * @class
   * @name Marionette.Xhr
   * @param {Object} options options for xhr.
   * @param {String} [options.method="GET"] any HTTP verb like 'GET' or 'POST'.
   * @param {Boolean} [options.async] false will indicate
   *                   a synchronous request.
   * @param {Object} [options.headers] full of http headers.
   * @param {Object} [options.data] post data.
   */
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
    /** @scope Marionette.Xhr.prototype */

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

  module.exports = Xhr;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('xhr'), Marionette] :
    [module, require('./marionette')]
));
(function(module, ns) {

  var debug = function() {},
      Responder;

  var isNode = typeof(window) === 'undefined';
  var isXpc = !isNode && (typeof(window.xpcModule) !== 'undefined');

  if (isNode) {
    debug = require('debug')('marionette:command-stream');
    Responder = require('test-agent/lib/test-agent/responder');
  } else {
    Responder = TestAgent.Responder;
  }

  if (isXpc) {
    debug = window.xpcModule.require('debug')('marionette:command-stream');
  }

  /**
   * Command stream accepts a socket or any event
   * emitter that will emit data events
   *
   * @class Marionette.CommandStream
   * @param {EventEmitter} socket socket instance.
   * @constructor
   */
  function CommandStream(socket) {
    this.buffer = '';
    this.inCommand = false;
    this.commandLength = 0;
    this.socket = socket;

    Responder.apply(this);

    socket.on('data', this.add.bind(this));
    socket.on('error', function() {
      console.log(arguments);
    });
  }

  var proto = CommandStream.prototype = Object.create(
    Responder.prototype
  );

  /**
   * Length prefix
   *
   * @property prefix
   * @type String
   */
  proto.prefix = ':';

  /**
   * name of the event this class
   * will emit when a response to a
   * command is received.
   *
   * @property commandEvent
   * @type String
   */
  proto.commandEvent = 'command';

  /**
   * Parses command into a string to
   * be sent over a tcp socket to marionette.
   *
   *
   * @method stringify
   * @param {Object} command marionette command.
   * @return {String} command as a string.
   */
  proto.stringify = function stringify(command) {
    var string;
    if (typeof(command) === 'string') {
      string = command;
    } else {
      string = JSON.stringify(command);
    }

    return String(string.length) + this.prefix + string;
  };

  /**
   * Accepts raw string command parses it and
   * emits a commandEvent.
   *
   * @private
   * @method _handleCommand
   * @param {String} string raw response from marionette.
   */
  proto._handleCommand = function _handleCommand(string) {
    debug('got raw bytes ', string);
    var data = JSON.parse(string);
    debug('sending event', data);
    this.emit(this.commandEvent, data);
  };


  /**
   * Checks if current buffer is ready to read.
   *
   * @private
   * @method _checkBuffer
   * @return {Boolean} true when in a command and buffer \
   *                   is ready to begin reading.
   */
  proto._checkBuffer = function _checkBuffer() {
    var lengthIndex;
    if (!this.inCommand) {
      lengthIndex = this.buffer.indexOf(this.prefix);
      if (lengthIndex !== -1) {
        this.commandLength = parseInt(this.buffer.slice(0, lengthIndex));
        this.buffer = this.buffer.slice(lengthIndex + 1);
        this.inCommand = true;
      }
    }

    return this.inCommand;
  };

  /**
   * Read current buffer.
   * Drain and emit all comands from the buffer.
   *
   * @method _readBuffer
   * @private
   * @return {Object} self.
   */
  proto._readBuffer = function _readBuffer() {
    var commandString;

    if (this._checkBuffer()) {
      if (this.buffer.length >= this.commandLength) {
        commandString = this.buffer.slice(0, this.commandLength);
        this._handleCommand(commandString);
        this.buffer = this.buffer.slice(this.commandLength);
        this.inCommand = false;

        this._readBuffer();
      }
    }
    return this;
  };

  /**
   * Writes a command to the socket.
   * Handles conversion and formatting of object.
   *
   * @method send
   * @param {Object} data marionette command.
   */
  proto.send = function send(data) {
    debug('writing ', data, 'to socket');
    if (this.socket.write) {
      //nodejs socket
      this.socket.write(this.stringify(data), 'utf8');
    } else {
      //moztcp socket
      this.socket.send(this.stringify(data));
    }
  };

  /**
   * Adds a chunk (string or buffer) to the
   * total buffer of this instance.
   *
   * @this
   * @param {String|Buffer} buffer buffer or string to add.
   */
  proto.add = function add(buffer) {
    var lengthIndex, command;

    this.buffer += buffer.toString();
    this._readBuffer();
  };

  module.exports = exports = CommandStream;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('command-stream'), Marionette] :
    [module, require('./marionette')]
));
/**
@namespace
*/
(function(module, ns) {

  /**
   * Creates an element reference
   * based on an id and a client instance.
   * You should never need to manually create
   * an instance of element.
   *
   * Use {{#crossLink "Marionette.Client/findElement"}}{{/crossLink}} or
   * {{#crossLink "Marionette.Client/findElements"}}{{/crossLink}} to create
   * instance(s) of this class.
   *
   * @class Marionette.Element
   * @param {String} id id of element.
   * @param {Marionette.Client} client client instance.
   */
  function Element(id, client) {
    this.id = id;
    this.client = client;
  }

  Element.prototype = {
    /**
     * Sends remote command processes the result.
     * Appends element id to each command.
     *
     * @method _sendCommand
     * @chainable
     * @private
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
     * @method findElement
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
     * @method findElements
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
     * @method scriptWith
     * @param {Function|String} script remote script.
     * @param {Function} callback callback when script completes.
     */
    scriptWith: function scriptWith(script, callback) {
      this.client.executeScript(script, [this], callback);
    },

    /**
     * Checks to see if two elements are equal
     *
     * @method equals
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
     * @method getAttribute
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
     * @method sendKeys
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
     * @method click
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
     * @method text
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
     * Returns tag name of element.
     *
     * @method tagName
     * @param {Function} callback node style [err, tagName].
     */
    tagName: function tagName(callback) {
      var cmd = {
        type: 'getElementTagName',
      };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Clears element.
     *
     * @method clear
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
     * @method selected
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
     * @method enabled
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
     * @method displayed
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

  module.exports = Element;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('element'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
(function(module, ns) {

  var Element = ns.require('element'),
      Exception = ns.require('error');

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

  /**
   * Initializes client.
   * You must create and initialize
   * a driver and pass it into the client before
   * using the client itself.
   *
   *     // all drivers conform to this api
   *
   *     var driver = new Marionette.Dirver.MozTcp({});
   *     var client;
   *
   *     driver.connect(function(err) {
   *       if (err) {
   *         // handle error case...
   *       }
   *
   *       client = new Marionette.Client(driver, {
   *           // optional default callback can be used to implement
   *           // a generator interface or other non-callback based api.
   *          defaultCallback: function(err, result) {
   *            console.log('CALLBACK GOT:', err, result);
   *          }
   *       });
   *
   *       // by default commands run in a queue.
   *       // assuming there is not a fatal error each command
   *       // will execute sequentially.
   *       client.startSession().
   *              goUrl('http://google.com').
   *              executeScript(function() {
   *                alert(document.title);
   *              });
   *       }
   *     });
   *
   *
   * @class Marionette.Client
   * @constructor
   * @param {Marionette.Drivers.Abstract} driver fully initialized client.
   * @param {Object} options options for driver.
   */
  function Client(driver, options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }
    this.driver = driver;
    this.defaultCallback = options.defaultCallback || false;
  }

  Client.prototype = {

    Element: Element,

    /**
     * Constant for chrome context.
     *
     * @type {String}
     * @property CHROME
     */
    CHROME: 'chrome',

    /**
     * Constant for content context.
     *
     * @type {String}
     * @property CONTENT
     */
    CONTENT: 'content',

    /**
     * Actor id for instance
     *
     * @property actor
     * @type String
     */
    actor: null,

    /**
     * Session id for instance.
     *
     * @property session
     * @type String
     */
    session: null,

    /**
     * Sends a command to the server.
     * Adds additional information like actor and session
     * to command if not present.
     *
     *
     * @method send
     * @chainable
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

    _handleCallback: function() {
      var args = Array.prototype.slice.call(arguments),
          callback = args.shift();

      if (!callback) {
        callback = this.defaultCallback;
      }

      // handle error conversion
      if (args[0]) {
        args[0] = Exception.error(args[0]);
      }

      callback.apply(this, args);
    },

    /**
     * Sends request and formats response.
     *
     *
     * @private
     * @method _sendCommand
     * @chainable
     * @param {Object} command marionette command.
     * @param {String} responseKey the part of the response to pass \
     *                             unto the callback.
     * @param {Object} callback wrapped callback.
     */
    _sendCommand: function(command, responseKey, callback) {
      var self = this;

      this.send(command, function(data) {
        var value = self._transformResultValue(data[responseKey]);
        self._handleCallback(callback, data.error, value);
      });
      return this;
    },

    /**
     * Finds the actor for this instance.
     *
     * @private
     * @method _getActorId
     * @param {Function} callback executed when response is sent.
     */
    _getActorId: function _getActorId(callback) {
      var self = this, cmd;

      cmd = { type: 'getMarionetteID' };

      return this._sendCommand(cmd, 'id', function(err, actor) {
        self.actor = actor;
        if (callback) {
          callback(err, actor);
        }
      });
    },

    /**
     * Starts a remote session.
     *
     * @private
     * @method _newSession
     * @param {Function} callback optional.
     */
    _newSession: function _newSession(callback) {
      var self = this;

      function newSession(data) {
        self.session = data.value;
        self._handleCallback(callback, data.error, data);
      }

      this.send({ type: 'newSession' }, newSession);
    },

    /**
     * Finds actor and creates connection to marionette.
     * This is a combination of calling getMarionetteId and then newSession.
     *
     * @method startSession
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
     * @chainable
     * @method deleteSession
     * @param {Function} callback executed when session is destroyed.
     */
    deleteSession: function destroySession(callback) {
      var cmd = { type: 'deleteSession' },
          self = this;

      this._sendCommand(cmd, 'ok', function(err, value) {
        self.driver.close();
        self._handleCallback(callback, err, value);
      });

      return this;
    },

    /**
     * Callback will receive the id of the current window.
     *
     * @chainable
     * @method getWindow
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
     * @method getWindow
     * @chainable
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
     * @method switchToWindow
     * @chainable
     * @param {String} id window id you can find these with getWindow(s).
     * @param {Function} callback called with boolean.
     */
    switchToWindow: function switchToWindow(id, callback) {
      var cmd = { type: 'switchToWindow', value: id };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Imports a script into the marionette
     * context for the duration of the session.
     *
     * Good for prototyping new marionette commands.
     *
     * @method importScript
     * @chainable
     * @param {String} script javascript string blob.
     * @param {Function} callback called with boolean.
     */
    importScript: function(script, callback) {
      var cmd = { type: 'importScript', script: script };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Switches context of marionette to specific iframe.
     *
     *
     * @method switchToFrame
     * @chainable
     * @param {String|Marionette.Element} id iframe id or element.
     * @param {Function} callback called with boolean.
     */
    switchToFrame: function switchToFrame(id, callback) {
      if (typeof(id) === 'function') {
        callback = id;
        id = null;
      }

      var cmd = { type: 'switchToFrame' };

      if (id instanceof this.Element) {
        cmd.element = id.id;
      } else if (
        id !== null &&
        typeof(id) === 'object' &&
        id.ELEMENT
      ) {
        cmd.element = id.ELEMENT;
      } else if (id) {
        cmd.value = id;
      }

      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Switches context of window.
     *
     * @method setContext
     * @chainable
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
     * @method setScriptTimeout
     * @chainable
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
     * @method setSearchTimeout
     * @chainable
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
     * @method getUrl
     * @chainable
     * @param {Function} callback receives url.
     */
    getUrl: function getUrl(callback) {
      var cmd = { type: 'getUrl' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Refreshes current window on device.
     *
     * @method refresh
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
     * @method goUrl
     * @chainable
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
     * @method goForward
     * @chainable
     * @param {Function} callback receives boolean.
     */
    goForward: function goForward(callback) {
      var cmd = { type: 'goForward' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives window back.
     *
     * @method goBack
     * @chainable
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
     * @method log
     * @chainable
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
     *     device.getLogs(function(err, logs){
     *       //logs => [
     *         [
     *           'msg',
     *           'level',
     *           'Fri Apr 27 2012 11:00:32 GMT-0700 (PDT)'
     *         ]
     *       ]
     *     });
     *
     *
     * @method getLogs
     * @chainable
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
     * @method executeJsScript
     * @chainable
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
     * Executes a remote script will block. Script is wrapped in a function.
     *
     *     // its is very important to remember that the contents of this
     *     // method are "stringified" (Function#toString) and sent over the
     *     // wire to execute on the device. So things like scope will not be
     *     // the same. If you need to pass other information in arguments
     *     // option should be used.
     *
     *     // assume that this element is the result of findElement
     *     var element;
     *     var config = {
     *        event: 'magicCustomEvent',
     *        detail: { foo: true  }
     *     };
     *
     *     var remoteArgs = [element, details];
     *
     *     // unlike other callbacks this one will execute _on device_
     *     function remoteFn(element, details) {
     *        // element in this context is a real dom element now.
     *        var event = document.createEvent('CustomEvent');
     *        event.initCustomEvent(config.event, true, true, event.detail);
     *        element.dispatchEvent(event);
     *
     *        return { success: true };
     *     }
     *
     *     client.executeJsScript(remoteFn, remoteArgs, function(err, value) {
     *       // value => { success: true }
     *     });
     *
     *
     * @method executeScript
     * @chainable
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
     * Script is wrapped in a function and will be executed asynchronously.
     *
     * NOTE: that setScriptTimeout _must_ be set prior to using this method
     *       as the timeout defaults to zero.
     *
     *
     *     function remote () {
     *       window.addEventListener('someevent', function() {
     *         // special method to notify that async script is complete.
     *         marionetteScriptFinished({ fromRemote: true })
     *       });
     *     }
     *
     *     client.executeAsyncScript(remote, function(err, value) {
     *       // value === { fromRemote: true }
     *     });
     *
     *
     * @method executeAsyncScript
     * @chainable
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
     * @method _findElement
     * @private
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
      return this._sendCommand(cmd, 'value',
                               function processElements(err, result) {
        var element;

        if (result instanceof Array) {
          element = [];
          result.forEach(function(el) {
            element.push(new this.Element(el, self));
          }, this);
        } else {
          element = new this.Element(result, self);
        }
        self._handleCallback(callback, err, element);
      });
    },

    /**
     * Attempts to find a dom element (via css selector, xpath, etc...)
     * "elements" returned are instances of
     * {{#crossLink "Marionette.Element"}}{{/crossLink}}
     *
     *
     *     // with default options
     *     client.findElement('#css-selector', function(err, element) {
     *        if (err) {
     *          // handle case where element was not found
     *        }
     *
     *        // see element interface for all methods, etc..
     *        element.click(function() {
     *
     *        });
     *     });
     *
     *
     *
     * @method findElement
     * @chainable
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
     * Finds multiple elements in the dom. This method has the same
     * api signature as {{#crossLink "findElement"}}{{/crossLink}} the
     * only difference is where findElement returns a single element
     * this method will return an array of elements in the callback.
     *
     *
     *     // find all links in the document
     *     client.findElements('a[href]', function(err, element) {
     *     });
     *
     *
     * @method findElements
     * @chainable
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
     * @private
     * @method _convertFunction
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
     * @private
     * @method _transformResultValue
     * @param {Object} value original result from server.
     * @return {Object|Marionette.Element} processed result.
     */
    _transformResultValue: function _transformResultValue(value) {
      if (value && typeof(value.ELEMENT) === 'string') {
        return new this.Element(value.ELEMENT, this);
      }
      return value;
    },

    /**
     * Prepares arguments for script commands.
     * Formats Marionette.Element's sod
     * marionette can use them in script commands.
     *
     *
     * @private
     * @method _prepareArguments
     * @param {Array} arguments list of args for wrapped function.
     * @return {Array} processed arguments.
     */
    _prepareArguments: function _prepareArguments(args) {
      if (args.map) {
        return args.map(function(item) {
          if (item instanceof this.Element) {
            return {'ELEMENT': item.id };
          }
          return item;
        }, this);
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
     * @method _executeScript
     * @private
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

  module.exports = Client;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('client'), Marionette] :
    [module, require('./marionette')]
));
(function(module, ns) {

  /**
   *
   * Abstract driver that will handle
   * all common tasks between implementations.
   * Such as error handling, request/response queuing
   * and timeouts.
   *
   * @constructor
   * @class Marionette.Drivers.Abstract
   * @param {Object} options set options on prototype.
   */
  function Abstract(options) {
    this._sendQueue = [];
    this._responseQueue = [];
  }

  Abstract.prototype = {

    /**
     * Timeout for commands
     *
     * @property timeout
     * @type Numeric
     */
    timeout: 10000,

    /**
     * Waiting for a command to finish?
     *
     * @private
     * @property _waiting
     * @type Boolean
     */
    _waiting: true,

    /**
     * Is system ready for commands?
     *
     * @property ready
     * @type Boolean
     */
    ready: false,

    /**
     * Connection id for the server.
     *
     * @property connectionId
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
     * @method send
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
     *
     *     MyClass.prototype._connect = function _connect(){
     *       //open a socket to marrionete accept response
     *       //you *must* call _onDeviceResponse with the first
     *       //response from marionette it looks like this:
     *       //{ from: 'root', applicationType: 'gecko', traits: [] }
     *       this.connectionId = result.id;
     *     }
     *
     * @method connect
     * @param {Function} callback executes
     *   after successfully connecting to the server.
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
     *
     * @method close
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
     * @method _nextCommand
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
     * @method _onDeviceResponse
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

  module.exports = Abstract;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/abstract'), Marionette] :
    [module, require('../marionette')]
));
(function(module, ns) {
  var WebsocketClient,
      Abstract = ns.require('drivers/abstract');

  if (!this.TestAgent) {
    WebsocketClient = require('test-agent/lib/test-agent/websocket-client');
  } else {
    WebsocketClient = TestAgent.WebsocketClient;
  }

  /**
   * WebSocket interface for marionette.
   * Generally {{#crossLink "Marionette.Drivers.Tcp"}}{{/crossLink}}
   * will be faster and more reliable but WebSocket can expose devices
   * over http instead of a pure socket.
   *
   *
   * @extend Marionette.Drivers.Abstract
   * @class Marionette.Drivers.Websocket
   * @param {Object} options options for abstract/prototype.
   */
  function Websocket(options) {
    Abstract.call(this, options);

    this.client = new WebsocketClient(options);
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

  module.exports = Websocket;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/websocket'), Marionette] :
    [module, require('../marionette')]
));
(function(module, ns) {

  try {
    if (!window.navigator.mozTCPSocket) {
      return;
    }
  } catch(e) {
    return;
  }

  var TCPSocket = navigator.mozTCPSocket;

  var Responder = TestAgent.Responder;
  var ON_REGEX = /^on/;

 /**
   * Horrible hack to work around
   * missing stuff in TCPSocket & add
   * node compatible api.
   */
  function SocketWrapper(host, port, options) {
    var events = new Responder();
    var eventMethods = [
      'on',
      'addEventListener',
      'removeEventListener',
      'once',
      'emit'
    ];

    var rawSocket = TCPSocket.open(host, port, options);

    var eventList = [
      'onopen',
      'ondrain',
      'ondata',
      'onerror',
      'onclose'
    ];

    eventList.forEach(function(method) {
      rawSocket[method] = function(method, data) {
        var emitData;
        if ('data' in data) {
          emitData = data.data;
        } else {
          emitData = data;
        }
        events.emit(method, emitData);
      }.bind(socket, method.substr(2));
    });

    var socket = Object.create(rawSocket);

    eventMethods.forEach(function(method) {
      socket[method] = events[method].bind(events);
    });

    return socket;
  }

  var Abstract, CommandStream, Responder;

  Abstract = ns.require('drivers/abstract');
  CommandStream = ns.require('command-stream');

  /** TCP **/
  Tcp.Socket = SocketWrapper;

  /**
   * Connects to gecko marionette server using mozTCP api.
   *
   *
   *     // default options are fine for b2g-desktop
   *     // or a device device /w port forwarding.
   *     var tcp = new Marionette.Drivers.MozTcp();
   *
   *     tcp.connect(function() {
   *       // ready to use with client
   *     });
   *
   *
   * @class Marionette.Drivers.MozTcp
   * @extends Marionette.Drivers.Abstract
   * @constructor
   * @param {Object} options connection options.
   *   @param {String} [options.host="127.0.0.1"] ip/host.
   *   @param {Numeric} [options.port="2828"] marionette server port.
   */
  function Tcp(options) {
    if (typeof(options)) {
      options = {};
    }
    Abstract.call(this, options);


    this.connectionId = 0;
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 2828;
  }

  Tcp.prototype = Object.create(Abstract.prototype);

  /**
   * Sends a command to the server.
   *
   * @param {Object} cmd remote marionette command.
   */
  Tcp.prototype._sendCommand = function _sendCommand(cmd) {
    this.client.send(cmd);
  };

  /**
   * Opens TCP socket for marionette client.
   */
  Tcp.prototype._connect = function connect() {
    var client, self = this;

    this.socket = new Tcp.Socket(this.host, this.port);
    client = this.client = new CommandStream(this.socket);
    this.client.on('command', this._onClientCommand.bind(this));
  };

  /**
   * Receives command from server.
   *
   * @param {Object} data response from marionette server.
   */
  Tcp.prototype._onClientCommand = function(data) {
    this._onDeviceResponse({
      id: this.connectionId,
      response: data
    });
  };

  /**
   * Closes connection to marionette.
   */
  Tcp.prototype._close = function close() {
    if (this.socket && this.socket.close) {
      this.socket.close();
    }
  };

  /** export */
  module.exports = exports = Tcp;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/moz-tcp'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
/** @namespace */
(function(module, ns) {

  var Abstract = ns.require('drivers/abstract'),
      Xhr = ns.require('xhr');

  Httpd.Xhr = Xhr;

  /**
   * Creates instance of http proxy backend.
   *
   * @deprecated
   * @class Marionette.Drivers.Httpd
   * @extends Marionette.Drivers.Abstract
   * @param {Object} options key/value pairs to add to prototype.
   */
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

  /** @scope Marionette.Drivers.Httpd.prototype */

  /**
   * Location of the http server that will proxy to marionette
   * @memberOf Marionette.Drivers.Httpd#
   * @name proxyUrl
   * @type String
   */
  proto.proxyUrl = '/marionette';

  /**
   * Port that proxy should connect to.
   *
   * @name port
   * @memberOf Marionette.Drivers.Httpd#
   * @type Numeric
   */
  proto.port = 2828;

  /**
   * Server proxy should connect to.
   *
   *
   * @name server
   * @memberOf Marionette.Drivers.Httpd#
   * @type String
   */
  proto.server = 'localhost';

  /**
   * Sends command to server for this connection
   *
   * @name _sendCommand
   * @memberOf Marionette.Drivers.Httpd#
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
   *
   * @name _close
   * @memberOf Marionette.Drivers.Httpd#
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
   *
   * @name _connect
   * @memberOf Marionette.Drivers.Httpd#
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
   * @memberOf Marionette.Drivers.Httpd#
   * @name _request
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
   * @name _onQueueResponse
   * @memberOf Marionette.Drivers.Httpd#
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


  module.exports = Httpd;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/httpd-polling'), Marionette] :
    [module, require('../marionette')]
));
(function(module, ns) {

  module.exports = {
    Abstract: ns.require('drivers/abstract'),
    HttpdPolling: ns.require('drivers/httpd-polling'),
    Websocket: ns.require('drivers/websocket')
  };

  if (typeof(window) === 'undefined') {
    module.exports.Tcp = require('./tcp');
  } else {
    if (typeof(window.TCPSocket) !== 'undefined') {
      module.exports.MozTcp = ns.require('drivers/moz-tcp');
    }
  }

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers'), Marionette] :
    [module, require('../marionette')]
));
(function(module, ns) {

  var exports = module.exports;

  exports.Element = ns.require('element');
  exports.Error = ns.require('error');
  exports.Client = ns.require('client');
  exports.Xhr = ns.require('xhr');
  exports.Drivers = ns.require('drivers');
  exports.CommandStream = ns.require('command-stream');

}.apply(
  this,
  (this.Marionette) ?
    [Marionette, Marionette] :
    [module, require('./marionette')]
));
