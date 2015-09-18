(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":2}],2:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":3}],3:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],4:[function(require,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],5:[function(require,module,exports){
/* globals define */
;(function(define){'use strict';define(function(require,exports,module){
/**
 * Locals
 */
var textContent = Object.getOwnPropertyDescriptor(Node.prototype,
    'textContent');
var innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
var removeAttribute = Element.prototype.removeAttribute;
var setAttribute = Element.prototype.setAttribute;
var noop  = function() {};

/**
 * Register a new component.
 *
 * @param  {String} name
 * @param  {Object} props
 * @return {constructor}
 * @public
 */
exports.register = function(name, props) {
  var baseProto = getBaseProto(props.extends);
  var template = props.template || baseProto.templateString;

  // Components are extensible by default but can be declared
  // as non extensible as an optimization to avoid
  // storing the template strings
  var extensible = props.extensible = props.hasOwnProperty('extensible')?
    props.extensible : true;

  // Clean up
  delete props.extends;

  // Pull out CSS that needs to be in the light-dom
  if (template) {
    // Stores the string to be reprocessed when
    // a new component extends this one
    if (extensible && props.template) {
      props.templateString = props.template;
    }

    var output = processCss(template, name);

    props.template = document.createElement('template');
    props.template.innerHTML = output.template;
    props.lightCss = output.lightCss;

    props.globalCss = props.globalCss || '';
    props.globalCss += output.globalCss;
  }

  // Inject global CSS into the document,
  // and delete as no longer needed
  injectGlobalCss(props.globalCss);
  delete props.globalCss;

  // Merge base getter/setter attributes with the user's,
  // then define the property descriptors on the prototype.
  var descriptors = mixin(props.attrs || {}, base.descriptors);

  // Store the orginal descriptors somewhere
  // a little more private and delete the original
  props._attrs = props.attrs;
  delete props.attrs;

  // Create the prototype, extended from base and
  // define the descriptors directly on the prototype
  var proto = createProto(baseProto, props);
  Object.defineProperties(proto, descriptors);

  // Register the custom-element and return the constructor
  try {
    return document.registerElement(name, { prototype: proto });
  } catch (e) {
    if (e.name !== 'NotSupportedError') {
      throw e;
    }
  }
};

var base = {
  properties: {
    GaiaComponent: true,
    attributeChanged: noop,
    attached: noop,
    detached: noop,
    created: noop,

    createdCallback: function() {
      if (this.rtl) { addDirObserver(); }
      injectLightCss(this);
      this.created();
    },

    /**
     * It is very common to want to keep object
     * properties in-sync with attributes,
     * for example:
     *
     *   el.value = 'foo';
     *   el.setAttribute('value', 'foo');
     *
     * So we support an object on the prototype
     * named 'attrs' to provide a consistent
     * way for component authors to define
     * these properties. When an attribute
     * changes we keep the attr[name]
     * up-to-date.
     *
     * @param  {String} name
     * @param  {String||null} from
     * @param  {String||null} to
     */
    attributeChangedCallback: function(name, from, to) {
      var prop = toCamelCase(name);
      if (this._attrs && this._attrs[prop]) { this[prop] = to; }
      this.attributeChanged(name, from, to);
    },

    attachedCallback: function() { this.attached(); },
    detachedCallback: function() { this.detached(); },

    /**
     * A convenient method for setting up
     * a shadow-root using the defined template.
     *
     * @return {ShadowRoot}
     */
    setupShadowRoot: function() {
      if (!this.template) { return; }
      var node = document.importNode(this.template.content, true);
      this.createShadowRoot().appendChild(node);
      return this.shadowRoot;
    },

    /**
     * Sets an attribute internally
     * and externally. This is so that
     * we can style internal shadow-dom
     * content.
     *
     * @param {String} name
     * @param {String} value
     */
    setAttr: function(name, value) {
      var internal = this.shadowRoot.firstElementChild;
      setAttribute.call(internal, name, value);
      setAttribute.call(this, name, value);
    },

    /**
     * Removes an attribute internally
     * and externally. This is so that
     * we can style internal shadow-dom
     * content.
     *
     * @param {String} name
     * @param {String} value
     */
    removeAttr: function(name) {
      var internal = this.shadowRoot.firstElementChild;
      removeAttribute.call(internal, name);
      removeAttribute.call(this, name);
    }
  },

  descriptors: {
    textContent: {
      set: function(value) {
        textContent.set.call(this, value);
        if (this.lightStyle) { this.appendChild(this.lightStyle); }
      },

      get: function() {
        return textContent.get();
      }
    },

    innerHTML: {
      set: function(value) {
        innerHTML.set.call(this, value);
        if (this.lightStyle) { this.appendChild(this.lightStyle); }
      },

      get: innerHTML.get
    }
  }
};

/**
 * The default base prototype to use
 * when `extends` is undefined.
 *
 * @type {Object}
 */
var defaultPrototype = createProto(HTMLElement.prototype, base.properties);

/**
 * Returns a suitable prototype based
 * on the object passed.
 *
 * @private
 * @param  {HTMLElementPrototype|undefined} proto
 * @return {HTMLElementPrototype}
 */
function getBaseProto(proto) {
  if (!proto) { return defaultPrototype; }
  proto = proto.prototype || proto;
  return !proto.GaiaComponent ?
    createProto(proto, base.properties) : proto;
}

/**
 * Extends the given proto and mixes
 * in the given properties.
 *
 * @private
 * @param  {Object} proto
 * @param  {Object} props
 * @return {Object}
 */
function createProto(proto, props) {
  return mixin(Object.create(proto), props);
}

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @private
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  var div = document.createElement('div');
  try { div.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Regexs used to extract shadow-css
 *
 * @type {Object}
 */
var regex = {
  shadowCss: /(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,
  ':host': /(?:\:host)/g,
  ':host()': /\:host\((.+)\)(?: \:\:content)?/g,
  ':host-context': /\:host-context\((.+)\)([^{,]+)?/g,
  '::content': /(?:\:\:content)/g
};

/**
 * Extracts the :host and ::content rules
 * from the shadow-dom CSS and rewrites
 * them to work from the <style scoped>
 * injected at the root of the component.
 *
 * @private
 * @return {String}
 */
function processCss(template, name) {
  var globalCss = '';
  var lightCss = '';

  if (!hasShadowCSS) {
    template = template.replace(regex.shadowCss, function(match) {
      var hostContext = regex[':host-context'].exec(match);

      if (hostContext) {
        globalCss += match
          .replace(regex['::content'], '')
          .replace(regex[':host-context'], '$1 ' + name + '$2')
          .replace(/ +/g, ' '); // excess whitespace
      } else {
        lightCss += match
          .replace(regex[':host()'], name + '$1')
          .replace(regex[':host'], name)
          .replace(regex['::content'], name);
      }

      return '';
    });
  }

  return {
    template: template,
    lightCss: lightCss,
    globalCss: globalCss
  };
}

/**
 * Some CSS rules, such as @keyframes
 * and @font-face don't work inside
 * scoped or shadow <style>. So we
 * have to put them into 'global'
 * <style> in the head of the
 * document.
 *
 * @private
 * @param  {String} css
 */
function injectGlobalCss(css) {
  if (!css) {return;}
  var style = document.createElement('style');
  style.innerHTML = css.trim();
  headReady().then(function() {
    document.head.appendChild(style);
  });
}


/**
 * Resolves a promise once document.head is ready.
 *
 * @private
 */
function headReady() {
  return new Promise(function(resolve) {
    if (document.head) { return resolve(); }
    window.addEventListener('load', function fn() {
      window.removeEventListener('load', fn);
      resolve();
    });
  });
}


/**
 * The Gecko platform doesn't yet have
 * `::content` or `:host`, selectors,
 * without these we are unable to style
 * user-content in the light-dom from
 * within our shadow-dom style-sheet.
 *
 * To workaround this, we clone the <style>
 * node into the root of the component,
 * so our selectors are able to target
 * light-dom content.
 *
 * @private
 */
function injectLightCss(el) {
  if (hasShadowCSS) { return; }
  var stylesheet = el.querySelector('style');

  if (!stylesheet) {
    stylesheet = document.createElement('style');
    stylesheet.setAttribute('scoped', '');
    stylesheet.appendChild(document.createTextNode(el.lightCss));
    el.appendChild(stylesheet);
  }

  el.lightStyle = stylesheet;
}

/**
 * Convert hyphen separated
 * string to camel-case.
 *
 * Example:
 *
 *   toCamelCase('foo-bar'); //=> 'fooBar'
 *
 * @private
 * @param  {Sring} string
 * @return {String}
 */
function toCamelCase(string) {
  return string.replace(/-(.)/g, function replacer(string, p1) {
    return p1.toUpperCase();
  });
}

/**
 * Observer (singleton)
 *
 * @type {MutationObserver|undefined}
 */
var dirObserver;

/**
 * Observes the document `dir` (direction)
 * attribute and dispatches a global event
 * when it changes.
 *
 * Components can listen to this event and
 * make internal changes if need be.
 *
 * @private
 */
function addDirObserver() {
  if (dirObserver) { return; }

  dirObserver = new MutationObserver(onChanged);
  dirObserver.observe(document.documentElement, {
    attributeFilter: ['dir'],
    attributes: true
  });

  function onChanged(mutations) {
    document.dispatchEvent(new Event('dirchanged'));
  }
}

/**
 * Copy the values of all properties from
 * source object `target` to a target object `source`.
 * It will return the target object.
 *
 * @private
 * @param   {Object} target
 * @param   {Object} source
 * @returns {Object}
 */
function mixin(target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
  return target;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));

},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
/* global define */
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var GaiaDialogProto = require('gaia-dialog').prototype;
var component = require('gaia-component');

/**
 * Exports
 */
module.exports = component.register('gaia-dialog-alert', {
  created: function() {
    this.setupShadowRoot();
    this.els = {
      dialog: this.shadowRoot.querySelector('gaia-dialog')
    };
    this.els.dialog.addEventListener('closed',
      GaiaDialogProto.hide.bind(this));
  },

  open: function(e) {
    return GaiaDialogProto.show.call(this)
      .then(() => this.els.dialog.open(e));
  },

  close: function() {
    return this.els.dialog.close()
      .then(GaiaDialogProto.hide.bind(this));
  },

  template: `
    <gaia-dialog>
      <section>
        <p><content></content></p>
      </section>
      <div>
        <button class="submit primary" on-click="close">Ok</button>
      </div>
    </gaia-dialog>

    <style>

    :host {
      display: none;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog-alert',this));

},{"gaia-component":6,"gaia-dialog":8}],8:[function(require,module,exports){
;(function(define){'use strict';define((require,exports,module) => {

/**
 * Dependencies
 */
var component = require('gaia-component');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : () => {};

/**
 * Use the dom-scheduler if it's around,
 * else fallback to fake shim.
 *
 * @type {Object}
 */
var schedule = window.scheduler || {
  mutation: block => Promise.resolve(block()),
  transition: (block, el, event, timeout) => {
    block();
    return after(el, event, timeout || 500);
  }
};

/**
 * Exports
 */

module.exports = component.register('gaia-dialog', {
  created() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.dialog-inner'),
      background: this.shadowRoot.querySelector('.background'),
      window: this.shadowRoot.querySelector('.window')
    };

    this.shadowRoot.addEventListener('click', e => this.onClick(e));
  },

  onClick(e) {
    var el = e.target.closest('[on-click]');
    if (!el) { return; }
    debug('onClick');
    var method = el.getAttribute('on-click');
    if (typeof this[method] == 'function') { this[method](); }
  },

  open(options) {
    if (this.isOpen) { return; }
    debug('open dialog');
    this.isOpen = true;

    this.show()
      .then(() => this.animateBackgroundIn(options))
      .then(() => this.animateWindowIn())
      .then(() => this.dispatch('opened'));
  },

  close(options) {
    if (!this.isOpen) { return; }
    debug('close dialog');
    this.isOpen = false;

    this.animateWindowOut()
      .then(() => this.animateBackgroundOut())
      .then(() => this.hide())
      .then(() => this.dispatch('closed'));
  },

  animateBackgroundIn(options) {
    if (options) { return this.animateBackgroundInFrom(options); }

    var el = this.els.background;
    return schedule.transition(() => {
      debug('animate background in');
      el.classList.remove('animate-out');
      el.classList.add('animate-in');
    }, el, 'animationend');
  },

  animateBackgroundOut() {
    var el = this.els.background;
    return schedule.transition(() => {
      debug('animate background out');
      el.classList.add('animate-out');
      el.classList.remove('animate-in');
    }, el, 'animationend')
      .then(() => el.style = '');
  },

  animateBackgroundInFrom(pos) {
    var el = this.els.background;
    var scale = Math.sqrt(window.innerWidth * window.innerHeight) / 15;
    var duration = scale * 9;

    return schedule.mutation(() => {
        el.classList.add('circular');
        el.classList.remove('animate-out');
        el.style.transform = `translate(${pos.clientX}px, ${pos.clientY}px)`;
        el.style.transitionDuration = duration + 'ms';
        el.offsetTop; // Hack, any ideas?
      })

      .then(() => {
        return schedule.transition(() => {
          debug('animate background in from', pos);
          el.style.transform += ` scale(${scale})`;
          el.style.opacity = 1;
        }, el, 'transitionend', duration * 1.5);
      });
  },

  show() {
    return schedule.mutation(() => {
      debug('show');
      this.style.display = 'block';
    });
  },

  hide() {
    return schedule.mutation(() => {
      debug('hide');
      this.style.display = 'none';
    });
  },

  animateWindowIn() {
    var el = this.els.window;
    return schedule.transition(() => {
      debug('animate window in');
      el.classList.add('animate-in');
      el.classList.remove('animate-out');
    }, el, 'animationend');
  },

  animateWindowOut() {
    var el = this.els.window;
    return schedule.transition(() => {
      debug('animate window out');
      el.classList.add('animate-out');
      el.classList.remove('animate-in');
    }, el, 'animationend');
  },

  dispatch(name) {
    this.dispatchEvent(new CustomEvent(name));
  },

  attrs: {
    opened: {
      get: function() { return !!this.isOpen; },
      set: function(value) {
        value = value === '' || value;
        if (!value) { this.close(); }
        else { this.open(); }
      }
    }
  },

  template: `
    <div class="dialog-inner">
      <div class="background" on-click="close"></div>
      <div class="window"><content></content></div>
    </div>

    <style>

    ::content * {
      box-sizing: border-box;
      font-weight: inherit;
      font-size: inherit;
    }

    ::content p,
    ::content h1,
    ::content h2,
    ::content h3,
    ::content h4,
    ::content button,
    ::content fieldset {
      padding: 0;
      margin: 0;
      border: 0;
    }

    :host {
      display: none;
      position: fixed;
      top: 0px; left: 0px;
      width: 100%;
      height: 100%;
      z-index: 200;
      font-style: italic;
      text-align: center;

      overflow: hidden;
    }

    /** Inner
     ---------------------------------------------------------*/

    .dialog-inner {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    /** Background
     ---------------------------------------------------------*/

    .background {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      background: rgba(199,199,199,0.85);
    }

    /**
     * .circular
     */

    .background.circular {
      width: 40px;
      height: 40px;
      margin: -20px;
      border-radius: 50%;
      will-change: transform, opacity;
      transition-property: opacity, transform;
      transition-timing-function: linear;
    }

    /**
     * .animate-in
     */

    .background.animate-in {
      animation-name: gaia-dialog-fade-in;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
    }

    /**
     * .animate-out
     */

    .background.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Window
     ---------------------------------------------------------*/

    .window {
      position: relative;
      width: 90%;
      max-width: 350px;
      margin: auto;
      box-shadow: 0 1px 0 0px rgba(0,0,0,0.15);
      background: var(--color-iota);
      transition: opacity 300ms;
      opacity: 0;
    }

    .window.animate-in {
      animation-name: gaia-dialog-entrance;
      animation-duration: 300ms;
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
      animation-fill-mode: forwards;
      opacity: 1;
    }

    .window.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 150ms;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Title
     ---------------------------------------------------------*/

    ::content h1 {
      padding: 16px;
      font-size: 23px;
      line-height: 26px;
      font-weight: 200;
      font-style: italic;
      color: #858585;
    }

    ::content strong {
      font-weight: 700;
    }

    ::content small {
      font-size: 0.8em;
    }

    /** Section
     ---------------------------------------------------------*/

    ::content section {
      padding: 33px 18px;
      color: #858585;
    }

    ::content section > *:not(:last-child) {
      margin-bottom: 13px;
    }

    /** Paragraphs
     ---------------------------------------------------------*/

    ::content p {
      text-align: -moz-start;
    }

    /** Buttons
     ---------------------------------------------------------*/

    ::content button {
      position: relative;
      display: block;
      width: 100%;
      height: 50px;
      margin: 0;
      border: 0;
      padding: 0rem 16px;
      cursor: pointer;
      font: inherit;
      background: var(--color-beta);
      color: var(--color-epsilon);
      transition: all 200ms;
      transition-delay: 300ms;
      border-radius: 0;
    }

    /**
     * .primary
     */

    ::content button.primary {
      color: var(--highlight-color);
    }

    /**
     * .danger
     */

    ::content button.danger {
      color: var(--color-destructive);
    }

    /**
     * Disabled buttons
     */

    ::content button[disabled] {
      color: var(--color-zeta);
    }

    /** Button Divider Line
     ---------------------------------------------------------*/

    ::content button:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 6px;
      right: 6px;
      top: 49px;
      background: #E7E7E7;
    }

    ::content button:last-of-type:after {
      display: none;
    }

    ::content button:active {
      background-color: var(--highlight-color);
      color: #fff;
      transition: none;
    }

    ::content button:active:after {
      background: var(--highlight-color);
      transition: none;
    }

    ::content button[data-icon]:before {
      float: left;
    }

    /** Fieldset (button group)
     ---------------------------------------------------------*/

    ::content fieldset {
      overflow: hidden;
    }

    ::content fieldset button {
      position: relative;
      float: left;
      width: 50%;
    }

    ::content fieldset button:after {
      content: '';
      display: block;
      position: absolute;
      top: 6px;
      bottom: 6px;
      right: 0px;
      left: auto;
      width: 1px;
      height: calc(100% - 12px);
      background: #e7e7e7;
      transition: all 200ms;
      transition-delay: 200ms;
    }

    </style>`,

  globalCss: `
    @keyframes gaia-dialog-entrance {
      0% { transform: translateY(100px); }
      100% { transform: translateY(0px); }
    }

    @keyframes gaia-dialog-fade-in {
      0% { opacity: 0 }
      100% { opacity: 1 }
    }

    @keyframes gaia-dialog-fade-out {
      0% { opacity: 1 }
      100% { opacity: 0 }
    }`
});

/**
 * Utils
 */

function after(target, event, timeout) {
  return new Promise(resolve => {
    var timer = timeout && setTimeout(cb, timeout);
    target.addEventListener(event, cb);
    function cb() {
      target.removeEventListener(event, cb);
      clearTimeout(timer);
      resolve();
    }
  });
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog',this));

},{"gaia-component":6}],9:[function(require,module,exports){
module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _io = __webpack_require__(1);

	var _libEnv = __webpack_require__(3);

	exports.default = {
	  fetch: _io.fetch,
	  Env: _libEnv.Env
	};
	module.exports = exports.default;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.fetch = fetch;

	var _libErrors = __webpack_require__(2);

	function load(type, url) {
	  return new Promise(function (resolve, reject) {
	    var xhr = new XMLHttpRequest();

	    if (xhr.overrideMimeType) {
	      xhr.overrideMimeType(type);
	    }

	    xhr.open('GET', url, true);

	    if (type === 'application/json') {
	      xhr.responseType = 'json';
	    }

	    xhr.addEventListener('load', function io_onload(e) {
	      if (e.target.status === 200 || e.target.status === 0) {
	        resolve(e.target.response || e.target.responseText);
	      } else {
	        reject(new _libErrors.L10nError('Not found: ' + url));
	      }
	    });
	    xhr.addEventListener('error', reject);
	    xhr.addEventListener('timeout', reject);

	    try {
	      xhr.send(null);
	    } catch (e) {
	      if (e.name === 'NS_ERROR_FILE_NOT_FOUND') {
	        reject(new _libErrors.L10nError('Not found: ' + url));
	      } else {
	        throw e;
	      }
	    }
	  });
	}

	var io = {
	  extra: function (code, ver, path, type) {
	    return navigator.mozApps.getLocalizationResource(code, ver, path, type);
	  },
	  app: function (code, ver, path, type) {
	    switch (type) {
	      case 'text':
	        return load('text/plain', path);
	      case 'json':
	        return load('application/json', path);
	      default:
	        throw new _libErrors.L10nError('Unknown file type: ' + type);
	    }
	  }
	};

	function fetch(ver, res, lang) {
	  var url = res.replace('{locale}', lang.code);
	  var type = res.endsWith('.json') ? 'json' : 'text';
	  return io[lang.src](lang.code, ver, url, type);
	}

/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.L10nError = L10nError;

	function L10nError(message, id, lang) {
	  this.name = 'L10nError';
	  this.message = message;
	  this.id = id;
	  this.lang = lang;
	}

	L10nError.prototype = Object.create(Error.prototype);
	L10nError.prototype.constructor = L10nError;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.amendError = amendError;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _context = __webpack_require__(4);

	var _formatPropertiesParser = __webpack_require__(7);

	var _formatPropertiesParser2 = _interopRequireDefault(_formatPropertiesParser);

	var _formatL20nEntriesParser = __webpack_require__(8);

	var _formatL20nEntriesParser2 = _interopRequireDefault(_formatL20nEntriesParser);

	var _pseudo = __webpack_require__(9);

	var _events = __webpack_require__(10);

	var parsers = {
	  properties: _formatPropertiesParser2.default,
	  l20n: _formatL20nEntriesParser2.default
	};

	var Env = (function () {
	  function Env(defaultLang, fetch) {
	    _classCallCheck(this, Env);

	    this.defaultLang = defaultLang;
	    this.fetch = fetch;

	    this._resCache = Object.create(null);

	    var listeners = {};
	    this.emit = _events.emit.bind(this, listeners);
	    this.addEventListener = _events.addEventListener.bind(this, listeners);
	    this.removeEventListener = _events.removeEventListener.bind(this, listeners);
	  }

	  Env.prototype.createContext = function createContext(resIds) {
	    return new _context.Context(this, resIds);
	  };

	  Env.prototype._parse = function _parse(syntax, lang, data) {
	    var _this = this;

	    var parser = parsers[syntax];
	    if (!parser) {
	      return data;
	    }

	    var emit = function (type, err) {
	      return _this.emit(type, amendError(lang, err));
	    };
	    return parser.parse.call(parser, emit, data);
	  };

	  Env.prototype._create = function _create(lang, entries) {
	    if (lang.src !== 'qps') {
	      return entries;
	    }

	    var pseudoentries = Object.create(null);
	    for (var key in entries) {
	      pseudoentries[key] = _pseudo.walkEntry(entries[key], _pseudo.qps[lang.code].translate);
	    }
	    return pseudoentries;
	  };

	  Env.prototype._getResource = function _getResource(lang, res) {
	    var _this2 = this;

	    var cache = this._resCache;
	    var id = res + lang.code + lang.src;

	    if (cache[id]) {
	      return cache[id];
	    }

	    var syntax = res.substr(res.lastIndexOf('.') + 1);

	    var saveEntries = function (data) {
	      var entries = _this2._parse(syntax, lang, data);
	      cache[id] = _this2._create(lang, entries);
	    };

	    var recover = function (err) {
	      err.lang = lang;
	      _this2.emit('fetcherror', err);
	      cache[id] = err;
	    };

	    var langToFetch = lang.src === 'qps' ? { code: this.defaultLang, src: 'app' } : lang;

	    return cache[id] = this.fetch(res, langToFetch).then(saveEntries, recover);
	  };

	  return Env;
	})();

	exports.Env = Env;

	function amendError(lang, err) {
	  err.lang = lang;
	  return err;
	}

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var _errors = __webpack_require__(2);

	var _resolver = __webpack_require__(5);

	var _plurals = __webpack_require__(6);

	var Context = (function () {
	  function Context(env, resIds) {
	    _classCallCheck(this, Context);

	    this._env = env;
	    this._resIds = resIds;
	  }

	  Context.prototype._formatTuple = function _formatTuple(lang, args, entity, id, key) {
	    try {
	      return _resolver.format(this, lang, args, entity);
	    } catch (err) {
	      err.id = key ? id + '::' + key : id;
	      err.lang = lang;
	      this._env.emit('resolveerror', err, this);
	      return [{ error: err }, err.id];
	    }
	  };

	  Context.prototype._formatEntity = function _formatEntity(lang, args, entity, id) {
	    var _formatTuple2 = this._formatTuple(lang, args, entity, id);

	    var value = _formatTuple2[1];

	    var formatted = {
	      value: value,
	      attrs: null
	    };

	    if (entity.attrs) {
	      formatted.attrs = Object.create(null);
	      for (var key in entity.attrs) {
	        var _formatTuple3 = this._formatTuple(lang, args, entity.attrs[key], id, key);

	        var attrValue = _formatTuple3[1];

	        formatted.attrs[key] = attrValue;
	      }
	    }

	    return formatted;
	  };

	  Context.prototype._formatValue = function _formatValue(lang, args, entity, id) {
	    return this._formatTuple(lang, args, entity, id)[1];
	  };

	  Context.prototype.fetch = function fetch(langs) {
	    if (langs.length === 0) {
	      return Promise.resolve(langs);
	    }

	    return Promise.all(this._resIds.map(this._env._getResource.bind(this._env, langs[0]))).then(function () {
	      return langs;
	    });
	  };

	  Context.prototype._resolve = function _resolve(langs, id, args, formatter) {
	    var _this = this;

	    var lang = langs[0];

	    if (!lang) {
	      this._env.emit('notfounderror', new _errors.L10nError('"' + id + '"' + ' not found in any language', id), this);
	      if (formatter === this._formatEntity) {
	        return { value: id, attrs: null };
	      } else {
	        return id;
	      }
	    }

	    var entity = this._getEntity(lang, id);

	    if (entity) {
	      return Promise.resolve(formatter.call(this, lang, args, entity, id));
	    } else {
	      this._env.emit('notfounderror', new _errors.L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang), this);
	    }

	    return this.fetch(langs.slice(1)).then(function (nextLangs) {
	      return _this._resolve(nextLangs, id, args, formatter);
	    });
	  };

	  Context.prototype.resolveEntity = function resolveEntity(langs, id, args) {
	    return this._resolve(langs, id, args, this._formatEntity);
	  };

	  Context.prototype.resolveValue = function resolveValue(langs, id, args) {
	    return this._resolve(langs, id, args, this._formatValue);
	  };

	  Context.prototype._getEntity = function _getEntity(lang, id) {
	    var cache = this._env._resCache;

	    for (var i = 0, resId = undefined; resId = this._resIds[i]; i++) {
	      var resource = cache[resId + lang.code + lang.src];
	      if (resource instanceof _errors.L10nError) {
	        continue;
	      }
	      if (id in resource) {
	        return resource[id];
	      }
	    }
	    return undefined;
	  };

	  Context.prototype._getMacro = function _getMacro(lang, id) {
	    switch (id) {
	      case 'plural':
	        return _plurals.getPluralRule(lang.code);
	      default:
	        return undefined;
	    }
	  };

	  return Context;
	})();

	exports.Context = Context;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.format = format;

	var _errors = __webpack_require__(2);

	var KNOWN_MACROS = ['plural'];
	var MAX_PLACEABLE_LENGTH = 2500;

	var FSI = '⁨';
	var PDI = '⁩';

	var resolutionChain = new WeakSet();

	function format(ctx, lang, args, entity) {
	  if (typeof entity === 'string') {
	    return [{}, entity];
	  }

	  if (resolutionChain.has(entity)) {
	    throw new _errors.L10nError('Cyclic reference detected');
	  }

	  resolutionChain.add(entity);

	  var rv = undefined;

	  try {
	    rv = resolveValue({}, ctx, lang, args, entity.value, entity.index);
	  } finally {
	    resolutionChain.delete(entity);
	  }
	  return rv;
	}

	function resolveIdentifier(ctx, lang, args, id) {
	  if (KNOWN_MACROS.indexOf(id) > -1) {
	    return [{}, ctx._getMacro(lang, id)];
	  }

	  if (args && args.hasOwnProperty(id)) {
	    if (typeof args[id] === 'string' || typeof args[id] === 'number' && !isNaN(args[id])) {
	      return [{}, args[id]];
	    } else {
	      throw new _errors.L10nError('Arg must be a string or a number: ' + id);
	    }
	  }

	  if (id === '__proto__') {
	    throw new _errors.L10nError('Illegal id: ' + id);
	  }

	  var entity = ctx._getEntity(lang, id);

	  if (entity) {
	    return format(ctx, lang, args, entity);
	  }

	  throw new _errors.L10nError('Unknown reference: ' + id);
	}

	function subPlaceable(locals, ctx, lang, args, id) {
	  var res = undefined;

	  try {
	    res = resolveIdentifier(ctx, lang, args, id);
	  } catch (err) {
	    return [{ error: err }, '{{ ' + id + ' }}'];
	  }

	  var value = res[1];

	  if (typeof value === 'number') {
	    return res;
	  }

	  if (typeof value === 'string') {
	    if (value.length >= MAX_PLACEABLE_LENGTH) {
	      throw new _errors.L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH + ')');
	    }
	    return res;
	  }

	  return [{}, '{{ ' + id + ' }}'];
	}

	function interpolate(locals, ctx, lang, args, arr) {
	  return arr.reduce(function (_ref, cur) {
	    var localsSeq = _ref[0];
	    var valueSeq = _ref[1];

	    if (typeof cur === 'string') {
	      return [localsSeq, valueSeq + cur];
	    } else {
	      var _subPlaceable = subPlaceable(locals, ctx, lang, args, cur.name);

	      var value = _subPlaceable[1];

	      return [localsSeq, valueSeq + FSI + value + PDI];
	    }
	  }, [locals, '']);
	}

	function resolveSelector(ctx, lang, args, expr, index) {
	  var selectorName = undefined;
	  if (index[0].type === 'call' && index[0].expr.type === 'prop' && index[0].expr.expr.name === 'cldr') {
	    selectorName = 'plural';
	  } else {
	    selectorName = index[0].name;
	  }
	  var selector = resolveIdentifier(ctx, lang, args, selectorName)[1];

	  if (typeof selector !== 'function') {
	    return selector;
	  }

	  var argValue = index[0].args ? resolveIdentifier(ctx, lang, args, index[0].args[0].name)[1] : undefined;

	  if (selectorName === 'plural') {
	    if (argValue === 0 && 'zero' in expr) {
	      return 'zero';
	    }
	    if (argValue === 1 && 'one' in expr) {
	      return 'one';
	    }
	    if (argValue === 2 && 'two' in expr) {
	      return 'two';
	    }
	  }

	  return selector(argValue);
	}

	function resolveValue(locals, ctx, lang, args, expr, index) {
	  if (!expr) {
	    return [locals, expr];
	  }

	  if (typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
	    return [locals, expr];
	  }

	  if (Array.isArray(expr)) {
	    return interpolate(locals, ctx, lang, args, expr);
	  }

	  if (index) {
	    var selector = resolveSelector(ctx, lang, args, expr, index);
	    if (selector in expr) {
	      return resolveValue(locals, ctx, lang, args, expr[selector]);
	    }
	  }

	  var defaultKey = expr.__default || 'other';
	  if (defaultKey in expr) {
	    return resolveValue(locals, ctx, lang, args, expr[defaultKey]);
	  }

	  throw new _errors.L10nError('Unresolvable value');
	}

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.getPluralRule = getPluralRule;
	var locales2rules = {
	  'af': 3,
	  'ak': 4,
	  'am': 4,
	  'ar': 1,
	  'asa': 3,
	  'az': 0,
	  'be': 11,
	  'bem': 3,
	  'bez': 3,
	  'bg': 3,
	  'bh': 4,
	  'bm': 0,
	  'bn': 3,
	  'bo': 0,
	  'br': 20,
	  'brx': 3,
	  'bs': 11,
	  'ca': 3,
	  'cgg': 3,
	  'chr': 3,
	  'cs': 12,
	  'cy': 17,
	  'da': 3,
	  'de': 3,
	  'dv': 3,
	  'dz': 0,
	  'ee': 3,
	  'el': 3,
	  'en': 3,
	  'eo': 3,
	  'es': 3,
	  'et': 3,
	  'eu': 3,
	  'fa': 0,
	  'ff': 5,
	  'fi': 3,
	  'fil': 4,
	  'fo': 3,
	  'fr': 5,
	  'fur': 3,
	  'fy': 3,
	  'ga': 8,
	  'gd': 24,
	  'gl': 3,
	  'gsw': 3,
	  'gu': 3,
	  'guw': 4,
	  'gv': 23,
	  'ha': 3,
	  'haw': 3,
	  'he': 2,
	  'hi': 4,
	  'hr': 11,
	  'hu': 0,
	  'id': 0,
	  'ig': 0,
	  'ii': 0,
	  'is': 3,
	  'it': 3,
	  'iu': 7,
	  'ja': 0,
	  'jmc': 3,
	  'jv': 0,
	  'ka': 0,
	  'kab': 5,
	  'kaj': 3,
	  'kcg': 3,
	  'kde': 0,
	  'kea': 0,
	  'kk': 3,
	  'kl': 3,
	  'km': 0,
	  'kn': 0,
	  'ko': 0,
	  'ksb': 3,
	  'ksh': 21,
	  'ku': 3,
	  'kw': 7,
	  'lag': 18,
	  'lb': 3,
	  'lg': 3,
	  'ln': 4,
	  'lo': 0,
	  'lt': 10,
	  'lv': 6,
	  'mas': 3,
	  'mg': 4,
	  'mk': 16,
	  'ml': 3,
	  'mn': 3,
	  'mo': 9,
	  'mr': 3,
	  'ms': 0,
	  'mt': 15,
	  'my': 0,
	  'nah': 3,
	  'naq': 7,
	  'nb': 3,
	  'nd': 3,
	  'ne': 3,
	  'nl': 3,
	  'nn': 3,
	  'no': 3,
	  'nr': 3,
	  'nso': 4,
	  'ny': 3,
	  'nyn': 3,
	  'om': 3,
	  'or': 3,
	  'pa': 3,
	  'pap': 3,
	  'pl': 13,
	  'ps': 3,
	  'pt': 3,
	  'rm': 3,
	  'ro': 9,
	  'rof': 3,
	  'ru': 11,
	  'rwk': 3,
	  'sah': 0,
	  'saq': 3,
	  'se': 7,
	  'seh': 3,
	  'ses': 0,
	  'sg': 0,
	  'sh': 11,
	  'shi': 19,
	  'sk': 12,
	  'sl': 14,
	  'sma': 7,
	  'smi': 7,
	  'smj': 7,
	  'smn': 7,
	  'sms': 7,
	  'sn': 3,
	  'so': 3,
	  'sq': 3,
	  'sr': 11,
	  'ss': 3,
	  'ssy': 3,
	  'st': 3,
	  'sv': 3,
	  'sw': 3,
	  'syr': 3,
	  'ta': 3,
	  'te': 3,
	  'teo': 3,
	  'th': 0,
	  'ti': 4,
	  'tig': 3,
	  'tk': 3,
	  'tl': 4,
	  'tn': 3,
	  'to': 0,
	  'tr': 0,
	  'ts': 3,
	  'tzm': 22,
	  'uk': 11,
	  'ur': 3,
	  've': 3,
	  'vi': 0,
	  'vun': 3,
	  'wa': 4,
	  'wae': 3,
	  'wo': 0,
	  'xh': 3,
	  'xog': 3,
	  'yo': 0,
	  'zh': 0,
	  'zu': 3
	};

	function isIn(n, list) {
	  return list.indexOf(n) !== -1;
	}
	function isBetween(n, start, end) {
	  return typeof n === typeof start && start <= n && n <= end;
	}

	var pluralRules = {
	  '0': function () {
	    return 'other';
	  },
	  '1': function (n) {
	    if (isBetween(n % 100, 3, 10)) {
	      return 'few';
	    }
	    if (n === 0) {
	      return 'zero';
	    }
	    if (isBetween(n % 100, 11, 99)) {
	      return 'many';
	    }
	    if (n === 2) {
	      return 'two';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '2': function (n) {
	    if (n !== 0 && n % 10 === 0) {
	      return 'many';
	    }
	    if (n === 2) {
	      return 'two';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '3': function (n) {
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '4': function (n) {
	    if (isBetween(n, 0, 1)) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '5': function (n) {
	    if (isBetween(n, 0, 2) && n !== 2) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '6': function (n) {
	    if (n === 0) {
	      return 'zero';
	    }
	    if (n % 10 === 1 && n % 100 !== 11) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '7': function (n) {
	    if (n === 2) {
	      return 'two';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '8': function (n) {
	    if (isBetween(n, 3, 6)) {
	      return 'few';
	    }
	    if (isBetween(n, 7, 10)) {
	      return 'many';
	    }
	    if (n === 2) {
	      return 'two';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '9': function (n) {
	    if (n === 0 || n !== 1 && isBetween(n % 100, 1, 19)) {
	      return 'few';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '10': function (n) {
	    if (isBetween(n % 10, 2, 9) && !isBetween(n % 100, 11, 19)) {
	      return 'few';
	    }
	    if (n % 10 === 1 && !isBetween(n % 100, 11, 19)) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '11': function (n) {
	    if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
	      return 'few';
	    }
	    if (n % 10 === 0 || isBetween(n % 10, 5, 9) || isBetween(n % 100, 11, 14)) {
	      return 'many';
	    }
	    if (n % 10 === 1 && n % 100 !== 11) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '12': function (n) {
	    if (isBetween(n, 2, 4)) {
	      return 'few';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '13': function (n) {
	    if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
	      return 'few';
	    }
	    if (n !== 1 && isBetween(n % 10, 0, 1) || isBetween(n % 10, 5, 9) || isBetween(n % 100, 12, 14)) {
	      return 'many';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '14': function (n) {
	    if (isBetween(n % 100, 3, 4)) {
	      return 'few';
	    }
	    if (n % 100 === 2) {
	      return 'two';
	    }
	    if (n % 100 === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '15': function (n) {
	    if (n === 0 || isBetween(n % 100, 2, 10)) {
	      return 'few';
	    }
	    if (isBetween(n % 100, 11, 19)) {
	      return 'many';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '16': function (n) {
	    if (n % 10 === 1 && n !== 11) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '17': function (n) {
	    if (n === 3) {
	      return 'few';
	    }
	    if (n === 0) {
	      return 'zero';
	    }
	    if (n === 6) {
	      return 'many';
	    }
	    if (n === 2) {
	      return 'two';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '18': function (n) {
	    if (n === 0) {
	      return 'zero';
	    }
	    if (isBetween(n, 0, 2) && n !== 0 && n !== 2) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '19': function (n) {
	    if (isBetween(n, 2, 10)) {
	      return 'few';
	    }
	    if (isBetween(n, 0, 1)) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '20': function (n) {
	    if ((isBetween(n % 10, 3, 4) || n % 10 === 9) && !(isBetween(n % 100, 10, 19) || isBetween(n % 100, 70, 79) || isBetween(n % 100, 90, 99))) {
	      return 'few';
	    }
	    if (n % 1000000 === 0 && n !== 0) {
	      return 'many';
	    }
	    if (n % 10 === 2 && !isIn(n % 100, [12, 72, 92])) {
	      return 'two';
	    }
	    if (n % 10 === 1 && !isIn(n % 100, [11, 71, 91])) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '21': function (n) {
	    if (n === 0) {
	      return 'zero';
	    }
	    if (n === 1) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '22': function (n) {
	    if (isBetween(n, 0, 1) || isBetween(n, 11, 99)) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '23': function (n) {
	    if (isBetween(n % 10, 1, 2) || n % 20 === 0) {
	      return 'one';
	    }
	    return 'other';
	  },
	  '24': function (n) {
	    if (isBetween(n, 3, 10) || isBetween(n, 13, 19)) {
	      return 'few';
	    }
	    if (isIn(n, [2, 12])) {
	      return 'two';
	    }
	    if (isIn(n, [1, 11])) {
	      return 'one';
	    }
	    return 'other';
	  }
	};

	function getPluralRule(code) {
	  var index = locales2rules[code.replace(/-.*$/, '')];
	  if (!(index in pluralRules)) {
	    return function () {
	      return 'other';
	    };
	  }
	  return pluralRules[index];
	}

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _errors = __webpack_require__(2);

	var MAX_PLACEABLES = 100;

	exports.default = {
	  patterns: null,
	  entryIds: null,
	  emit: null,

	  init: function () {
	    this.patterns = {
	      comment: /^\s*#|^\s*$/,
	      entity: /^([^=\s]+)\s*=\s*(.*)$/,
	      multiline: /[^\\]\\$/,
	      index: /\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,
	      unicode: /\\u([0-9a-fA-F]{1,4})/g,
	      entries: /[^\r\n]+/g,
	      controlChars: /\\([\\\n\r\t\b\f\{\}\"\'])/g,
	      placeables: /\{\{\s*([^\s]*?)\s*\}\}/
	    };
	  },

	  parse: function (emit, source) {
	    if (!this.patterns) {
	      this.init();
	    }
	    this.emit = emit;

	    var entries = {};

	    var lines = source.match(this.patterns.entries);
	    if (!lines) {
	      return entries;
	    }
	    for (var i = 0; i < lines.length; i++) {
	      var line = lines[i];

	      if (this.patterns.comment.test(line)) {
	        continue;
	      }

	      while (this.patterns.multiline.test(line) && i < lines.length) {
	        line = line.slice(0, -1) + lines[++i].trim();
	      }

	      var entityMatch = line.match(this.patterns.entity);
	      if (entityMatch) {
	        try {
	          this.parseEntity(entityMatch[1], entityMatch[2], entries);
	        } catch (e) {
	          if (!this.emit) {
	            throw e;
	          }
	        }
	      }
	    }
	    return entries;
	  },

	  parseEntity: function (id, value, entries) {
	    var name, key;

	    var pos = id.indexOf('[');
	    if (pos !== -1) {
	      name = id.substr(0, pos);
	      key = id.substring(pos + 1, id.length - 1);
	    } else {
	      name = id;
	      key = null;
	    }

	    var nameElements = name.split('.');

	    if (nameElements.length > 2) {
	      throw this.error('Error in ID: "' + name + '".' + ' Nested attributes are not supported.');
	    }

	    var attr;
	    if (nameElements.length > 1) {
	      name = nameElements[0];
	      attr = nameElements[1];

	      if (attr[0] === '$') {
	        throw this.error('Attribute can\'t start with "$"');
	      }
	    } else {
	      attr = null;
	    }

	    this.setEntityValue(name, attr, key, this.unescapeString(value), entries);
	  },

	  setEntityValue: function (id, attr, key, rawValue, entries) {
	    var value = rawValue.indexOf('{{') > -1 ? this.parseString(rawValue) : rawValue;

	    var isSimpleValue = typeof value === 'string';
	    var root = entries;

	    var isSimpleNode = typeof entries[id] === 'string';

	    if (!entries[id] && (attr || key || !isSimpleValue)) {
	      entries[id] = Object.create(null);
	      isSimpleNode = false;
	    }

	    if (attr) {
	      if (isSimpleNode) {
	        var val = entries[id];
	        entries[id] = Object.create(null);
	        entries[id].value = val;
	      }
	      if (!entries[id].attrs) {
	        entries[id].attrs = Object.create(null);
	      }
	      if (!entries[id].attrs && !isSimpleValue) {
	        entries[id].attrs[attr] = Object.create(null);
	      }
	      root = entries[id].attrs;
	      id = attr;
	    }

	    if (key) {
	      isSimpleNode = false;
	      if (typeof root[id] === 'string') {
	        var val = root[id];
	        root[id] = Object.create(null);
	        root[id].index = this.parseIndex(val);
	        root[id].value = Object.create(null);
	      }
	      root = root[id].value;
	      id = key;
	      isSimpleValue = true;
	    }

	    if (isSimpleValue && (!entries[id] || isSimpleNode)) {
	      if (id in root) {
	        throw this.error();
	      }
	      root[id] = value;
	    } else {
	      if (!root[id]) {
	        root[id] = Object.create(null);
	      }
	      root[id].value = value;
	    }
	  },

	  parseString: function (str) {
	    var chunks = str.split(this.patterns.placeables);
	    var complexStr = [];

	    var len = chunks.length;
	    var placeablesCount = (len - 1) / 2;

	    if (placeablesCount >= MAX_PLACEABLES) {
	      throw this.error('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES + ')');
	    }

	    for (var i = 0; i < chunks.length; i++) {
	      if (chunks[i].length === 0) {
	        continue;
	      }
	      if (i % 2 === 1) {
	        complexStr.push({ type: 'idOrVar', name: chunks[i] });
	      } else {
	        complexStr.push(chunks[i]);
	      }
	    }
	    return complexStr;
	  },

	  unescapeString: function (str) {
	    if (str.lastIndexOf('\\') !== -1) {
	      str = str.replace(this.patterns.controlChars, '$1');
	    }
	    return str.replace(this.patterns.unicode, function (match, token) {
	      return String.fromCodePoint(parseInt(token, 16));
	    });
	  },

	  parseIndex: function (str) {
	    var match = str.match(this.patterns.index);
	    if (!match) {
	      throw new _errors.L10nError('Malformed index');
	    }
	    if (match[2]) {
	      return [{
	        type: 'call',
	        expr: {
	          type: 'prop',
	          expr: {
	            type: 'glob',
	            name: 'cldr'
	          },
	          prop: 'plural',
	          cmpt: false
	        }, args: [{
	          type: 'idOrVar',
	          name: match[2]
	        }]
	      }];
	    } else {
	      return [{ type: 'idOrVar', name: match[1] }];
	    }
	  },

	  error: function (msg) {
	    var type = arguments.length <= 1 || arguments[1] === undefined ? 'parsererror' : arguments[1];

	    var err = new _errors.L10nError(msg);
	    if (this.emit) {
	      this.emit(type, err);
	    }
	    return err;
	  }
	};
	module.exports = exports.default;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _errors = __webpack_require__(2);

	var MAX_PLACEABLES = 100;

	exports.default = {
	  parse: function (emit, string) {
	    this._source = string;
	    this._index = 0;
	    this._length = string.length;
	    this.entries = Object.create(null);
	    this.emit = emit;

	    return this.getResource();
	  },

	  getResource: function () {
	    this.getWS();
	    while (this._index < this._length) {
	      try {
	        this.getEntry();
	      } catch (e) {
	        if (e instanceof _errors.L10nError) {
	          this.getJunkEntry();
	          if (!this.emit) {
	            throw e;
	          }
	        } else {
	          throw e;
	        }
	      }

	      if (this._index < this._length) {
	        this.getWS();
	      }
	    }

	    return this.entries;
	  },

	  getEntry: function () {
	    if (this._source[this._index] === '<') {
	      ++this._index;
	      var id = this.getIdentifier();
	      if (this._source[this._index] === '[') {
	        ++this._index;
	        return this.getEntity(id, this.getItemList(this.getExpression, ']'));
	      }
	      return this.getEntity(id);
	    }

	    if (this._source.startsWith('/*', this._index)) {
	      return this.getComment();
	    }

	    throw this.error('Invalid entry');
	  },

	  getEntity: function (id, index) {
	    if (!this.getRequiredWS()) {
	      throw this.error('Expected white space');
	    }

	    var ch = this._source[this._index];
	    var value = this.getValue(ch, index === undefined);
	    var attrs = undefined;

	    if (value === undefined) {
	      if (ch === '>') {
	        throw this.error('Expected ">"');
	      }
	      attrs = this.getAttributes();
	    } else {
	      var ws1 = this.getRequiredWS();
	      if (this._source[this._index] !== '>') {
	        if (!ws1) {
	          throw this.error('Expected ">"');
	        }
	        attrs = this.getAttributes();
	      }
	    }

	    ++this._index;

	    if (id in this.entries) {
	      throw this.error('Duplicate entry ID "' + id, 'duplicateerror');
	    }
	    if (!attrs && !index && typeof value === 'string') {
	      this.entries[id] = value;
	    } else {
	      this.entries[id] = {
	        value: value,
	        attrs: attrs,
	        index: index
	      };
	    }
	  },

	  getValue: function () {
	    var ch = arguments.length <= 0 || arguments[0] === undefined ? this._source[this._index] : arguments[0];
	    var optional = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

	    switch (ch) {
	      case '\'':
	      case '"':
	        return this.getString(ch, 1);
	      case '{':
	        return this.getHash();
	    }

	    if (!optional) {
	      throw this.error('Unknown value type');
	    }

	    return;
	  },

	  getWS: function () {
	    var cc = this._source.charCodeAt(this._index);

	    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
	      cc = this._source.charCodeAt(++this._index);
	    }
	  },

	  getRequiredWS: function () {
	    var pos = this._index;
	    var cc = this._source.charCodeAt(pos);

	    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
	      cc = this._source.charCodeAt(++this._index);
	    }
	    return this._index !== pos;
	  },

	  getIdentifier: function () {
	    var start = this._index;
	    var cc = this._source.charCodeAt(this._index);

	    if (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || cc === 95) {
	      cc = this._source.charCodeAt(++this._index);
	    } else {
	      throw this.error('Identifier has to start with [a-zA-Z_]');
	    }

	    while (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || cc >= 48 && cc <= 57 || cc === 95) {
	      cc = this._source.charCodeAt(++this._index);
	    }

	    return this._source.slice(start, this._index);
	  },

	  getUnicodeChar: function () {
	    for (var i = 0; i < 4; i++) {
	      var cc = this._source.charCodeAt(++this._index);
	      if (cc > 96 && cc < 103 || cc > 64 && cc < 71 || cc > 47 && cc < 58) {
	        continue;
	      }
	      throw this.error('Illegal unicode escape sequence');
	    }
	    this._index++;
	    return String.fromCharCode(parseInt(this._source.slice(this._index - 4, this._index), 16));
	  },

	  stringRe: /"|'|{{|\\/g,
	  getString: function (opchar, opcharLen) {
	    var body = [];
	    var placeables = 0;

	    this._index += opcharLen;
	    var start = this._index;

	    var bufStart = start;
	    var buf = '';

	    while (true) {
	      this.stringRe.lastIndex = this._index;
	      var match = this.stringRe.exec(this._source);

	      if (!match) {
	        throw this.error('Unclosed string literal');
	      }

	      if (match[0] === '"' || match[0] === '\'') {
	        if (match[0] !== opchar) {
	          this._index += opcharLen;
	          continue;
	        }
	        this._index = match.index + opcharLen;
	        break;
	      }

	      if (match[0] === '{{') {
	        if (placeables > MAX_PLACEABLES - 1) {
	          throw this.error('Too many placeables, maximum allowed is ' + MAX_PLACEABLES);
	        }
	        placeables++;
	        if (match.index > bufStart || buf.length > 0) {
	          body.push(buf + this._source.slice(bufStart, match.index));
	          buf = '';
	        }
	        this._index = match.index + 2;
	        this.getWS();
	        body.push(this.getExpression());
	        this.getWS();
	        this._index += 2;
	        bufStart = this._index;
	        continue;
	      }

	      if (match[0] === '\\') {
	        this._index = match.index + 1;
	        var ch2 = this._source[this._index];
	        if (ch2 === 'u') {
	          buf += this._source.slice(bufStart, match.index) + this.getUnicodeChar();
	        } else if (ch2 === opchar || ch2 === '\\') {
	          buf += this._source.slice(bufStart, match.index) + ch2;
	          this._index++;
	        } else if (this._source.startsWith('{{', this._index)) {
	          buf += this._source.slice(bufStart, match.index) + '{{';
	          this._index += 2;
	        } else {
	          throw this.error('Illegal escape sequence');
	        }
	        bufStart = this._index;
	      }
	    }

	    if (body.length === 0) {
	      return buf + this._source.slice(bufStart, this._index - opcharLen);
	    }

	    if (this._index - opcharLen > bufStart || buf.length > 0) {
	      body.push(buf + this._source.slice(bufStart, this._index - opcharLen));
	    }

	    return body;
	  },

	  getAttributes: function () {
	    var attrs = Object.create(null);

	    while (true) {
	      this.getAttribute(attrs);
	      var ws1 = this.getRequiredWS();
	      var ch = this._source.charAt(this._index);
	      if (ch === '>') {
	        break;
	      } else if (!ws1) {
	        throw this.error('Expected ">"');
	      }
	    }
	    return attrs;
	  },

	  getAttribute: function (attrs) {
	    var key = this.getIdentifier();
	    var index = undefined;

	    if (this._source[this._index] === '[') {
	      ++this._index;
	      this.getWS();
	      index = this.getItemList(this.getExpression, ']');
	    }
	    this.getWS();
	    if (this._source[this._index] !== ':') {
	      throw this.error('Expected ":"');
	    }
	    ++this._index;
	    this.getWS();
	    var value = this.getValue();

	    if (key in attrs) {
	      throw this.error('Duplicate attribute "' + key, 'duplicateerror');
	    }

	    if (!index && typeof value === 'string') {
	      attrs[key] = value;
	    } else {
	      attrs[key] = {
	        value: value,
	        index: index
	      };
	    }
	  },

	  getHash: function () {
	    var items = Object.create(null);

	    ++this._index;
	    this.getWS();

	    var defKey = undefined;

	    while (true) {
	      var _getHashItem = this.getHashItem();

	      var key = _getHashItem[0];
	      var value = _getHashItem[1];
	      var def = _getHashItem[2];

	      items[key] = value;

	      if (def) {
	        if (defKey) {
	          throw this.error('Default item redefinition forbidden');
	        }
	        defKey = key;
	      }
	      this.getWS();

	      var comma = this._source[this._index] === ',';
	      if (comma) {
	        ++this._index;
	        this.getWS();
	      }
	      if (this._source[this._index] === '}') {
	        ++this._index;
	        break;
	      }
	      if (!comma) {
	        throw this.error('Expected "}"');
	      }
	    }

	    if (defKey) {
	      items.__default = defKey;
	    }

	    return items;
	  },

	  getHashItem: function () {
	    var defItem = false;
	    if (this._source[this._index] === '*') {
	      ++this._index;
	      defItem = true;
	    }

	    var key = this.getIdentifier();
	    this.getWS();
	    if (this._source[this._index] !== ':') {
	      throw this.error('Expected ":"');
	    }
	    ++this._index;
	    this.getWS();

	    return [key, this.getValue(), defItem];
	  },

	  getComment: function () {
	    this._index += 2;
	    var start = this._index;
	    var end = this._source.indexOf('*/', start);

	    if (end === -1) {
	      throw this.error('Comment without a closing tag');
	    }

	    this._index = end + 2;
	  },

	  getExpression: function () {
	    var exp = this.getPrimaryExpression();

	    while (true) {
	      var ch = this._source[this._index];
	      if (ch === '.' || ch === '[') {
	        ++this._index;
	        exp = this.getPropertyExpression(exp, ch === '[');
	      } else if (ch === '(') {
	        ++this._index;
	        exp = this.getCallExpression(exp);
	      } else {
	        break;
	      }
	    }

	    return exp;
	  },

	  getPropertyExpression: function (idref, computed) {
	    var exp = undefined;

	    if (computed) {
	      this.getWS();
	      exp = this.getExpression();
	      this.getWS();
	      if (this._source[this._index] !== ']') {
	        throw this.error('Expected "]"');
	      }
	      ++this._index;
	    } else {
	      exp = this.getIdentifier();
	    }

	    return {
	      type: 'prop',
	      expr: idref,
	      prop: exp,
	      cmpt: computed
	    };
	  },

	  getCallExpression: function (callee) {
	    this.getWS();

	    return {
	      type: 'call',
	      expr: callee,
	      args: this.getItemList(this.getExpression, ')')
	    };
	  },

	  getPrimaryExpression: function () {
	    var ch = this._source[this._index];

	    switch (ch) {
	      case '$':
	        ++this._index;
	        return {
	          type: 'var',
	          name: this.getIdentifier()
	        };
	      case '@':
	        ++this._index;
	        return {
	          type: 'glob',
	          name: this.getIdentifier()
	        };
	      default:
	        return {
	          type: 'id',
	          name: this.getIdentifier()
	        };
	    }
	  },

	  getItemList: function (callback, closeChar) {
	    var items = [];
	    var closed = false;

	    this.getWS();

	    if (this._source[this._index] === closeChar) {
	      ++this._index;
	      closed = true;
	    }

	    while (!closed) {
	      items.push(callback.call(this));
	      this.getWS();
	      var ch = this._source.charAt(this._index);
	      switch (ch) {
	        case ',':
	          ++this._index;
	          this.getWS();
	          break;
	        case closeChar:
	          ++this._index;
	          closed = true;
	          break;
	        default:
	          throw this.error('Expected "," or "' + closeChar + '"');
	      }
	    }

	    return items;
	  },

	  getJunkEntry: function () {
	    var pos = this._index;
	    var nextEntity = this._source.indexOf('<', pos);
	    var nextComment = this._source.indexOf('/*', pos);

	    if (nextEntity === -1) {
	      nextEntity = this._length;
	    }
	    if (nextComment === -1) {
	      nextComment = this._length;
	    }

	    var nextEntry = Math.min(nextEntity, nextComment);

	    this._index = nextEntry;
	  },

	  error: function (message) {
	    var type = arguments.length <= 1 || arguments[1] === undefined ? 'parsererror' : arguments[1];

	    var pos = this._index;

	    var start = this._source.lastIndexOf('<', pos - 1);
	    var lastClose = this._source.lastIndexOf('>', pos - 1);
	    start = lastClose > start ? lastClose + 1 : start;
	    var context = this._source.slice(start, pos + 10);

	    var msg = message + ' at pos ' + pos + ': `' + context + '`';
	    var err = new _errors.L10nError(msg);
	    if (this.emit) {
	      this.emit(type, err);
	    }
	    return err;
	  }
	};
	module.exports = exports.default;

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.walkEntry = walkEntry;
	exports.walkValue = walkValue;

	function walkEntry(entry, fn) {
	  if (typeof entry === 'string') {
	    return fn(entry);
	  }

	  var newEntry = Object.create(null);

	  if (entry.value) {
	    newEntry.value = walkValue(entry.value, fn);
	  }

	  if (entry.index) {
	    newEntry.index = entry.index;
	  }

	  if (entry.attrs) {
	    newEntry.attrs = Object.create(null);
	    for (var key in entry.attrs) {
	      newEntry.attrs[key] = walkEntry(entry.attrs[key], fn);
	    }
	  }

	  return newEntry;
	}

	function walkValue(value, fn) {
	  if (typeof value === 'string') {
	    return fn(value);
	  }

	  if (value.type) {
	    return value;
	  }

	  var newValue = Array.isArray(value) ? [] : Object.create(null);
	  var keys = Object.keys(value);

	  for (var i = 0, key = undefined; key = keys[i]; i++) {
	    newValue[key] = walkValue(value[key], fn);
	  }

	  return newValue;
	}

	function createGetter(id, name) {
	  var _pseudo = null;

	  return function getPseudo() {
	    if (_pseudo) {
	      return _pseudo;
	    }

	    var reAlphas = /[a-zA-Z]/g;
	    var reVowels = /[aeiouAEIOU]/g;
	    var reWords = /[^\W0-9_]+/g;

	    var reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;

	    var charMaps = {
	      'qps-ploc': 'ȦƁƇḒḖƑƓĦĪ' + 'ĴĶĿḾȠǾƤɊŘ' + 'ŞŦŬṼẆẊẎẐ' + '[\\]^_`' + 'ȧƀƈḓḗƒɠħī' + 'ĵķŀḿƞǿƥɋř' + 'şŧŭṽẇẋẏẑ',

	      'qps-plocm': '∀ԐↃpƎɟפHIſ' + 'Ӽ˥WNOԀÒᴚS⊥∩Ʌ' + 'ＭXʎZ' + '[\\]ᵥ_,' + 'ɐqɔpǝɟƃɥıɾ' + 'ʞʅɯuodbɹsʇnʌʍxʎz'
	    };

	    var mods = {
	      'qps-ploc': function (val) {
	        return val.replace(reVowels, function (match) {
	          return match + match.toLowerCase();
	        });
	      },

	      'qps-plocm': function (val) {
	        return val.replace(reWords, function (match) {
	          return '‮' + match + '‬';
	        });
	      }
	    };

	    var replaceChars = function (map, val) {
	      return val.replace(reAlphas, function (match) {
	        return map.charAt(match.charCodeAt(0) - 65);
	      });
	    };

	    var tranform = function (val) {
	      return replaceChars(charMaps[id], mods[id](val));
	    };

	    var apply = function (fn, val) {
	      if (!val) {
	        return val;
	      }

	      var parts = val.split(reExcluded);
	      var modified = parts.map(function (part) {
	        if (reExcluded.test(part)) {
	          return part;
	        }
	        return fn(part);
	      });
	      return modified.join('');
	    };

	    return _pseudo = {
	      translate: function (val) {
	        return apply(tranform, val);
	      },
	      name: tranform(name)
	    };
	  };
	}

	var qps = Object.defineProperties(Object.create(null), {
	  'qps-ploc': {
	    enumerable: true,
	    get: createGetter('qps-ploc', 'Runtime Accented')
	  },
	  'qps-plocm': {
	    enumerable: true,
	    get: createGetter('qps-plocm', 'Runtime Mirrored')
	  }
	});
	exports.qps = qps;

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.emit = emit;
	exports.addEventListener = addEventListener;
	exports.removeEventListener = removeEventListener;

	function emit(listeners) {
	  var _this = this;

	  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	    args[_key - 1] = arguments[_key];
	  }

	  var type = args.shift();

	  if (listeners['*']) {
	    listeners['*'].slice().forEach(function (listener) {
	      return listener.apply(_this, args);
	    });
	  }

	  if (listeners[type]) {
	    listeners[type].slice().forEach(function (listener) {
	      return listener.apply(_this, args);
	    });
	  }
	}

	function addEventListener(listeners, type, listener) {
	  if (!(type in listeners)) {
	    listeners[type] = [];
	  }
	  listeners[type].push(listener);
	}

	function removeEventListener(listeners, type, listener) {
	  var typeListeners = listeners[type];
	  var pos = typeListeners.indexOf(listener);
	  if (pos === -1) {
	    return;
	  }

	  typeListeners.splice(pos, 1);
	}

/***/ }
/******/ ]);
},{}],10:[function(require,module,exports){
/*! http://mths.be/endswith v0.2.0 by @mathias */
if (!String.prototype.endsWith) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var toString = {}.toString;
		var endsWith = function(search) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			if (search && toString.call(search) == '[object RegExp]') {
				throw TypeError();
			}
			var stringLength = string.length;
			var searchString = String(search);
			var searchLength = searchString.length;
			var pos = stringLength;
			if (arguments.length > 1) {
				var position = arguments[1];
				if (position !== undefined) {
					// `ToInteger`
					pos = position ? Number(position) : 0;
					if (pos != pos) { // better `isNaN`
						pos = 0;
					}
				}
			}
			var end = Math.min(Math.max(pos, 0), stringLength);
			var start = end - searchLength;
			if (start < 0) {
				return false;
			}
			var index = -1;
			while (++index < searchLength) {
				if (string.charCodeAt(start + index) != searchString.charCodeAt(index)) {
					return false;
				}
			}
			return true;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'endsWith', {
				'value': endsWith,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.endsWith = endsWith;
		}
	}());
}

},{}],11:[function(require,module,exports){
/*! https://mths.be/includes v0.2.0 by @mathias */
if (!String.prototype.includes) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var toString = {}.toString;
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var indexOf = ''.indexOf;
		var includes = function(search) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			if (search && toString.call(search) == '[object RegExp]') {
				throw TypeError();
			}
			var stringLength = string.length;
			var searchString = String(search);
			var searchLength = searchString.length;
			var position = arguments.length > 1 ? arguments[1] : undefined;
			// `ToInteger`
			var pos = position ? Number(position) : 0;
			if (pos != pos) { // better `isNaN`
				pos = 0;
			}
			var start = Math.min(Math.max(pos, 0), stringLength);
			// Avoid the `indexOf` call if no match is possible
			if (searchLength + start > stringLength) {
				return false;
			}
			return indexOf.call(string, searchString, pos) != -1;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'includes', {
				'value': includes,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.includes = includes;
		}
	}());
}

},{}],12:[function(require,module,exports){
/*! http://mths.be/startswith v0.2.0 by @mathias */
if (!String.prototype.startsWith) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var toString = {}.toString;
		var startsWith = function(search) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			if (search && toString.call(search) == '[object RegExp]') {
				throw TypeError();
			}
			var stringLength = string.length;
			var searchString = String(search);
			var searchLength = searchString.length;
			var position = arguments.length > 1 ? arguments[1] : undefined;
			// `ToInteger`
			var pos = position ? Number(position) : 0;
			if (pos != pos) { // better `isNaN`
				pos = 0;
			}
			var start = Math.min(Math.max(pos, 0), stringLength);
			// Avoid the `indexOf` call if no match is possible
			if (searchLength + start > stringLength) {
				return false;
			}
			var index = -1;
			while (++index < searchLength) {
				if (string.charCodeAt(start + index) != searchString.charCodeAt(index)) {
					return false;
				}
			}
			return true;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'startsWith', {
				'value': startsWith,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.startsWith = startsWith;
		}
	}());
}

},{}],13:[function(require,module,exports){
/*!
 * string_score.js: String Scoring Algorithm 0.1.22
 *
 * http://joshaven.com/string_score
 * https://github.com/joshaven/string_score
 *
 * Copyright (C) 2009-2014 Joshaven Potter <yourtech@gmail.com>
 * Special thanks to all of the contributors listed here https://github.com/joshaven/string_score
 * MIT License: http://opensource.org/licenses/MIT
 *
 * Date: Tue Mar 1 2011
 * Updated: Tue Mar 10 2015
*/

/*jslint nomen:true, white:true, browser:true,devel:true */

/**
 * Scores a string against another string.
 *    'Hello World'.score('he');         //=> 0.5931818181818181
 *    'Hello World'.score('Hello');    //=> 0.7318181818181818
 */
String.prototype.score = function (word, fuzziness) {
  'use strict';

  // If the string is equal to the word, perfect match.
  if (this === word) { return 1; }

  //if it's not a perfect match and is empty return 0
  if (word === "") { return 0; }

  var runningScore = 0,
      charScore,
      finalScore,
      string = this,
      lString = string.toLowerCase(),
      strLength = string.length,
      lWord = word.toLowerCase(),
      wordLength = word.length,
      idxOf,
      startAt = 0,
      fuzzies = 1,
      fuzzyFactor,
      i;

  // Cache fuzzyFactor for speed increase
  if (fuzziness) { fuzzyFactor = 1 - fuzziness; }

  // Walk through word and add up scores.
  // Code duplication occurs to prevent checking fuzziness inside for loop
  if (fuzziness) {
    for (i = 0; i < wordLength; i+=1) {

      // Find next first case-insensitive match of a character.
      idxOf = lString.indexOf(lWord[i], startAt);

      if (idxOf === -1) {
        fuzzies += fuzzyFactor;
      } else {
        if (startAt === idxOf) {
          // Consecutive letter & start-of-string Bonus
          charScore = 0.7;
        } else {
          charScore = 0.1;

          // Acronym Bonus
          // Weighing Logic: Typing the first character of an acronym is as if you
          // preceded it with two perfect character matches.
          if (string[idxOf - 1] === ' ') { charScore += 0.8; }
        }

        // Same case bonus.
        if (string[idxOf] === word[i]) { charScore += 0.1; }

        // Update scores and startAt position for next round of indexOf
        runningScore += charScore;
        startAt = idxOf + 1;
      }
    }
  } else {
    for (i = 0; i < wordLength; i+=1) {
      idxOf = lString.indexOf(lWord[i], startAt);
      if (-1 === idxOf) { return 0; }

      if (startAt === idxOf) {
        charScore = 0.7;
      } else {
        charScore = 0.1;
        if (string[idxOf - 1] === ' ') { charScore += 0.8; }
      }
      if (string[idxOf] === word[i]) { charScore += 0.1; }
      runningScore += charScore;
      startAt = idxOf + 1;
    }
  }

  // Reduce penalty for longer strings.
  finalScore = 0.5 * (runningScore / strLength    + runningScore / wordLength) / fuzzies;

  if ((lWord[0] === lString[0]) && (finalScore < 0.85)) {
    finalScore += 0.15;
  }

  return finalScore;
};

},{}],14:[function(require,module,exports){
/* global navigator */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _display = require('./display');

var _display2 = _interopRequireDefault(_display);

var _storesApp = require('../stores/app');

var _storesApp2 = _interopRequireDefault(_storesApp);

var _storesFirstTimeUse = require('../stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _libGrammarTools = require('../lib/grammar-tools');

var _libGrammarTools2 = _interopRequireDefault(_libGrammarTools);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var debug = (0, _debug2['default'])('AppActions');

var AppActions = (function () {
  function AppActions() {
    _classCallCheck(this, AppActions);
  }

  _createClass(AppActions, null, [{
    key: 'handleFirstTimeUseChange',

    /**
     * Hides first time use component
     */
    value: function handleFirstTimeUseChange() {
      debug('handleFirstTimeUseChange');

      var tourInfo = _storesFirstTimeUse2['default'].getTourInfo();

      if (tourInfo.inFlight) {
        if (tourInfo.current === 0) {
          _display2['default'].changeViews(null);
        }
      }
    }

    /**
     * Builds dynamic grammar
     */
  }, {
    key: 'buildDynamicGrammar',
    value: function buildDynamicGrammar() {
      debug('buildDynamicGrammar');

      this.buildAppsGrammar();
      this.buildContactsGrammar();
    }

    /**
     * Builds apps grammar
     */
  }, {
    key: 'buildAppsGrammar',
    value: function buildAppsGrammar() {
      debug('buildAppsGrammar');

      if (!navigator.mozApps || !navigator.mozApps.mgmt) {
        debug('buildAppsGrammar', 'navigator.mozApps not found');
        return;
      }

      var allApps = navigator.mozApps.mgmt.getAll();

      allApps.onsuccess = function () {
        var priorityLocale = _libLocalizer2['default'].getPriorityLocale();
        var priorityLang = _libLocalizer2['default'].getPriorityLang();

        var appNames = allApps.result.filter(function (app) {
          if (!app.manifest || app.manifest.hasOwnProperty('role') || app.manifest.name === 'Communications' || app.manifest.name === 'Vaani') {
            return false;
          }

          return true;
        }).map(function (app) {
          var appName = app.manifest.name;

          if (app.manifest.locales) {
            if (app.manifest.locales.hasOwnProperty(priorityLocale) && app.manifest.locales[priorityLocale].hasOwnProperty('name')) {
              appName = app.manifest.locales[priorityLocale].name;
            } else if (app.manifest.locales.hasOwnProperty(priorityLang) && app.manifest.locales[priorityLang].hasOwnProperty('name')) {
              appName = app.manifest.locales[priorityLang].name;
            }
          }

          return _libGrammarTools2['default'].clean(appName);
        });

        var appsGrammar = appNames.join(' | ').toLocaleLowerCase();

        _storesApp2['default'].updateAppsGrammar(appsGrammar);

        debug('buildAppsGrammar:appsGrammar', appsGrammar);
      };
    }

    /**
     * Builds contacts grammar
     */
  }, {
    key: 'buildContactsGrammar',
    value: function buildContactsGrammar() {
      debug('buildContactsGrammar');

      if (!navigator.mozContacts) {
        debug('buildContactsGrammar', 'navigator.mozContacts not found');
        return;
      }

      var contacts = [];
      var request = navigator.mozContacts.getAll();

      request.onsuccess = function () {
        if (this.result) {
          if (this.result.tel.length > 0 && this.result.name.length > 0 && this.result.category && this.result.category.includes('favorite')) {

            contacts.push(this.result);
          }

          // trigger request.onsuccess again with a new result
          this['continue']();
        } else {
          var uniqueNames = {};

          contacts.forEach(function (contact) {
            var name = _libGrammarTools2['default'].clean(contact.name[0]);
            var nameParts = name.split(' ');

            nameParts.forEach(function (part) {
              uniqueNames[part] = true;
            });

            uniqueNames[name] = true;
          });

          var names = Object.keys(uniqueNames);
          var contactsGrammar = names.join(' | ').toLocaleLowerCase();

          _storesApp2['default'].updateContacts(contacts);
          _storesApp2['default'].updateContactsGrammar(contactsGrammar);

          debug('buildContactsGrammar:contacts', contacts);
          debug('buildContactsGrammar:contactsGrammar', contactsGrammar);
        }
      };
    }
  }]);

  return AppActions;
})();

exports['default'] = AppActions;
module.exports = exports['default'];

},{"../lib/grammar-tools":35,"../lib/localizer":36,"../stores/app":38,"../stores/first-time-use":42,"./display":17,"debug":1}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesCallContact = require('../stores/call-contact');

var _storesCallContact2 = _interopRequireDefault(_storesCallContact);

var _libDialer = require('../lib/dialer');

var _libDialer2 = _interopRequireDefault(_libDialer);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _libVaani = require('../lib/vaani');

var _libVaani2 = _interopRequireDefault(_libVaani);

var _display = require('./display');

var _display2 = _interopRequireDefault(_display);

var _talkie = require('./talkie');

var _talkie2 = _interopRequireDefault(_talkie);

require('string.prototype.includes');

var debug = (0, _debug2['default'])('CallContactActions');

var CallContactActions = (function () {
  function CallContactActions() {
    _classCallCheck(this, CallContactActions);
  }

  _createClass(CallContactActions, null, [{
    key: 'setupSpeech',

    /**
     * Initializes a Vaani instance
     */
    value: function setupSpeech(callback) {
      var _this = this;

      debug('setupSpeech');

      _libLocalizer2['default'].resolve(['general__yesCommand', 'general__noCommand']).then(function (entities) {
        var yesCommand = entities[0].value;
        var noCommand = entities[1].value;
        var grammar = '\n          #JSGF v1.0;\n          grammar fxosVoiceCommands;\n          public <simple> =\n            ' + yesCommand + ' | ' + noCommand + '\n          ;\n      ';

        _this.vaani = new _libVaani2['default']({
          grammar: grammar,
          interpreter: _this._interpreter.bind(_this),
          onSay: _this._onSay.bind(_this),
          onSayDone: _this._onSayDone.bind(_this),
          onListen: _this._onListen.bind(_this),
          onListenDone: _this._onListenDone.bind(_this)
        });

        callback();
      });
    }

    /**
     * Asks the user to confirm the contact and waits for a response
     */
  }, {
    key: 'confirmContact',
    value: function confirmContact() {
      var _this2 = this;

      debug('confirmContact');

      var contact = _storesCallContact2['default'].getContact();
      debug('confirmContact:contact', contact);
      var args = {
        contactName: contact && contact.name && contact.name[0] || undefined
      };

      _libLocalizer2['default'].resolve('callContact__doYouWantMeToCall', args).then(function (entity) {
        _storesCallContact2['default'].updateText(entity.value);

        _this2.vaani.say(entity.attrs.spoken, true);
      });
    }

    /**
     * Interprets the result of speech recognition
     * @param err {Error|null} An error if speech was not understood
     * @param command {String} Text returned from the speech recognition
     * @private
     */
  }, {
    key: '_interpreter',
    value: function _interpreter(err, command) {
      var _this3 = this;

      debug('_interpreter', arguments);

      _talkie2['default'].setActiveAnimation('none');

      if (err) {
        debug('_interpreter error', err);

        _libLocalizer2['default'].resolve('general__iDidntUnderstandSayAgain').then(function (entity) {
          _storesCallContact2['default'].updateText(entity.value);

          _this3.vaani.say(entity.attrs.spoken, true);
        });

        return;
      }

      _libLocalizer2['default'].resolve(['general__yesCommand', 'general__noCommand', 'general__ok', 'general__iWasntAbleToUnderstand', 'callContact__iWasntAbleToCall']).then(function (entities) {
        var yesCommand = entities[0].value;
        var noCommand = entities[1].value;
        var ok = entities[2];
        var iWasntAbleToUnderstand = entities[3];
        var iWasntAbleToCall = entities[4];

        if (command.includes(yesCommand)) {
          var contact = _storesCallContact2['default'].getContact();

          debug('dialing', contact.tel[0].value);

          _libDialer2['default'].dial(contact.tel[0].value, function (err, call) {
            if (err) {
              debug('Dialer error', err);

              _this3.vaani.say(iWasntAbleToCall.attrs.spoken);

              return;
            }

            call.onstatechange = function (event) {
              debug('call state changed', event);

              if (call.state === 'disconnected') {
                _display2['default'].changeViews(null);
              }
            };
          });
        } else if (command.includes(noCommand)) {
          _this3.vaani.say(ok.attrs.spoken);

          _display2['default'].changeViews(null);
        } else {
          debug('Unable to match interpretation');

          _this3.vaani.say(iWasntAbleToUnderstand.attrs.spoken);
        }
      });
    }

    /**
     * A hook that's fired when Vaani's say function is called
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSay',
    value: function _onSay(sentence, waitForResponse) {
      debug('_onSay', arguments);

      _talkie2['default'].setActiveAnimation('sending');
      _talkie2['default'].setMode('none');
    }

    /**
     * A hook that's fired when Vaani's say function is finished
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSayDone',
    value: function _onSayDone(sentence, waitForResponse) {
      if (!waitForResponse) {
        _talkie2['default'].setActiveAnimation('none');
      }
    }

    /**
     * A hook that's fired when Vaani's listen function is called
     * @private
     */
  }, {
    key: '_onListen',
    value: function _onListen() {
      debug('_onListen');

      _talkie2['default'].setActiveAnimation('receiving');
    }

    /**
     * A hook that's fired when Vaani's listen function is finished
     * @private
     */
  }, {
    key: '_onListenDone',
    value: function _onListenDone() {}

    /**
     * The action that handles mic toggles
     */
  }, {
    key: 'toggleMic',
    value: function toggleMic() {
      debug('toggleMic');

      if (this.vaani.isSpeaking || this.vaani.isListening) {
        this.vaani.cancel();

        _storesCallContact2['default'].updateContact(undefined);
        _storesCallContact2['default'].updateText('');

        _talkie2['default'].setActiveAnimation('none');
        _talkie2['default'].setMode('none');

        _display2['default'].changeViews(null);

        return;
      }

      this.confirmContact();
    }
  }]);

  return CallContactActions;
})();

exports['default'] = CallContactActions;
module.exports = exports['default'];

},{"../lib/dialer":34,"../lib/localizer":36,"../lib/vaani":37,"../stores/call-contact":39,"./display":17,"./talkie":20,"debug":1,"string.prototype.includes":11}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesCallNumber = require('../stores/call-number');

var _storesCallNumber2 = _interopRequireDefault(_storesCallNumber);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _libVaani = require('../lib/vaani');

var _libVaani2 = _interopRequireDefault(_libVaani);

var _libDialer = require('../lib/dialer');

var _libDialer2 = _interopRequireDefault(_libDialer);

var _display = require('./display');

var _display2 = _interopRequireDefault(_display);

var _talkie = require('./talkie');

var _talkie2 = _interopRequireDefault(_talkie);

var debug = (0, _debug2['default'])('CallNumberActions');

var CallNumberActions = (function () {
  function CallNumberActions() {
    _classCallCheck(this, CallNumberActions);
  }

  _createClass(CallNumberActions, null, [{
    key: 'setupSpeech',

    /**
     * Initializes a Vaani instance
     */
    value: function setupSpeech(callback) {
      var _this = this;

      debug('setupSpeech');

      _libLocalizer2['default'].resolve(['general__yesCommand', 'general__noCommand']).then(function (entities) {
        var yesCommand = entities[0].value;
        var noCommand = entities[1].value;
        var grammar = '\n          #JSGF v1.0;\n          grammar fxosVoiceCommands;\n          public <simple> =\n            ' + yesCommand + ' | ' + noCommand + '\n          ;\n      ';

        _this.vaani = new _libVaani2['default']({
          grammar: grammar,
          interpreter: _this._interpreter.bind(_this),
          onSay: _this._onSay.bind(_this),
          onSayDone: _this._onSayDone.bind(_this),
          onListen: _this._onListen.bind(_this),
          onListenDone: _this._onListenDone.bind(_this)
        });

        callback();
      });
    }

    /**
     * Asks the user to confirm the number and waits for a response
     */
  }, {
    key: 'confirmNumber',
    value: function confirmNumber() {
      var _this2 = this;

      debug('confirmNumber');

      var phoneNumber = _storesCallNumber2['default'].getPhoneNumber();
      var args = {
        number: phoneNumber,
        numberSpaced: phoneNumber.replace(/(\d)(?=\d)/g, '$1 ')
      };

      _libLocalizer2['default'].resolve('callNumber__doYouWantMeToCall', args).then(function (entity) {
        _storesCallNumber2['default'].updateText(entity.value);

        _this2.vaani.say(entity.attrs.spoken, true);
      });
    }

    /**
     * Interprets the result of speech recognition
     * @param err {Error|null} An error if speech was not understood
     * @param command {String} Text returned from the speech recognition
     * @private
     */
  }, {
    key: '_interpreter',
    value: function _interpreter(err, command) {
      var _this3 = this;

      debug('_interpreter', arguments);

      _talkie2['default'].setActiveAnimation('none');

      if (err) {
        debug('_interpreter error', err);

        _libLocalizer2['default'].resolve('general__iDidntUnderstandSayAgain').then(function (entity) {
          _storesCallNumber2['default'].updateText(entity.value);

          _this3.vaani.say(entity.attrs.spoken, true);
        });

        return;
      }

      _libLocalizer2['default'].resolve(['general__yesCommand', 'general__noCommand', 'general__ok', 'general__iWasntAbleToUnderstand', 'callNumber__iWasntAbleToCall']).then(function (entities) {
        var yesCommand = entities[0].value;
        var noCommand = entities[1].value;
        var ok = entities[2];
        var iWasntAbleToUnderstand = entities[3];
        var iWasntAbleToCall = entities[4];

        if (command.includes(yesCommand)) {
          var phoneNumber = _storesCallNumber2['default'].getPhoneNumber();

          debug('dialing', phoneNumber);

          _libDialer2['default'].dial(phoneNumber, function (err, call) {
            if (err) {
              debug('Dialer error', err);

              _this3.vaani.say(iWasntAbleToCall.attrs.spoken);

              return;
            }

            call.onstatechange = function (event) {
              debug('call state changed', event);

              if (call.state === 'disconnected') {
                _display2['default'].changeViews(null);
              }
            };
          });
        } else if (command.includes(noCommand)) {
          _this3.vaani.say(ok.attrs.spoken);

          _display2['default'].changeViews(null);
        } else {
          debug('Unable to match interpretation');

          _this3.vaani.say(iWasntAbleToUnderstand.attrs.spoken);
        }
      });
    }

    /**
     * A hook that's fired when Vaani's say function is called
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSay',
    value: function _onSay(sentence, waitForResponse) {
      debug('_onSay', arguments);

      _talkie2['default'].setActiveAnimation('sending');
      _talkie2['default'].setMode('none');
    }

    /**
     * A hook that's fired when Vaani's say function is finished
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSayDone',
    value: function _onSayDone(sentence, waitForResponse) {
      if (!waitForResponse) {
        _talkie2['default'].setActiveAnimation('none');
      }
    }

    /**
     * A hook that's fired when Vaani's listen function is called
     * @private
     */
  }, {
    key: '_onListen',
    value: function _onListen() {
      debug('_onListen');

      _talkie2['default'].setActiveAnimation('receiving');
    }

    /**
     * A hook that's fired when Vaani's listen function is finished
     * @private
     */
  }, {
    key: '_onListenDone',
    value: function _onListenDone() {}

    /**
     * The action that handles mic toggles
     */
  }, {
    key: 'toggleMic',
    value: function toggleMic() {
      debug('toggleMic');

      if (this.vaani.isSpeaking || this.vaani.isListening) {
        this.vaani.cancel();

        _storesCallNumber2['default'].updatePhoneNumber('');
        _storesCallNumber2['default'].updateText('');

        _talkie2['default'].setActiveAnimation('none');
        _talkie2['default'].setMode('none');

        _display2['default'].changeViews(null);

        return;
      }

      this.confirmNumber();
    }
  }]);

  return CallNumberActions;
})();

exports['default'] = CallNumberActions;
module.exports = exports['default'];

},{"../lib/dialer":34,"../lib/localizer":36,"../lib/vaani":37,"../stores/call-number":40,"./display":17,"./talkie":20,"debug":1}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesDisplay = require('../stores/display');

