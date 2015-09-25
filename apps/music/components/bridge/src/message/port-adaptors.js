'use strict';

/**
 * Dependencies
 * @ignore
 */

var deferred = require('../utils').deferred;

/**
 * Message event name
 * @type {String}
 */
const MSG = 'message';

/**
 * Mini Logger
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[PortAdaptor]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Creates a bridge.js port abstraction
 * with a consistent interface.
 *
 * @param  {Object} target
 * @param  {Object} options
 * @return {PortAdaptor}
 */
module.exports = function create(target, options) {
  if (!target) throw error(1);
  if (isEndpoint(target)) return target;
  var type = target.constructor.name;
  var CustomAdaptor = adaptors[type];
  debug('creating port adaptor for', type);
  if (CustomAdaptor) return CustomAdaptor(target, options);
  return new PortAdaptor(target, options);
};

/**
 * The default adaptor.
 * @private
 */
function PortAdaptor(target) {
  debug('PortAdaptor');
  this.target = target;
}

var PortAdaptorProto = PortAdaptor.prototype = {
  constructor: PortAdaptor,
  addListener(callback) { on(this.target, MSG, callback); },
  removeListener(callback) { off(this.target, MSG, callback); },
  postMessage(data, transfer) { this.target.postMessage(data, transfer); }
};

/**
 * A registry of specific adaptors
 * for when the default PortAdaptor
 * is not suitable.
 *
 * @type {Object}
 */
var adaptors = {

  /**
   * Create an HTMLIframeElement PortAdaptor.
   *
   * @param {HTMLIframeElement} iframe
   */
  'HTMLIFrameElement': function(iframe) {
    debug('HTMLIFrameElement');
    var ready = windowReady(iframe);
    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => postMessageSync(iframe.contentWindow, data, transfer));
      }
    };
  },

  /**
   * Create a BroadcastChannel port-adaptor.
   *
   * @param {Object} channel
   * @param {[type]} options [description]
   */
  'BroadcastChannel': function(channel, options) {
    debug('BroadcastChannel', channel.name);
    var receiver = options && options.receiver;
    var ready = options && options.ready;
    var sendReady = () => {
      channel.postMessage('ready');
      debug('sent ready');
    };

    ready = ready || receiver
      ? Promise.resolve()
      : setupSender();

    if (receiver) {
      sendReady();
      on(channel, MSG, e => {
        if (e.data != 'ready?') return;
        sendReady();
      });
    }

    function setupSender() {
      debug('setup sender');
      var promise = deferred();

      channel.postMessage('ready?');
      on(channel, MSG, function fn(e) {
        if (e.data != 'ready') return;
        off(channel, MSG, fn);
        debug('BroadcastChannel: ready');
        promise.resolve();
      });

      return promise.promise;
    }

    return {
      target: channel,
      addListener: PortAdaptorProto.addListener,
      removeListener: PortAdaptorProto.removeListener,
      postMessage(data, transfer) {
        ready.then(() => channel.postMessage(data, transfer));
      }
    };
  },

  'Window': function(win, options) {
    debug('Window');
    var ready = options && options.ready
      || win === parent // parent always ready
      || win === self; // self always ready

    ready = ready ? Promise.resolve() : windowReady(win);

    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => postMessageSync(win, data, transfer));
      }
    };
  },

  'SharedWorker': function(worker) {
    worker.port.start();
    return new PortAdaptor(worker.port);
  },

  'SharedWorkerGlobalScope': function() {
    var ports = [];

    return {
      postMessage() {}, // noop
      addListener(callback, listen) {
        this.onconnect = e => {
          var port = e.ports[0];
          ports.push(port);
          port.start();
          listen(port);
        };

        on(self, 'connect', this.onconnect);
      },

      removeListener(callback, unlisten) {
        off(self, 'connect', this.onconnect);
        ports.forEach(port => {
          port.close();
          unlisten(port);
        });
      }
    };
  }
};

/**
 * Return a Promise that resolves
 * when a Window is ready to start
 * recieving messages.
 *
 * @param  {Window} target
 * @return {Promise}
 */
var windowReady = (function() {
  if (typeof window == 'undefined') return;
  var parent = window.opener || window.parent;
  var domReady = 'DOMContentLoaded';
  var windows = new WeakSet();

  // Side B: Dispatches 'load'
  // from the child window
  if (parent != self) {
    on(window, domReady, function fn() {
      off(window, domReady, fn);
      postMessageSync(parent, 'load');
    });
  }

  // Side A: Listens for 'ready' in the parent window
  on(self, 'message', e => e.data == 'load' && windows.add(e.source));

  return target => {
    var win = target.contentWindow || target;

    // Ready if the target has previously announces itself ready
    if (windows.has(win)) return Promise.resolve();

    // Ready if the target is the parent window
    if (win == window.parent) return Promise.resolve();

    var def = deferred();
    debug('waiting for Window to be ready ...');
    on(window, 'message', function fn(e) {
      if (e.data == 'load' && e.source == win) {
        debug('Window ready');
        off(window, 'message', fn);
        def.resolve();
      }
    });
    return def.promise;
  };
})();

/**
 * Utils
 * @ignore
 */

function isEndpoint(thing) {
  return !!(thing && thing.addListener);
}

// Shorthand
function on(target, name, fn) { target.addEventListener(name, fn); }
function off(target, name, fn) { target.removeEventListener(name, fn); }

/**
 * Dispatches syncronous 'message'
 * event on a Window.
 *
 * We use this because standard
 * window.postMessage() gets blocked
 * until the main-thread is free.
 *
 * @param  {Window} win
 * @param  {*} data
 * @private
 */
function postMessageSync(win, data, transfer) {
  var event = {
    data: data,
    source: self
  };

  if (transfer) event.ports = transfer;

  win.dispatchEvent(new MessageEvent('message', event));
}

/**
 * Creates new `Error` from registery.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */
function error(id) {
  return new Error({
    1: 'target is undefined'
  }[id]);
}
