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

  BaseModule.create(Core, {
    name: 'Core',

    REGISTRY: {
      'mozSettings': 'SettingsCore'
    },

    _start: function() {
      for (var api in this.REGISTRY) {
        this.debug('Detecting API: ' + api +
          ' and corresponding module: ' + this.REGISTRY[api]);
        if (navigator[api]) {
          this.debug('API: ' + api + ' found, starting the handler.');
          this.startAPIHandler(api, this.REGISTRY[api]);
        } else {
          this.debug('API: ' + api + ' not found, skpping the handler.');
        }
      }
    },

    startAPIHandler: function(api, handler) {
      BaseModule.lazyLoad([handler]).then(function() {
        var moduleName = BaseModule.lowerCapital(handler);
        if (window[handler] && typeof(window[handler]) === 'function') {
          this[moduleName] = new window[handler](navigator[api], this);
        } else {
          this[moduleName] =
            BaseModule.instantiate(handler, navigator[api], this);
        }
        if (!this[moduleName]) {
          return;
        }
        this[moduleName].start && this[moduleName].start();
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
