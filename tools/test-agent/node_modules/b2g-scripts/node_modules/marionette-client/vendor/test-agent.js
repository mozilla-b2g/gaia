// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
(function(window) {
  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var exports = window.TestAgent;

  var formatRegExp = /%[sdj%]/g;
  exports.format = function(f) {
    if (typeof f !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (x === '%%') return '%';
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof x !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  };

  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
   *    properties of objects.
   * @param {Number} depth Depth in which to descend in object. Default is 2.
   * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
   *    output. Default is false (no coloring).
   */
  function inspect(obj, showHidden, depth, colors) {
    var ctx = {
      showHidden: showHidden,
      seen: [],
      stylize: colors ? stylizeWithColor : stylizeNoColor
    };
    return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
  }
  exports.inspect = inspect;

  // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
  var colors = {
    'bold' : [1, 22],
    'italic' : [3, 23],
    'underline' : [4, 24],
    'inverse' : [7, 27],
    'white' : [37, 39],
    'grey' : [90, 39],
    'black' : [30, 39],
    'blue' : [34, 39],
    'cyan' : [36, 39],
    'green' : [32, 39],
    'magenta' : [35, 39],
    'red' : [31, 39],
    'yellow' : [33, 39]
  };

  // Don't use 'blue' not visible on cmd.exe
  var styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };


  function stylizeWithColor(str, styleType) {
    var style = styles[styleType];

    if (style) {
      return '\033[' + colors[style][0] + 'm' + str +
             '\033[' + colors[style][1] + 'm';
    } else {
      return str;
    }
  }


  function stylizeNoColor(str, styleType) {
    return str;
  }


  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }

    // Look up the keys of the object.
    var visibleKeys = Object.keys(value);
    var keys = ctx.showHidden ? Object.getOwnPropertyNames(value) : visibleKeys;

    // Some type of object without properties can be shortcutted.
    if (keys.length === 0) {
      if (typeof value === 'function') {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }
      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }
      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '', array = false, braces = ['{', '}'];

    // Make Array say that they are Array
    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    }

    // Make error with message first say the error
    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);

    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(
          ctx, value, recurseTimes, visibleKeys, key, array
        );
      });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
  }


  function formatPrimitive(ctx, value) {
    switch (typeof value) {
      case 'undefined':
        return ctx.stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');

      case 'number':
        return ctx.stylize('' + value, 'number');

      case 'boolean':
        return ctx.stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return ctx.stylize('null', 'null');
    }
  }


  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }


  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
      if (Object.prototype.hasOwnProperty.call(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            String(i), true));
      } else {
        output.push('');
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            key, true));
      }
    });
    return output;
  }


  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
    if (visibleKeys.indexOf(key) < 0) {
      name = '[' + key + ']';
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (recurseTimes === null) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function(line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function(line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }
    if (typeof name === 'undefined') {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify('' + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'")
                   .replace(/\\"/g, '"')
                   .replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }


  function reduceToSingleString(output, base, braces) {
    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] +
             (base === '' ? '' : base + '\n ') +
             ' ' +
             output.join(',\n  ') +
             ' ' +
             braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  }


  // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.
  function isArray(ar) {
    return Array.isArray(ar) ||
           (typeof ar === 'object' && objectToString(ar) === '[object Array]');
  }

  function isRegExp(re) {
    return typeof re === 'object' && objectToString(re) === '[object RegExp]';
  }

  function isDate(d) {
    return typeof d === 'object' && objectToString(d) === '[object Date]';
  }


  function isError(e) {
    return typeof e === 'object' && objectToString(e) === '[object Error]';
  }


  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }

}(this));

