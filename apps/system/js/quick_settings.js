/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var QuickSettings = {
  // Indicate setting status of geolocation.enabled
  geolocationEnabled: false,

  init: function qs_init() {    
    var settings = window.navigator.mozSettings;
    var conn = window.navigator.mozMobileConnection;
    if (!settings || !conn)
      return;

    this.getAllElements();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);

    var self = this;

    /*
     * Monitor data network icon
     */
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
            var enabled = !!this.airplaneMode.dataset.enabled;
            SettingsListener.getSettingsLock().set({
              'ril.radio.disabled': !enabled
            });
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
        if (this.toggleAutoConfigWifi) {
          this.autoConfigWifi();
          this.toggleAutoConfigWifi = false;
        }
        break;
      case 'wifi-disabled':
        delete this.wifi.dataset.initializing;
        break;
    }
  },

  getAllElements: function qs_getAllElements() {
    // ID of elements to create references
    var elements = ['wifi', 'data', 'bluetooth', 'airplane-mode', 'full-app'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach(function createElementRef(name) {
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

  // Check wifi status.
  // If we confirmed there's no known networks around,
  // wifi settings page will be opened.
  // Otherwise nothing will be done.
  autoConfigWifi : function qs_autoConfigWifi() {
    function openWifiSetting() {
      var activity = new MozActivity({
        name : 'configure',
        data : {
          target : 'device',
          section : 'wifi'
        }
      });
    };
    var wifiManager = window.navigator.mozWifiManager;
    var req = wifiManager.getKnownNetworks();
    req.onsuccess = function() {
      //There's no any known networks saved in phone.
      if (req.result.length == 0) {
        openWifiSetting();
        return;
      }

      console.log("*****original onstatuschange:" + wifiManager.onstatuschange);

      wifiManager.onstatuschange = function (evt) {
        console.log("*****" + evt.status);
        if (evt.status == 'connecting') {
          console.log("******onstatuschange:connecting");
          wifiManager.onstatuschange = null;
        } else if (evt.status == 'disconnected') {
          console.log("******onstatuschange:disconnected");
          openWifiSetting();
          wifiManager.onstatuschange = null;
        }
      };
    }
/*       var retries = 3;
      var scan_interval = 2000;
      function scanKnownNetworks() {
        if (wifiManager.connection.status != 'disconnected') {
          //Already connecting to an known networks.  Do nothing.
          return;
        }


       var reqNetwork = wifiManager.getNetworks();
        reqNetwork.onerror = function() {
          //If we failed getting networks around, retry for certain times.
          retries--;
          if (retries > 0)
            setTimeout(scanKnownNetworks, scan_interval);
          else
            openWifiSetting();
        }

        reqNetwork.onsuccess = function() {
          //After retriving networks around,
          //check if there are known networks included.
          for (var i = 0; i < reqNetwork.result.length; i++) {
            if (reqNetwork.result[i].known)
              return;
          }
          //No known networks.
          openWifiSetting();
        }
      }
      setTimeout(scanKnownNetworks, scan_interval);
    };*/
  }
};

QuickSettings.init();
