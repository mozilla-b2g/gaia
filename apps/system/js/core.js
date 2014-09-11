/* global System */
'use strict';

(function(exports) {
  /**
   * This is the core part of the system app.
   * It is responsible to instantiate and start the other core modules.
   */
  var Core = function() {
  };
  // XXX: Move shared file name here.
  Core.IMPORTS = [];
  // XXX: Move non-API sensitive modules here.
  Core.SUB_MODULES = [];
  Core.SUB_MODULE_PARENT = window;

  System.create(Core, {}, {
    name: 'Core',

    REGISTRY: {
      'mozApps': 'AppCore',
      'mozMobileConnections': 'MobileConnectionCore',
      'mozNfc': 'NfcCore',
      'mozWifiManager': 'WifiCore',
      'mozBluetooth': 'BluetoothCore',
      'battery': 'BatteryCore',
      'mozPower': 'PowerCore',
      'mozVoicemail': 'VoicemailCore',
      'mozInputMethod': 'InputMethodCore',
      'mozDownloadManager': 'DownloadCore',
      'mozIccManager': 'IccCore',
      'mozCellbroadcast': 'CellbroadcastCore'
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
      if (!window[handler]) {
        this.debug('Module: ' + handler + ' not found, lazy loading.');
        System.lazyLoad([handler], function() {
          this.startAPIHandler(api, handler);
        }.bind(this));
        return;
      }
      var moduleName = System.lowerCapital(handler);
      if (typeof(window[handler]) == 'function') {
        try {
        this[moduleName] =
          new window[handler](navigator[api], this);
          this[moduleName].start && this[moduleName].start();
        } catch (e) {
          console.log(handler, e);
        }
      } else {
        window[handler].init && window[handler].init();
      }
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
  exports.Core = Core;
}(window));
