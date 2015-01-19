/* global Service, LazyLoader */

'use strict';

var Wifi = {
  name: 'Wifi',

  wifiEnabled: true,

  wifiDisabledByWakelock: false,

  // Without an wifi wake lock, wait for screenOffTimeout milliseconds
  // to turn wifi off after the conditions are met.
  // If it's set to 0, wifi will never be turn off.
  screenOffTimeout: 0,

  // When wifiSleepMode is true, Wi-Fi will be automatically turned off
  // during sleep to save battery power.
  wifiSleepMode: false,

  // if Wifi is enabled but disconnected, try to scan for networks every
  // kScanInterval ms.
  kScanInterval: 20 * 1000,

  _scanTimer: null,

  _enabled: false,

  get enabled() {
    return this._enabled;
  },

  init: function wf_init() {
    if (!window.navigator.mozSettings)
      return;

    if (!window.navigator.mozWifiManager) {
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
      if (!req.result[name])
        return;

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

    // when wifi status change, emit event to notify StatusBar/UpdateManager
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
      if (!value)
        return;

      // If wifi is enabled but disconnected.
      // we would need to call getNetworks() continuously
      // so we could join known wifi network
      self._scanTimer = setInterval(function wifi_scan() {
        if (wifiManager.connection.status == 'disconnected')
          wifiManager.getNetworks();
      });
    });
  },

  handleEvent: function wifi_handleEvent(evt) {
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
    if (!ScreenManager.screenEnabled && !battery.charging) {
      if (!this.wifiEnabled && this._wakeLockManager.isHeld) {
        lock.set({ 'wifi.enabled': true });
        window.addEventListener('wifi-enabled', function() {
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

      // Set System Message Handler, so we will be notified when alarm goes off.
      this.setSystemMessageHandler();

      // When user wants to allow wifi off then start with a timer,
      // only turn off wifi till timeout.
      if (this.wifiSleepMode == true) {
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
      else {
        return;
      }
    }
    // ... and quietly turn it back on or cancel the timer otherwise
    else {
      if (this._alarmId) {
        navigator.mozAlarms.remove(this._alarmId);
        this._alarmId = null;
      }

      // If wifi is enabled but disconnected.
      // we would need to call getNetworks() so we could join known wifi network
      if (this.wifiEnabled && wifiManager.connection.status == 'disconnected') {
        wifiManager.getNetworks();
      }

      // We don't need to do anything if we didn't disable wifi at first place.
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
    // |sleep| is finished. In this case, we acquire a CPU wake lock to prevent
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
    request.onsuccess = function() { wakeLockForSettings.unlock() };
    request.onerror = request.onsuccess;
  },

  // Register for handling system message,
  // this cannot be done during |init()| because of bug 797803
  setSystemMessageHandler: function wifi_setSystemMessageHandler() {
    if (this._systemMessageHandlerRegistered)
      return;

    this._systemMessageHandlerRegistered = true;
    var self = this;
    navigator.mozSetMessageHandler('alarm', function gotAlarm(message) {
      if (message.data !== 'wifi-off')
        return;

      self.sleep();
    });
  }
};

Wifi.init();
