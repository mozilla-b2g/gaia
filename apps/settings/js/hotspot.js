/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

onLocalized(function hotspot() {

  var settings = window.navigator.mozSettings;
  var hotspotSettingsSection = document.getElementById('hotspot-settings-section');

  function setHotspotSettingsEnabled(enabled) {
    hotspotSettingsSection.hidden = enabled;
  }

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
});

