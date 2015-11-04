/* global LazyLoader, Service, SettingsListener,
          WifiIcon, WifiWakeLockManager */

'use strict';
(function(exports) {
  var Wifi = {
    name: 'Wifi',

    // Sync with mozSettings wifi.enabled key with an observer.
    // Note that there is a timing difference with _enabled and enabled.
    wifiEnabled: true,

    // True if we have disabled the wifi so we would remember to quietly turn
    // it back on.
    // (TODO: this should be named wifiDisabledByTimeout)
    wifiDisabledByWakelock: false,

    // Without an wifi wake lock, wait for screenOffTimeout milliseconds
    // to turn wifi off after the conditions are met.
    // If it's set to 0, wifi will never be turn off.
    // This is in sync with mozSettings wifi.screen_off_timeout.
    screenOffTimeout: 0,

    // When wifiSleepMode is true and the screenOffTimeout is not zero,
    // Wi-Fi will be automatically turned off during sleep to save battery
    // power.
    // This is in sync with mozSettings wifi.sleepMode.
    wifiSleepMode: false,

    // if Wifi is enabled but disconnected, try to scan for networks every
    // kScanInterval ms.
    kScanInterval: 20 * 1000,

    _scanTimer: null,

    // Sync with the hardware (mozWifiManager) state by listening to the
    // two events.
    _enabled: false,

    get enabled() {
      return this._enabled;
    },

    // true if there is an alarm or if there is an alarm being set.
    _hasAlarm: false,

    // keep the id returned by mozAlarms API
    _alarmId: null,

    start: function() {
      if (!window.navigator.mozSettings) {
        console.error('Wifi: No mozSettings!');
        return;
      }

      if (!window.navigator.mozWifiManager) {
        console.error('Wifi: No mozWifiManager!');
        return;
      }

      this.wifiManager = window.navigator.mozWifiManager;

      LazyLoader.load(['js/captive_portal.js']);
      Service.request('stepReady', '#wifi').then(function() {
        return LazyLoader.load(['js/wifi_icon.js']);
      }.bind(this)).then(function() {
        this.icon = new WifiIcon(this);
        this.icon.start();
      }.bind(this))['catch'](function(err) { // XXX: workaround gjslint
        console.error(err);
      });

      window.addEventListener('screenchange', this);

      var battery = window.navigator.battery;
      battery.addEventListener('chargingchange', this);


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

      this._wakeLockManager = new WifiWakeLockManager();
      this._wakeLockManager.onwakelockchange = this.maybeToggleWifi.bind(this);
      this._wakeLockManager.start();

      var self = this;
      var wifiManager = window.navigator.mozWifiManager;
      // when wifi is really enabled, emit event to notify QuickSettings
      wifiManager.onenabled = function onWifiEnabled() {
        self._enabled = true;
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('wifi-enabled',
          /* canBubble */ true, /* cancelable */ false, null);
        window.dispatchEvent(evt);
        self.icon && self.icon.update();
      };

      // when wifi is really disabled, emit event to notify QuickSettings
      wifiManager.ondisabled = function onWifiDisabled() {
        this._enabled = false;
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('wifi-disabled',
          /* canBubble */ true, /* cancelable */ false, null);
        window.dispatchEvent(evt);
        if (self.icon) {
          self.icon.update();
        }
      };

      // when wifi status change, emit event to notify Statusbar/UpdateManager
      wifiManager.onstatuschange = function onWifiDisabled() {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('wifi-statuschange',
          /* canBubble */ true, /* cancelable */ false, null);
        window.dispatchEvent(evt);
        self.icon && self.icon.update();
      };

      wifiManager.onconnectioninfoupdate = function() {
        self.icon && self.icon.update();
      };

      SettingsListener.observe(
        'wifi.screen_off_timeout', 600000, function(value) {
          self.screenOffTimeout = value;
        });

      SettingsListener.observe('wifi.sleepMode', true, function(value) {
        self.wifiSleepMode = value;
      });

      Service.registerState('enabled', this);

      // Track the wifi.enabled mozSettings value
      SettingsListener.observe('wifi.enabled', true, function(value) {
        if (!wifiManager && value) {
          self.wifiEnabled = false;

          // roll back the setting value to notify the UIs
          // that wifi interface is not available
          if (value) {
            SettingsListener.getSettingsLock().set({
              'wifi.enabled': false
            });
          }

          return;
        }

        self.wifiEnabled = value;
        if (self.icon) {
          self.icon && self.icon.update();
        }

        clearTimeout(self._scanTimer);
        if (!value) {
          return;
        }

        // If wifi is enabled but disconnected.
        // we would need to call getNetworks() continuously
        // so we could join known wifi network
        self._scanTimer = setInterval(function wifi_scan() {
          if (wifiManager.connection.status == 'disconnected') {
            wifiManager.getNetworks();
          }
        });
      });
    },

    handleEvent: function wifi_handleEvent(evt) {
      this.maybeToggleWifi();
    },

    /**
     * Check the status of screen, wifi wake lock, and power source
     * and turn on/off wifi accordingly.
     *
     * You can think of this as a gigantic state machine where the input
     * is the states and the output is triggering the timer to turn wifi off,
     * or turning the wifi back on (if it is turned off by us).
     *
     * |--------------------------------|---------------------|
     * | Conditions                     |                     |
     * |--------|-----------|-----------| End state           |
     * | Screen | Power     | Wake lock |                     |
     * |--------|-----------|-----------|---------------------|
     * | off    | unplugged | not hold  | set timer to off (1)|
     * |--------|-----------|-----------|---------------------|
     * | off    | unplugged | hold      | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (2)           |
     * |--------|-----------|-----------|---------------------|
     * | off    | plugged   | not hold  | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (3)           |
     * |--------|-----------|-----------|---------------------|
     * | off    | plugged   | hold      | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (4)           |
     * |--------|-----------|-----------|---------------------|
     * | on     | unplugged | not hold  | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (5)           |
     * |--------|-----------|-----------|---------------------|
     * | on     | unplugged | hold      | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (6)           |
     * |--------|-----------|-----------|---------------------|
     * | on     | plugged   | not hold  | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (7)           |
     * |--------|-----------|-----------|---------------------|
     * | on     | plugged   | hold      | turn back on        |
     * |        |           |           | if turned off by    |
     * |        |           |           | timer (8)           |
     * |--------|-----------|-----------|---------------------|
     *
     * The rest of the code are housekeepers making sure we keep an CPU lock
     * during the operations, and try not to set the timer twice etc.
     *
     * It is also assumed setting mozSettings w/ the same value would be a
     * no-op with no side effects so we don't really protect that.
     *
     * As the entry point to of the state machine, it is very important to
     * keep this function making the right decisions at all times.
     */
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
      var wifiManager = window.navigator.mozWifiManager;
      if (!battery || !wifiManager ||
          // We don't need to do anything if wifi is not disabled by system app.
          (!this.wifiEnabled && !this.wifiDisabledByWakelock)) {
        releaseCpuLock();
        return;
      }

      var lock = SettingsListener.getSettingsLock();
      // Let's quietly turn off wifi if there is no wake lock and
      // the screen is off and we are not on a power source.
      if (!Service.query('screenEnabled') && !battery.charging &&
          !this._wakeLockManager.isHeld) {
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

        // When user wants to allow wifi off then start with a timer,
        // only turn off wifi till timeout.
        if (this.wifiSleepMode === true) {
          // maybeToggleWifi state machine state #1

          // We should not try to set more than one alarms.
          if (this._hasAlarm) {
            releaseCpuLock();
            return;
          }

          this._hasAlarm = true;
          var date = new Date(Date.now() + this.screenOffTimeout);
          var req = navigator.mozAlarms.add(date, 'ignoreTimezone', 'wifi-off');
          req.onsuccess = function wifi_offAlarmSet() {
            this._alarmId = req.result;
            releaseCpuLock();
          }.bind(this);
          req.onerror = function wifi_offAlarmSetFailed() {
            console.warn('Fail to set wifi sleep timer on Alarm API. ' +
              'Turn off wifi immediately.');
            this._hasAlarm = false;
            this.sleep();
            releaseCpuLock();
          }.bind(this);
        } else {
          releaseCpuLock();
          return;
        }
      }
      // ... and quietly turn it back on or cancel the timer otherwise
      else {
        // maybeToggleWifi state machine state #2 to #8
        if (this._alarmId) {
          navigator.mozAlarms.remove(this._alarmId);
          this._hasAlarm = false;
          this._alarmId = null;
        }

        // If wifi is enabled but disconnected.
        // we would need to call getNetworks()
        // so we could join known wifi network
        if (this.wifiEnabled &&
            wifiManager.connection.status == 'disconnected') {
          wifiManager.getNetworks();
        }

        // We don't need to do anything if
        // we didn't disable wifi at first place.
        if (!this.wifiDisabledByWakelock) {
          releaseCpuLock();
          return;
        }

        this.wifiDisabledByWakelock = false;

        if (this.wifiEnabled) {
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
      // If the CPU is in suspend mode at this moment, alarm servcie would wake
      // up the CPU to run the handler and turn it back to suspend immediately
      // |sleep| is finished.
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
    // this cannot be done during |start()| because of bug 797803
    setSystemMessageHandler: function wifi_setSystemMessageHandler() {
      if (this._systemMessageHandlerRegistered) {
        return;
      }

      this._systemMessageHandlerRegistered = true;
      navigator.mozSetMessageHandler('alarm', function gotAlarm(message) {
        if (message.data !== 'wifi-off') {
          return;
        }

        this._hasAlarm = false;
        this._alarmId = null;

        // Wifi shall not sleep if the condition to turn this off has changed.
        // (Alarm should have been removed when condition changes, but for
        // reason unknown to us it still triggers.)
        var battery = window.navigator.battery;
        if (Service.query('screenEnabled') ||
            battery.charging ||
            this._wakeLockManager.isHeld) {
          console.error(
            'Wifi: mozAlarms should be cancelled but still triggers.');
          return;
        }

        this.sleep();
      }.bind(this));
    }
  };
  exports.Wifi = Wifi;
}(window));
