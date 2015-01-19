/* global BaseModule, ScreenManager, LazyLoader, RemoteDebugger */
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

  Core.SIDE_MODULES = [
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
    'AppMigrator',
    'TextSelectionDialog',
    'ExternalStorageMonitor',
    'DeviceStorageWatcher',
    'SleepMenu',
    'AppUsageMetrics',
    'CellBroadcastSystem',
    'CpuManager',
    'HomeGesture',
    'SourceView',
    'TtlView',
    'MediaRecording',
    'QuickSettings',
    'Shortcuts',
    'UsbStorage',
    'MobileIdManager', // nonblocking
    'FindmydeviceLauncher', // nonblocking
    'FxAccountsManager', // nonblocking
    'FxAccountsUI', // nonblocking
    'NetworkActivity',
    'CrashReporter',
    'Screenshot',
    'SoundManager',
    'CustomDialogService'
  ];

  Core.SUB_MODULES = [
    'OrientationManager',
    'HierarchyManager',
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
    DEBUG: true,
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

    __sub_module_loaded: function() {
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

      var self = this;
      var idleObserver = {
        time: 10,
        onidle: function() {
          navigator.removeIdleObserver(idleObserver);
          self._startSideModules();
          // XXX: find a proper launcher for these modules
          LazyLoader.load([
            'js/download/download_manager.js',
            'js/payment.js',
            'js/identity.js',
            'js/devtools/logshake.js',
            'js/devtools/remote_debugger.js',
            'shared/js/date_time_helper.js'
          ]).then(function() {
            self.remoteDebugger = new RemoteDebugger();
            // self.remoteDebugger.start();
          });
        }
      };
      navigator.addIdleObserver(idleObserver);
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
