/* This is a built file do not modify directly */

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

    if (array) {
      desc = { value: value[key] };
    } else {
      desc = Object.getOwnPropertyDescriptor(value, key);
    }

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

    errorObject.stack = this.formatStack(err) || '';
    errorObject.message = err.message || err.toString();
    errorObject.type = err.type || 'Error';
    errorObject.constructorName = err.constructor.name || '';
    errorObject.expected = err.expected || null;
    errorObject.actual = err.actual || null;

    if (typeof(err) === 'object' && 'uncaught' in err) {
      errorObject.uncaught = err.uncaught;
    }

    return errorObject;
  };

}(this));
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

(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Loader = window.TestAgent.Loader = function Loader(options) {
    var key;

    this._cached = {};

    //queue stuff
    this._queue = [];

    this.doneCallbacks = [];

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
     * Queue for script loads.
     */
    _queue: null,

    /**
     * Used for queue identification.
     */
    _currentId: null,

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
     * Begins an item in the queue.
     */
    _begin: function() {
      var item = this._queue[0];

      if (item) {
        item();
      } else {
        this._fireCallbacks();
      }
    },

    /**
     * Moves to the next item in the queue.
     */
    _next: function() {
      this._queue.shift();
      this._begin();
    },

    /**
     * Loads given script into current target window.
     * If file has been previously loaded it will not
     * be loaded again.
     *
     * @param {String} url location to load script from.
     * @param {String} callback callback when script loading is complete.
     */
    require: function(url, callback, options) {
      this._queue.push(
        this._require.bind(this, url, callback, options)
      );

      if (this._queue.length === 1) {
        this._begin();
      }
    },

    /**
     * Function that does the actual require work work.
     * Handles calling ._next on cached file or on onload
     * success.
     *
     * @private
     */
    _require: function require(url, callback, options) {
      var prefix = this.prefix,
          suffix = '',
          self = this,
          element,
          key,
          document = this.targetWindow.document;

      if (url in this._cached) {
        if (callback) {
          callback();
        }
        return this._next();
      }

      if (this.bustCache) {
        suffix = '?time=' + String(Date.now());
      }

      this._cached[url] = true;

      url = prefix + url + suffix;
      element = document.createElement('script');
      element.src = url;
      element.async = false;
      element.type = this.type;

      if (options) {
        for (key in options) {
          if (options.hasOwnProperty(key)) {
            element.setAttribute(key, options[key]);
          }
        }
      };

      function oncomplete() {
        if (callback) {
          callback();
        }
        self._next();
      }


      //XXX: should we report missing
      //files differently ? maybe
      //fail the whole test case
      //when a file is missing...?
      element.onerror = oncomplete;
      element.onload = oncomplete;

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

  Sandbox.prototype = {
    __proto__: TestAgent.Responder.prototype,

    _element: null,

    /**
     * @type Boolean
     *
     * True when sandbox is ready
     */
    ready: false,

    /**
     * URL for the iframe sandbox.
     *
     * @type String
     */
    url: null,

    /**
     * Returns iframe element.
     *
     *
     * @type DOMElement
     */
    getElement: function getElement() {
      var iframe;
      if (!this._element) {
        iframe = this._element = window.document.createElement('iframe');
        iframe.src = this.url + '?time=' + String(Date.now());
      }
      return this._element;
    },

    _insertIframe: function() {

      var element = this.getElement();
      var iframeWindow;
      var self = this;
      var src = element.src;

      window.document.body.appendChild(element);
      iframeWindow = element.contentWindow;

      // GECKO (Firefox, B2G) has a problem
      // with the caching of iframes this sometimes
      // causes the onerror event not to fire
      // when we boot up the iframe setting
      // the source here ensures the cached
      // version is never used.
      iframeWindow.location.href = src;

      return iframeWindow;
    },

    run: function(callback) {
      this.destroy();

      var iframeWindow = this._insertIframe();
      var self = this;

      iframeWindow.onerror = function(message, file, line) {
        self.emit('error', {
          message: message,
          //remove cache busting string
          filename: file.split('?time=')[0],
          lineno: line
        });
      };

      iframeWindow.addEventListener('DOMContentLoaded',
                                    function contentLoaded() {

        iframeWindow.removeEventListener('DOMContentLoaded', contentLoaded);

        self.ready = true;
        self.emit('ready', this);
        callback.call(this);
      });

      return iframeWindow;
    },

    destroy: function destroy() {
      var el;

      if (!this.ready) {
        return false;
      }

      this.ready = false;

      el = this.getElement();
      el.parentNode.removeChild(el);


      return true;
    },

    getWindow: function getWindow() {
      if (!this.ready) {
        return false;
      }

      return this.getElement().contentWindow;
    }

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
    var self = this
      , stats = this.stats = { suites: 0, tests: 0, passes: 0, pending: 0, failures: 0 }
      , failures = this.failures = [];

    if (!runner) return;
    this.runner = runner;

    runner.stats = stats;

    runner.on('start', function(){
      stats.start = new Date;
    });

    runner.on('suite', function(suite){
      stats.suites = stats.suites || 0;
      suite.root || stats.suites++;
    });

    runner.on('test end', function(test){
      stats.tests = stats.tests || 0;
      stats.tests++;
    });

    runner.on('pass', function(test){
      stats.passes = stats.passes || 0;

      var medium = test.slow() / 2;
      test.speed = test.duration > test.slow()
        ? 'slow'
        : test.duration > medium
          ? 'medium'
          : 'fast';

      stats.passes++;
    });

    runner.on('fail', function(test, err){
      stats.failures = stats.failures || 0;
      stats.failures++;
      test.err = err;
      failures.push(test);
    });

    runner.on('end', function(){
      stats.end = new Date;
      stats.duration = new Date - stats.start;
    });

    runner.on('pending', function(){
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

      if (stack) {
        //re-orgnaize the stack to exlude the above
        stack = stack.split('\n').map(function(e) {
          return e.trim().replace(/^at /, '');
        });

        stack.splice(0, 1);
        stack = stack.join('\n');
      }

      //this is temp
      var logDetails = {messages: [message], stack: stack };


      if (MochaReporter.testAgentEnvId) {
        logDetails.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(
        JSON.stringify(['log', logDetails])
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
      var obj = {
        total: total
      };

      if (MochaReporter.testAgentEnvId) {
        obj.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(JSON.stringify(['start', obj]));
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
      if (MochaReporter.testAgentEnvId) {
        self.stats.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(JSON.stringify(['end', self.stats]));
    });
  }

  var exportKeys = [
    'title',
    'getTitle',
    'fullTitle',
    'root',
    'duration',
    'state',
    'type',
    'slow'
  ];

  function jsonExport(object, additional) {
    var result = {}, key;

    exportKeys.forEach(function(key) {
      var value;

      if(object.fn) {
        result.fn = object.fn.toString();
      }

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

    if (MochaReporter.testAgentEnvId) {
      result.testAgentEnvId = MochaReporter.testAgentEnvId;
    }

    return result;
  }

  //export
  exports.JsonStreamReporter = MochaReporter;

}(this));

(function() {
  var isNode = typeof(window) === 'undefined',
      Responder,
      exports;

  if(!isNode) {
    if(typeof(TestAgent.Mocha) === 'undefined') {
      TestAgent.Mocha = {};
    }
    Responder = TestAgent.Responder;
  } else {
    Responder = require('../responder');
  }

  function copy(values, exclude) {
    var key;

    if (!exclude) {
      exclude = [];
    }

    for (key in values) {
      if (values.hasOwnProperty(key)) {
        if (exclude.indexOf(key) > -1) {
          continue;
        }
        this[key] = values[key];
      }
    }
  }

  function wrapWithEnvId(data) {
    var prefix;
    if (data.testAgentEnvId) {
      prefix = '[' + data.testAgentEnvId + '] ';
      if (data.__test__.fullTitle !== '') {
        data.__test__.fullTitle = prefix + data.__test__.fullTitle;
      }

      if (data.title !== '') {
        data.title = prefix + data.title;
      }
    }
  }

  RunnerStreamProxy.Suite = function Suite(suite) {
    this.__test__ = suite;
    copy.call(this, suite, ['fullTitle']);
    wrapWithEnvId(this);
  };

  RunnerStreamProxy.Suite.prototype.fullTitle = function() {
    return this.__test__.fullTitle;
  };


  RunnerStreamProxy.Test = function Test(test) {
    this.__test__ = test;
    copy.call(this, test, ['fullTitle', 'slow']);
    wrapWithEnvId(this);
  };

  RunnerStreamProxy.Test.prototype = {
    fullTitle: function() {
      return this.__test__.fullTitle;
    },

    slow: function() {
      return this.__test__.slow;
    }
  };

  function RunnerStreamProxy(runner) {
    var self = this;

    Responder.apply(this, arguments);

    this.runner = runner;

    this.on({

      'start': function onStart(data) {
        runner.emit('start', data);
      },

      'log': function onLog(data) {
        console.log.apply(console, data.messages);
      },

      'end': function onEnd(data) {
        runner.emit('end', data);
      },

      'suite': function onSuite(data) {
        this.parent = new RunnerStreamProxy.Suite(data);
        runner.emit('suite', this.parent);
      },

      'suite end': function onSuiteEnd(data) {
        runner.emit('suite end', new RunnerStreamProxy.Suite(data));
        this.parent = null;
      },

      'test': function onTest(data) {
        self.err = null;
        runner.emit('test', this._createTest(data));
      },

      'test end': this._emitTest.bind(this, 'test end'),
      'fail': this._emitTest.bind(this, 'fail'),
      'pass': this._emitTest.bind(this, 'pass'),
      'pending': this._emitTest.bind(this, 'pending')

    });
  }

  RunnerStreamProxy.prototype = Object.create(Responder.prototype);

  /**
   * Emits a event on the runner intended to be used with bind
   *
   *    something.on('someEventName', this._emitTest.bind('someEventName'));
   *
   * @param {String} event
   * @param {Object} data
   */
  RunnerStreamProxy.prototype._emitTest = function _emitTest(event, data) {
    var err;
    if (data.err) {
      err = data.err;
      this.err = err;
    }
    this.runner.emit(event, this._createTest(data), err);
  };

  /**
   * Factory to create a test.
   *
   *
   * @param {Object} data
   * @return {RunnerStreamProxy.Test}
   */
  RunnerStreamProxy.prototype._createTest = function _createTest(data) {
    var test = new RunnerStreamProxy.Test(data);

    test.parent = this.parent;

    if (this.err) {
      test.err = this.err;
    }

    return test;
  };


  if (isNode) {
    module.exports = RunnerStreamProxy;
  } else {
    TestAgent.Mocha.RunnerStreamProxy = RunnerStreamProxy;
  }

}());
(function() {

  var isNode = typeof(window) === 'undefined',
      Responder;

  if (!isNode) {
    if (typeof(TestAgent.Mocha) === 'undefined') {
      TestAgent.Mocha = {};
    }
    Responder = TestAgent.Responder;
  } else {
    Responder = require('../responder');
  }

  /**
   * Removes a value from an array.
   *
   * @param {Array} array target to remove value from.
   * @param {Object} value value to remove from array.
   */
  function removeIndex(array, value) {
    var index = array.indexOf(value);

    if (index !== -1) {
      array.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Creates a thread manager able to
   * accept test events from multiple sources.
   *
   *
   * @param {Object} options config.
   * @param {Array} options.envs object containing a list of
   *                                     environments to keep track of.
   * @constructor
   */
  function ConcurrentReportingEvents(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.envOrder = [];
    this.envQueue = {};
    //clone
    this.total = 0;
    this.startQueue = this.envs.concat([]);
    this.timeoutId = null;
    this.currentEnv = null;

    Responder.call(this);
  }

  var proto = ConcurrentReportingEvents.prototype = Object.create(
    Responder.prototype
  );

  /**
   * Name of start event
   *
   * @type String
   */
  proto.START = 'start';

  /**
   * Name of end event
   *
   * @type String
   */
  proto.END = 'end';

  /**
   * Time between events before
   * throwing an error.
   *
   * @type Numeric
   */
  proto.envTimeout = 10000;

  var emit = proto.emit;

  /**
   * Emits queued events for envId.
   *
   * @this
   * @param {String} envId id of env to emit.
   */
  proto._emitQueuedEvents = function(envId) {
    var queue = this.envQueue[envId],
        event;

    while ((event = queue.shift())) {
      this.emit.apply(this, event);
    }
  };

  /**
   * Emits runner error.
   * @this
   * @param {Object} self context to emit event from.
   */
  proto._emitRunnerError = function _emitRunnerError(self) {
    var context = self || this;
    context.emit('runner error', new Error('timeout'));
  };

  /**
   * Clears and resets the event timer.
   * If no events occur within the .envTimeout
   * period the 'runner error' event will be sent.
   * @this
   */
  proto._setTimeout = function _setTimeout() {
    this._clearTimeout();
    this.timeoutId = setTimeout(
      this._emitRunnerError,
      this.envTimeout,
      this
    );
  };


  /**
   * Clears timeout.
   * @this
   */
  proto._clearTimeout = function _clearTimeout() {
    clearTimeout(this.timeoutId);
  };

  /**
   * Checks if current report is complete.
   *
   * @this
   * @return {Boolean} true when all envs are done.
   */
  proto.isComplete = function() {
    return this.envs.length === 0;
  };

  /**
   * Triggers the start event.
   */
  proto.emitStart = function() {
    emit.call(this, 'start', { total: this.total });
  };

  /**
   * Emits an event on this object.
   * Events will be emitted in groups
   * based on the testAgentEnvId value in
   * data. If one is not present this
   * will act as a normal emit function.
   *
   * @this
   * @param {String} event events name.
   * @param {Object} data data to emit.
   * @return {Object} self.
   */
  proto.emit = function(event, data) {
    var envId,
        currentEnv;

    if (typeof(data) !== 'object' || !('testAgentEnvId' in data)) {
      //act like a normal responder
      return emit.apply(this, arguments);
    }

    envId = data.testAgentEnvId;
    currentEnv = this.currentEnv;

    this._setTimeout();

    //when another env sends the start event queue
    //it to be next in line.
    if (event === this.START) {
      this.total = this.total + data.total;

      this.envOrder.push(envId);

      //create env queue if it does not exist
      if (!(envId in this.envQueue)) {
        this.envQueue[envId] = [];
      }

      removeIndex(this.startQueue, envId);

      if (this.startQueue.length === 0) {
        this.emitStart();
        this.currentEnv = this.envOrder.shift();
        this._emitQueuedEvents(this.currentEnv);
      }

      return this;
    }

    //if this event is for a different group
    //queue the event until the current group
    //emits an 'end' event
    if (envId !== currentEnv) {
      if (!this.envQueue[envId]) {
        return console.log(
          'Attempting to log an test event for the environment: "' + envId +
          '" but it does not exist. \nevent:', event, '\ndata:', data
        );
      }
      this.envQueue[envId].push(arguments);
      return this;
    }

    //when the end event fires
    //on the current group
    if (event === this.END) {
      removeIndex(this.envs, currentEnv);

      this.currentEnv = this.envOrder.shift();
      //emit the next groups events
      if (this.currentEnv) {
        this._emitQueuedEvents(this.currentEnv);
        //and suppress this 'end' event
        return this;
      }

      if (!this.isComplete()) {
        //don't emit end until all envs are complete
        return this;
      }

      this._clearTimeout();
      //if this is the last
      //env send the end event.
    }

    emit.apply(this, arguments);

    return this;
  };

  if (isNode) {
    module.exports = ConcurrentReportingEvents;
  } else {
    TestAgent.Mocha.ConcurrentReportingEvents = ConcurrentReportingEvents;
  }

}());
(function() {

  var isNode = typeof(window) === 'undefined',
      Responder,
      Proxy,
      ReportingEvents,
      Mocha;

  if (!isNode) {
    if (typeof(TestAgent.Mocha) === 'undefined') {
      TestAgent.Mocha = {};
    }

    Responder = TestAgent.Responder;
    Proxy = TestAgent.Mocha.RunnerStreamProxy;
    ReportingEvents = TestAgent.Mocha.ConcurrentReportingEvents;
  } else {
    Responder = require('../responder');
    Proxy = require('./runner-stream-proxy');
    ReportingEvents = require('./concurrent-reporting-events');
  }

  /**
   * @param {Object} options configuration options.
   * @constructor
   */
  function Reporter(options) {
    var key;

    Responder.call(this);

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    if (isNode) {
      Mocha = require('mocha');
    } else {
      Mocha = window.Mocha;
    }

    this.envs = [];
    if (!this.reporterClass) {
      this.reporterClass = Mocha.reporters[this.defaultMochaReporter];
    }
  }

  Reporter.prototype = Object.create(Responder.prototype);

  /**
   * Set envs for next test run.
   *
   * @param {String|String[]} env a single env or an array of envs.
   */
  Reporter.prototype.setEnvs = function setEnvs(env) {
    if (env instanceof Array) {
      this.envs = env;
    } else {
      this.envs = [env];
    }
  };

  /**
   * Default mocha reporter defaults to 'Spec'
   *
   * @type String
   */
  Reporter.prototype.defaultMochaReporter = 'Spec';

  /**
   * Creates a runner instance.
   */
  Reporter.prototype.createRunner = function createRunner() {
    var self = this;
    this.runner = new ReportingEvents({
      envs: this.envs
    });

    this.proxy = new Proxy(this.runner);
    this.envs = [];

    this.runner.once('start', this._onStart.bind(this));
  };

  /**
   * Triggered when runner starts.
   * Emits start event creates the reporter
   * class and sets up the 'end' listener.
   */
  Reporter.prototype._onStart = function _onStart() {
    this.emit('start', this);
    this.reporter = new this.reporterClass(this.runner);
    this.runner.emitStart();

    this.runner.on('end', this._onEnd.bind(this));
  };

  /**
   * Triggered when runner is finished.
   * Emits the end event then
   * cleans up the runner, reporter and proxy
   */
  Reporter.prototype._onEnd = function _onEnd() {
    this.emit('end', this);
    this.runner = null;
    this.reporter = null;
    this.proxy = null;
  };

  /**
   * Returns the mocha reporter used in the proxy.
   *
   *
   * @return {Object} mocha reporter.
   */
  Reporter.prototype.getMochaReporter = function getMochaReporter() {
    return this.reporter;
  };

  /**
   * Reponds to a an event in the form of a json string or an array.
   * This is passed through to the proxy which will format the results
   * and emit an event to the runner which will then communicate to the
   * reporter.
   *
   * Creates reporter, proxy and runner when receiving the start event.
   *
   * @param {Array | String} line event line.
   * @return {Object} proxy object.
   */
  Reporter.prototype.respond = function respond(line) {
    var data = Responder.parse(line);
    if (data.event === 'start' && !this.proxy) {
      this.createRunner();
    }
    return this.proxy.respond([data.event, data.data]);
  };

  if (isNode) {
    module.exports = Reporter;
  } else {
    TestAgent.Mocha.Reporter = Reporter;
  }

}());
(function() {

  var isNode = typeof(window) === 'undefined',
      Reporter;

  if (isNode) {
    Reporter = require('../mocha/reporter');
  } else {
    if (typeof(TestAgent.Common) === 'undefined') {
      TestAgent.Common = {};
    }
    Reporter = TestAgent.Mocha.Reporter;
  }

  /**
   * The usual merge function.
   * Takes multiple objects and merges
   * them in order into a new object.
   *
   * If I need this elsewhere should probably be a utility.
   *
   * @param {...Object} args any number of objects to merge.
   * @return {Object} result of merges.
   */
  function merge() {
    var args = Array.prototype.slice.call(arguments),
        result = {};

    args.forEach(function(object) {
      var key;
      for (key in object) {
        if (object.hasOwnProperty(key)) {
          result[key] = object[key];
        }
      }
    });

    return result;
  }

  /**
   * REQUIRES: responder
   *
   * Provides a listener for test data events
   * to stream reports to the servers console.
   *
   * @constructor
   * @param {Object} options see mocha/reporter for options.
   */
  function Mocha(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    if(options.mochaSelector) {
      this.mochaSelector = options.mochaSelector;
      delete options.mochaSelector;
    }

    this.reporter = new Reporter(options);
    this.isRunning = false;
  }

  Mocha.prototype = {

    /**
     * Used to clear previous mocha element
     * for HTML reporting.
     * Obviously only used when window is present.
     *
     * @type String
     */
    mochaSelector: '#mocha',

    /**
     * Title for simulated syntax error test failures.
     *
     * @this
     * @type String
     */
    syntaxErrorTitle: 'Syntax Error',

    enhance: function enhance(server) {
      server.on('test data', this._onTestData.bind(this));
      server.on('set test envs', this._onSetTestEnvs.bind(this));
      this.reporter.on('start', this._onRunnerStart.bind(this, server));
      this.reporter.on('end', this._onRunnerEnd.bind(this, server));
    },

    _onSetTestEnvs: function _onSetTestEnvs(env) {
      this.reporter.setEnvs(env);
    },

    _onTestData: function _onTestData(data, socket) {
      this.reporter.respond(data);
    },

    _onRunnerEnd: function _onRunnerEnd(server, runner) {
      var endArgs = Array.prototype.slice.call(arguments).slice(1);
      endArgs.unshift('test runner end');

      this.isRunning = false;
      server.emit.apply(server, endArgs);
    },

    _onRunnerStart: function _onRunnerStart(server, runner) {

      if (typeof(window) !== 'undefined') {
        this._startBrowser();
      }

      server.emit('test runner', runner);

      this.isRunning = true;
    },

    _startBrowser: function() {
      var el = document.querySelector(this.mochaSelector);
      if (el) {
        el.innerHTML = '';
      }
    }
  };

  if (isNode) {
    module.exports = Mocha;
  } else {
    TestAgent.Common.MochaTestEvents = Mocha;
  }

}());
(function() {

  var isNode = typeof(window) === 'undefined';

  if (!isNode) {
    if (typeof(TestAgent.Common) === 'undefined') {
      TestAgent.Common = {};
    }
  }

  function Blanket() {

  }

  Blanket.prototype = {

    enhance: function enhance(server) {
      this.server = server;
      server.on('coverage data', this._onCoverageData.bind(this));

      if (typeof(window) !== 'undefined') {
        window.addEventListener('message', function(event) {
          var data = event.data;
          if (/coverage info/.test(data)) {
            server.send('coverage data', data);
          }
        });
      }
    },

    _onCoverageData: function _onCoverageData(data) {
      var data = JSON.parse(data);
      data.shift();
      this._printCoverageResult(data.shift());
    },

    _printCoverageResult: function _printCoverageResult(coverResults) {
      var key,
          titleColor = '\033[1;36m',
          fileNameColor = '\033[0;37m',
          stmtColor = '\033[0;33m',
          percentageColor = '\033[0;36m',
          originColor = '\033[0m';

      // Print title
      console.info('\n\n    ' + titleColor + '-- Blanket.js Test Coverage Result --' + originColor + '\n');
      console.info('    ' + fileNameColor + 'File Name' + originColor +
        ' - ' + stmtColor + 'Covered/Total Smts' + originColor +
        ' - ' + percentageColor + 'Coverage (\%)\n' + originColor);

      // Print coverage result for each file
      coverResults.forEach(function(dataItem) {
        var filename = dataItem.filename,
            formatPrefix = (filename === "Global Total" ? "\n    " : "      "),
            seperator = ' - ';

        filename = (filename === "Global Total" ? filename : filename.substr(0, filename.indexOf('?')));
        outputFormat = formatPrefix;
        outputFormat += fileNameColor + filename + originColor + seperator;
        outputFormat += stmtColor + dataItem.stmts + originColor  + seperator;
        outputFormat += percentageColor + dataItem.percentage + originColor;

        console.info(outputFormat);
      });
    }
  }

  if (isNode) {
    module.exports = Blanket;
  } else {
    TestAgent.Common.BlanketCoverEvents = Blanket;
  }

}());
(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  TestAgent.BrowserWorker = function BrowserWorker(options) {
    var self = this,
        dep = this.deps;

    TestAgent.Responder.call(this);

    if (typeof(options) === 'undefined') {
      options = {};
    }
    this.sandbox = new dep.Sandbox(options.sandbox);
    this.loader = new dep.Loader(options.loader);
    this.env = options.env || null;

    this._testsProcessor = [];
    this.testRunner = options.testRunner;
    //event proxy
    this.sandbox.on('error', this.emit.bind(this, 'sandbox error'));

    this.on('set env', function(env) {
      self.env = env;
    });

    this.on('run tests', function(data) {
      self.runTests(data.tests || [], false);
    });

    this.on('run tests with coverage', function(data) {
      self.runTests(data.tests || [], true);
    });
  };

  //inheritance
  TestAgent.BrowserWorker.prototype = Object.create(
      TestAgent.Responder.prototype
  );

  var proto = TestAgent.BrowserWorker.prototype;

  proto.deps = {
    Sandbox: TestAgent.Sandbox,
    Loader: TestAgent.Loader,
    ConfigLoader: TestAgent.Config
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

    if (this.send) {
      this.send.apply(this, args);
    }

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
  proto.runTests = function runTests(tests, runCoverage) {
    var self = this,
        done = this._emitTestComplete.bind(this);

    if (!this.testRunner) {
      throw new Error('Worker must be provided a .testRunner method');
    }

    this.createSandbox(function createSandbox() {
      self.testRunner(self, self._processTests(tests), done);
      if (runCoverage) {
        self.coverageRunner(self);
      }
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

  /**
   * Emits 'start worker' event as a hook
   * for other plugins.
   */
  proto.start = function start() {
    this.emit('worker start');
  };

  /**
   * Signals when the worker is ready to start running tests
   */
  proto.ready = function ready() {
    this.emit('worker ready');
    if (this.send) {
      this.send('worker ready');
    }
  };

}(this));
(function(window) {
  /**
   * Creates websocket enhancement.
   *
   * @constructor
   * @param {Object} options see WebsocketClient for options.
   */
  function Websocket(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    options.url = options.url || this.defaults.url;
    options.retry = options.retry || this.defaults.retry;

    this.socket = new TestAgent.WebsocketClient(
      options
    );
  }

  Websocket.prototype = {

    defaults: {
      retry: true,
      url: 'ws://' + document.location.host.split(':')[0] + ':8789'
    },

    /**
     * Enhances worker to respond to
     * websocket events. Adds a send method
     * to communicate with the websocket server.
     *
     * @param {TestAgent.BrowserWorker} worker browser worker.
     */
    enhance: function(worker) {
      var socket = this.socket,
          originalEmit = socket.emit,
          originalSend = worker.send;

      if (originalSend) {
        worker.send = function() {
          socket.send.apply(socket, arguments);
          return originalSend.apply(worker, arguments);
        }
      } else {
        worker.send = socket.send.bind(socket);
      }

      socket.emit = function() {
        worker.emit.apply(worker, arguments);
        return originalEmit.apply(socket, arguments);
      };

      worker.on('worker start', socket.start.bind(socket));
    }

  };

  TestAgent.BrowserWorker.Websocket = Websocket;

}(this));
(function(window) {

  function PostMessage(options) {
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

  PostMessage.prototype = {

    window: window,

    allowedDomains: '*',

    targetWindow: window.parent,

    enhance: function enhance(worker) {
      var originalSend = worker.send,
          self = this,
          onMessage = this.onMessage.bind(this, worker);

      if (originalSend) {
        worker.send = function() {
          self.postMessage.apply(self, arguments);
          return originalSend.apply(worker, arguments);
        }
      } else {
        worker.send = self.postMessage.bind(self);
      }

      worker.on('worker start', function() {
        worker.send('worker start', {
          type: 'post-message',
          domain: window.location.href
        });
      });

      this.window.addEventListener('message', onMessage);
    },

    onMessage: function onMessage(worker, event) {
      var data = event.data;
      if (data) {
        if (typeof(data) === 'string') {
          data = JSON.parse(data);
        }
        worker.respond(data);
      }
    },

    postMessage: function postMessage() {
      if (this.targetWindow === this.window) {
        //prevent sending messages to myself!
        return;
      }

      var args = Array.prototype.slice.call(arguments);
      args = JSON.stringify(args);
      this.targetWindow.postMessage(args, this.allowedDomains);
    }

  };

  window.TestAgent.BrowserWorker.PostMessage = PostMessage;

}(this));
(function(window) {

  function Driver(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.testGroups = {};
    this.sandboxes = {};

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Driver.prototype = {

    allowedDomains: '*',

    window: window,

    forwardEvents: ['test data', 'error', 'set test envs'],

    listenToWorker: 'post-message',

    iframeAttrs: null,

    enhance: function(worker) {
      var self = this,
          onMessage;

      onMessage = this.onMessage.bind(this, worker);
      this.worker = worker;
      this.runCoverage = false;

      worker.on('worker start', function(data) {
        if (data && data.type == self.listenToWorker) {
          self._startDomainTests(self.currentEnv);
        }
      });

      worker.on('run tests complete', function() {
        self._loadNextDomain();
      });

      worker.runTests = this.runTests.bind(this);

      this.window.addEventListener('message', onMessage);
    },

    onMessage: function(worker, event) {
      var eventType, data = event.data;

      if (data) {
        if (typeof(data) === 'string') {
          data = JSON.parse(event.data);
        }
        //figure out what event this is
        eventType = data[0];
        worker.respond(data);
        if (this.forwardEvents.indexOf(eventType) !== -1) {
          if (worker.send) {
            worker.send.apply(worker, data);
          }
        }
      }
    },

    /**
     * Sends message to a given iframe.
     *
     * @param {HTMLElement} iframe raw iframe element.
     * @param {String} event name.
     * @param {Object} data data to send.
     */
    send: function(iframe, event, data) {
      var send = JSON.stringify([event, data]);
      iframe.contentWindow.postMessage(send, this.allowedDomains);
    },

    /**
     * Creates an iframe for a domain appends it to body
     * and returns element.
     *
     * @param {String} src url source to load iframe from.
     * @return {HTMLElement} iframe element.
     */
    createIframe: function(src) {
      var iframe = document.createElement('iframe');
      iframe.src = src + '?time' + String(Date.now());

      if (this.iframeAttrs) {
        var key;
        for (key in this.iframeAttrs) {
          if (this.iframeAttrs.hasOwnProperty(key)) {
            iframe.setAttribute(
              key,
              this.iframeAttrs[key]
            );
          }
        }
      }

      document.body.appendChild(iframe);

      return iframe;
    },

    /**
     * Removes iframe from the dom.
     *
     * @param {HTMLElement} iframe raw iframe element.
     */
    removeIframe: function(iframe) {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    },

    /**
     * Creates new iframe and register's it under
     * .sandboxes
     *
     *
     * Removes current iframe and its
     * associated tests if a current domain
     * is set.
     */
    _loadNextDomain: function() {
      var iframe;
      //if we have a current domain
      //remove it it should be finished now.
      if (this.currentEnv) {
        this.removeIframe(
          this.sandboxes[this.currentEnv]
        );
        delete this.testGroups[this.currentEnv];
      }

      var nextEnv = Object.keys(this.testGroups).shift();
      if (nextEnv) {
        var nextGroup = this.testGroups[nextEnv];
        this.currentEnv = nextGroup.env;
        iframe = this.createIframe(nextGroup.domain);
        this.sandboxes[this.currentEnv] = iframe;
      } else {
        this.currentEnv = null;
      }
    },

    /**
     * Sends run tests event to domain.
     *
     * @param {String} env the enviroment to test against.
     */
    _startDomainTests: function(env) {
      var iframe, tests, group;

      if (env in this.sandboxes) {
        iframe = this.sandboxes[env];
        group = this.testGroups[env];

        this.send(iframe, 'set env', group.env);

        if (!this.runCoverage) {
          this.send(iframe, 'run tests', { tests: group.tests });
        } else {
          this.send(iframe, 'run tests with coverage', { tests: group.tests });
        }
      }
    },

    /**
     * Maps each test in the list
     * into a test group based on the results
     * of groupTestsByDomain.
     *
     * @param {Array} tests list of tests.
     */
    _createTestGroups: function(tests) {
      var i = 0, len = tests.length,
          group;

      this.testGroups = {};

      for (i; i < len; i++) {
        group = this.groupTestsByDomain(tests[i]);
        if (group.env && group.test) {
          if (!(group.env in this.testGroups)) {
            this.testGroups[group.env] = {
              env: group.env,
              domain: group.domain,
              tests: []
            };
          }
          this.testGroups[group.env].tests.push(group.test);
        }
      }
    },

    /**
     * Runs a group of tests.
     *
     * @param {Array} tests list of tests to run.
     */
    runTests: function(tests, runCoverage) {
      var envs;
      this.runCoverage = runCoverage;
      this._createTestGroups(tests);
      envs = Object.keys(this.testGroups);
      this.worker.emit('set test envs', envs);
      this.worker.send('set test envs', envs);
      this._loadNextDomain();
    }

  };

  window.TestAgent.BrowserWorker.MultiDomainDriver = Driver;

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
    /**
     * Test interface for mocha use.
     */
    ui: 'bdd',

    /**
     * Default test timeout.
     */
    timeout: 10000,

    /**
     * Mocha reporter to use.
     * If null is given none will be used.
     */
    reporter: 'HTML',

    /**
     * location of test helper(s).
     *
     * Will be loaded before any of your tests.
     * May pass more then one via an array.
     *
     * Each helper is loaded completely before
     * requiring any other helpers allowing multiple
     * files to be requested prior to executing tests.
     *
     * @type {String|Array}
     */
    testHelperUrl: './test/helper.js',

    /**
     * Location of the mocha runtime.
     */
    mochaUrl: './vendor/mocha/mocha.js',

    enhance: function enhance(worker) {
      this.worker = worker;
      worker.testRunner = this._testRunner.bind(this);
    },

    getReporter: function getReporter(box) {
      var stream = TestAgent.Mocha.JsonStreamReporter,
          self = this;

      stream.console = box.console;

      stream.send = function send(line) {
        self.worker.send('test data', line);
      };

      if (this.worker.env) {
        TestAgent.Mocha.JsonStreamReporter.testAgentEnvId = this.worker.env;
      }


      if(this.reporter) {
        return MochaDriver.createMutliReporter(
          TestAgent.Mocha.JsonStreamReporter,
          box.Mocha.reporters[this.reporter]
        );
      } else {
        return TestAgent.Mocha.JsonStreamReporter;
      }

      return result;
    },

    _loadTestHelpers: function(box, callback) {
      var helpers = this.testHelperUrl;
      if (typeof(helpers) === 'string') {
        helpers = [helpers];
      }

      var current = 0;
      var max = helpers.length;

      function next() {
        if (current < max) {
          box.require(helpers[current], function() {
            current++;
            next();
          });
        } else {
          callback();
        }
      }

      next();
    },

    _testRunner: function _testRunner(worker, tests, done) {
      var box = worker.sandbox.getWindow(),
          self = this;

      worker.loader.done(function onDone() {
        box.mocha.run(done);
      });

      box.require(this.mochaUrl, function onRequireMocha() {
        if (!box.process) {
          box.process = {
            stdout: {
              write: console.log
            },
            write: console.log
          };
        }

        // due to a bug in mocha, iframes added to the DOM are
        // detected as global leaks in FF 21+, these global ignores
        // are a workaround. see also:
        // https://developer.mozilla.org/en-US/docs/Site_Compatibility_for_Firefox_21
        var globalIgnores = ['0', '1', '2', '3', '4', '5'];

        //setup mocha
        box.mocha.setup({
          globals: globalIgnores,
          ui: self.ui,
          reporter: self.getReporter(box),
          timeout: self.timeout
        });
      });

      self._loadTestHelpers(box, function() {
        tests.sort().forEach(function(test) {
          box.require(test);
        });
      });
    }

  };

  window.TestAgent.BrowserWorker.MochaDriver = MochaDriver;

}(this));
(function(window) {
  'use strict';

  function BlanketDriver(options) {
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

  BlanketDriver.prototype = {
    /**
     * Location of the blanket runtime.
     */
    blanketUrl: './vendor/blanket/blanket.js',

    /**
     * Location of config for blanket.
     */
    configUrl: '/test/unit/blanket_config.json',

    /**
     * Default config when config file not found.
     */
    _defaultConfig: {
      'data-cover-only': 'js/'
    },

    enhance: function enhance(worker) {
      var self = this;
      this.worker = worker;
      worker.coverageRunner = this._coverageRunner.bind(this);
      this.load(function(data) {
        self.blanketConfig = data;
      });
    },

    _coverageRunner: function _coverageRunner(worker) {
      var box = worker.sandbox.getWindow();
      box.require(this.blanketUrl, null, this.blanketConfig);
    },

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

      return this._defaultConfig;
    },

    /**
     * Loads list of files from url
     */
    load: function load(callback) {
      var xhr = new XMLHttpRequest(),
          self = this,
          response;

      xhr.open('GET', this.configUrl, true);
      xhr.onload = function onload() {
        if (xhr.status === 200 || xhr.status === 0) {
          response = self._parseResponse(xhr);
        } else {
          response = self._defaultConfig;
        }

        callback.call(this, response);
      };

      xhr.send(null);
    }
  };

  window.TestAgent.BrowserWorker.BlanketDriver = BlanketDriver;

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
    WORKING: 'working',
    EXECUTE: 'execute',

    tasks: {
      test: 'run tests',
      coverage: 'run tests with coverage',
    },

    templates: {
      testList: '<ul class="test-list"></ul>',
      testItem: '<li data-url="%s">%s</li>',
      testRun: '<button class="run-tests">execute</button>',
      error: [
        '<h1>Critical Error</h1>',
        '<p><span class="error">%0s</span> in file ',
        '<span class="file">',
        '<a href="%1s">%1s</a>',
         '</span> line #',
        '<span class="line">%2s</span>'
      ].join('')
    },

    get execButton() {
      if (!this._execButton) {
        this._execButton = this.element.querySelector('button');
      }
      return this._execButton;
    },

    get command() {
      var covCheckbox = document.querySelector('#test-agent-coverage-checkbox'),
          covFlag = covCheckbox ? covCheckbox.checked : false;

      if (covFlag) {
        return this.tasks.coverage;
      } else {
        return this.tasks.test;
      }
    },

    enhance: function enhance(worker) {
      this.worker = worker;
      this.worker.on('config', this.onConfig.bind(this));
      this.worker.on('sandbox', this.onSandbox.bind(this));
      this.worker.on('sandbox error', this.onSandboxError.bind(this));
      this.worker.on('test runner', this.onTestRunner.bind(this));
      this.worker.on('test runner end', this.onTestRunnerEnd.bind(this));
    },

    onTestRunner: function onTestRunner() {
      this.isRunning = true;
      this.execButton.textContent = this.WORKING;
      this.execButton.className += ' ' + this.WORKING
    },

    onTestRunnerEnd: function onTestRunnerEnd() {
      var className = this.execButton.className;

      this.isRunning = false;
      this.execButton.textContent = this.EXECUTE;
      this.execButton.className = className.replace(' ' + this.WORKING, '');
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

      window.dispatchEvent(new CustomEvent('test-agent-list-done'));
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

        if (self.isRunning) {
          return;
        }

        var tests = [], key;

        for (key in self.queue) {
          if (self.queue.hasOwnProperty(key)) {
            tests.push(key);
          }
        }

        self.worker.emit(self.command, {tests: tests});
      });
    }

  };

}(this));