(function(window) {

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var FF_STACK_LINE = /(\w+)?\@(.*):(\d+)/;
  var TIME_REGEX = /\?time\=(\d+)/g;

  /**
   * Returns a formatted stack trace.
   *
   * @param {String} error error inst Formats a stacktrace.
   * @return {String} stack trace.
   */
  window.TestAgent.formatStack = function formatStack(err) {
    //split stack into lines
    var lines,
        stack = err.stack,
        lineNo,
        i = 0,
        matches,
        stackFunc,
        errType,
        buffer = '',
        stackFile;


    if (!err.stack) {
      return err.stack;
    }

    errType = err.type || err.constructor.name || 'Error:';

    stack = stack.replace(TIME_REGEX, '');
    lines = stack.split('\n');

    if (lines[0].match(FF_STACK_LINE)) {
      buffer += errType + ': ' + err.message + '\n';
      //we are in a firefox stack trace
      for (i; i < lines.length; i++) {
        matches = FF_STACK_LINE.exec(lines[i]);
        if (!matches) {
          continue;
        }
        stackFunc = matches[1] || '(anonymous)';
        stackFile = matches[2] || '';
        lineNo = matches[3] || '';

        buffer += '    at ' + stackFunc +
                 ' (' + stackFile + ':' + lineNo + ')\n';
      }

      stack = buffer;
    }

    return stack;
  };

  /**
   * Accepts an instance of error and
   * creates a object that can be sent
   * to the test agent server to be used
   * in error reporting.
   *
   *
   * @param {Error|Object} err error instance.
   */
  window.TestAgent.exportError = function(err) {
    var errorObject = {};

    errorObject.stack = this.formatStack(err);
    errorObject.message = err.message;
    errorObject.type = err.type;
    errorObject.constructorName = err.constructor.name;
    errorObject.expected = err.expected;
    errorObject.actual = err.actual;

    return errorObject;

  };

}(this));
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

(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Loader = window.TestAgent.Loader = function Loader(options) {
    var key;

    this._cached = {};
    this.doneCallbacks = [];
    this.pending = 0;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  };

  Loader.prototype = {

    /**
     * Prefix for all loaded files
     *
     * @type String
     */
    prefix: '',


    /**
     * javascript content type.
     *
     *
     * @type String
     */
    type: 'text/javascript',

    /**
     * When true will add timestamps to required urls via query param
     *
     * @type Boolean
     */
    bustCache: true,

    /**
     * Current window in which required files will be injected.
     *
     * @private
     * @type Window
     */
    _targetWindow: window,

    /**
     * Cached urls
     *
     * @type Object
     * @private
     */
    _cached: null,

    get targetWindow() {
      return this._targetWindow;
    },

    set targetWindow(value) {
      this._targetWindow = value;
      this._cached = {};
    },

    /**
     * _decrements pending and fires done callbacks
     */
    _decrementPending: function _decrementPending() {
      if (this.pending > 0) {
        this.pending--;
      }

      if (this.pending <= 0) {
        this._fireCallbacks();
      }
    },

    _fireCallbacks: function _fireCallbacks() {
      var callback;
      while ((callback = this.doneCallbacks.shift())) {
        callback();
      }
    },

    /**
     * Adds a done callback.
     * You may call this function multiple times.
     *
     * @param {Function} callback called after all scripts are loaded.
     */
    done: function done(callback) {
      this.doneCallbacks.push(callback);
      return this;
    },

    /**
     * Loads given script into current target window.
     * If file has been previously loaded it will not
     * be loaded again.
     *
     * @param {String} url location to load script from.
     * @param {String} callback callback when script loading is complete.
     */
    require: function require(url, callback) {
      var prefix = this.prefix,
          suffix = '',
          self = this,
          element,
          document = this.targetWindow.document;

      if (url in this._cached) {
        if (callback) {
          if (this.pending) {
            this.done(callback);
          } else {
            callback();
          }
        }
        return;
      }

      if (this.bustCache) {
        suffix = '?time=' + String(Date.now());
      }

      this._cached[url] = true;

      var args = arguments;

      url = prefix + url + suffix;
      element = document.createElement('script');
      element.src = url;
      element.async = false;
      element.type = this.type;
      element.onload = function scriptOnLoad() {
        if (callback) {
          callback();
        }
        self._decrementPending();
      };

      this.pending++;

      document.getElementsByTagName('head')[0].appendChild(element);
    }

  };

}(this));
(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Sandbox = window.TestAgent.Sandbox = function Sandbox(url) {
    TestAgent.Responder.call(this);
    this.url = url;
  };

  var proto = Sandbox.prototype = Object.create(
    TestAgent.Responder.prototype
  );

  proto._element = null;

  /**
   * @type Boolean
   *
   * True when sandbox is ready
   */
  proto.ready = false;

  /**
   * URL for the iframe sandbox.
   *
   * @type String
   */
  proto.url = null;

  /**
   * Returns iframe element.
   *
   *
   * @type DOMElement
   */
  proto.getElement = function getElement() {
    var iframe;
    if (!this._element) {
      iframe = this._element = window.document.createElement('iframe');
      iframe.src = this.url + '?time=' + String(Date.now());
    }
    return this._element;
  };

  proto.run = function run(callback) {
    //cleanup old sandboxes
    this.destroy();

    var element = this.getElement(),
        iframeWindow,
        self = this;

    //this must come before the listener
    window.document.body.appendChild(element);
    iframeWindow = element.contentWindow;

    iframeWindow.onerror = function(message, file, line) {
      self.emit('error', {
        message: message,
        //remove cache busting string
        filename: file.split('?time=')[0],
        lineno: line
      });
    };

    iframeWindow.addEventListener('DOMContentLoaded', function() {
      self.ready = true;
      self.emit('ready', this);
      callback.call(this);
    });

    return iframeWindow;
  };

  proto.destroy = function destroy() {
    var el;

    if (!this.ready) {
      return false;
    }

    this.ready = false;

    el = this.getElement();
    el.parentNode.removeChild(el);


    return true;
  };

  proto.getWindow = function getWindow() {
    if (!this.ready) {
      return false;
    }

    return this.getElement().contentWindow;
  };


}(this));

