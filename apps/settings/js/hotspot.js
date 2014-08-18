/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Hotspot = {
  init: function hotspot_init() {
    this.initHotspotPanel();
  },

  initHotspotPanel: function() {
    var settings = window.navigator.mozSettings;
    var lock = settings.createLock();

    var hotspotSettingBtn =
      document.querySelector('#hotspot-settings-section button');

    var hotspotElement =
      document.querySelector('input#tethering-wifi-enabled');

    var usbTetheringElement =
      document.querySelector('input#tethering-usb-enabled');

    function generateHotspotPassword() {
      var words = ['amsterdam', 'ankara', 'auckland',
                   'belfast', 'berlin', 'boston',
                   'calgary', 'caracas', 'chicago',
                   'dakar', 'delhi', 'dubai',
                   'dublin', 'houston', 'jakarta',
                   'lagos', 'lima', 'madrid',
                   'newyork', 'osaka', 'oslo',
                   'porto', 'santiago', 'saopaulo',
                   'seattle', 'stockholm', 'sydney',
                   'taipei', 'tokyo', 'toronto'];
      var password = words[Math.floor(Math.random() * words.length)];
      for (var i = 0; i < 4; i++) {
        password += Math.floor(Math.random() * 10);
      }
      return password;
    }

    var req = lock.get('tethering.wifi.security.password');
    req.onsuccess = function onThetheringPasswordSuccess() {
      var pwd = req.result['tethering.wifi.security.password'];
      if (!pwd) {
        pwd = generateHotspotPassword();
        lock.set({ 'tethering.wifi.security.password': pwd });
      }
    };

    function generateHotspotSsid() {
      var characters = 'abcdefghijklmnopqrstuvwxyz' +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      var password = 'FirefoxHotspot_';
      for (var i = 0; i < 10; i++) {
        password += characters.charAt(
            Math.floor(Math.random() * characters.length));
      }
      return password;
    }

    var lockSsid = settings.createLock();
    var reqSsid = lockSsid.get('tethering.wifi.ssid');
    reqSsid.onsuccess = function onThetheringPasswordSuccess() {
      var ssid = reqSsid.result['tethering.wifi.ssid'];
      if (!ssid) {
        ssid = generateHotspotSsid();
        lockSsid.set({ 'tethering.wifi.ssid': ssid });
      }
    };

    function setHotspotSettingsEnabled(enabled) {
      // disable the setting button when internet sharing is enabled
      hotspotSettingBtn.disabled = enabled;
      hotspotElement.checked = enabled;
    }

    function setUSBTetheringCheckbox(enabled) {
      usbTetheringElement.checked = enabled;
    }

    // Wi-fi hotspot event listener
    hotspotElement.addEventListener('change', _hotspotMasterSettingChanged);

    // Wifi tethering enabled
    settings.addObserver('tethering.wifi.enabled', function(event) {
      setHotspotSettingsEnabled(event.settingValue);
    });

    // USB tethering event listener
    usbTetheringElement.addEventListener('change', _usbTetheringSettingChanged);

    // USB tethering enabled
    settings.addObserver('tethering.usb.enabled', function(event) {
      setUSBTetheringCheckbox(event.settingValue);
    });

    function _hotspotMasterSettingChanged(evt) {
      var checkbox = evt.target;
      var lock = settings.createLock();
      var cset = {};
      var usbStorageSetting;
      var usbTetheringSetting;

      var promiseUsbTethering = new Promise(function(resolve, reject) {
        var requestUsbTetheringSetting = lock.get('tethering.usb.enabled');

        requestUsbTetheringSetting.onsuccess = function dt_getStatusSuccess() {
          resolve(requestUsbTetheringSetting.result['tethering.usb.enabled']);
        };
      });
      promiseUsbTethering.then(function(usbTetheringSetting) {
        if (checkbox.checked) {
          // In that case there is no need to show a dialog
          if (!usbTetheringSetting) {
            cset['tethering.wifi.enabled'] = true;
            settings.createLock().set(cset);
          } else {
            openIncompatibleSettingsDialog('incompatible-settings-dialog',
              'tethering.wifi.enabled', 'tethering.usb.enabled', null);
          }
        } else {
          cset['tethering.wifi.enabled'] = false;
          settings.createLock().set(cset);
        }
      });
    }

    function _usbTetheringSettingChanged(evt) {
      var checkbox = evt.target;
      var lock = navigator.mozSettings.createLock();
      var cset = {};
      var usbStorageSetting;
      var wifiTetheringSetting;

      var promiseUsbStorage = new Promise(function(resolve, reject) {
        var requestUsbStorageSetting = lock.get('ums.enabled');

        requestUsbStorageSetting.onsuccess = function dt_getStatusSuccess() {
          resolve(requestUsbStorageSetting.result['ums.enabled']);
        };
      });

      var promiseWifiTethering = new Promise(function(resolve, reject) {
        var requestWifiTetheringSetting = lock.get('tethering.wifi.enabled');

        requestWifiTetheringSetting.onsuccess = function dt_getStatusSuccess() {
          resolve(requestWifiTetheringSetting.result['tethering.wifi.enabled']);
        };
      });

      Promise.all([promiseUsbStorage, promiseWifiTethering])
        .then(function(values) {
          usbStorageSetting = values[0];
          wifiTetheringSetting = values[1];
          if (checkbox.checked) {
            if (!usbStorageSetting && !wifiTetheringSetting) {
              cset['tethering.usb.enabled'] = true;
              settings.createLock().set(cset);
            } else {
              if (usbStorageSetting && wifiTetheringSetting) {
                // First the user must disable wifi tethering setting
                openIncompatibleSettingsDialog('incompatible-settings-dialog',
                  'tethering.usb.enabled', 'tethering.wifi.enabled',
                  openSecondWarning);
              } else {
                var oldSetting = usbStorageSetting ? 'ums.enabled' :
                  'tethering.wifi.enabled';
                openIncompatibleSettingsDialog('incompatible-settings-dialog',
                  'tethering.usb.enabled', oldSetting, null);
              }
            }
          } else {
            cset['tethering.usb.enabled'] = false;
            settings.createLock().set(cset);
          }
      });

      function openSecondWarning() {
        openIncompatibleSettingsDialog('incompatible-settings-dialog',
          'tethering.usb.enabled', 'ums.enabled', null);
      }
    }

    var reqTetheringWifiEnabled =
      settings.createLock().get('tethering.wifi.enabled');

    var reqTetheringUSBEnabled =
      settings.createLock().get('tethering.usb.enabled');

    reqTetheringWifiEnabled.onsuccess = function dt_getStatusSuccess() {
      setHotspotSettingsEnabled(
        reqTetheringWifiEnabled.result['tethering.wifi.enabled']
      );
    };

    reqTetheringUSBEnabled.onsuccess = function dt_getStatusSuccess() {
      setUSBTetheringCheckbox(
        reqTetheringUSBEnabled.result['tethering.usb.enabled']
      );
    };

    hotspotSettingBtn.addEventListener('click',
      openDialog.bind(window, 'hotspot-wifiSettings'));

    // Localize WiFi security type string when setting changes
    SettingsListener.observe('tethering.wifi.security.type', 'wpa-psk',
      function(value) {
        var wifiSecurityType = document.getElementById('wifi-security-type');
        wifiSecurityType.setAttribute('data-l10n-id', 'hotspot-' + value);
      }
    );
  }
};

navigator.mozL10n.once(Hotspot.init.bind(Hotspot));