var _storesDisplay2 = _interopRequireDefault(_storesDisplay);

var debug = (0, _debug2['default'])('DisplayActions');

var DisplayActions = (function () {
  function DisplayActions() {
    _classCallCheck(this, DisplayActions);
  }

  _createClass(DisplayActions, null, [{
    key: 'changeViews',

    /**
     * Changes the current view
     * @param {String} (optional) The name of the comoponent to create
     */
    value: function changeViews(componentName) {
      debug('changeViews', arguments);

      var newView;

      if (componentName) {
        newView = document.createElement(componentName);
      }

      _storesDisplay2['default'].updateActiveView(newView);
    }
  }]);

  return DisplayActions;
})();

exports['default'] = DisplayActions;
module.exports = exports['default'];

},{"../stores/display":41,"debug":1}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesFirstTimeUse = require('../stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _talkie = require('./talkie');

var _talkie2 = _interopRequireDefault(_talkie);

var _toolbar = require('./toolbar');

var _toolbar2 = _interopRequireDefault(_toolbar);

var debug = (0, _debug2['default'])('FirstTimeUseActions');

var FirstTimeUseActions = (function () {
  function FirstTimeUseActions() {
    _classCallCheck(this, FirstTimeUseActions);
  }

  _createClass(FirstTimeUseActions, null, [{
    key: 'startTour',

    /**
     * Updates the launch count
     */
    value: function startTour() {
      _storesFirstTimeUse2['default'].updateTourInfo(1, true);
    }

    /**
     * Updates the launch count
     */
  }, {
    key: 'updateLaunchCount',
    value: function updateLaunchCount(count) {
      _storesFirstTimeUse2['default'].updateLaunchCount(count);
    }

    /**
     * Advances the tour
     */
  }, {
    key: 'advanceTour',
    value: function advanceTour() {
      debug('advanceTour');

      var tourInfo = _storesFirstTimeUse2['default'].getTourInfo();
      var currentStep = tourInfo.current;
      var totalSteps = tourInfo.total;
      var toolbarActiveItem = 'none';

      if (currentStep === 1) {
        toolbarActiveItem = 'community';
      }
      if (currentStep === 2) {
        toolbarActiveItem = 'help';
      }

      if (currentStep === totalSteps) {
        _storesFirstTimeUse2['default'].updateTourInfo(0, false);

        _talkie2['default'].setMode('idle');
      } else {
        currentStep += 1;
        _storesFirstTimeUse2['default'].updateTourInfo(currentStep, true);
      }

      _toolbar2['default'].setActiveItem(toolbarActiveItem);
    }
  }]);

  return FirstTimeUseActions;
})();

exports['default'] = FirstTimeUseActions;
module.exports = exports['default'];

},{"../stores/first-time-use":42,"./talkie":20,"./toolbar":21,"debug":1}],19:[function(require,module,exports){
/* global navigator */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesApp = require('../stores/app');

var _storesApp2 = _interopRequireDefault(_storesApp);

var _storesCallNumber = require('../stores/call-number');

var _storesCallNumber2 = _interopRequireDefault(_storesCallNumber);

var _storesCallContact = require('../stores/call-contact');

var _storesCallContact2 = _interopRequireDefault(_storesCallContact);

var _storesStandingBy = require('../stores/standing-by');

var _storesStandingBy2 = _interopRequireDefault(_storesStandingBy);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _libVaani = require('../lib/vaani');

var _libVaani2 = _interopRequireDefault(_libVaani);

var _libAppLauncher = require('../lib/app-launcher');

var _libAppLauncher2 = _interopRequireDefault(_libAppLauncher);

var _display = require('./display');

var _display2 = _interopRequireDefault(_display);

var _talkie = require('./talkie');

var _talkie2 = _interopRequireDefault(_talkie);

require('string.prototype.startswith');

require('string.prototype.endswith');

require('string.prototype.includes');

var debug = (0, _debug2['default'])('StandingByActions');

var StandingByActions = (function () {
  function StandingByActions() {
    _classCallCheck(this, StandingByActions);
  }

  _createClass(StandingByActions, null, [{
    key: 'setupSpeech',

    /**
     * Initializes a Vaani instance
     * @param callback {Function} The function to call back when speech has
     *        been setup.
     */
    value: function setupSpeech(callback) {
      var _this = this;

      debug('setupSpeech');

      _libLocalizer2['default'].resolve(['standingBy__openCommand', 'standingBy__callCommand', 'standingBy__dialCommand', 'standingBy__specialAppPhone', 'standingBy__specialAppContacts']).then(function (entities) {
        var openCommand = entities[0].value;
        var callCommand = entities[1].value;
        var dialCommand = entities[2].value;
        var specialAppPhone = entities[3].value;
        var specialAppContacts = entities[4].value;
        var appsGrammar = _storesApp2['default'].getAppsGrammar() || 'unavailable';
        var contactsGrammar = _storesApp2['default'].getContactsGrammar() || 'unknown';
        var grammar = '\n          #JSGF v1.0;\n          grammar fxosVoiceCommands;\n          <app> =\n            ' + specialAppPhone + ' |\n            ' + specialAppContacts + ' |\n            ' + appsGrammar + '\n          ;\n          <contact> = ' + contactsGrammar + ';\n          <digit> = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;\n          public <simple> =\n            ' + openCommand + ' <app> |\n            ' + dialCommand + ' <digit>+ |\n            ' + callCommand + ' <contact>\n          ;\n      ';

        debug('setupSpeech:grammar', grammar);

        _this.vaani = new _libVaani2['default']({
          grammar: grammar,
          interpreter: _this._interpreter.bind(_this),
          onSay: _this._onSay.bind(_this),
          onSayDone: _this._onSayDone.bind(_this),
          onListen: _this._onListen.bind(_this),
          onListenDone: _this._onListenDone.bind(_this)
        });

        callback();
      });
    }

    /**
     * Greets the user and waits for a response
     */
  }, {
    key: 'greetUser',
    value: function greetUser() {
      var _this2 = this;

      debug('greetUser');

      _libLocalizer2['default'].resolve('standingBy__howMayIHelpYou').then(function (entity) {
        _storesStandingBy2['default'].updateText(entity.value);

        _this2.vaani.listen();
      });
    }

    /**
     * Interprets the result of speech recognition
     * @param err {Error|null} An error if speech was not understood
     * @param command {String} Text returned from the speech recognition
     */
  }, {
    key: '_interpreter',
    value: function _interpreter(err, command) {
      var _this3 = this;

      debug('_interpreter', arguments);

      _talkie2['default'].setActiveAnimation('none');

      if (err) {
        debug('_interpreter:error', err);

        _libLocalizer2['default'].resolve('general__iDidntUnderstandSayAgain').then(function (entity) {
          _this3.vaani.say(entity.attrs.spoken, true);

          _storesStandingBy2['default'].updateText(entity.value);
        });

        return;
      }

      _libLocalizer2['default'].resolve(['standingBy__openCommand', 'standingBy__openCommandCue', 'standingBy__callCommand', 'standingBy__callCommandCue', 'standingBy__dialCommand', 'standingBy__dialCommandCue', 'standingBy__specialAppPhone', 'standingBy__specialAppContacts']).then(function (entities) {
        var openCommand = entities[0].value;
        var openCommandCue = entities[1].value === 'start' ? 'startsWith' : 'endsWith';
        var callCommand = entities[2].value;
        var callCommandCue = entities[3].value === 'start' ? 'startsWith' : 'endsWith';
        var dialCommand = entities[4].value;
        var dialCommandCue = entities[5].value === 'start' ? 'startsWith' : 'endsWith';
        var specialAppPhone = entities[6].value;
        var specialAppContacts = entities[7].value;

        if (command[callCommandCue](callCommand)) {
          debug('_interpreter:callCommand', command);

          if (!navigator.mozContacts) {
            debug('_interpreter', 'navigator.mozContacts not found');
            return;
          }

          var contactRequested;

          if (callCommandCue === 'startsWith') {
            contactRequested = command.substring(callCommand.length + 1);
          } else {
            contactRequested = command.substring(0, command.length - (callCommand.length + 1));
          }

          debug('_interpreter:contactRequested', contactRequested);

          var contacts = _storesApp2['default'].getContacts();
          var contactMatch;

          for (var i = 0; i < contacts.length; i++) {
            if (contacts[i].name[0].toLocaleLowerCase().includes(contactRequested)) {
              contactMatch = contacts[i];
              break;
            }
          }

          debug('_interpreter:callCommand:contactMatch', contactMatch);

          _storesCallContact2['default'].updateContact(contactMatch);

          _display2['default'].changeViews('vaani-call-contact');
        } else if (command[dialCommandCue](dialCommand)) {
          debug('_interpreter:dialCommand', command);

          var phoneNumber;

          if (dialCommandCue === 'startsWith') {
            phoneNumber = command.substring(dialCommand.length + 1);
          } else {
            phoneNumber = command.substring(0, command.length - (dialCommand.length + 1));
          }

          _storesCallNumber2['default'].updatePhoneNumber(phoneNumber);

          _display2['default'].changeViews('vaani-call-number');
        } else if (command[openCommandCue](openCommand)) {
          debug('_interpreter:openCommand', command);

          var appRequested, appToLaunch, entryPoint;

          if (openCommandCue === 'startsWith') {
            appRequested = command.substring(openCommand.length + 1);
          } else {
            appRequested = command.substring(0, command.length - (openCommand.length + 1));
          }

          appToLaunch = appRequested;

          if (command.includes(specialAppPhone)) {
            appRequested = 'phone';
            appToLaunch = 'communications';
            entryPoint = 'dialer';
          } else if (command.includes(specialAppContacts)) {
            appRequested = 'contacts';
            appToLaunch = 'communications';
            entryPoint = 'contacts';
          }

          _libAppLauncher2['default'].launch(appToLaunch, entryPoint, function (err) {
            if (err) {
              debug('AppLauncher error', err);

              var args = { app: appRequested };

              _libLocalizer2['default'].resolve('standingBy__iCantFindThatApp', args).then(function (entity) {
                _this3.vaani.say(entity.attrs.spoken);

                _storesStandingBy2['default'].updateText(entity.value);
              });

              return;
            }

            _storesStandingBy2['default'].updateText('');
          });
        } else {
          debug('Unable to match interpretation');

          _libLocalizer2['default'].resolve('general__iWasntAbleToUnderstand').then(function (entity) {
            _this3.vaani.say(entity.attrs.spoken);

            _storesStandingBy2['default'].updateText(entity.value);
          });
        }
      });
    }

    /**
     * A hook that's fired when Vaani's say function is called
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSay',
    value: function _onSay(sentence, waitForResponse) {
      debug('_onSay', arguments);

      _talkie2['default'].setActiveAnimation('sending');
      _talkie2['default'].setMode('none');
    }

    /**
     * A hook that's fired when Vaani's say function is finished
     * @param sentence {String} The sentence to be spoken
     * @param waitForResponse {Boolean} Indicates if we will wait
     *        for a response after the sentence has been said
     * @private
     */
  }, {
    key: '_onSayDone',
    value: function _onSayDone(sentence, waitForResponse) {
      debug('_onSayDone');

      if (!waitForResponse) {
        _talkie2['default'].setActiveAnimation('none');
      }
    }

    /**
     * A hook that's fired when Vaani's listen function is called
     * @private
     */
  }, {
    key: '_onListen',
    value: function _onListen() {
      debug('_onListen');

      _talkie2['default'].setActiveAnimation('receiving');
    }

    /**
     * A hook that's fired when Vaani's listen function is finished
     * @private
     */
  }, {
    key: '_onListenDone',
    value: function _onListenDone() {}

    /**
     * The action that handles mic toggles
     */
  }, {
    key: 'toggleMic',
    value: function toggleMic() {
      debug('toggleMic');

      if (this.vaani.isSpeaking || this.vaani.isListening) {
        this.vaani.cancel();

        _storesStandingBy2['default'].updateText('');

        _talkie2['default'].setActiveAnimation('none');
        _talkie2['default'].setMode('none');

        return;
      }

      this.greetUser();
    }
  }]);

  return StandingByActions;
})();

exports['default'] = StandingByActions;
module.exports = exports['default'];

},{"../lib/app-launcher":32,"../lib/localizer":36,"../lib/vaani":37,"../stores/app":38,"../stores/call-contact":39,"../stores/call-number":40,"../stores/standing-by":43,"./display":17,"./talkie":20,"debug":1,"string.prototype.endswith":10,"string.prototype.includes":11,"string.prototype.startswith":12}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesDisplay = require('../stores/display');

var _storesDisplay2 = _interopRequireDefault(_storesDisplay);

var _storesTalkie = require('../stores/talkie');

var _storesTalkie2 = _interopRequireDefault(_storesTalkie);

var _display = require('./display');

var _display2 = _interopRequireDefault(_display);

var debug = (0, _debug2['default'])('TalkieActions');

var TalkieActions = (function () {
  function TalkieActions() {
    _classCallCheck(this, TalkieActions);
  }

  _createClass(TalkieActions, null, [{
    key: 'toggleMic',

    /**
     * Delegates to the active view's toggleMic function or
     * changes to view to vaani-standing-by
     */
    value: function toggleMic() {
      debug('toggleMic');

      var activeView = _storesDisplay2['default'].getActiveView();

      if (activeView && activeView.toggleMic) {
        activeView.toggleMic();

        return;
      }

      _display2['default'].changeViews('vaani-standing-by');
    }

    /**
     * Sets the active animation
     * @param value {String} the name of the animation
     */
  }, {
    key: 'setActiveAnimation',
    value: function setActiveAnimation(value) {
      debug('setActiveAnimation', arguments);

      _storesTalkie2['default'].updateActiveAnimation(value);
    }

    /**
     * Sets the mode
     * @param value {String} the mode
     */
  }, {
    key: 'setMode',
    value: function setMode(value) {
      debug('setMode', arguments);

      _storesTalkie2['default'].updateMode(value);
    }
  }]);

  return TalkieActions;
})();

exports['default'] = TalkieActions;
module.exports = exports['default'];

},{"../stores/display":41,"../stores/talkie":44,"./display":17,"debug":1}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _storesToolbar = require('../stores/toolbar');