(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Server = window.TestAgent.Config = function Config(options) {
    var key;

    for (key in options) {
       if (options.hasOwnProperty(key)) {
        this[key] = options[key];
       }
    }
  };

  Server.prototype = {
    /**
     * URL to the json fiel which contains
     * a list of files to load.
     *
     * @type String
     */
    url: '',

    /**
     * Ready is true when resources have been loaded
     *
     * @type Boolean
     */
    ready: false,

    /**
     * List of test resources.
     *
     * @type Array
     */
    resources: [],

    /**
     * Parse XHR response
     *
     * @param {Object} xhr xhr object.
     */
    _parseResponse: function _parseResponse(xhr) {
      var response;

      if (xhr.responseText) {
        response = JSON.parse(xhr.responseText);
        //only return files for now...
        return response;
      }

      return {
        tests: []
      };
    },

    /**
     * Loads list of files from url
     *
     */
    load: function load(callback) {
      var xhr = new XMLHttpRequest(),
          self = this,
          response;

      xhr.open('GET', this.url, true);
      xhr.onreadystatechange = function onReadyStateChange() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0) {
            response = self._parseResponse(xhr);

            self.ready = true;
            self.resources = response.tests;

            callback.call(this, response);
          } else {
            throw new Error('Could not fetch tests from "' + self.url + '"');
          }
        } else {
        }
      };

      xhr.send(null);
    }
  };

  //backwards compat
  Server.prototype._loadResource = Server.prototype.load;

}(this));

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
/*(The MIT License)

Copyright (c) 20011-2012 TJ Holowaychuk <tj@vision-media.ca>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  if (typeof(window.TestAgent.Mocha) === 'undefined') {
    window.TestAgent.Mocha = {};
  }


  Base.slow = 75;

  //Credit: mocha -
  //https://github.com/visionmedia/mocha/blob/master/lib/reporters/base.js#L194
  function Base(runner) {
    var self = this,
        stats,
        failures = this.failures = [];

    stats = this.stats = {
      suites: 0, tests: 0, passes: 0, pending: 0, failures: 0
    };

    if (!runner) return;
    this.runner = runner;

    runner.on('start', function onStart() {
      stats.start = new Date;
    });

    runner.on('suite', function onSuite(suite) {
      stats.suites = stats.suites || 0;
      suite.root || stats.suites++;
    });

    runner.on('test end', function onTestEnd(test) {
      stats.tests = stats.tests || 0;
      stats.tests++;
    });

    runner.on('pass', function onPass(test) {
      stats.passes = stats.passes || 0;

      var medium = Base.slow / 2;
      //reformatted for gjslint
      test.speed =
        (test.duration > Base.slow) ?
        'slow' : test.duration > medium ?
         'medium' : 'fast';

      stats.passes++;
    });

    runner.on('fail', function onFail(test, err) {
      stats.failures = stats.failures || 0;
      stats.failures++;
      test.err = err;
      failures.push(test);
    });

    runner.on('end', function onEnd() {
      stats.end = new Date;
      stats.duration = new Date - stats.start;
    });

    runner.on('pending', function onPending() {
      stats.pending++;
    });
  }

  window.TestAgent.Mocha.ReporterBase = Base;

}(this));
(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  if (typeof(window.TestAgent.Mocha) === 'undefined') {
    window.TestAgent.Mocha = {};
  }

  var Base = TestAgent.Mocha.ReporterBase,
      exports = window.TestAgent.Mocha,
      log = console.log.bind(console);

  MochaReporter.console = window.console;
  MochaReporter.send = function mochaReporterSend() {};

  //TODO -- Buffer console.log calls

  function MochaReporter(runner) {
    Base.call(this, runner);

    var self = this,
        stats = this.stats,
        total = runner.total,
        indentation = -1,
        suiteTitle,
        currentTest;

    MochaReporter.console.log = function consoleLogShim() {
      var args = Array.prototype.slice.call(arguments),
          message = TestAgent.format.apply(TestAgent, arguments);
      //real console log
      log.apply(this, arguments);

      //for server

      var stack, messages = args.map(function(item) {
        if (!item) {
          return item;
        }
        return (item.toString) ? item.toString() : item;
      });

      try {
        throw new Error();
      } catch (e) {
        stack = e.stack;
      }

      //re-orgnaize the stack to exlude the above
      stack = stack.split('\n').map(function(e) {
        return e.trim().replace(/^at /, '');
      });

      stack.splice(0, 1);
      stack = stack.join('\n');

      //this is temp
      MochaReporter.send(
        JSON.stringify(['log', {messages: [message], stack: stack}])
      );
    };

    runner.on('suite', function onSuite(suite) {
      indentation++;
      MochaReporter.send(
        JSON.stringify(
          ['suite', jsonExport(suite, { indentation: indentation })]
        )
      );
    });

    runner.on('suite end', function onSuiteEnd(suite) {
      MochaReporter.send(
        JSON.stringify(
          ['suite end', jsonExport(suite, { indentation: indentation })]
        )
      );
      indentation--;
    });

    runner.on('test', function onTest(test) {
      MochaReporter.send(JSON.stringify(['test', jsonExport(test)]));
    });

    runner.on('test end', function onTestEnd(test) {
      MochaReporter.send(JSON.stringify(['test end', jsonExport(test)]));
    });

    runner.on('start', function onStart() {
      MochaReporter.send(JSON.stringify(['start', { total: total }]));
    });

    runner.on('pass', function onPass(test) {
      MochaReporter.send(JSON.stringify(['pass', jsonExport(test)]));
    });

    runner.on('fail', function onFail(test, err) {
      MochaReporter.send(
        JSON.stringify(
          ['fail', jsonExport(test, {err: TestAgent.exportError(err) })]
        )
      );
    });

    runner.on('end', function onEnd() {
      MochaReporter.send(JSON.stringify(['end', self.stats]));
    });
  }

  var exportKeys = [
    'title',
    'getTitle',
    'fullTitle',
    'root',
    'duration',
    'state'
  ];

  function jsonExport(object, additional) {
    var result = {}, key;

    exportKeys.forEach(function(key) {
      var value;
      if (key in object) {
        value = object[key];

        if (typeof(value) === 'function') {
          result[key] = object[key]();
        } else {
          result[key] = value;
        }
      }
    });

    if (typeof(additional) !== 'undefined') {
      for (key in additional) {
        if (additional.hasOwnProperty(key)) {
          result[key] = additional[key];
        }
      }
    }
    return result;
  }

  //export
  exports.JsonStreamReporter = MochaReporter;

}(this));

(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  TestAgent.BrowserWorker = function BrowserWorker(options) {
    var self = this,
        dep = this.deps;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    function option(name) {
      if (name in options) {
        return options[name];
      }

      if (name in self.defaults) {
        return self.defaults[name];
      }

      return undefined;
    }


    this.deps.Server.call(this, option('server'));
    this.sandbox = new dep.Sandbox(option('sandbox'));
    this.loader = new dep.Loader(option('loader'));

    this._testsProcessor = [];
    this.testRunner = options.testRunner;
    //event proxy
    this.sandbox.on('error', this.emit.bind(this, 'sandbox error'));
  };

  //inheritance
  TestAgent.BrowserWorker.prototype = Object.create(
      TestAgent.WebsocketClient.prototype
  );

  var proto = TestAgent.BrowserWorker.prototype;

  proto.deps = {
    Server: TestAgent.WebsocketClient,
    Sandbox: TestAgent.Sandbox,
    Loader: TestAgent.Loader,
    ConfigLoader: TestAgent.Config
  };

  proto.defaults = {
    server: {
      retry: true,
      url: 'ws://' + document.location.host.split(':')[0] + ':8789'
    }
  };

  /**
   * Create a new sandbox instance and set
   * loader to use it as its target.
   *
   * @param {Function} callback executed when sandbox is created.
   */
  proto.createSandbox = function createSandbox(callback) {
    var self = this;

    this.sandbox.run(function onSandboxRun() {
      self.loader.targetWindow = this;
      if (callback) {
        if (!('require' in this)) {
          this.require = self.loader.require.bind(self.loader);
        }
        callback.call(this, self.loader);
        self.emit('sandbox', this, self.loader);
      }
    });
  };

  proto._emitTestComplete = function _emitTestComplete() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('run tests complete');
    this.emit.apply(this, args);
  };

  /**
   * Adds function which will reduce the test files given to runTests.
   * Each filter much return an array of tests.
   *
   *    worker.addTestsProcessor(function(tests){
   *      return tests;
   *    });
   *
   * @param {Function} callback reducer function.
   * @return {Object} self.
   */
  proto.addTestsProcessor = function addTestsProcessor(callback) {
    this._testsProcessor.push(callback);
  };


  /**
   * Runs tests through all testsProcessor reducers.
   *
   *
   * @param {Array} tests list of tests to process.
   */
  proto._processTests = function _processTests(tests) {
    var result = tests,
        reducers = this._testsProcessor,
        length = reducers.length,
        i = 0;

    for (; i < length; i++) {
      result = reducers[i](result);
    }

    return result;
  };

  /**
   * Builds sandbox executes the .testRunner function.
   *
   * @param {Array} tests list of tests to execute.
   */
  proto.runTests = function runTests(tests) {
    var self = this,
        done = this._emitTestComplete.bind(this);

    if (!this.testRunner) {
      throw new Error('Worker must be provided a .testRunner method');
    }

    this.createSandbox(function createSandbox() {
      self.testRunner(self, self._processTests(tests), done);
    });
  };

  /**
   * Enhances worker with functionality from class.
   *
   *    Enhancement = function(options){}
   *    Enhancement.prototype.enhance = function enhance(server){
   *      //do stuff
   *    }
   *
   *    //second argument passed to constructor
   *    worker.enhance(Enhancement, {isBlue: true});
   *
   *
   * @param {Object} enhancement enhancement class.
   * @param {Object} options options for class.
   * @return {Object} self.
   */
  proto.use = function use(enhancement, options) {
    new enhancement(options).enhance(this);

    return this;
  };

}(this));
(function(window) {
  'use strict';

  function MochaDriver(options) {
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

  MochaDriver.createMutliReporter = function createMultiReporter() {
    var reporters = Array.prototype.slice.call(arguments);

    return function(runner) {
      reporters.forEach(function(Report) {
        new Report(runner);
      });
    };
  };

  MochaDriver.prototype = {
    ui: 'bdd',
    testHelperUrl: './test/helper.js',
    mochaUrl: './vendor/mocha/mocha.js',

    enhance: function enhance(worker) {
      this.worker = worker;
      worker.testRunner = this._testRunner.bind(this);
      worker.on('run tests', this._onRunTests.bind(this));
    },

    _onRunTests: function _onRunTests(data) {
      this.worker.runTests(data.tests || []);
    },

    getReporter: function getReporter(box) {
      var stream = TestAgent.Mocha.JsonStreamReporter,
          self = this;

      stream.console = box.console;

      stream.send = function send(line) {
        self.worker.send('test data', line);
      };

      return MochaDriver.createMutliReporter(
        TestAgent.Mocha.JsonStreamReporter,
        box.mocha.reporters.HTML
      );
    },

    _testRunner: function _testRunner(worker, tests, done) {
      var box = worker.sandbox.getWindow(),
          self = this;

      worker.loader.done(function onDone() {
        box.mocha.run(done);
      });

      box.require(this.mochaUrl, function onRequireMocha() {
        //setup mocha
        box.mocha.setup({
          ui: self.ui,
          reporter: self.getReporter(box)
        });
      });

      box.require(this.testHelperUrl, function(){
        tests.forEach(function(test) {
          box.require(test);
        });
      });
    }

  };

  window.TestAgent.BrowserWorker.MochaDriver = MochaDriver;

}(this));
(function(window) {
  'use strict';

  var Worker = window.TestAgent.BrowserWorker;


  function ErrorReporting() {

  };

  ErrorReporting.prototype = {
    enhance: function enhance(worker) {
      worker.on('sandbox error', this.onSandboxError.bind(this, worker));
    },

    onSandboxError: function onSandboxError(worker, data) {
      worker.send('error', data);
    }
  };

  Worker.ErrorReporting = ErrorReporting;

}(this));

(function(window) {
  'use strict';

  var Worker = window.TestAgent.BrowserWorker;


  Worker.Config = function Config(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.config = new TestAgent.Config(options);
  };

  Worker.Config.prototype = {
    enhance: function enhance(worker) {
      worker.config = this._config.bind(this, worker, this.config);
    },

    _config: function _config(worker, config, callback) {
      config.load(function(data) {
        worker.emit('config', data);
        if (callback) {
          callback(data);
        }
      });
    }

  };

}(this));
(function(window) {
  'use strict';

  var FORMAT_REGEX = /%([0-9])?s/g,
      Worker = window.TestAgent.BrowserWorker;

  function format() {
    var i = 0,
        str,
        args = Array.prototype.slice.call(arguments),
        result;

    str = args.shift();

    result = str.replace(FORMAT_REGEX, function(match, pos) {
      var index = parseInt(pos || i++, 10);
      return args[index];
    });

    return result;
  }

  function fragment() {
    var string = format.apply(this, arguments),
        element = document.createElement('div');

    element.innerHTML = string;
    return element.firstChild;
  }

  var TestUi = Worker.TestUi = function TestUi(options) {
    var selector;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    selector = options.selector || '#test-agent-ui';
    this.element = options.element || document.querySelector(selector);
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'error ' + this.HIDDEN;
    this.element.appendChild(this.errorElement);
    this.queue = {};
  };


  TestUi.prototype = {
    HIDDEN: 'hidden',

    templates: {
      testList: '<ul class="test-list"></ul>',
      testItem: '<li data-url="%s">%s</li>',
      testRun: '<button class="run-tests">Execute</button>',
      error: [
        '<h1>Critical Error</h1>',
        '<p><span class="error">%0s</span> in file ',
        '<span class="file">',
        '<a href="%1s">%1s</a>',
         '</span> line #',
        '<span class="line">%2s</span>'
      ].join('')
    },

    enhance: function enhance(worker) {
      this.worker = worker;
      this.worker.on('config', this.onConfig.bind(this));
      this.worker.on('sandbox', this.onSandbox.bind(this));
      this.worker.on('sandbox error', this.onSandboxError.bind(this));
    },

    onSandbox: function onSandbox() {
      var error = this.errorElement;
      if (error) {
        if (error.className.indexOf(this.HIDDEN) === -1) {
          error.className += ' ' + this.HIDDEN;
        }
      }
    },

    onSandboxError: function onSandboxError(data) {
      var element = this.element,
          error = this.errorElement,
          message = data.message,
          file = data.filename,
          line = data.lineno;

      error.className = error.className.replace(' hidden', '');

      error.innerHTML = format(
        this.templates.error,
        message,
        file,
        line
      );
    },

    onConfig: function onConfig(data) {
      //purge elements
      var elements = this.element.getElementsByTagName('test-list'),
          element,
          templates = this.templates,
          i = 0,
          parent;

      for (; i < elements.length; i++) {
        element = elements[i];
        element.parentNode.removeChild(element);
      }

      parent = fragment(templates.testList);

      data.tests.forEach(function(test) {
        parent.appendChild(fragment(
          templates.testItem,
          test,
          test
        ));
      });

      this.element.appendChild(
        parent
      );

      this.element.appendChild(fragment(templates.testRun));

      this.initDomEvents();
    },

    initDomEvents: function initDomEvents() {
      var ul = this.element.querySelector('ul'),
          button = this.element.querySelector('button'),
          self = this,
          activeClass = ' active';

      ul.addEventListener('click', function(e) {
        var target = e.target,
            url = target.getAttribute('data-url');

        if (url) {
          if (self.queue[url]) {
            target.className = target.className.replace(activeClass, '');
            delete self.queue[url];
          } else {
            target.className += activeClass;
            self.queue[url] = true;
          }
        }
      });

      button.addEventListener('click', function onTestClick() {
        var tests = [], key;

        for (key in self.queue) {
          if (self.queue.hasOwnProperty(key)) {
            tests.push(key);
          }
        }
        self.worker.emit('run tests', {tests: tests});
      });
    }

  };

}(this));
