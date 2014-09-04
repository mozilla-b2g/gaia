/* global System, BaseModule */
'use strict';

(function(exports) {
  /**
   * This is the core part of the system app.
   * It is responsible to instantiate and start the other core modules.
   */
  var Core = function() {
  };
  Core.prototype = Object.create(BaseModule.prototype);
  Core.prototype.constructor = Core;
  Core.IMPORTS = [
    'shared/js/nfc_utils.js',
    'shared/js/gesture_detector.js',
    'shared/js/settings_listener.js',
    'shared/js/custom_dialog.js',
    'shared/js/notification_helper.js',
    'shared/js/async_storage.js',
    'shared/js/mobile_operator.js',
    'shared/js/manifest_helper.js'
  ];
  // This is environmental modules which don't rely on specific API.
  Core.SUB_MODULES =
    [
      'InitLogoHandler',
      'HardwareButtons',
      'LayoutManager',
      'OrientationManager',
      'PermissionManager',
      'RemoteDebugger',
      'SleepMenu',
      'SoftwareButtonManager',
      'WallpaperManager',
      'VisibilityManager',
      'SourceView',
      'RemoteDebugger',
      'Places',
      'Accessibility',
      'HomeGesture',
      'InternetSharing',
      'Storage',
      'TelephonySettings',
      'Statusbar',
      'UtilityTray'
    ];

  Core.SUB_MODULE_PARENT = window;

  var proto = {
    name: 'Core',

    REGISTRY: {
      'mozApps': 'AppsHandler',
      'mozMobileConnections': 'MobileConnectionsHandler',
      'mozNfc': 'NFCHandler',
      'mozWifiManager': 'WifiHandler',
      'mozBluetooth': 'BluetoothHandler',
      'battery': 'BatteryHandler',
      'mozPower': 'ScreenManager',
      'mozVoicemail': 'Voicemail',
      'mozInputMethod': 'KeyboardManager',
      'mozDownloadManager': 'DownloadManager',
      'mozIccManager': 'Icc'
    },

    API_RETRY_COUNT: 20,
    API_RETRY_ENABLED: true,

    _start: function() {
      // With all important event handlers in place, we can now notify
      // Gecko that we're ready for certain system services to send us
      // messages (e.g. the radio).
      // Note that shell.js starts listen for the mozContentEvent event at
      // mozbrowserloadstart,
      // which sometimes does not happen till window.onload.
      this.publish('mozContentEvent',
        { type: 'system-message-listener-ready' },
        true);

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
  };
  BaseModule.mixin(Core.prototype, proto);
  exports.Core = Core;
}(window));
