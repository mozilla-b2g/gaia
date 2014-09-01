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
    if (!settings) {
      return;
    }

    this.getAllElements();
    this.monitorDataChange();

    (function initNetworkSprite() {
      var networkTypeSetting =
        SettingsHelper('operatorResources.data.icon', {});

      networkTypeSetting.get(function gotNS(networkTypeValues) {
        if (!networkTypeValues) {
          return;
        }
        var sprite = networkTypeValues['data_sprite'];
        if (sprite) {
          document.getElementById('quick-settings-data').style.backgroundImage =
            'url("' + sprite + '")';
        }
      });
    })();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);

    this.monitorBluetoothChange();
    this.monitorWifiChange();
    this.monitorGeoChange();
    this.monitorAirplaneModeChange();
  },

  monitorDataChange: function() {
    var conns = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections;

    if (!conns) {
      // hide data icon without mozMobileConnection object
      this.overlay.classList.add('non-mobile');
    } else {
      var label = {
        'lte': '4G', // 4G LTE
        'ehrpd': '4G', // 4G CDMA
        'hspa+': 'H+', // 3.5G HSPA+
        'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
        // 3G CDMA
        'evdo0': '3G', 'evdoa': '3G', 'evdob': '3G', '1xrtt': '3G',
        'umts': '3G', // 3G
        'edge': 'E', // EDGE
        'is95a': '2G', 'is95b': '2G', // 2G CDMA
        'gprs': '2G'
      };

      for (var i = 0; i < conns.length; i++) {
        var conn = conns[i];
        conn.addEventListener('datachange', function qs_onDataChange() {
          var dataType;
          // if there is any data connection got established,
          // we would just use that
          for (var j = 0; j < conns.length; j++) {
            dataType = label[conns[j].data.type] || dataType;
          }
          this.data.dataset.network = dataType;
          this.setAccessibilityAttributes(this.data, 'dataButton', dataType);
        }.bind(this));
      }

      /*
       * monitor data setting
       * TODO prevent quickly tapping on it
       */
      SettingsListener.observe('ril.data.enabled', true, function(value) {
        if (value) {
          this.data.dataset.enabled = 'true';
        } else {
          delete this.data.dataset.enabled;
        }
        this.setAccessibilityAttributes(this.data, 'dataButton',
          this.data.dataset.network);
      }.bind(this));
    }
  },

  monitorBluetoothChange: function() {
    /* monitor bluetooth setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     */
    var self = this;
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
      if (!btFirstSet) {
        self.bluetooth.dataset.initializing = 'true';
      }
      btFirstSet = false;

      self.setAccessibilityAttributes(self.bluetooth, 'bluetoothButton');
    });
    window.addEventListener('bluetooth-adapter-added', this);
    window.addEventListener('bluetooth-disabled', this);
  },

  monitorWifiChange: function() {
    /* monitor wifi setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     */
    var self = this;
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
      if (!wifiFirstSet) {
        self.wifi.dataset.initializing = 'true';
      }
      wifiFirstSet = false;

      self.setAccessibilityAttributes(self.wifi, 'wifiButton');
    });
    window.addEventListener('wifi-enabled', this);
    window.addEventListener('wifi-disabled', this);
    window.addEventListener('wifi-statuschange', this);
  },

  monitorGeoChange: function() {
    /* monitor geolocation setting
     * TODO prevent quickly tapping on it
     */
    var self = this;
    SettingsListener.observe('geolocation.enabled', true, function(value) {
      self.geolocationEnabled = value;
    });
  },

  monitorAirplaneModeChange: function() {
    var self = this;
    SettingsListener.observe('airplaneMode.status', false, function(value) {
      delete self.airplaneMode.dataset.enabling;
      delete self.airplaneMode.dataset.disabling;

      self.data.dataset.airplaneMode = (value === 'enabled');
      switch (value) {
        case 'enabled':
          self.data.classList.add('quick-settings-airplane-mode');
          self.airplaneMode.dataset.enabled = 'true';
          break;
        case 'disabled':
          self.data.classList.remove('quick-settings-airplane-mode');
          delete self.airplaneMode.dataset.enabled;
          break;
        case 'enabling':
          self.airplaneMode.dataset.enabling = 'true';
          break;
        case 'disabling':
          self.airplaneMode.dataset.disabling = 'true';
          break;
      }
      self.setAccessibilityAttributes(self.airplaneMode, 'airplaneMode');
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
            applications.getByManifestURL(protocol + 'settings.' +
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
        this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
        break;
      // unlock wifi toggle
      case 'wifi-enabled':
        delete this.wifi.dataset.initializing;
        this.wifi.dataset.enabled = 'true';
        this.setAccessibilityAttributes(this.wifi, 'wifiButton');
        if (this.toggleAutoConfigWifi) {
          // Check whether it found a wifi to connect after a timeout.
          this.wifiStatusTimer = setTimeout(this.autoConfigWifi.bind(this),
            this.WIFI_STATUSCHANGE_TIMEOUT);
        }
        break;
      case 'wifi-disabled':
        delete this.wifi.dataset.initializing;
        delete this.wifi.dataset.enabled;
        this.setAccessibilityAttributes(this.wifi, 'wifiButton');
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

  /**
   * Set aria-label and aria-pressed attributes for the appropriate buttons.
   * @param {Object} button Element.
   * @param {String} label Button label.
   * @param {?String} type Optional type attribute for l10n.
   */
  setAccessibilityAttributes: function(button, label, type) {
    label += button.dataset.enabled === undefined ? '-off' : '-on';
    if (button.dataset.initializing !== undefined) {
      label += '-initializing';
    }

    button.setAttribute('aria-label', navigator.mozL10n.get(label, {
      type: type || ''
    }));
    button.setAttribute('aria-pressed', button.dataset.enabled !== undefined);
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

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(QuickSettings.init.bind(QuickSettings));
}
