/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var QuickSettings = {
  // Indicate setting status of geolocation.enabled
  geolocationEnabled: false,
  WIFI_STATUSCHANGE_TIMEOUT: 2000,
  // ID of elements to create references
  ELEMENTS: ['wifi', 'data', 'bluetooth', 'airplane-mode', 'full-app'],

  init: function qs_init() {
    var settings = window.navigator.mozSettings;

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    if (!settings)
      return;

    this.getAllElements();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);

    var self = this;

    /*
     * Monitor data network icon
     */
    if (conn) {
      conn.addEventListener('datachange', function qs_onDataChange() {
        var label = {
          'lte': '4G', // 4G LTE
          'ehrpd': '4G', // 4G CDMA
          'hspa+': 'H+', // 3.5G HSPA+
          'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
          'evdo0': '3G', 'evdoa': '3G', 'evdob': '3G', '1xrtt': '3G', // 3G CDMA
          'umts': '3G', // 3G
          'edge': 'E', // EDGE
          'is95a': '2G', 'is95b': '2G', // 2G CDMA
          'gprs': '2G'
        };
        self.data.dataset.network = label[conn.data.type];
      });

      /* monitor data setting
       * TODO prevent quickly tapping on it
       */
      SettingsListener.observe('ril.data.enabled', true, function(value) {
        if (value) {
          self.data.dataset.enabled = 'true';
        } else {
          delete self.data.dataset.enabled;
        }
      });
    } else {
      // hide data icon without mozMobileConnection object
      this.overlay.classList.add('non-mobile');
    }
    /* monitor bluetooth setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     */
    var btFirstSet = true;
    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      // check self.bluetooth.dataset.enabled and value are identical
      if ((self.bluetooth.dataset.enabled && value) ||
          (self.bluetooth.dataset.enabled === undefined && !value))
        return;

      if (value) {
        self.bluetooth.dataset.enabled = 'true';
      } else {
        delete self.bluetooth.dataset.enabled;
      }

      // Set to the initializing state to block user interaction until the
      // operation completes. (unless we are being called for the first time,
      // where Bluetooth is already initialize
      if (!btFirstSet)
        self.bluetooth.dataset.initializing = 'true';
      btFirstSet = false;
    });
    window.addEventListener('bluetooth-adapter-added', this);
    window.addEventListener('bluetooth-disabled', this);


    /* monitor wifi setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     */
    var wifiFirstSet = true;
    SettingsListener.observe('wifi.enabled', true, function(value) {
      // check self.wifi.dataset.enabled and value are identical
      if ((self.wifi.dataset.enabled && value) ||
          (self.wifi.dataset.enabled === undefined && !value))
        return;

      if (value) {
        self.wifi.dataset.enabled = 'true';
      } else {
        delete self.wifi.dataset.enabled;
      }
      // Set to the initializing state to block user interaction until the
      // operation completes. (unless we are being called for the first time,
      // where Wifi is already initialize
      if (!wifiFirstSet)
        self.wifi.dataset.initializing = 'true';
      wifiFirstSet = false;
    });
    window.addEventListener('wifi-enabled', this);
    window.addEventListener('wifi-disabled', this);
    window.addEventListener('wifi-statuschange', this);

    /* monitor geolocation setting
     * TODO prevent quickly tapping on it
     */
    SettingsListener.observe('geolocation.enabled', true, function(value) {
      self.geolocationEnabled = value;
    });

    // monitor airplane mode
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self.data.dataset.airplaneMode = value;
      if (value) {
        self.data.classList.add('quick-settings-airplane-mode');
        self.airplaneMode.dataset.enabled = 'true';
      } else {
        self.data.classList.remove('quick-settings-airplane-mode');
        delete self.airplaneMode.dataset.enabled;
      }
    });
  },

  handleEvent: function qs_handleEvent(evt) {
    evt.preventDefault();
    switch (evt.type) {
      case 'click':
        switch (evt.target) {
          case this.wifi:
            // do nothing if wifi isn't ready
            if (this.wifi.dataset.initializing)
              return;
            var enabled = !!this.wifi.dataset.enabled;
            SettingsListener.getSettingsLock().set({
              'wifi.enabled': !enabled
            });
            SettingsListener.getSettingsLock().set({
              'wifi.connect_via_settings': !enabled
            });
            if (!enabled)
              this.toggleAutoConfigWifi = true;
            break;

          case this.data:
            if (this.data.dataset.airplaneMode !== 'true') {
              // TODO should ignore the action if data initialization isn't done
              var enabled = !!this.data.dataset.enabled;

              SettingsListener.getSettingsLock().set({
                'ril.data.enabled': !enabled
              });
            }

            break;

          case this.bluetooth:
            // do nothing if bluetooth isn't ready
            if (this.bluetooth.dataset.initializing)
              return;

            var enabled = !!this.bluetooth.dataset.enabled;
            SettingsListener.getSettingsLock().set({
              'bluetooth.enabled': !enabled
            });
            break;

          case this.airplaneMode:
            AirplaneMode.enabled = !this.airplaneMode.dataset.enabled;
            break;

          case this.fullApp:
            // XXX: This should be replaced probably by Web Activities
            var host = document.location.host;
            var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
            var protocol = document.location.protocol + '//';
            Applications.getByManifestURL(protocol + 'settings.' +
                                          domain + '/manifest.webapp').launch();

            UtilityTray.hide();
            break;
        }
        break;

      case 'utilitytrayshow':
        break;

      // unlock bluetooth toggle
      case 'bluetooth-adapter-added':
      case 'bluetooth-disabled':
        delete this.bluetooth.dataset.initializing;
        break;
      // unlock wifi toggle
      case 'wifi-enabled':
        delete this.wifi.dataset.initializing;
        this.wifi.dataset.enabled = 'true';
        if (this.toggleAutoConfigWifi) {
          // Check whether it found a wifi to connect after a timeout.
          this.wifiStatusTimer = setTimeout(this.autoConfigWifi.bind(this),
            this.WIFI_STATUSCHANGE_TIMEOUT);
        }
        break;
      case 'wifi-disabled':
        delete this.wifi.dataset.initializing;
        delete this.wifi.dataset.enabled;
        if (this.toggleAutoConfigWifi) {
          clearTimeout(this.wifiStatusTimer);
          this.wifiStatusTimer = null;
          this.toggleAutoConfigWifi = false;
        }
        break;

      case 'wifi-statuschange':
        if (this.toggleAutoConfigWifi && !this.wifi.dataset.initializing)
          this.autoConfigWifi();
        break;
    }
  },

  getAllElements: function qs_getAllElements() {
    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.ELEMENTS.forEach(function createElementRef(name) {
      this[toCamelCase(name)] =
        document.getElementById('quick-settings-' + name);
    }, this);

    this.overlay = document.getElementById('quick-settings');
  },

  // XXX Break down obj keys in a for each loop because mozSettings
  // does not currently supports multiple keys in one set()
  // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
  setMozSettings: function qs_setter(keypairs) {
    var setlock = SettingsListener.getSettingsLock();
    for (var key in keypairs) {
      var obj = {};
      obj[key] = keypairs[key];
      setlock.set(obj);
    }
  },

  /* Auto-config wifi if user enabled wifi from quick settings bar.
   * If there are no known networks around, wifi settings page
   * will be opened. Otherwise nothing will be done.
   */
  autoConfigWifi: function qs_autoConfigWifi() {
    clearTimeout(this.wifiStatusTimer);
    this.wifiStatusTimer = null;
    this.toggleAutoConfigWifi = false;

    var wifiManager = window.navigator.mozWifiManager;
    var status = wifiManager.connection.status;

    if (status == 'disconnected') {
      SettingsListener.getSettingsLock().set({
        'wifi.connect_via_settings': false
      });
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'wifi'
        }
      });
    } else if (status == 'connectingfailed') {
      SettingsListener.getSettingsLock().set({
        'wifi.connect_via_settings': false
      });
    }
  }
};

if (navigator.mozL10n &&
    (navigator.mozL10n.readyState == 'complete' ||
      navigator.mozL10n.readyState == 'interactive')) {
  QuickSettings.init();
} else {
  window.addEventListener('localized', QuickSettings.init.bind(QuickSettings));
}