var _storesToolbar2 = _interopRequireDefault(_storesToolbar);

var debug = (0, _debug2['default'])('ToolbarActions');

var ToolbarActions = (function () {
  function ToolbarActions() {
    _classCallCheck(this, ToolbarActions);
  }

  _createClass(ToolbarActions, null, [{
    key: 'setActiveItem',

    /**
     * Sets the active item
     * @param value {String} The active item
     */
    value: function setActiveItem(value) {
      debug('setActiveItem', arguments);

      _storesToolbar2['default'].updateActiveItem(value);
    }
  }]);

  return ToolbarActions;
})();

exports['default'] = ToolbarActions;
module.exports = exports['default'];

},{"../stores/toolbar":45,"debug":1}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _storesCallContact = require('../stores/call-contact');

var _storesCallContact2 = _interopRequireDefault(_storesCallContact);

var _actionsCallContact = require('../actions/call-contact');

var _actionsCallContact2 = _interopRequireDefault(_actionsCallContact);

var CallContact = _gaiaComponent2['default'].register('vaani-call-contact', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.text = this.shadowRoot.querySelector('.text');
  },
  attached: function attached() {
    _storesCallContact2['default'].addChangeListener(this.render.bind(this));

    _actionsCallContact2['default'].setupSpeech(function () {
      _actionsCallContact2['default'].confirmContact();
    });

    this.render();
  },
  detached: function detached() {
    _storesCallContact2['default'].removeChangeListener(this.render.bind(this));
  },
  render: function render() {
    this.els.text.textContent = _storesCallContact2['default'].getText();
  },
  toggleMic: function toggleMic() {
    _actionsCallContact2['default'].toggleMic();
  },
  template: '\n    <div id="call-number">\n      <p class="text"></p>\n    </div>\n\n    <style>\n      #call-number {\n        display: flex;\n        align-items: center;\n        width: 100%;\n        min-height: 24.3rem;\n      }\n      #call-number .text {\n        width: 100%;\n        font-size: 2.1rem;\n        text-align: center;\n        margin: 0 3rem;\n      }\n    </style>\n  '
});

