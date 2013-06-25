/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wifi = {
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

  init: function wf_init() {
    if (!window.navigator.mozSettings)
      return;

    if (!window.navigator.mozWifiManager)
      return;

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

    var self = this;
    var wifiManager = window.navigator.mozWifiManager;
    // when wifi is really enabled, emit event to notify QuickSettings
    wifiManager.onenabled = function onWifiEnabled() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('wifi-enabled',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
    };

    // when wifi is really disabled, emit event to notify QuickSettings
    wifiManager.ondisabled = function onWifiDisabled() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('wifi-disabled',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
    };

    // when wifi status change, emit event to notify StatusBar/UpdateManager
    wifiManager.onstatuschange = function onWifiDisabled() {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('wifi-statuschange',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
    };

    SettingsListener.observe(
      'wifi.screen_off_timeout', 600000, function(value) {
        self.screenOffTimeout = value;
      });

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

    var power = navigator.mozPower;
    power.addWakeLockListener(function wifi_handleWakeLock(topic, state) {
      if (topic !== 'wifi')
        return;

      self.wifiWakeLocked = (state == 'locked-foreground' ||
                             state == 'locked-background');

      self.maybeToggleWifi();
    });
  },

  handleEvent: function wifi_handleEvent(evt) {
    this.maybeToggleWifi();
  },

  // Check the status of screen, wifi wake lock and power source
  // and turn on/off wifi accordingly
  maybeToggleWifi: function wifi_maybeToggleWifi() {
    // Do nothing if we are being disabled.
    if (!this.screenOffTimeout)
      return;

    var battery = window.navigator.battery;
    var wifiManager = window.navigator.mozWifiManager;
    if (!battery || !wifiManager ||
        (!this.wifiEnabled && !this.wifiDisabledByWakelock))
      return;


    // Let's quietly turn off wifi if there is no wake lock and
    // the screen is off and we are not on a power source.
    if (!ScreenManager.screenEnabled &&
        !this.wifiWakeLocked && !battery.charging) {
      // We don't need to do anything if wifi is not enabled currently
      if (!this.wifiEnabled)
        return;

      // We still need to turn of wifi even if there is no Alarm API
      if (!navigator.mozAlarms) {
        console.warn('Turning off wifi without sleep timer because' +
          ' Alarm API is not available');
        this.sleep();

        return;
      }

      // Set System Message Handler, so we will be notified when alarm goes off.
      this.setSystemMessageHandler();

      // Start with a timer, only turn off wifi till timeout.
      var date = new Date(Date.now() + this.screenOffTimeout);
      var self = this;
      var req = navigator.mozAlarms.add(date, 'ignoreTimezone', 'wifi-off');
      req.onsuccess = function wifi_offAlarmSet() {
        self._alarmId = req.result;
      };
      req.onerror = function wifi_offAlarmSetFailed() {
        console.warn('Fail to set wifi sleep timer on Alarm API. ' +
          'Turn off wifi immediately.');
        self.sleep();
      };
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
      if (!this.wifiDisabledByWakelock)
        return;

      var lock = SettingsListener.getSettingsLock();
      // turn wifi back on.
      lock.set({ 'wifi.enabled': true });

      this.wifiDisabledByWakelock = false;
      lock.set({ 'wifi.disabled_by_wakelock': false });
    }
  },

  // Quietly turn off wifi for real, set wifiDisabledByWakelock to true
  // so we will turn it back on.
  sleep: function wifi_sleep() {
    var lock = SettingsListener.getSettingsLock();

    // Actually turn off the wifi

    // The |sleep| might be triggered when an alarm comes.
    // If the CPU is in suspend mode at this moment, alarm servcie would wake
    // up the CPU to run the handler and turn it back to suspend immediately
    // |sleep| is finished. In this case, we acquire a CPU wake lock to prevent
    // the CPU goes to suspend mode before the switching is done.
    var wakeLockForWifi = navigator.requestWakeLock('cpu');
    lock.set({ 'wifi.enabled': false });
    window.addEventListener('wifi-disabled', function() {
      if (wakeLockForWifi) {
        wakeLockForWifi.unlock();
        wakeLockForWifi = null;
      }
    });
    window.setTimeout(function() {
      if (wakeLockForWifi) {
        wakeLockForWifi.unlock();
        wakeLockForWifi = null;
      }
     }, 30000); //To prevent the CPU awake forever (if wifi cannot be disabled)

     // Remember that it was turned off by us.
     this.wifiDisabledByWakelock = true;

     // Keep this value in disk so if the phone reboots we'll
     // be able to turn the wifi back on.
     var wakeLockForSettings = navigator.requestWakeLock('cpu');
     var request = lock.set({ 'wifi.disabled_by_wakelock': true });
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
