/* global BaseModule, ScreenManager, LazyLoader, RemoteDebugger,
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
  Core.IMPORTS = [
    'js/media_playback.js'
  ];

  Core.SUB_MODULES = [
    'SleepMenu',
    'OrientationManager',
    'HierarchyManager',
    'FeatureDetector',
    'SystemDialogManager',
    'WallpaperManager',
    'LayoutManager',
    'SoftwareButtonManager',
    'AppCore'
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
      ScreenManager && ScreenManager.turnScreenOn();
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

      this.loadWhenIdle([
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
        'CellBroadcastSystem', // Blocked by integration test.
        'CpuManager',
        'HomeGesture',
        'SourceView',
        'TtlView',
        'MediaRecording',
        'QuickSettings',
        'Shortcuts',
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
        'CarrierInfoNotifier'
        // XXX: We should move this into mobileConnectionCore,
        // but integration tests running on desktop without mobileConnection
        // is testing this.
      ]).then(function() {
        this.startAPIHandlers();
        return Promise.resolve();
      }.bind(this)).then(function() {
        return LazyLoader.load([
          'js/download/download_manager.js',
          'js/payment.js',
          'js/identity.js',
          'js/devtools/logshake.js',
          'js/devtools/remote_debugger.js',
          'js/devtools/developer_hud.js',
          'shared/js/date_time_helper.js'
        ]);
      }.bind(this)).then(function() {
        this.remoteDebugger = new RemoteDebugger();
        this.developerHud = new DeveloperHud();
        this.developerHud.start();
      }.bind(this));
    },

    startAPIHandlers: function() {
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
      return new Promise(function(resolve, reject) {
        BaseModule.lazyLoad([handler]).then(function() {
          var moduleName = BaseModule.lowerCapital(handler);
          if (window[handler] && typeof(window[handler]) === 'function') {
            this[moduleName] = new window[handler](navigator[api], this);
          } else {
            this[moduleName] =
              BaseModule.instantiate(handler, navigator[api], this);
          }
          if (!this[moduleName]) {
            reject();
            return;
          }
          this[moduleName].start && this[moduleName].start();
          resolve();
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
