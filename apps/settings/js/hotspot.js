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
    var passwordItem = document.querySelector('#hotspot .password-item');

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
    function updatePasswordItemVisibility(securityType) {
      passwordItem.hidden = (securityType == 'open');
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

    // security type
    settings.addObserver('tethering.wifi.security.type', function(event) {
      updatePasswordItemVisibility(event.settingValue);
    });

    var reqSecurityType =
      settings.createLock().get('tethering.wifi.security.type');

    reqSecurityType.onsuccess = function dt_getStatusSuccess() {
      updatePasswordItemVisibility(
        reqSecurityType.result['tethering.wifi.security.type']
      );
    };

    hotspotSettingBtn.addEventListener('click',
      openDialog.bind(window, 'hotspot-wifiSettings'));
  }
};

navigator.mozL10n.ready(Hotspot.init.bind(Hotspot));
