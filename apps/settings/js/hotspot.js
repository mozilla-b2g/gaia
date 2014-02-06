/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Hotspot = {
  init: function hotspot_init() {
    this.initHotspotPanel();
  },

  initHotspotPanel: function() {
    var settings = window.navigator.mozSettings;
    var hotspotSettingBtn =
      document.querySelector('#hotspot-settings-section button');

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

    var lock = settings.createLock();
    var req = lock.get('tethering.wifi.security.password');
    req.onsuccess = function onThetheringPasswordSuccess() {
      var pwd = req.result['tethering.wifi.security.password'];
      if (!pwd) {
        pwd = generateHotspotPassword();
        lock.set({ 'tethering.wifi.security.password': pwd });
      }
    };

    function setHotspotSettingsEnabled(enabled) {
      // disable the setting button when internet sharing is enabled
      hotspotSettingBtn.disabled = enabled;
    }

    // tethering enabled
    settings.addObserver('tethering.wifi.enabled', function(event) {
      setHotspotSettingsEnabled(event.settingValue);
    });

    var reqTetheringWifiEnabled =
      settings.createLock().get('tethering.wifi.enabled');

    reqTetheringWifiEnabled.onsuccess = function dt_getStatusSuccess() {
      setHotspotSettingsEnabled(
        reqTetheringWifiEnabled.result['tethering.wifi.enabled']
      );
    };

    hotspotSettingBtn.addEventListener('click',
      openDialog.bind(window, 'hotspot-wifiSettings'));

    // Localize WiFi security type string when setting changes
    SettingsListener.observe('tethering.wifi.security.type', 'wpa-psk',
      function(value) {
        var l10n = navigator.mozL10n;
        var wifiSecurityType = document.getElementById('wifi-security-type');
        l10n.localize(wifiSecurityType, 'hotspot-' + value);
      }
    );
  }
};

navigator.mozL10n.ready(Hotspot.init.bind(Hotspot));
