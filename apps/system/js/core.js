/* global BaseModule, LazyLoader, RemoteDebugger,
          DeveloperHud */
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
    'SleepMenu',
    'OrientationManager',
    'HierarchyManager',
    'FeatureDetector',
    'SystemDialogManager',
    'WallpaperManager',
    'LayoutManager',
    'SoftwareButtonManager',
    'AppCore',
    'ScreenManager'
  ];

  Core.SERVICES = [
    'getAPI'
  ];

  BaseModule.create(Core, {
    DEBUG: false,
    name: 'Core',

    REGISTRY: {
      'mozTelephony': 'TelephonyMonitor',
      'mozBluetooth': 'BluetoothCore',
      'mozMobileConnections': 'MobileConnectionCore',
      'mozNfc': 'NfcCore',
      'battery': 'BatteryOverlay',
      'mozWifiManager': 'Wifi',
      'mozVoicemail': 'Voicemail'
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
      // We need to be sure to get the focus in order to wake up the screen
      // if the phone goes to sleep before any user interaction.
      // Apparently it works because no other window
      // has the focus at this point.
      window.focus();
      // With all important event handlers in place, we can now notify
      // Gecko that we're ready for certain system services to send us
      // messages (e.g. the radio).
      // Note that shell.js starts listen for the mozContentEvent event at
      // mozbrowserloadstart, which sometimes does not happen till
      // window.onload.
      this.publish('mozContentEvent', {
        type: 'system-message-listener-ready'
      }, true);

      return this.loadWhenIdle([
        'Statusbar',
        'HardwareButtons',
        'CameraTrigger',
        'NotificationScreen',
        'AirplaneMode',
        'NotificationsSystemMessage',
        'Accessibility',
        'AlarmMonitor',
        'DebuggingMonitor',
        'TimeCore',
        'GeolocationCore',
        'TetheringMonitor',
        'UsbCore',
        'TextSelectionDialog',
        'ExternalStorageMonitor',
        'DeviceStorageWatcher',
        'AppUsageMetrics',
        'CellBroadcastSystem',
        // This should be loaded by MobileConnectionCore.
        // However, the integration test is testing this on desktop b2g
        // which has no navigator.mozMobileConnections.
        'CpuManager',
        'HomeGesture',
        'SourceView',
        'TtlView',
        'MediaRecording',
        'QuickSettings',
        'UsbStorage',
        'MobileIdManager',
        'FindmydeviceLauncher',
        'FxAccountsManager',
        'FxAccountsUI',
        'NetworkActivity',
        'CrashReporter',
        'Screenshot',
        'SoundManager',
        'CustomDialogService',
        'CarrierInfoNotifier',
        'AboutServiceWorkersProxy',
        'MultiScreenController'
        // XXX: We should move CarrierInfoNotifier into mobileConnectionCore,
        // but integration tests running on desktop without mobileConnection
        // is testing this.
      ]).then(() => {
        return Promise.all([
          this.startAPIHandlers(),
          LazyLoader.load([
            'js/download/download_manager.js',
            'js/payment.js',
            'js/identity.js',
            'js/devtools/logshake.js',
            'js/devtools/remote_debugger.js',
            'js/devtools/developer_hud.js',
            'js/devtools/devtools_auth.js'
          ])
        ]).then(() => {
          this.remoteDebugger = new RemoteDebugger();
          this.developerHud = new DeveloperHud();
          return Promise.resolve(this.developerHud.start());
        });
      });
    },

    startAPIHandlers: function() {
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
      return BaseModule.lazyLoad([handler]).then(() => {
        var moduleName = BaseModule.lowerCapital(handler);
        if (window[handler] && typeof(window[handler]) === 'function') {
          this[moduleName] = new window[handler](navigator[api], this);
        } else if (BaseModule.defined(handler)) {
          this[moduleName] =
            BaseModule.instantiate(handler, navigator[api], this);
        } else if (window[handler]) {
          this[moduleName] = window[handler];
        } else {
          return Promise.reject('Cannot find handler for ' + api);
        }
        return this[moduleName].start();
      });
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