exports['default'] = CallContact;
module.exports = exports['default'];

},{"../actions/call-contact":15,"../stores/call-contact":39,"gaia-component":5}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _storesCallNumber = require('../stores/call-number');

var _storesCallNumber2 = _interopRequireDefault(_storesCallNumber);

var _actionsCallNumber = require('../actions/call-number');

var _actionsCallNumber2 = _interopRequireDefault(_actionsCallNumber);

var CallNumber = _gaiaComponent2['default'].register('vaani-call-number', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.text = this.shadowRoot.querySelector('.text');
  },
  attached: function attached() {
    _storesCallNumber2['default'].addChangeListener(this.render.bind(this));

    _actionsCallNumber2['default'].setupSpeech(function () {
      _actionsCallNumber2['default'].confirmNumber();
    });

    this.render();
  },
  detached: function detached() {
    _storesCallNumber2['default'].removeChangeListener(this.render.bind(this));
  },
  render: function render() {
    this.els.text.textContent = _storesCallNumber2['default'].getText();
  },
  toggleMic: function toggleMic() {
    _actionsCallNumber2['default'].toggleMic();
  },
  template: '\n    <div id="call-number">\n      <p class="text"></p>\n    </div>\n\n    <style>\n      #call-number {\n        display: flex;\n        align-items: center;\n        width: 100%;\n        min-height: 24.3rem;\n      }\n      #call-number .text {\n        width: 100%;\n        font-size: 2.1rem;\n        text-align: center;\n        margin: 0 3rem;\n      }\n    </style>\n  '
});

