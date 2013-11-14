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
