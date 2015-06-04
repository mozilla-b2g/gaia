(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var sww = require('./lib/sww.js');

self.ServiceWorkerWare = sww.ServiceWorkerWare;
self.StaticCacher = sww.StaticCacher;
self.SimpleOfflineCache = sww.SimpleOfflineCache;

},{"./lib/sww.js":5}],2:[function(require,module,exports){
'use strict';

// Inspired by expressjs and shed (https://github.com/wibblymat/shed)
function Router(options) {
  this.options = options;
  this.stack = [];
}

Router.prototype.ALL_METHODS = 'all';
Router.prototype.methods = ['get', 'post', 'put', 'delete', 'head',
  Router.prototype.ALL_METHODS];

/**
 * Add a new route to the stack.
 * @param method (String) http verb to handle the request
 * @param path (Regexp) string or regexp to match urls
 * @param handler (Function) payload to be executed if url matches.
 */
Router.prototype.add = function r_add(method, path, handler) {
  method = this._sanitizeMethod(method);
  this.stack.push({
    method: method,
    path: new RegExp(path),
    handler: handler
  });
};

/**
 * Create the utility methods .get .post ... etc.
 */
Router.prototype.methods.forEach(function(method) {
  Router.prototype[method] = function(path, handler) {
    return this.add(method, path, handler);
  };
});

Router.prototype.proxyMethods = function r_proxyPrototype(obj) {
  var self = this;
  this.methods.forEach(function(method) {
    obj[method] = function(path, mw) {
      if (typeof mw.onFetch !== 'function' && typeof mw !== 'function') {
        throw new Error('This middleware cannot handle fetch request');
      }
      var handler = typeof mw.onFetch !== 'undefined' ?
        mw.onFetch.bind(mw) : mw;
      self.add(method, path, handler);
    };
  });
};

/**
 * Matches the given url and methods with the routes stored in
 * the stack.
 */
Router.prototype.match = function r_match(method, url) {
  method = this._sanitizeMethod(method);
  var matches = [];

  var self = this;
  this.stack.forEach(function eachRoute(route) {
    if (!(method === route.method || route.method === self.ALL_METHODS)) {
      return;
    }

    if (route.path.test(url)) {
      matches.push(route.handler);
    }
  });

  return matches;
};

Router.prototype._sanitizeMethod = function(method) {
  var sanitizedMethod = method.toLowerCase().trim();
  if (this.methods.indexOf(sanitizedMethod) === -1) {
    throw new Error('Method "' + method + '" is not supported');
  }
  return sanitizedMethod;
};

module.exports = Router;

},{}],3:[function(require,module,exports){
'use strict';

var cacheHelper = require('sw-cache-helper');

var debug = 0 ? console.log.bind(console, '[SimpleOfflineCache]') :
 function(){};

// Default Match options, not exposed.
var DEFAULT_MATCH_OPTIONS = {
  ignoreSearch: false,
  ignoreMethod: false,
  ignoreVary: false
};
var DEFAULT_MISS_POLICY = 'fetchAndChace';
// List of different policies
var MISS_POLICIES = [
  DEFAULT_MISS_POLICY
];


/**
 * Constructor for the middleware that serves the content of a
 * cache specified by it's name.
 * @param {string} cacheName Name of the cache that will be serving the content
 * @param {object} [options] Object use to setup the cache matching alternatives
 * @param {string} [missPolicy] Name of the policy to follow if a request miss
 *                 when hitting the cache.
 */
function SimpleOfflineCache(cacheName, options, missPolicy) {
  this.cacheName = cacheName || cacheHelper.defaultCacheName;
  this.options = options || DEFAULT_MATCH_OPTIONS;
  this.missPolicy = missPolicy || DEFAULT_MISS_POLICY;
  if (MISS_POLICIES.indexOf(this.missPolicy) === -1) {
    console.warn('Policy ' + missPolicy + ' not supported');
    this.missPolicy = DEFAULT_MISS_POLICY;
  }
}

SimpleOfflineCache.prototype.onFetch = function soc_onFetch(request, response) {
  // If another middleware layer already have a response, the simple cache
  // just pass through the response and does nothing.
  if (response) {
    return Promise.resolve(response);
  }

  var clone = request.clone();
  var _this = this;
  debug('Handing fetch event: %s', clone.url);
  return this.ensureCache().then(function(cache) {
    return cache.match(request.clone(), _this.options).then(function(res) {
      if (res) {
        return res;
      }

      // So far we just support one policy
      switch(_this.missPolicy) {
        case DEFAULT_MISS_POLICY:
          return cacheHelper.fetchAndCache(request, cache);
      }
    });
  });
};

SimpleOfflineCache.prototype.ensureCache = function soc_ensureCache() {
  return cacheHelper.getCache(this.cacheName).then(function(cache) {
    return cache;
  });
};

module.exports = SimpleOfflineCache;

},{"sw-cache-helper":6}],4:[function(require,module,exports){
'use strict';

var CacheHelper = require('sw-cache-helper');

function StaticCacher(fileList) {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    throw new Error('Invalid file list');
  }
  this.files = fileList;
}

StaticCacher.prototype.onInstall = function sc_onInstall() {
  var self = this;
  return CacheHelper.getDefaultCache().then(function(cache) {
    return CacheHelper.addAll(cache, self.files);
  });
};

module.exports = StaticCacher;

},{"sw-cache-helper":6}],5:[function(require,module,exports){
/* global fetch, BroadcastChannel, clients */
'use strict';

var debug = 1 ? console.log.bind(console, '[ServiceWorkerWare]') : function(){};
var StaticCacher = require('./staticcacher.js');
var SimpleOfflineCache = require('./simpleofflinecache.js');
var Router = require('./router.js');

function DEFAULT_FALLBACK_MW(request, response) {
  return fetch(request);
}

function ServiceWorkerWare(fallbackMw) {
  this.middleware = [];
  this.router = new Router({});
  this.router.proxyMethods(this);
  this.fallbackMw = fallbackMw || DEFAULT_FALLBACK_MW;
}

ServiceWorkerWare.prototype.init = function sww_init() {
  // lifecycle events
  addEventListener('install', this);
  addEventListener('activate', this);
  addEventListener('beforeevicted', this);
  addEventListener('evicted', this);

  // network events
  addEventListener('fetch', this);

  // misc events
  addEventListener('message', this);
  // XXX: Add default configuration
};

/**
 * Handle and forward all events related to SW
 */
ServiceWorkerWare.prototype.handleEvent = function sww_handleEvent(evt) {
  debug('Event received: ' + evt.type);
  switch(evt.type) {
    case 'install':
      this.onInstall(evt);
      break;
    case 'fetch':
      this.onFetch(evt);
      break;
    case 'activate':
    case 'message':
    case 'beforeevicted':
    case 'evicted':
      this.forwardEvent(evt);
      break;
    default:
      debug('Unhandled event ' + evt.type);
  }
};

ServiceWorkerWare.prototype.onFetch = function sww_onFetch(evt) {
  var steps = this.router.match(evt.request.method, evt.request.url);

  // Push the fallback middleware at the end of the list.
  // XXX bug 1165860: Decorating fallback MW with `stopIfResponse` until
  // 1165860 lands
  steps.push((function(req, res) {
    if (res) {
      return Promise.resolve(res);
    }
    return this.fallbackMw(req, res);
  }).bind(this));

  evt.respondWith(steps.reduce(function(prevTaskPromise, currentTask) {
    debug('Applying middleware ' + currentTask.name);
    return prevTaskPromise.then(currentTask.bind(currentTask,
       evt.request.clone()));
  }, Promise.resolve(null)));
};

/**
 * Walk all the middle ware installed asking if they have prerequisites
 * (on the way of a promise to be resolved) when installing the SW
 */
ServiceWorkerWare.prototype.onInstall = function sww_oninstall(evt) {
  var waitingList = [];
  this.middleware.forEach(function(mw) {
    if (typeof mw.onInstall !== 'undefined') {
      waitingList.push(mw.onInstall());
    }
  });
  evt.waitUntil(Promise.all(waitingList));
};

/**
 * Register a new middleware layer, they will treat the request in
 * the order that this layers have been defined.
 * A middleware layer can behave in the ServiceWorker in two ways:
 *  - Listening to SW lifecycle events (install, activate, message).
 *  - Handle a request.
 * To handle each case (or both) the middleware object should provide
 * the following methods:
 * - on<SW LiveCiclyeEvent>: for listening to SW lifeciclye events
 * - onFetch: for handling fetch urls
 */
ServiceWorkerWare.prototype.use = function sww_use() {
  // If the first parameter is not a function we will understand that
  // is the path to handle, and the handler will be the second parameter
  if (arguments.length === 0) {
    throw new Error('No arguments given');
  }
  var mw = arguments[0];
  var path = '/';
  var method = this.router.ALL_METHODS;
  if (typeof mw === 'string') {
    path = arguments[0];
    mw = arguments[1];
    var kind = typeof mw;
    if (!mw || !(kind === 'object' || kind === 'function')) {
      throw new Error('No middleware specified');
    }
    if (Router.prototype.methods.indexOf(arguments[2]) !== -1) {
      method = arguments[2];
    }
  }

  this.middleware.push(mw);
  // Add to the router just if middleware object is able to handle onFetch
  // or if we have a simple function
  var handler = null;
  if (typeof mw.onFetch === 'function') {
    handler = mw.onFetch.bind(mw);
  } else if (typeof mw === 'function') {
    handler = mw;
  }
  if (handler) {
    this.router.add(method, path, handler);
  }
  // XXX: Attaching the broadcastMessage to mw that implements onMessage.
  // We should provide a way to get a reference to the SWW object and do
  // the broadcast from there
  if (typeof mw.onMessage === 'function') {
    mw.broadcastMessage = this.broadcastMessage;
  }
};


/**
 * Forward the event received to any middleware layer that has a 'on<Event>'
 * handler
 */
ServiceWorkerWare.prototype.forwardEvent = function sww_forwardEvent(evt) {
  this.middleware.forEach(function(mw) {
    var handlerName = 'on' + evt.type.replace(/^[a-z]/,
      function(m){
         return m.toUpperCase();
      }
    );
    if (typeof mw[handlerName] !== 'undefined') {
      mw[handlerName].call(mw, evt);
    }
  });
};

/**
 * Broadcast a message to all worker clients
 * @param msg Object the message
 * @param channel String (Used just in Firefox Nightly) using broadcastchannel
 * api to deliver the message, this parameter can be undefined as we listen for
 * a channel undefined in the client.
 */
ServiceWorkerWare.prototype.broadcastMessage = function sww_broadcastMessage(
  msg, channel) {
  // XXX: Until https://bugzilla.mozilla.org/show_bug.cgi?id=1130685 is fixed
  // we can use BroadcastChannel API in Firefox Nightly
  if (typeof BroadcastChannel === 'function') {
    var bc = new BroadcastChannel(channel);
    bc.postMessage(msg);
    bc.close();
    return Promise.resolve();
  } else {
    // This is suppose to be the way of broadcasting a message, unfortunately
    // it's not working yet in Chrome Canary
    return clients.matchAll().then(function(consumers) {
      consumers.forEach(function(client) {
        client.postMessage(msg);
      });
    });
  }
};

module.exports = {
  ServiceWorkerWare: ServiceWorkerWare,
  StaticCacher: StaticCacher,
  SimpleOfflineCache: SimpleOfflineCache
};

},{"./router.js":2,"./simpleofflinecache.js":3,"./staticcacher.js":4}],6:[function(require,module,exports){
/* global caches, fetch, Promise, Request, module*/
(function() {
  'use strict';

  var CacheHelper = {
    defaultCacheName: 'offline',
    getCache: function getCache(name) {
      return caches.open(name);
    },
    getDefaultCache: function getDefaultCache() {
      return this.getCache(this.defaultCacheName);
    },
    fetchAndCache: function fetchAndChache(request, cache) {
      return fetch(request.clone()).then(function(response) {
        var clone = response.clone();
        if (parseInt(clone.status) < 400) {
          cache.put(request.clone(), response.clone());
        }

        return response.clone();
      });
    },
    addAll: function addAll(cache, urls) {
      if (!cache) {
        throw new Error('Need a cache to store things');
      }
      // Polyfill until chrome implements it
      if (typeof cache.addAll !== 'undefined') {
        return cache.addAll(urls);
      }

      var promises = [];
      var self = this;
      urls.forEach(function(url) {
        promises.push(self.fetchAndCache(new Request(url), cache));
      });

      return Promise.all(promises);
    }
  };

  module.exports = CacheHelper;
})();

},{}]},{},[1])


//# sourceMappingURL=sww.js.map