exports['default'] = CallNumber;
module.exports = exports['default'];

},{"../actions/call-number":16,"../stores/call-number":40,"gaia-component":5}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('gaia-dialog/gaia-dialog-alert');

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _actionsToolbar = require('../actions/toolbar');

var _actionsToolbar2 = _interopRequireDefault(_actionsToolbar);

var _actionsDisplay = require('../actions/display');

var _actionsDisplay2 = _interopRequireDefault(_actionsDisplay);

var Community = _gaiaComponent2['default'].register('vaani-community', {
  created: function created() {
    this.setupShadowRoot();

    this.dialog = this.shadowRoot.querySelector('gaia-dialog-alert');
  },
  attached: function attached() {
    this.dialog.open();
    this.dialog.addEventListener('closed', this.onClose.bind(this));

    _libLocalizer2['default'].addChangeListener(this.localize.bind(this));

    this.localize();
  },
  detached: function detached() {
    this.dialog.removeEventListener('closed', this.onClose.bind(this));

    _libLocalizer2['default'].removeChangeListener(this.localize.bind(this));
  },
  localize: function localize() {
    _libLocalizer2['default'].localize(this.shadowRoot);
  },
  onClose: function onClose() {
    _actionsToolbar2['default'].setActiveItem('none');
    _actionsDisplay2['default'].changeViews(null);
  },
  template: '\n    <div id="help">\n      <gaia-dialog-alert>\n        <h3 data-l10n-id="community__helpTheCommunity"></h3>\n        <div data-l10n-id="community__comingSoonContent"></div>\n      </gaia-dialog-alert>\n    </div>\n  '
});

