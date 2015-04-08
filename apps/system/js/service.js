'use strict';

(function(exports) {
  var DEBUG = false;
  /**
   * Shared some global property.
   * @type {Object}
   * @module Service
   */
  exports.Service = {
    /**
     * Stores the servers by the server name.
     * @type {Map}
     */
    _providers: new Map(),

    /**
     * Stores the services by the services name.
     * @type {Map}
     */
    _services: new Map(),

    /**
     * Stores the awaiting consumers by the service name.
     * @type {Map}
     */
    _requestsByService: new Map(),

    /**
     * Stores the awaiting consumers by the server name.
     * @type {Map}
     */
    _requestsByProvider: new Map(),

    /**
     * Request a service and get a promise.
     * The service name may include the name of server or not if it is unique.
     * @example
     * Service.request('locked').then(function() {});
     * Service.request('addObserver', 'test.enabled', this).then(function() {});
     * Service.request('StatusBar:height').then(function() {});
     *
     * @param  {String} service Service name
     * @return {Promise}
     */
    request: function(service) {
      var requestItems = service.split(':');
      var args = Array.prototype.slice.call(arguments, 1);
      var self = this;
      this.debug(requestItems);
      if (requestItems.length > 1) {
        var serverName = requestItems[0];
        var serviceName = requestItems[1];
        if (this._providers.get(serverName)) {
          this.debug('service: ' + serviceName +
            ' is online, perform the request with ' + args.concat());
          return new Promise(function(resolve, reject) {
            var returnValue = self._providers.get(serverName)[serviceName]
              .apply(self._providers.get(serverName), args);
            self._unwrapPromise(returnValue, resolve, reject);
          });
        } else {
          return new Promise(function(resolve, reject) {
            self.debug('service: ' + service + ' is offline, queue the task.');
            if (!self._requestsByProvider.has(serverName)) {
              self._requestsByProvider.set(serverName, []);
            }
            self._requestsByProvider.get(serverName).push({
              service: serviceName,
              resolve: resolve,
              reject: reject,
              args: args
            });
          });
        }
        return;
      }
      if (this._services.has(service)) {
        var server = this._services.get(service);
        this.debug('service [' + service +
          '] provider [' + server.name + '] is online, perform the task.');
        return new Promise(function(resolve, reject) {
          var returnValue = resolve(server[service].apply(server, args));
          self._unwrapPromise(returnValue, resolve, reject);
        });
      } else {
        this.debug('service: ' + service + ' is offline, queue the task.');
        var promise = new Promise(function(resolve, reject) {
          self.debug('storing the requests...');
          if (!self._requestsByService.has(service)) {
            self._requestsByService.set(service, []);
          }
          self._requestsByService.get(service).push({
            service: service,
            args: args,
            resolve: resolve,
            reject: reject
          });
        });
        return promise;
      }
    },

    /**
     * Register an asynchronous service.
     * If there is any client awaiting this service, they will be executed after
     * registration.
     * @param  {String} service Service name
     * @param  {Object} server  The server object which has the service.
     */
    register: function(service, server) {
      var self = this;
      if (!this._providers.has(server.name)) {
        this._providers.set(server.name, server);
      }
      this.debug((server.name || '(Anonymous)') +
        ' is registering service: [' + service + ']');

      this.debug('checking awaiting requests by server..');
      if (this._requestsByProvider.has(server.name)) {
        this._requestsByProvider.get(server.name).forEach(function(request) {
          self.debug('resolving..', server,
            server.name, request.service, request.args);
          var returnValue = (typeof(server[request.service]) === 'function') ?
            server[request.service].apply(server, request.args) :
            server[request.service];
          self._unwrapPromise(returnValue, request.resolve, request.reject);
        });
        this._requestsByProvider.delete(server.name);
      }

      if (!this._services.has(service)) {
        this._services.set(service, server);
      } else {
        this.debug('the service [' + service + '] has already been ' +
          'registered by other server:', this._services.get(service).name);
        return;
      }

      this.debug('checking awaiting requests by service..');
      if (this._requestsByService.has(service)) {
        this._requestsByService.get(service).forEach(function(request) {
          self.debug('resolving..', server, request.service);
          var returnValue = server[request.service].apply(server, request.args);
          self._unwrapPromise(returnValue, request.resolve, request.reject);
        });
        this._requestsByService.delete(service);
      }
    },

    /* Helper function to unwrap the promise in service request */
    _unwrapPromise: function(returnValue, resolve, reject) {
      if (returnValue && returnValue.then && returnValue.catch) {
        this.debug('return value is promise', returnValue);
        returnValue.then(function(result) {
          resolve(result);
        }).catch(function(error) {
          reject(error);
        });
      } else {
        this.debug('return value is non-promise', returnValue);
        resolve(returnValue);
      }
    },

    /**
     * Unregister an asynchronous service.
     * @param  {String} service The name of the service
     * @param  {Object} server  The server
     */
    unregister: function(service, server) {
      this._providers.delete(server.name);
      var se = this._services.get(service);
      if (se && server === se) {
        this._services.delete(service);
      }
    },

    _states: new Map(),
    _statesByState: new Map(),

    registerState: function(state, provider) {
      this._states.set(provider.name, provider);
      this._statesByState.set(state, provider);
    },

    unregisterState: function(state, provider) {
      this._states.delete(provider.name);
      var machine = this._statesByState.get(state);
      if (machine === provider) {
        this._statesByState.delete(state);
      }
    },

    /**
     * Synchonously query the state of specific state machine.
     * If the state machine is not started,
     * you will get undefined.
     *
     * @example
     * Service.query('FtuLauncher.isFtuRunning');
     * Service.query('isFtuRunning');
     * 
     * @param  {String} state The machine name and the state name.
     * @return {String|Boolean|Number|Object}
     */
    query: function(stateString) {
      this.debug(stateString);
      var args = stateString.split('.');
      var state, provider;
      if (args.length > 1) {
        provider = this._states.get(args[0]);
        state = args[1];
      } else {
        state = args[0];
        provider = this._statesByState.get(state);
      }
      if (!provider) {
        this.debug('Provider not ready, return undefined state.');
        return undefined;
      }
      if (typeof(provider[state]) === 'function') {
        var functionArgs = Array.prototype.slice.call(arguments, 1);
        return provider[state].apply(provider, functionArgs);
      } else {
        return provider[state];
      }
    },

    /**
     * XXX: applications should register a service
     * for ready check by Service.register('ready', applications).
     */
    get applicationReady() {
      return window.applications && window.applications.ready;
    },

    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     *
     * XXX: AppWindowManager should register a service
     * for isBusyLoading query by
     * Service.register('isBusyLoading', appWindowManager).
     */
    isBusyLoading: function() {
      var app = this.currentApp;
      return app && !app.loaded;
    },

    /**
     * Record the start time of the system for later debugging usage.
     * @access private
     * @type {Number}
     * @memberOf module:Service
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset.
     * @memberOf module:Service
     */
    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + window.Service.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * XXX: FtuLauncher should register 'isFtuRunning' service.
     */
    get runningFTU() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuRunning();
      }
    },

    /**
     * XXX: LockscreenWindowManager should register 'locked' service.
     */
    get locked() {
      // Someone ask this state too early.
      if ('undefined' === typeof window.lockScreenWindowManager) {
        return false;
      } else {
        return window.lockScreenWindowManager.isActive();
      }
    },

    get manifestURL() {
      return window.location.href.replace('index.html', 'manifest.webapp');
    },

    get currentApp() {
      if ('undefined' === typeof window.appWindowManager) {
        return null;
      } else {
        return window.appWindowManager.getActiveApp();
      }
    }
  };
})(window);
