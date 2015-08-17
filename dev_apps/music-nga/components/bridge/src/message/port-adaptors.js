'use strict';

/**
 * Dependencies
 * @ignore
 */

var deferred = require('../utils').deferred;

const MSG = 'message';

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[PortAdaptor]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Creates a
 * @param  {[type]} target  [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
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
 * for which the default port-adaptor
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
  HTMLIFrameElement(iframe) {
    debug('HTMLIFrameElement');
    var ready = windowReady(iframe);
    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => {
          iframe.contentWindow.postMessage(data, '*', transfer);
        });
      }
    };
  },

  /**
   * Create a BroadcastChannel port-adaptor.
   *
   * @param {Object} channel
   * @param {[type]} options [description]
   */
  BroadcastChannel(channel, options) {
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

  Window(win, options) {
    debug('Window');
    var ready = options && options.ready || win === self;
    ready = ready ? Promise.resolve() : windowReady(win);

    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => win.postMessage(data, '*', transfer));
      }
    };
  },

  SharedWorker(worker) {
    worker.port.start();
    return new PortAdaptor(worker.port);
  },

  SharedWorkerGlobalScope() {
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
      parent.postMessage('load', '*');
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