exports['default'] = Community;
module.exports = exports['default'];

},{"../actions/display":17,"../actions/toolbar":21,"../lib/localizer":36,"gaia-component":5,"gaia-dialog/gaia-dialog-alert":7}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _storesDisplay = require('../stores/display');

var _storesDisplay2 = _interopRequireDefault(_storesDisplay);

var Display = _gaiaComponent2['default'].register('vaani-display', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.content = this.shadowRoot.querySelector('.content');
  },
  attached: function attached() {
    _storesDisplay2['default'].addChangeListener(this.render.bind(this));
  },
  detached: function detached() {
    _storesDisplay2['default'].removeChangeListener(this.render.bind(this));
  },
  render: function render() {
    var children = this.els.content.childNodes;

    for (var i = 0; i < children.length; i++) {
      this.els.content.removeChild(children[i]);
    }

    if (_storesDisplay2['default'].getActiveView()) {
      this.els.content.appendChild(_storesDisplay2['default'].getActiveView());
    }
  },
  template: '\n    <div id="display">\n      <div class="content"></div>\n    </div>\n\n    <style>\n      #display {\n        width: 100%;\n      }\n    </style>\n  '
});

exports['default'] = Display;
module.exports = exports['default'];

},{"../stores/display":41,"gaia-component":5}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _storesFirstTimeUse = require('../stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _actionsFirstTimeUse = require('../actions/first-time-use');

var _actionsFirstTimeUse2 = _interopRequireDefault(_actionsFirstTimeUse);

var FirstTimeUse = _gaiaComponent2['default'].register('vaani-first-time-use', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.arrowUp = this.shadowRoot.querySelector('.arrow-up');
    this.els.arrowDown = this.shadowRoot.querySelector('.arrow-down');
    this.els.step1 = this.shadowRoot.querySelector('.step-1');
    this.els.step2 = this.shadowRoot.querySelector('.step-2');
    this.els.step3 = this.shadowRoot.querySelector('.step-3');
    this.els.btns = this.shadowRoot.querySelectorAll('.btn');
  },
  attached: function attached() {
    for (var i = 0; i < this.els.btns.length; ++i) {
      var btn = this.els.btns[i];
      btn.addEventListener('click', this.nextStep.bind(this));
    }

    _storesFirstTimeUse2['default'].addChangeListener(this.render.bind(this));
    _libLocalizer2['default'].addChangeListener(this.localize.bind(this));

    this.isAttached = true;

    this.localize();
    this.render();
  },
  detached: function detached() {
    for (var i = 0; i < this.els.btns.length; ++i) {
      var btn = this.els.btns[i];
      btn.removeEventListener('click', this.nextStep.bind(this));
    }

    _storesFirstTimeUse2['default'].removeChangeListener(this.render.bind(this));
    _libLocalizer2['default'].removeChangeListener(this.localize.bind(this));
  },
  localize: function localize() {
    _libLocalizer2['default'].localize(this.shadowRoot);
  },
  render: function render() {
    var tourInfo = _storesFirstTimeUse2['default'].getTourInfo();
    var currentStep = tourInfo.current;

    this.els.step1.style.display = currentStep === 1 ? 'block' : 'none';
    this.els.step2.style.display = currentStep === 2 ? 'block' : 'none';
    this.els.step3.style.display = currentStep === 3 ? 'block' : 'none';

    this.els.arrowUp.classList.remove('arrow-up-left');
    this.els.arrowUp.classList.remove('arrow-up-right');
    this.els.arrowDown.classList.remove('arrow-down-center');

    if (currentStep === 2) {
      this.els.arrowUp.classList.remove('arrow-up-right');
      this.els.arrowUp.classList.add('arrow-up-left');
    }

    if (currentStep === 3) {
      this.els.arrowUp.classList.remove('arrow-up-left');
      this.els.arrowUp.classList.add('arrow-up-right');
    }
  },
  nextStep: function nextStep() {
    _actionsFirstTimeUse2['default'].advanceTour();
  },
  template: '\n    <div id="first-time-use">\n      <div class="arrow-up"></div>\n      <div class="container">\n        <div class="step-1">\n          <h3 class="title" data-l10n-id="firstTimeUse__whatIsVaani"></h3>\n          <p class="message" data-l10n-id="firstTimeUse__whatIsVaaniContent"></p>\n          <hr />\n          <button class="btn" data-l10n-id="firstTimeUse__ok"></button>\n        </div>\n        <div class="step-2">\n          <h3 class="title" data-l10n-id="firstTimeUse__helpTheCommunity"></h3>\n          <p class="message" data-l10n-id="firstTimeUse__helpTheCommunityContent"></p>\n          <hr />\n          <button class="btn" data-l10n-id="firstTimeUse__ok"></button>\n        </div>\n        <div class="step-3">\n          <h3 class="title" data-l10n-id="firstTimeUse__notSure"></h3>\n          <p class="message" data-l10n-id="firstTimeUse__notSureContent"></p>\n          <hr />\n          <button class="btn" data-l10n-id="firstTimeUse__ok"></button>\n        </div>\n      </div>\n      <div class="arrow-down"></div>\n    </div>\n\n    <style>\n      #first-time-use {\n        position: relative;\n        margin: 0 1.5rem;\n      }\n      #first-time-use .arrow-up {\n        display: none;\n        position: absolute;\n        top: -1.2rem;\n        width: 0;\n        height: 0;\n        border-left: 1.2rem solid transparent;\n        border-right: 1.2rem solid transparent;\n        border-bottom: 1.2rem solid rgba(201, 228, 253, 0.75);\n      }\n      #first-time-use .arrow-up-left {\n        display: block;\n        left: 0;\n      }\n      #first-time-use .arrow-up-right {\n        display: block;\n        right: 0;\n      }\n      #first-time-use .container {\n        padding: 0 1.5rem;\n        border-radius: 2px;\n        background-color: #c9e4fd;\n        background-color: rgba(201, 228, 253, 0.75);\n      }\n      #first-time-use .title {\n        color: #4d4d4d;\n        font-size: 1.7rem;\n        font-weight: 600;\n        text-align: center;\n        margin: 0;\n        padding: 1.5rem 0 0 0;\n      }\n      #first-time-use .message {\n        color: #4d4d4d;\n        font-size: 1.5rem;\n        line-height: 1.9rem;\n      }\n      #first-time-use .message-only {\n        padding: 1.5rem 0;\n      }\n      #first-time-use hr {\n        border: 0;\n        height: 0.1rem;\n        background-color: #000;\n        opacity: 0.2;\n        margin: 0;\n      }\n      #first-time-use .btn {\n        color: #00aacc;\n        font-weight: normal;\n        font-style: italic;\n        font-size: 1.7rem;\n        display: block;\n        height: 4rem;\n        width: 100%;\n        text-align: center;\n        background: none;\n        border: none;\n      }\n      #first-time-use .step-1,\n      #first-time-use .step-2,\n      #first-time-use .step-3 {\n        display: none;\n      }\n    </style>\n  '
});

exports['default'] = FirstTimeUse;
module.exports = exports['default'];

},{"../actions/first-time-use":18,"../lib/localizer":36,"../stores/first-time-use":42,"gaia-component":5}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('gaia-dialog/gaia-dialog-alert');

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _actionsToolbar = require('../actions/toolbar');

var _actionsToolbar2 = _interopRequireDefault(_actionsToolbar);

var _actionsDisplay = require('../actions/display');

var _actionsDisplay2 = _interopRequireDefault(_actionsDisplay);

var Help = _gaiaComponent2['default'].register('vaani-help', {
  created: function created() {
    this.setupShadowRoot();

    this.dialog = this.shadowRoot.querySelector('gaia-dialog-alert');
  },
  attached: function attached() {
    this.dialog.open();
    this.dialog.addEventListener('closed', this.onClose.bind(this));

    _libLocalizer2['default'].addChangeListener(this.localize.bind(this));

    this.localize();
  },
  detached: function detached() {
    this.dialog.removeEventListener('closed', this.onClose.bind(this));

    _libLocalizer2['default'].removeChangeListener(this.localize.bind(this));
  },
  localize: function localize() {
    _libLocalizer2['default'].localize(this.shadowRoot);
  },
  onClose: function onClose() {
    _actionsToolbar2['default'].setActiveItem('none');
    _actionsDisplay2['default'].changeViews(null);
  },
  template: '\n    <div id="help">\n      <gaia-dialog-alert>\n        <h3 data-l10n-id="help__whatCanIAsk"></h3>\n        <p data-l10n-id="help__openApp"></p>\n        <p data-l10n-id="help__dialNumber"></p>\n        <p data-l10n-id="help__callContact"></p>\n      </gaia-dialog-alert>\n    </div>\n  '
});

exports['default'] = Help;
module.exports = exports['default'];

},{"../actions/display":17,"../actions/toolbar":21,"../lib/localizer":36,"gaia-component":5,"gaia-dialog/gaia-dialog-alert":7}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _storesApp = require('../stores/app');

var _storesApp2 = _interopRequireDefault(_storesApp);

var _storesStandingBy = require('../stores/standing-by');

var _storesStandingBy2 = _interopRequireDefault(_storesStandingBy);

var _actionsStandingBy = require('../actions/standing-by');

var _actionsStandingBy2 = _interopRequireDefault(_actionsStandingBy);

var StandingBy = _gaiaComponent2['default'].register('vaani-standing-by', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.text = this.shadowRoot.querySelector('.text');
  },
  attached: function attached() {
    _storesStandingBy2['default'].addChangeListener(this.render.bind(this));
    _storesApp2['default'].addChangeListener(this._updateSpeach.bind(this));

    _actionsStandingBy2['default'].setupSpeech(function () {
      _actionsStandingBy2['default'].greetUser();
    });

    this.render();
  },
  detached: function detached() {
    _storesStandingBy2['default'].removeChangeListener(this.render.bind(this));
    _storesApp2['default'].removeChangeListener(this._updateSpeach.bind(this));
  },
  _updateSpeach: function _updateSpeach() {
    _actionsStandingBy2['default'].setupSpeech(function () {});
  },
  render: function render() {
    this.els.text.textContent = _storesStandingBy2['default'].getText();
  },
  toggleMic: function toggleMic() {
    _actionsStandingBy2['default'].toggleMic();
  },
  template: '\n    <div id="standing-by">\n      <p class="text"></p>\n    </div>\n\n    <style>\n      #standing-by {\n        display: flex;\n        align-items: center;\n        width: 100%;\n        min-height: 24.3rem;\n      }\n      #standing-by .text {\n        width: 100%;\n        font-size: 2.1rem;\n        text-align: center;\n        margin: 0 3rem;\n      }\n    </style>\n  '
});

