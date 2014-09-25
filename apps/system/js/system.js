/* global LazyLoader */
'use strict';

(function(window) {
  var DEBUG = true;
  /**
   * Shared some global property.
   * @type {Object}
   * @module  System
   */
  window.System = {
    /**
     * Store the services in a json format
     * serverName => {
     *   query: function() {},
     *   lock: function() {}
     * }
     * @type {Map}
     */
    _servers: new Map(),

    _services: new Map(),

    _requestsByService: new Map(),

    _requestsByServer: new Map(),

    request: function(service) {
      var requestItems = service.split(':');
      var args = Array.prototype.slice.call(arguments, 1);
      if (requestItems.length === 2) {
        var serverName = requestItems[0];
        var serviceName = requestItems[1];
        if (this._servers.get(serverName)) {
          this.debug('service: ' + serviceName +
            ' is online, perform the request with ' + args.concat());
          var self = this;
          return new Promise(function(resolve) {
            resolve(self._servers.get(serverName)[serviceName].apply(
              self._servers.get(serverName), args));
          });
        } else {
          var self = this;
          return new Promise(function(resolve, reject) {
            self.debug('service: ' + service + ' is offline, queue the task.');
            if (!self._requestsByServer.has(serverName)) {
              self._requestsByServer.set(serverName, []);
            }
            self._requestsByServer.get(serverName).push({
              service: serviceName,
              resolve: resolve,
              args: args
            });
          });
        }
      } else {
        if (this._services.has(service)) {
          var server = this._services.get(service);
          this.debug('service [' + service +
            '] provider [' + server.name + '] is online, perform the task.');
          return new Promise(function(resolve, reject) {
            resolve(server[service].apply(server, args));
          });
        } else {
          this.debug('service: ' + service + ' is offline, queue the task.');
          var self = this;
          var promise = new Promise(function(resolve) {
            self.debug('storing the requests...');
            if (!self._requestsByService.has(service)) {
              self._requestsByService.set(service, []);
            }
            self._requestsByService.get(service).push({
              service: service,
              args: args,
              resolve: resolve
            });
          });
          return promise;
        }
      }
    },

    register: function(service, server) {
      var self = this;
      if (!this._servers.has(server.name)) {
        this._servers.set(server.name, server);
      }
      this.debug((server.name || '(Anonymous)') +
        ' is registering service: [' + service + ']');
      this._services.set(service, server);
      this.debug('checking awaiting requests by server..');
      if (this._requestsByServer.has(server.name)) {
        this._requestsByServer.get(server.name).forEach(function(request) {
          self.debug('resolving..', server,
            server.name, request.service, request.args);
          request.resolve(server[request.service].apply(server, request.args));
        });
        this._requestsByServer.delete(server.name);
      }
      this.debug('checking awaiting requests by service..');
      if (this._requestsByService.has(service)) {
        this._requestsByService.get(service).forEach(function(request) {
          self.debug('resolving..', server, request.service);
          request.resolve(server[request.service].apply(server, request.args));
        });
        this._requestsByService.delete(service);
      }
    },

    unregister: function(service, server) {
      var s = this._servers.get(server.name);
      if (s) {
        s.splice(s.indexOf(service), 1);
      }
      var se = this._services.get(service);
      if (se && server === se) {
        this._services.delete(service);
      }
    },

    'API': {
      'nfc': navigator.mozNFC,
      'bluetooth': navigator.mozBluetooth,
      'apps': navigator.mozApps,
      'telephony': navigator.mozTelephony,
      'mobileConnections': navigator.mozMobileConnections,
      'wifi': navigator.wifiManager
    },

    getAPI: function(name) {
      return this.API[name];
    },

    /**
     * Create a module based on base module and give properties.
     * @param  {Function} constructor The constructor function.
     * @param  {Object} properties
     *                  The property object which includes getter/setter.
     * @param  {Object} prototype
     *                  The prototype which will be injected into the class.
     */
    create: function(constructor, properties, prototype) {
      constructor.prototype = Object.create(BaseModule.prototype, properties);
      constructor.prototype.constructor = constructor;
      if (prototype) {
        BaseModule.mixin(constructor.prototype, prototype);
      }
      return constructor;
    },

    lazyLoad: function(array, callback) {
      var fileList = [];
      array.forEach(function(module) {
        fileList.push(this.object2fileName(module));
      }, this);
      LazyLoader.load(fileList, callback);
    },

    lowerCapital: function(str) {
      return str.charAt(0).toLowerCase() + str.slice(1);
    },

    object2fileName: function(strings) {
      var i = 0;
      var ch = '';
      while (i <= strings.length) {
        var character = strings.charAt(i);
        if (character !== character.toLowerCase()) {
          if (ch === '') {
            ch += character.toLowerCase();
          } else {
            ch += '_' + character.toLowerCase();
          }
        } else {
          ch += character;
        }
        i++;
      }
      return '/js/' + ch + '.js';
    },

    get applicationReady() {
      return window.applications && window.applications.ready;
    },

    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     *
     * XXX: AppWindowManager should register a query interface
     * for isBusyLoading query.
     */
    isBusyLoading: function() {
      var app = window.AppWindowManager.getActiveApp();
      return app && !app.loaded;
    },

    /**
     * Record the start time of the system for later debugging usage.
     * @access private
     * @type {Number}
     * @memberOf module:System
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset.
     * @memberOf module:System
     */
    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    /**
     * Enable slow transition or not for debugging.
     * Note: Turn on this would make app opening/closing durations become 3s.
     * @type {Boolean}
     * @memberOf module:System
     */
    slowTransition: false,

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[System]' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    },

    _dump: function sys__dump() {
      try {
        throw new Error('dump');
      } catch (e) {
        console.log(e.stack);
      }
    },

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: false,
        detail: detail
      });
      window.dispatchEvent(evt);
    },

    get runningFTU() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuRunning();
      }
    },

    get isUpgrading() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuUpgrading();
      }
    },

    get locked() {
      // Someone ask this state too early.
      if ('undefined' === typeof window.lockScreenWindowManager) {
        return false;
      } else {
        return window.lockScreenWindowManager.states.active;
      }
    },

    get manifestURL() {
      return window.location.href.replace('index.html', 'manifest.webapp');
    }
  };
}(this));
