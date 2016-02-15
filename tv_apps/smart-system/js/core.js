/* global BaseModule */
'use strict';

(function(exports) {
  /**
   * This is the bootstrap module of the system app.
   * It is responsible to instantiate and start the other core modules
   * and sub systems per API.
   */
  var Core = function() {
  };

  Core.SUB_MODULES = [
    'LayoutManager',
    'AppCore'
  ];

  Core.SERVICES = [
    'getAPI'
  ];

  BaseModule.create(Core, {
    name: 'Core',

    REGISTRY: {
      'mozSettings': 'SettingsCore'
    },

    getAPI: function(api) {
      for (var key in this.REGISTRY) {
        if (api === BaseModule.lowerCapital(key.replace('moz', ''))) {
          return navigator[key];
        }
      }
      return false;
    },

    _start: function() {
      var promises = [];
      for (var api in this.REGISTRY) {
        this.debug('Detecting API: ' + api +
          ' and corresponding module: ' + this.REGISTRY[api]);
        if (navigator[api]) {
          this.debug('API: ' + api + ' found, starting the handler.');
          promises.push(this.startAPIHandler(api, this.REGISTRY[api]));
        } else {
          this.debug('API: ' + api + ' not found, skpping the handler.');
        }
      }
      return Promise.all(promises);
    },

    startAPIHandler: function(api, handler) {
      return new Promise(function(resolve, reject) {
        BaseModule.lazyLoad([handler]).then(function() {
          var moduleName = BaseModule.lowerCapital(handler);
          this[moduleName] =
            BaseModule.instantiate(handler, navigator[api], this);
          if (!this[moduleName]) {
            reject();
            return;
          }
          if (this[moduleName].start) {
            this[moduleName].start().then(() => resolve());
          } else {
            resolve();
          }
        }.bind(this));
      }.bind(this));
    },

    _stop: function() {
      for (var api in this.REGISTRY) {
        var moduleName =
            this.REGISTRY[api].charAt(0).toUpperCase() +
            this.REGISTRY[api].slice(1);
        this[moduleName] && this[moduleName].stop();
      }
    }
  });
}(window));