exports['default'] = StandingBy;
module.exports = exports['default'];

},{"../actions/standing-by":19,"../stores/app":38,"../stores/standing-by":43,"gaia-component":5}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _libLocalizer = require('../lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

var _storesFirstTimeUse = require('../stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _storesTalkie = require('../stores/talkie');

var _storesTalkie2 = _interopRequireDefault(_storesTalkie);

var _actionsTalkie = require('../actions/talkie');

var _actionsTalkie2 = _interopRequireDefault(_actionsTalkie);

var Talkie = _gaiaComponent2['default'].register('vaani-talkie', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.video = this.shadowRoot.querySelector('video');
    this.els.video.muted = true;
    this.els.mic = this.shadowRoot.querySelector('.mic');
    this.els.sending = this.shadowRoot.querySelector('.sending');
    this.els.receiving = this.shadowRoot.querySelector('#receiving');
    this.els.dots = this.shadowRoot.querySelector('#dots');
    this.els.idlePopup = this.shadowRoot.querySelector('.idle-popup');
  },
  attached: function attached() {
    var _this = this;

    this.els.mic.addEventListener('touchend', this.tapMic.bind(this));
    this.els.mic.addEventListener('click', this.toggleMic.bind(this));

    _storesTalkie2['default'].addChangeListener(this.render.bind(this));
    _libLocalizer2['default'].addChangeListener(this.localize.bind(this));

    this.listeningRing = 5;
    this.listeningRingDir = 'down'; // up | down
    this.listeningInerval = setInterval(function () {
      if (_this.listeningRingDir === 'down') {
        _this.listeningRing--;
        if (_this.listeningRing < 1) {
          _this.listeningRing = 1;
          _this.listeningRingDir = 'up';
        }
      } else {
        _this.listeningRing++;
        if (_this.listeningRing > 5) {
          _this.listeningRing = 5;
          _this.listeningRingDir = 'down';
        }
      }

      _this.els.dots.className = '';
      _this.els.dots.classList.add('show-' + _this.listeningRing);
    }, 75);

    this.localize();
    this.render();
  },
  detached: function detached() {
    this.els.mic.removeEventListener('touchend', this.tapMic.bind(this));
    this.els.mic.removeEventListener('click', this.toggleMic.bind(this));

    _storesTalkie2['default'].removeChangeListener(this.render.bind(this));
    _libLocalizer2['default'].removeChangeListener(this.localize.bind(this));

    clearInterval(this.listeningInerval);
  },
  localize: function localize() {
    _libLocalizer2['default'].localize(this.shadowRoot);
  },
  render: function render() {
    var mode = _storesTalkie2['default'].getMode();
    var activeAnimation = _storesTalkie2['default'].getActiveAnimation();

    if (mode === 'idle') {
      this.els.idlePopup.style.display = 'block';
    } else {
      this.els.idlePopup.style.display = 'none';
    }

    if (activeAnimation === 'receiving') {
      this.els.sending.style.display = 'none';
      this.els.receiving.style.display = 'block';
    } else if (activeAnimation === 'sending') {
      this.els.sending.style.display = 'block';
      this.els.receiving.style.display = 'none';
    } else {
      this.els.sending.style.display = 'none';
      this.els.receiving.style.display = 'none';
    }
  },
  tapMic: function tapMic(e) {
    e.preventDefault();
    e.target.click();
  },
  toggleMic: function toggleMic() {
    if (_storesFirstTimeUse2['default'].getTourInfo().inFlight) {
      return;
    }

    if (_storesTalkie2['default'].getMode() === 'idle') {
      _actionsTalkie2['default'].setMode('none');
    }

    _actionsTalkie2['default'].toggleMic();
  },
  template: '\n    <div id="talkie">\n      <div class="content">\n        <div class="idle-popup">\n          <div class="idle-popup-container">\n            <p class="message" data-l10n-id="talkie__tapToGetStarted"></p>\n          </div>\n          <div class="arrow-down"></div>\n        </div>\n\n        <div id="receiving">\n          <!--dots go here, see create method above-->\n          <div id="dots"></div>\n        </div>\n\n        <div class="sending"></div>\n\n        <div class="mic">\n          <img alt="tap to talk" src="/assets/images/mic.png" />\n        </div>\n      </div>\n      <video width="0" height="0"></video>\n    </div>\n\n    <style>\n      #talkie {\n        position: absolute;\n        bottom: 0;\n        width: 100%;\n        height: 23.8rem;\n      }\n      #talkie .content {\n        position: relative;\n        width: 100%;\n        height: 100%;\n      }\n      #talkie .mic {\n        position: absolute;\n        top: 50%;\n        left: 50%;\n        transform: translate(-50%, -50%);\n        height: 6.8rem;\n        width: 6.8rem;\n      }\n      #talkie .idle-popup {\n        display: none;\n        position: absolute;\n        margin: 0 auto;\n        width: 100%;\n      }\n      #talkie .idle-popup .idle-popup-container {\n        text-align: center;\n        margin: 0 1.5rem;\n        border-radius: 2px;\n        background-color: #c9e4fd;\n        background-color: rgba(201, 228, 253, 0.75);\n      }\n      #talkie .idle-popup .message {\n        color: #4d4d4d;\n        font-size: 1.5rem;\n        line-height: 1.9rem;\n        padding: 1.5rem;\n      }\n      #talkie .idle-popup .arrow-down {\n        width: 0;\n        height: 0;\n        margin: -1.5rem auto auto auto;\n        border-left: 1.2rem solid transparent;\n        border-right: 1.2rem solid transparent;\n        border-top: 1.2rem solid rgba(201, 228, 253, 0.75);\n      }\n      #talkie .sending {\n        display: none;\n        position: absolute;\n        top: 50%;\n        left: 50%;\n        height: 6.8rem;\n        width: 6.8rem;\n        transform: translate(-50%, -50%);\n      }\n      #talkie .sending:before,\n      #talkie .sending:after {\n        content: \'\';\n        position: absolute;\n        top: 50%;\n        left: 50%;\n        width: 6.8rem;\n        height: 6.8rem;\n        margin: -3.5rem 0 0 -3.4rem;\n        border-radius: 50%;\n        background-color: #6c3fff;\n        animation-name: sending;\n        animation-duration: 1s;\n        animation-iteration-count: 100;\n        animation-timing-function: linear;\n        pointer-events: none;\n      }\n      #talkie .sending:after {\n        animation-delay: 0.5s;\n      }\n      #receiving {\n        justify-content: center;\n        align-items: center;\n        position: absolute;\n        height: 100%;\n        width: 100%;\n      }\n      #dots {\n        display: none;\n        position: absolute;\n        top: 50%;\n        left: 50%;\n        width: 22.4rem;\n        height: 22.4rem;\n        border-radius: 50%;\n        background: url(\'/assets/images/dots.png\') no-repeat 50% 50% / 22.4rem;\n        transform: translate(-50%, -50%);\n        transition-property: width, height;\n        transition-duration: 30ms;\n        transition-timing-function: linear;\n        pointer-events: none;\n      }\n\n      #dots.show-5 {\n        display: block;\n        width: 22.4rem;\n        height: 22.4rem;\n      }\n\n      #dots.show-4 {\n        display: block;\n        width: 20rem;\n        height: 20rem;\n      }\n\n      #dots.show-3 {\n        display: block;\n        width: 17rem;\n        height: 17rem;\n      }\n\n      #dots.show-2 {\n        display: block;\n        width: 14rem;\n        height: 14rem;\n      }\n\n      #dots.show-1 {\n        display: block;\n        width: 11rem;\n        height: 11rem;\n      }\n    </style>\n  ',
  globalCss: '\n    @keyframes sending {\n      0% {\n        background-color: rgba(108,63,255, 0.3);\n        transform: scale3d(1, 1, 1);\n      }\n      33% {\n        background-color: #8c3fff;\n      }\n      66% {\n        background-color: #a33fff;\n      }\n      100% {\n        opacity: 0;\n        background-color: rgba(194,63,255, 0);\n        transform: scale3d(5, 5, 1);\n      }\n    }\n  '
});

exports['default'] = Talkie;
module.exports = exports['default'];

},{"../actions/talkie":20,"../lib/localizer":36,"../stores/first-time-use":42,"../stores/talkie":44,"gaia-component":5}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _gaiaComponent = require('gaia-component');

var _gaiaComponent2 = _interopRequireDefault(_gaiaComponent);

var _storesToolbar = require('../stores/toolbar');

var _storesToolbar2 = _interopRequireDefault(_storesToolbar);

var _storesFirstTimeUse = require('../stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _actionsDisplay = require('../actions/display');

var _actionsDisplay2 = _interopRequireDefault(_actionsDisplay);

var _actionsToolbar = require('../actions/toolbar');

var _actionsToolbar2 = _interopRequireDefault(_actionsToolbar);

var Toolbar = _gaiaComponent2['default'].register('vaani-toolbar', {
  created: function created() {
    this.setupShadowRoot();

    this.els = {};
    this.els.community = this.shadowRoot.querySelector('.community');
    this.els.communityImg = this.els.community.querySelector('img');
    this.els.help = this.shadowRoot.querySelector('.help');
    this.els.helpImg = this.els.help.querySelector('img');
  },
  attached: function attached() {
    this.els.community.addEventListener('click', this.toggleCommunity.bind(this));
    this.els.help.addEventListener('click', this.toggleHelp.bind(this));

    _storesToolbar2['default'].addChangeListener(this.render.bind(this));

    this.render();
  },
  detached: function detached() {
    this.els.community.removeEventListener('click', this.toggleCommunity.bind(this));
    this.els.help.removeEventListener('click', this.toggleHelp.bind(this));

    _storesToolbar2['default'].removeChangeListener(this.render.bind(this));
  },
  render: function render() {
    var activeItem = _storesToolbar2['default'].getActiveItem();

    if (activeItem === 'community') {
      this.els.communityImg.src = this.els.communityImg.dataset.srcActive;
      this.els.helpImg.src = this.els.helpImg.dataset.srcInactive;
    } else if (activeItem === 'help') {
      this.els.communityImg.src = this.els.communityImg.dataset.srcInactive;
      this.els.helpImg.src = this.els.helpImg.dataset.srcActive;
    } else {
      this.els.communityImg.src = this.els.communityImg.dataset.srcInactive;
      this.els.helpImg.src = this.els.helpImg.dataset.srcInactive;
    }
  },
  toggleCommunity: function toggleCommunity() {
    if (_storesFirstTimeUse2['default'].getTourInfo().inFlight) {
      return;
    }

    var isSelected = _storesToolbar2['default'].getActiveItem() === 'community';
    _actionsToolbar2['default'].setActiveItem(isSelected ? 'none' : 'community');

    _actionsDisplay2['default'].changeViews('vaani-community');
  },
  toggleHelp: function toggleHelp() {
    if (_storesFirstTimeUse2['default'].getTourInfo().inFlight) {
      return;
    }

    var isSelected = _storesToolbar2['default'].getActiveItem() === 'help';
    _actionsToolbar2['default'].setActiveItem(isSelected ? 'none' : 'help');

    _actionsDisplay2['default'].changeViews('vaani-help');
  },
  template: '\n    <div id="toolbar">\n      <div class="community">\n        <img\n          alt="community"\n          src="/assets/images/community.png"\n          data-src-active="/assets/images/community_pressed.png"\n          data-src-inactive="/assets/images/community.png"\n        />\n      </div>\n      <div class="help">\n        <img\n          alt="help"\n          src="/assets/images/help.png"\n          data-src-active="/assets/images/help_pressed.png"\n          data-src-inactive="/assets/images/help.png"\n        />\n      </div>\n      <div class="clearfix"></div>\n    </div>\n\n    <style>\n      #toolbar {\n        padding: 1.5rem;\n      }\n      #toolbar .community {\n        float: left;\n      }\n      #toolbar .help {\n        float: right;\n      }\n      .clearfix {\n        clear: both;\n      }\n    </style>\n  '
});

exports['default'] = Toolbar;
module.exports = exports['default'];

},{"../actions/display":17,"../actions/toolbar":21,"../stores/first-time-use":42,"../stores/toolbar":45,"gaia-component":5}],31:[function(require,module,exports){
/* global window, document */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _actionsApp = require('./actions/app');

var _actionsApp2 = _interopRequireDefault(_actionsApp);

var _actionsDisplay = require('./actions/display');

var _actionsDisplay2 = _interopRequireDefault(_actionsDisplay);

var _actionsFirstTimeUse = require('./actions/first-time-use');

var _actionsFirstTimeUse2 = _interopRequireDefault(_actionsFirstTimeUse);

var _storesApp = require('./stores/app');

var _storesApp2 = _interopRequireDefault(_storesApp);

var _storesFirstTimeUse = require('./stores/first-time-use');

var _storesFirstTimeUse2 = _interopRequireDefault(_storesFirstTimeUse);

var _libLocalizer = require('./lib/localizer');

var _libLocalizer2 = _interopRequireDefault(_libLocalizer);

require('./components/community');

require('./components/display');

require('./components/first-time-use');

require('./components/help');

require('./components/talkie');

require('./components/toolbar');

require('./components/standing-by');

require('./components/call-number');

require('./components/call-contact');

var debug = (0, _debug2['default'])('App');
window.myDebug = _debug2['default'];

var App = (function () {
  function App() {
    _classCallCheck(this, App);
  }

  _createClass(App, null, [{
    key: 'init',

    /**
     * Initializes the application (where the magic happens)
     */
    value: function init() {
      debug('init');

      // first time use counts
      var launchCount = localStorage.getItem('launchCount') || 0;
      launchCount = parseInt(launchCount, 10);
      launchCount += 1;
      localStorage.setItem('launchCount', launchCount);
      _actionsFirstTimeUse2['default'].updateLaunchCount(launchCount);

      // build dynamic grammar
      _actionsApp2['default'].buildDynamicGrammar();

      // instantiate top level components
      var display = document.createElement('vaani-display');
      var talkie = document.createElement('vaani-talkie');
      var toolbar = document.createElement('vaani-toolbar');

      // kick things off
      document.body.appendChild(toolbar);
      document.body.appendChild(talkie);
      document.body.appendChild(display);

      // show first time use if appropriate
      if (launchCount <= 2) {
        _actionsFirstTimeUse2['default'].startTour();
        _actionsDisplay2['default'].changeViews('vaani-first-time-use');
      }

      // state change listeners
      _storesFirstTimeUse2['default'].addChangeListener(_actionsApp2['default'].handleFirstTimeUseChange);
      _libLocalizer2['default'].addChangeListener(_actionsApp2['default'].buildDynamicGrammar);

      // app install/uninstall events
      if (navigator.mozApps && navigator.mozApps.mgmt) {
        navigator.mozApps.mgmt.oninstall = _actionsApp2['default'].buildAppsGrammar;
        navigator.mozApps.mgmt.onuninstall = _actionsApp2['default'].buildAppsGrammar;
      }
    }
  }]);

  return App;
})();

_libLocalizer2['default'].start(App.init);

},{"./actions/app":14,"./actions/display":17,"./actions/first-time-use":18,"./components/call-contact":22,"./components/call-number":23,"./components/community":24,"./components/display":25,"./components/first-time-use":26,"./components/help":27,"./components/standing-by":28,"./components/talkie":29,"./components/toolbar":30,"./lib/localizer":36,"./stores/app":38,"./stores/first-time-use":42,"debug":1}],32:[function(require,module,exports){
/* global navigator */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require('string_score');

var AppLauncher = (function () {
  function AppLauncher() {
    _classCallCheck(this, AppLauncher);
  }

  _createClass(AppLauncher, null, [{
    key: 'launch',

    /**
     * Launches an app or returns an error
     * @param appName {String} The app to launch
     * @param entryPoint {String} The entry point of the app
     * @param callback {Function} The function to callback
     */
    value: function launch(appName, entryPoint, callback) {
      this.findByName(appName, function (err, app) {
        if (err) {
          callback(err);
          return;
        }

        app.launch(entryPoint);

        callback();
      });
    }

    /**
     * Finds an app by name
     * @param appName {String} The app to find
     */
  }, {
    key: 'findByName',
    value: function findByName(appName, callback) {
      if (!navigator.mozApps || !navigator.mozApps.mgmt) {
        callback(Error('navigator.mozApps not found'));
        return;
      }

      var allApps = navigator.mozApps.mgmt.getAll();

      allApps.onsuccess = function () {
        var installedApps = allApps.result;
        var highScore = 0;
        var foundApp;

        installedApps.forEach(function (app) {
          var thisName = app.manifest.name.toLocaleLowerCase();
          var thisScore = thisName.score(appName);

          if (thisScore > highScore) {
            highScore = thisScore;
            foundApp = app;
          }
        });

        if (foundApp) {
          callback(null, foundApp);
        } else {
          callback(Error('App (' + appName + ') not found.'));
        }
      };

      allApps.onerror = callback;
    }
  }]);

  return AppLauncher;
})();

exports['default'] = AppLauncher;
module.exports = exports['default'];

},{"string_score":13}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _eventemitter2 = require('eventemitter2');

var CHANGE_EVENT = 'change';

var BaseStore = (function () {
  /**
   * @constructor
   */

  function BaseStore() {
    _classCallCheck(this, BaseStore);

    this._emitter = new _eventemitter2.EventEmitter2();
  }

  /**
   * Emits a change event
   */

  _createClass(BaseStore, [{
    key: 'emitChange',
    value: function emitChange() {
      this._emitter.emit(CHANGE_EVENT);
    }

    /**
     * Adds a change listener to the emitter
     * @param func {Function} The function to add
     */
  }, {
    key: 'addChangeListener',
    value: function addChangeListener(func) {
      this._emitter.addListener(CHANGE_EVENT, func);
    }

    /**
     * Adds a change listener to the emitter
     * @param func {Function} The function to remove
     */
  }, {
    key: 'removeChangeListener',
    value: function removeChangeListener(func) {
      this._emitter.removeListener(CHANGE_EVENT, func);
    }
  }]);

  return BaseStore;
})();

exports['default'] = BaseStore;
module.exports = exports['default'];

},{"eventemitter2":4}],34:[function(require,module,exports){
/* global navigator */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Dialer = (function () {
  function Dialer() {
    _classCallCheck(this, Dialer);
  }

  _createClass(Dialer, null, [{
    key: 'dial',

    /**
     * Dials the specified number
     * @param phoneNumber {String} The number to dial
     * @param callback {Function} The function to callback
     */
    value: function dial(phoneNumber, callback) {
      if (!navigator.mozTelephony) {
        callback(Error('navigator.mozTelephony not found'));
        return;
      }

      var telephony = navigator.mozTelephony;

      telephony.dial(phoneNumber).then(function (call) {
        callback(null, call);
      })['catch'](function (err) {
        callback(err);
      });
    }
  }]);

  return Dialer;
})();

exports['default'] = Dialer;
module.exports = exports['default'];

},{}],35:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var GrammarTools = (function () {
  function GrammarTools() {
    _classCallCheck(this, GrammarTools);
  }

  _createClass(GrammarTools, null, [{
    key: 'clean',

    /**
     * Removes special characters from a string and also condenses whitespace
     * @param value {String} The string to clean
     * @return {String} The cleaned string
     */
    value: function clean(value) {
      value = value.replace(/[^\w\s]/gi, '');
      value = value.replace(/\s+/g, ' ');

      return value;
    }
  }]);

  return GrammarTools;
})();

