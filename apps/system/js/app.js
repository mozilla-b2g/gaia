/* global System */
'use strict';

(function(exports) {
  /**
   * This is the core part of the system app.
   * It is responsible to instantiate and start the other core modules.
   */
  var App = function() {
  };
  App.prototype = {
    _DEBUG: true,

    debug: function awm_debug() {
      if (this._DEBUG) {
        console.log('[SystemApp]' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    // This is environmental modules which don't rely
    // on specific API.
    MODULES: [
      'LayoutManager',
      'PermissionManager',
      'RemoteDebugger',
      'SleepMenu',
      'SoftwareButtonManager',
      'WallpaperManager',
      'VisibilityManager',
      'TTLView',
      'SourceView',
      'RemoteDebugger',
      'Places',
      'Accessibility',
      'DeveloperHUD',
      'HomeGesture',
      'InternetSharing',
      'Storage',
      'TelephonySettings'
    ],

    REGISTRY: {
      'mozApps': 'ApplicationsMediator',
      'mozMobileConnections': 'MobileConnectionsMediator',
      'mozNfc': 'NFCMediator',
      'mozWifiManager': 'WiFiMediator',
      'mozBluetooth': 'BluetoothMediator',
      'battery': 'BatteryManager',
      'mozPower': 'ScreenManager',
      'mozVoicemail': 'Voicemail',
      'mozInputMethod': 'KeyboardManager'
    },

    API_RETRY_COUNT: 20,
    API_RETRY_ENABLED: true,

    start: function() {
      this.MODULES.forEach(function(module) {
        this.debug('Detecting Module: ' + module);
        if (window[module]) {
          var moduleName = System.lowerCapital(module);
          window[moduleName] = new window[module](this);
          window[moduleName].start && window[moduleName].start();
        } else {
          this.debug('Module: ' + module + ' not found..');
        }
      }, this);

      // With all important event handlers in place, we can now notify
      // Gecko that we're ready for certain system services to send us
      // messages (e.g. the radio).
      // Note that shell.js starts listen for the mozContentEvent event at
      // mozbrowserloadstart,
      // which sometimes does not happen till window.onload.
      var evt = new CustomEvent('mozContentEvent',
          { bubbles: true, cancelable: false,
            detail: { type: 'system-message-listener-ready' } });
      window.dispatchEvent(evt);

      for (var api in this.REGISTRY) {
        this.debug('Detecting API: ' + api +
          ' and corresponding module: ' + this.REGISTRY[api]);
        if (navigator[api]) {
          this.startAPIHandler(api, this.REGISTRY[api]);
        } else {
          this.debug('API: ' + api + ' not found..retry on going.');
          this.retryAPI(api);
        }
      }
    },

    startAPIHandler: function(api, handler) {
      if (!window[handler]) {
        this.debug('Module: ' + handler + ' not found..');
        return;
      }
      var moduleName = System.lowerCapital(handler);
      this[moduleName] =
        new window[handler](navigator[api], this);
      this[moduleName].start();
    },

    retryAPI: function(api) {
      if (!this.API_RETRY_ENABLED) {
        return;
      }
      // XXX: Bug 1051708
      // navigator.mozApps is undefined from booting until 3secs.
      (function(self, API) {
        var count = self.API_RETRY_COUNT;
        var interval = window.setInterval(function() {
          if (navigator[API]) {
            window.clearInterval(interval);
            self.debug('API: ' + API + ' found, starting the handler.');
            self.startAPIHandler(API, self.REGISTRY[API]);
          } else if (count < 0) {
            window.clearInterval(interval);
            self.debug('API: ' + API + ' retry count over..');
          } else {
            self.debug('API: ' + API + ' not found yet..' + count);
          }
          count--;
        }, 300);
      }(this, api));
    },

    stop: function() {
      for (var api in this.REGISTRY) {
        var moduleName =
            this.REGISTRY[api].charAt(0).toUpperCase() +
            this.REGISTRY[api].slice(1);
        this[moduleName] && this[moduleName].stop();
      }
    }
  };
  exports.App = App;
}(window));
