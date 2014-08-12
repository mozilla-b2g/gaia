/* global System, BaseModule, SettingsListener */
'use strict';

(function(exports) {
  var WifiHandler = function(wifiManager) {
    this.wifiManager = wifiManager;
  };
  WifiHandler.prototype = Object.create(BaseModule.prototype);
  WifiHandler.prototype.constructor = WifiHandler;
  WifiHandler.EVENTS = [
    'screenchange',
    'wakelock',
    'batterychargingchange',
  ];

  WifiHandler.SETTINGS = [
    'wifi.screen_off_timeout',
    'wifi.disabled_by_wakelock',
    'wifi-enabled'
  ];

  var prototype = {
    name: 'WifiHandler',

    wifiWakeLocked: false,

    wifiEnabled: true,

    wifiDisabledByWakelock: false,

    // Without an wifi wake lock, wait for screenOffTimeout milliseconds
    // to turn wifi off after the conditions are met.
    // If it's set to 0, wifi will never be turn off.
    screenOffTimeout: 0,

    // if Wifi is enabled but disconnected, try to scan for networks every
    // kScanInterval ms.
    kScanInterval: 20 * 1000,

    _scanTimer: null,

    '_observe_wifi.screen_off_timeout': function(value) {
      this.screenOffTimeout = value;
    },

    '_observe_wifi.disabled_by_wakelock': function(value) {

    },

    '_observe_wifi-enabled': function(value) {
      if (!this.wifiManager && value) {
        this.wifiEnabled = false;

        SettingsListener.getSettingsLock().set({
          'wifi.enabled': false
        });
        return;
      }

      this.wifiEnabled = value;

      clearTimeout(this._scanTimer);
      if (!value) {
        return;
      }

      // If wifi is enabled but disconnected.
      // we would need to call getNetworks() continuously
      // so we could join known wifi network
      var self = this;
      this._scanTimer = setInterval(function wifi_scan() {
        if (self.wifiManager.connection.status == 'disconnected') {
          self.wifiManager.getNetworks();
        }
      });
    },

    _handle_wakelock: function(evt) {
      var topic = evt.detail.topic;
      if (topic !== 'wifi') {
        return;
      }

      var state = evt.detail.state;
      this.wifiWakeLocked = (state == 'locked-foreground' ||
                             state == 'locked-background');

      this.maybeToggleWifi();
    },

    _start: function wf_init() {
      if (!window.navigator.mozSettings) {
        return;
      }

      if (!this.wifiManager) {
        return;
      }

      // If wifi is turned off by us and phone got rebooted,
      // bring wifi back.
      var name = 'wifi.disabled_by_wakelock';
      var req = SettingsListener.getSettingsLock().get(name);
      req.onsuccess = function gotWifiDisabledByWakelock() {
        if (!req.result[name]) {
          return;
        }

        // Re-enable wifi and reset wifi.disabled_by_wakelock
        // SettingsListener.getSettingsLock() always return invalid lock
        // in our usage here.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=793239
        var lock = navigator.mozSettings.createLock();
        lock.set({ 'wifi.enabled': true });
        lock.set({ 'wifi.disabled_by_wakelock': false });
      };

      var self = this;
      var wifiManager = this.wifiManager;
      // when wifi is really enabled,
      // emit event to notify QuickSettings
      wifiManager.onenabled = function onWifiEnabled() {
        self.publish('-enabled');
      };

      // when wifi is really disabled,
      // emit event to notify QuickSettings
      wifiManager.ondisabled = function onWifiDisabled() {
        self.publish('-disabled');
      };

      // when wifi status change,
      // emit event to notify StatusBar/UpdateManager
      wifiManager.onstatuschange = function onWifiDisabled() {
        self.publish('-statuschange');
      };
    },

    _handle_screenchange: function wifi_handleEvent() {
      this.maybeToggleWifi();
    },

    // Check the status of screen, wifi wake lock and power source
    // and turn on/off wifi accordingly
    maybeToggleWifi: function wifi_maybeToggleWifi() {
      // Keep CPU awake to ensure the flow is done.
      var cpuLock = navigator.requestWakeLock('cpu');

      var releaseCpuLock = function() {
        if (cpuLock) {
          cpuLock.unlock();
          cpuLock = null;
        }

        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = 0;
        }
      };

      // To prevent the CPU awake forever (if anything goes run)
      var timeoutId = window.setTimeout(releaseCpuLock, 30000);

      // Do nothing if we are being disabled.
      if (!this.screenOffTimeout) {
        releaseCpuLock();
        return;
      }

      var battery = window.navigator.battery;
      var wifiManager = this.wifiManager;
      if (!battery || !wifiManager ||
          // We don't need to do anything
          // if wifi is not disabled by system app.
          (!this.wifiEnabled && !this.wifiDisabledByWakelock)) {
        releaseCpuLock();
        return;
      }

      var lock = SettingsListener.getSettingsLock();
      // Let's quietly turn off wifi if there is no wake lock and
      // the screen is off and we are not on a power source.
      // But if wifi wake lock is held,
      // turn wifi into power save mode instead of turning wifi off.
      if (!System.screenOn && !battery.charging) {
        // Wifi wake lock is held while screen and wifi are off,
        // turn on wifi and
        // get into power save mode.
        if (!this.wifiEnabled && this.wifiWakeLocked) {
          lock.set({ 'wifi.enabled': true });
          window.addEventListener('wifi-enabled', function() {
            wifiManager.setPowerSavingMode(true);
            releaseCpuLock();
          });
          return;
        }

        // We still need to turn of wifi even if there is no Alarm API
        if (!navigator.mozAlarms) {
          console.warn('Turning off wifi without sleep timer because' +
            ' Alarm API is not available');
          this.sleep();
          releaseCpuLock();
          return;
        }

        // Set System Message Handler,
        // so we will be notified when alarm goes off.
        this.setSystemMessageHandler();

        // Start with a timer, only turn off wifi till timeout.
        var date = new Date(Date.now() + this.screenOffTimeout);
        var self = this;
        var req = navigator.mozAlarms.add(date, 'ignoreTimezone', 'wifi-off');
        req.onsuccess = function wifi_offAlarmSet() {
          self._alarmId = req.result;
          releaseCpuLock();
        };
        req.onerror = function wifi_offAlarmSetFailed() {
          console.warn('Fail to set wifi sleep timer on Alarm API. ' +
            'Turn off wifi immediately.');
          self.sleep();
          releaseCpuLock();
        };
      }
      // ... and quietly turn it back on or cancel the timer otherwise
      else {
        if (this._alarmId) {
          navigator.mozAlarms.remove(this._alarmId);
          this._alarmId = null;
        }

        // If wifi is enabled but disconnected.
        // we would need to call getNetworks()
        // so we could join known wifi network
        if (this.wifiEnabled &&
            wifiManager.connection.status == 'disconnected') {
          wifiManager.getNetworks();
        }

        // We don't need to do anything
        // if we didn't disable wifi at first place.
        if (!this.wifiDisabledByWakelock) {
          releaseCpuLock();
          return;
        }

        this.wifiDisabledByWakelock = false;

        if (this.wifiEnabled) {
          // Restore from power save mode is wifi is already enabled.
          wifiManager.setPowerSavingMode(false);
          releaseCpuLock();
          return;
        }

        // turn wifi back on.
        lock.set({ 'wifi.enabled': true });
        lock.set({ 'wifi.disabled_by_wakelock': false });
        window.addEventListener('wifi-enabled', function() {
          releaseCpuLock();
        });
      }
    },

    // Quietly turn off wifi for real, set wifiDisabledByWakelock to true
    // so we will turn it back on.
    sleep: function wifi_sleep() {
      // The |sleep| might be triggered when an alarm comes.
      // If the CPU is in suspend mode at this moment,
      // alarm servcie would wake up the CPU to run the handler
      // and turn it back to suspend immediately |sleep| is finished.
      // In this case, we acquire a CPU wake lock to prevent
      // the CPU goes to suspend mode before the switching is done.
      var wakeLockForWifi = navigator.requestWakeLock('cpu');

      var releaseWakeLockForWifi = function() {
        if (wakeLockForWifi) {
          wakeLockForWifi.unlock();
          wakeLockForWifi = null;
        }
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = 0;
        }
      };

      // To prevent the CPU awake forever (if wifi cannot be disabled)
      var timeoutId = window.setTimeout(releaseWakeLockForWifi, 30000);

      // Remember that it was turned off by us.
      this.wifiDisabledByWakelock = true;

      var request = null;
      // If Wifi wake lock is held,
      // change wifi to power save mode instead of disable it.
      if (this.wifiWakeLocked) {
        var wifiManager = window.navigator.mozWifiManager;
        if (wifiManager) {
          request = wifiManager.setPowerSavingMode(true);
          request.onsuccess = releaseWakeLockForWifi;
          request.onerror = releaseWakeLockForWifi;
          return;
        }
      }

      var lock = SettingsListener.getSettingsLock();

      // Actually turn off the wifi
      var wakeLockForSettings = navigator.requestWakeLock('cpu');
      lock.set({ 'wifi.enabled': false });
      window.addEventListener('wifi-disabled', releaseWakeLockForWifi);

      // Keep this value in disk so if the phone reboots we'll
      // be able to turn the wifi back on.
      request = lock.set({ 'wifi.disabled_by_wakelock': true });
      request.onsuccess = function() { wakeLockForSettings.unlock(); };
      request.onerror = request.onsuccess;
    },

    // Register for handling system message,
    // this cannot be done during |init()| because of bug 797803
    setSystemMessageHandler: function() {
      if (this._systemMessageHandlerRegistered) {
        return;
      }

      this._systemMessageHandlerRegistered = true;
      var self = this;
      navigator.mozSetMessageHandler('alarm', function(message) {
        if (message.data !== 'wifi-off') {
          return;
        }

        self.sleep();
      });
    }
  };
  BaseModule.mixin(WifiHandler.prototype, prototype);

  exports.WifiHandler = WifiHandler;
}(window));