exports['default'] = GrammarTools;
module.exports = exports['default'];

},{}],36:[function(require,module,exports){
/* global window, document */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _eventemitter2 = require('eventemitter2');

var _l20n = require('l20n');

var debug = (0, _debug2['default'])('Localizer');
var CHANGE_EVENT = 'change';

var Localizer = (function () {
  /**
   * @constructor
   */

  function Localizer() {
    _classCallCheck(this, Localizer);

    this.defaultLang = 'en-US';
    this.supportedLocales = ['en-US', 'es-ES', 'fr'];
    this.prioritizedLangs = [];

    this._env = new _l20n.Env(this.defaultLang, _l20n.fetch.bind(null, null));
    this._ctx = this._env.createContext(['localization/{locale}.l20n']);

    this._emitter = new _eventemitter2.EventEmitter2();
  }

  /**
   * Starts the localization logic by doing the initial l20n fetching and
   * listening for relevant events on the window when language options change
   * @param callback {Function} The function to callback after we've fetched
   *        langs and built our localized entities
   */

  _createClass(Localizer, [{
    key: 'start',
    value: function start(callback) {
      debug('start', arguments);

      this._prioritizeLocales();
      this._ctx.fetch(this.prioritizedLangs).then(callback);

      window.addEventListener('languagechange', this._onLangChange.bind(this));
      document.addEventListener('additionallanguageschange', this._onLangChange.bind(this));
    }

    /**
     * Prioritizes the `supportedLocales` array based on `navigator.languages`.
     * Specifically we find the language of highest priority in the
     * `navigator.languages' matched against our `supportedLocales` (in priority
     * order) and moves the first match to the front of the array. This function
     * also produces the value for the `prioritizedLangs` array.
     * @private
     */
  }, {
    key: '_prioritizeLocales',
    value: function _prioritizeLocales() {
      debug('_prioritizeLocales');

      for (var i = 0; i < navigator.languages.length; i++) {
        var idx = this.supportedLocales.indexOf(navigator.languages[i]);
        if (idx !== -1) {
          var supportedLocale = this.supportedLocales.splice(idx, 1);
          this.supportedLocales.unshift(supportedLocale.pop());
          break;
        }
      }

      this.prioritizedLangs = this.supportedLocales.map(function (lang) {
        return { code: lang, src: 'app' };
      });
    }

    /**
     * Language change handler
     * @private
     */
  }, {
    key: '_onLangChange',
    value: function _onLangChange() {
      debug('_onLangChange', navigator.languages);

      this._prioritizeLocales();
      this._ctx.fetch(this.prioritizedLangs).then(this.emitChange.bind(this));
    }

    /**
     * A shortcut for resolving entities.
     * @param entity {String|Array<String>} Either a String representing the
     *        entity to resolve or an Array of strings. If `entity` is an array
     *        it's items may be simple strings or a two item array representing
     *        an entity and an arguments object.
     * @param args {Object} Optional. When the `entity` argument is a String, the
     *        objecet of arguments passed to resolve.
     * @return {Promise}
     */
  }, {
    key: 'resolve',
    value: function resolve(entity) {
      var _this = this;

      var args = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      debug('resolve', arguments);

      if (Object.prototype.toString.call(entity) === '[object Array]') {
        return Promise.all(entity.map(function (ent) {
          if (Object.prototype.toString.call(ent) === '[object Array]') {
            return _this._ctx.resolveEntity(_this.prioritizedLangs, ent[0], ent[1]);
          } else {
            return _this._ctx.resolveEntity(_this.prioritizedLangs, ent, {});
          }
        }));
      } else {
        return this._ctx.resolveEntity(this.prioritizedLangs, entity, args);
      }
    }

    /**
     * Localizes a document or shadow root
     * @param doc {document|shadowRoot} An object with a querySelectorAll interface
     */
  }, {
    key: 'localize',
    value: function localize(doc) {
      var _this2 = this;

      debug('localize', arguments);

      var l10nEls = doc.querySelectorAll('[data-l10n-id]');

      var _loop = function (i) {
        var el = l10nEls[i];
        var key = el.getAttribute('data-l10n-id');

        _this2.resolve(key).then(function (entity) {
          el.innerHTML = entity.value;

          // TODO Reza: The attribute names here need logic from l20n that
          //            translate camelCase into attribute-case
          if (entity.attrs) {
            for (var attr in entity.attrs) {
              el.setAttribute(attr, entity.attrs[attr]);
            }
          }
        });
      };

      for (var i = 0; i < l10nEls.length; i++) {
        _loop(i);
      }
    }

    /**
     * Gets the highest priority locale
     */
  }, {
    key: 'getPriorityLocale',
    value: function getPriorityLocale() {
      debug('getPriorityLocale');

      return this.supportedLocales[0];
    }

    /**
     * Gets the highest priority lang from the highest priority locale
     */
  }, {
    key: 'getPriorityLang',
    value: function getPriorityLang() {
      debug('getPriorityLocale');

      return this.supportedLocales[0].split('-')[0];
    }

    /**
     * Emits a change event
     */
  }, {
    key: 'emitChange',
    value: function emitChange() {
      debug('emitChange');

      this._emitter.emit(CHANGE_EVENT);
    }

    /**
     * Adds a change listener to the emitter
     * @param func {Function} The function to add
     */
  }, {
    key: 'addChangeListener',
    value: function addChangeListener(func) {
      debug('addChangeListener', arguments);

      this._emitter.addListener(CHANGE_EVENT, func);
    }

    /**
     * Adds a change listener to the emitter
     * @param func {Function} The function to remove
     */
  }, {
    key: 'removeChangeListener',
    value: function removeChangeListener(func) {
      debug('removeChangeListener', arguments);

      this._emitter.removeListener(CHANGE_EVENT, func);
    }
  }]);

  return Localizer;
})();

exports['default'] = new Localizer();
module.exports = exports['default'];

},{"debug":1,"eventemitter2":4,"l20n":9}],37:[function(require,module,exports){
/* global speechSynthesis, SpeechGrammarList, SpeechRecognition, SpeechSynthesisUtterance */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _localizer = require('./localizer');

var _localizer2 = _interopRequireDefault(_localizer);

var debug = (0, _debug2['default'])('Vaani');

var Vaani = (function () {
  /**
   * @constructor
   * @param options {Object}
   * @param options.grammar {String} The JSGF 1.0 grammar list to be
   *        used by the speech recognition library
   * @param options.interpreter {Function} The function to call after
   *        speech recognition is attempted
   * @param options.onSay {Function} The function to call when say executes
   * @param options.onSayDone {Function} The function to call when say finishes
   * @param options.onListen {Function} The function to call when listen executes
   * @param options.onListenDone {Function} The function to call when listen finishes
   */

  function Vaani() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Vaani);

    debug('constructor', arguments);

    if (!options.hasOwnProperty('grammar')) {
      throw Error('Missing required `grammar` option.');
    }

    if (!options.hasOwnProperty('interpreter')) {
      throw Error('Missing required `interpreter` option.');
    }

    this.speechGrammarList = new SpeechGrammarList();
    this.speechGrammarList.addFromString(options.grammar, 1);
    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.lang = 'en-US';
    this.speechRecognition.grammars = this.speechGrammarList;
    this.isSpeaking = false;
    this.isListening = false;
    this.alertStart = document.createElement('audio');
    this.alertStart.src = '/assets/audios/alert_start.opus';
    this.alertStop = document.createElement('audio');
    this.alertStop.src = '/assets/audios/alert_end.opus';
    this._synthesisWasCanceled = false;
    this._interpreter = options.interpreter;
    this._onSay = options.onSay;
    this._onSayDone = options.onSayDone;
    this._onListen = options.onListen;
    this._onListenDone = options.onListenDone;
    this._interpretingCommand = false;
    this._audioEl = undefined;
  }

  /**
   * Says a sentence and optionally wait for a response
   * @param sentence {String} The sentence to be spoken
   * @param waitForResponse {Boolean} Indicates we will wait for a
   *        response after the sentence has been said
   */

  _createClass(Vaani, [{
    key: 'say',
    value: function say(sentence, waitForResponse) {
      var _this = this;

      debug('say', arguments);

      if (this._onSay) {
        this._onSay(sentence, waitForResponse);
      }

      if (waitForResponse) {
        this._interpretingCommand = true;
      }

      this.isSpeaking = true;
      this._synthesisWasCanceled = false;

      var lang = _localizer2['default'].getPriorityLang();
      var sayItProud;

      // Reza: This is a temporary solution to help dev in the browser
      if (navigator.userAgent.indexOf('Mobile') === -1) {
        sayItProud = function () {
          _this._audioEl = document.createElement('audio');

          var url = 'http://speechan.cloudapp.net/weblayer/synth.ashx';
          url += '?lng=' + lang;
          url += '&msg=' + sentence;

          _this._audioEl.src = url;
          _this._audioEl.setAttribute('autoplay', 'true');
          _this._audioEl.addEventListener('ended', function () {
            _this.isSpeaking = false;

            if (_this._onSayDone) {
              _this._onSayDone(sentence, waitForResponse);
            }

            if (waitForResponse) {
              _this.listen();
            }
          });
        };
      } else {
        sayItProud = function () {
          var utterance = new SpeechSynthesisUtterance(sentence);

          utterance.lang = lang;
          utterance.addEventListener('end', function () {
            _this.isSpeaking = false;

            if (_this._onSayDone) {
              _this._onSayDone(sentence, waitForResponse);
            }

            if (waitForResponse && !_this._synthesisWasCanceled) {
              _this.listen();
            }
          });

          speechSynthesis.speak(utterance);
        };
      }

      // Aus: Wait an extra 100ms for the audio output to stabilize off
      setTimeout(sayItProud, 100);
    }

    /**
     * Listen for a response from the user
     */
  }, {
    key: 'listen',
    value: function listen() {
      var _this2 = this;

      debug('listen');

      if (this._onListen) {
        this._onListen();
      }

      this.alertStart.play();

      setTimeout(function () {
        _this2.isListening = true;
        _this2.speechRecognition.start();
      }, 100);

      this.speechRecognition.onresult = function (event) {
        _this2.isListening = false;
        _this2._interpretingCommand = false;
        _this2.alertStop.play();

        if (_this2._onListenDone) {
          _this2._onListenDone();
        }

        var transcript = '';
        var partialTranscript = '';
        // var confidence = 0;
        // var isFinal = false;

        // Assemble the transcript from the array of results
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // isFinal = true;
            transcript += event.results[i][0].transcript;
            // Aus: This is useless right now but the idea is we wouldn't
            // always complete the action or command requested if the
            // confidence level is too low
            // confidence = event.results[i][0].confidence;
          } else {
              partialTranscript += event.results[i][0].transcript;
              // Aus: In theory, partial transcripts shouldn't be used
              // as their confidence will always be lower than a final
              // transcript. We should ask the user to repeat what they
              // want when all we have is a partial transcript with 'low'
              // confidence.
              // confidence = event.results[i][0].confidence;
            }
        }

        // Aus: We'll fall back to the partial transcript if there
        // isn't a final one for now. It actually looks like we never
        // get a final transcript currently.
        var usableTranscript = transcript || partialTranscript;

        // Aus: Ugh. This is really crappy error handling
        if (usableTranscript === 'ERROR') {
          var getOffMyLawn = new Error('Unrecognized speech.');
          _this2._interpreter(getOffMyLawn);
        } else if (usableTranscript.length) {
          _this2._interpreter(null, usableTranscript);
        }
      };
    }

    /**
     * Cancels speech synthesis and/or recognition
     */
  }, {
    key: 'cancel',
    value: function cancel() {
      debug('cancel');

      if (this.isListening) {
        this.speechRecognition.abort();
      }

      if (this.isSpeaking) {
        if (this._audioEl) {
          this._audioEl.pause();
        } else {
          this._synthesisWasCanceled = true;
          speechSynthesis.cancel();
        }
      }

      this.isSpeaking = false;
      this.isListening = false;
    }
  }]);

  return Vaani;
})();

exports['default'] = Vaani;
module.exports = exports['default'];

},{"./localizer":36,"debug":1}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var AppStore = (function (_BaseStore) {
  _inherits(AppStore, _BaseStore);

  /**
   * @constructor
   */

  function AppStore() {
    _classCallCheck(this, AppStore);

    _get(Object.getPrototypeOf(AppStore.prototype), 'constructor', this).call(this);

    this.state = {
      appsGrammar: undefined,
      contacts: [],
      contactsGrammar: undefined
    };
  }

  /**
   * Gets the apps grammar state
   */

  _createClass(AppStore, [{
    key: 'getAppsGrammar',
    value: function getAppsGrammar() {
      return this.state.appsGrammar;
    }

    /**
     * Updates the apps grammar state and emits a change event
     */
  }, {
    key: 'updateAppsGrammar',
    value: function updateAppsGrammar(grammar) {
      this.state.appsGrammar = grammar;

      this.emitChange();
    }

    /**
     * Gets the contacts grammar state
     */
  }, {
    key: 'getContactsGrammar',
    value: function getContactsGrammar() {
      return this.state.contactsGrammar;
    }

    /**
     * Updates the contacts grammar state and emits a change event
     */
  }, {
    key: 'updateContactsGrammar',
    value: function updateContactsGrammar(grammar) {
      this.state.contactsGrammar = grammar;

      this.emitChange();
    }

    /**
     * Gets the contacts state
     */
  }, {
    key: 'getContacts',
    value: function getContacts() {
      return this.state.contacts;
    }

    /**
     * Updates the contacts state and emits a change event
     */
  }, {
    key: 'updateContacts',
    value: function updateContacts(contacts) {
      this.state.contacts = contacts;

      this.emitChange();
    }
  }]);

  return AppStore;
})(_libBaseStore2['default']);

exports['default'] = new AppStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var CallContactStore = (function (_BaseStore) {
  _inherits(CallContactStore, _BaseStore);

  /**
   * @constructor
   */

  function CallContactStore() {
    _classCallCheck(this, CallContactStore);

    _get(Object.getPrototypeOf(CallContactStore.prototype), 'constructor', this).call(this);

    this.state = {
      contact: undefined,
      text: ''
    };
  }

  /**
   * Gets the contact state
   */

  _createClass(CallContactStore, [{
    key: 'getContact',
    value: function getContact() {
      return this.state.contact;
    }

    /**
     * Updates the contact state and emits a change event
     */
  }, {
    key: 'updateContact',
    value: function updateContact(contact) {
      this.state.contact = contact;

      this.emitChange();
    }

    /**
     * Gets the text state
     */
  }, {
    key: 'getText',
    value: function getText() {
      return this.state.text;
    }

    /**
     * Updates the text state and emits a change event
     */
  }, {
    key: 'updateText',
    value: function updateText(text) {
      this.state.text = text;

      this.emitChange();
    }
  }]);

  return CallContactStore;
})(_libBaseStore2['default']);

exports['default'] = new CallContactStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var CallNumberStore = (function (_BaseStore) {
  _inherits(CallNumberStore, _BaseStore);

  /**
   * @constructor
   */

  function CallNumberStore() {
    _classCallCheck(this, CallNumberStore);

    _get(Object.getPrototypeOf(CallNumberStore.prototype), 'constructor', this).call(this);

    this.state = {
      text: '',
      phoneNumber: ''
    };
  }

  /**
   * Gets the text state
   */

  _createClass(CallNumberStore, [{
    key: 'getText',
    value: function getText() {
      return this.state.text;
    }

    /**
     * Updates the text state and emits a change event
     */
  }, {
    key: 'updateText',
    value: function updateText(text) {
      this.state.text = text;

      this.emitChange();
    }

    /**
     * Gets the phone number state
     */
  }, {
    key: 'getPhoneNumber',
    value: function getPhoneNumber() {
      return this.state.phoneNumber;
    }

    /**
     * Updates the phone number state and emits a change event
     */
  }, {
    key: 'updatePhoneNumber',
    value: function updatePhoneNumber(phone) {
      this.state.phoneNumber = phone;

      this.emitChange();
    }
  }]);

  return CallNumberStore;
})(_libBaseStore2['default']);

exports['default'] = new CallNumberStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var DisplayStore = (function (_BaseStore) {
  _inherits(DisplayStore, _BaseStore);

  /**
   * @constructor
   */

  function DisplayStore() {
    _classCallCheck(this, DisplayStore);

    _get(Object.getPrototypeOf(DisplayStore.prototype), 'constructor', this).call(this);

    this.state = {
      activeView: undefined
    };
  }

  /**
   * Gets the active view state
   */

  _createClass(DisplayStore, [{
    key: 'getActiveView',
    value: function getActiveView() {
      return this.state.activeView;
    }

    /**
     * Updates the text state and emits a change event
     */
  }, {
    key: 'updateActiveView',
    value: function updateActiveView(view) {
      this.state.activeView = view;

      this.emitChange();
    }
  }]);

  return DisplayStore;
})(_libBaseStore2['default']);

exports['default'] = new DisplayStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var FirstTimeUseStore = (function (_BaseStore) {
  _inherits(FirstTimeUseStore, _BaseStore);

  /**
   * @constructor
   */

  function FirstTimeUseStore() {
    _classCallCheck(this, FirstTimeUseStore);

    _get(Object.getPrototypeOf(FirstTimeUseStore.prototype), 'constructor', this).call(this);

    this.state = {
      launchCount: -1,
      tour: {
        inFlight: false,
        current: 1,
        total: 3
      }
    };
  }

  /**
   * Gets the launch count state
   */

  _createClass(FirstTimeUseStore, [{
    key: 'getLaunchCount',
    value: function getLaunchCount() {
      return this.state.launchCount;
    }

    /**
     * Gets the tour state
     */
  }, {
    key: 'getTourInfo',
    value: function getTourInfo() {
      return this.state.tour;
    }

    /**
     * Updates the launch count state and emits a change event
     */
  }, {
    key: 'updateLaunchCount',
    value: function updateLaunchCount(count) {
      this.state.launchCount = count;

      this.emitChange();
    }

    /**
     * Updates the tour step and flight status and then emits a change event
     */
  }, {
    key: 'updateTourInfo',
    value: function updateTourInfo(step, isInFlight) {
      this.state.tour.current = step;
      this.state.tour.inFlight = isInFlight;

      this.emitChange();
    }
  }]);

  return FirstTimeUseStore;
})(_libBaseStore2['default']);

exports['default'] = new FirstTimeUseStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var StandingByStore = (function (_BaseStore) {
  _inherits(StandingByStore, _BaseStore);

  /**
   * @constructor
   */

  function StandingByStore() {
    _classCallCheck(this, StandingByStore);

    _get(Object.getPrototypeOf(StandingByStore.prototype), 'constructor', this).call(this);

    this.state = {
      text: ''
    };
  }

  /**
   * Gets the text state
   */

  _createClass(StandingByStore, [{
    key: 'getText',
    value: function getText() {
      return this.state.text;
    }

    /**
     * Updates the text state and emits a change event
     */
  }, {
    key: 'updateText',
    value: function updateText(text) {
      this.state.text = text;

      this.emitChange();
    }
  }]);

  return StandingByStore;
})(_libBaseStore2['default']);

exports['default'] = new StandingByStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var TalkieStore = (function (_BaseStore) {
  _inherits(TalkieStore, _BaseStore);

  /**
   * @constructor
   */

  function TalkieStore() {
    _classCallCheck(this, TalkieStore);

    _get(Object.getPrototypeOf(TalkieStore.prototype), 'constructor', this).call(this);

    this.state = {
      mode: 'none',
      activeAnimation: 'none'
    };
  }

  /**
   * Gets the mode state
   */

  _createClass(TalkieStore, [{
    key: 'getMode',
    value: function getMode() {
      return this.state.mode;
    }

    /**
     * Gets the active animation state
     */
  }, {
    key: 'getActiveAnimation',
    value: function getActiveAnimation() {
      return this.state.activeAnimation;
    }

    /**
     * Updates the mode state and emits a change event
     */
  }, {
    key: 'updateMode',
    value: function updateMode(mode) {
      this.state.mode = mode;

      this.emitChange();
    }

    /**
     * Updates the active animation state and emits a change event
     */
  }, {
    key: 'updateActiveAnimation',
    value: function updateActiveAnimation(animation) {
      this.state.activeAnimation = animation;

      this.emitChange();
    }
  }]);

  return TalkieStore;
})(_libBaseStore2['default']);

exports['default'] = new TalkieStore();
module.exports = exports['default'];

},{"../lib/base-store":33}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _libBaseStore = require('../lib/base-store');

var _libBaseStore2 = _interopRequireDefault(_libBaseStore);

var ToolbarStore = (function (_BaseStore) {
  _inherits(ToolbarStore, _BaseStore);

  /**
   * @constructor
   */

  function ToolbarStore() {
    _classCallCheck(this, ToolbarStore);

    _get(Object.getPrototypeOf(ToolbarStore.prototype), 'constructor', this).call(this);

    this.state = {
      activeItem: ''
    };
  }

  /**
   * Gets the active item state
   */

  _createClass(ToolbarStore, [{
    key: 'getActiveItem',
    value: function getActiveItem() {
      return this.state.activeItem;
    }

    /**
     * Updates the active item state and emits a change event
     */
  }, {
    key: 'updateActiveItem',
    value: function updateActiveItem(item) {
      this.state.activeItem = item;

      this.emitChange();
    }
  }]);

  return ToolbarStore;
})(_libBaseStore2['default']);

exports['default'] = new ToolbarStore();
module.exports = exports['default'];

},{"../lib/base-store":33}]},{},[31]);
