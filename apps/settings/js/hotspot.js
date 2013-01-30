/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

navigator.mozL10n.ready(function hotspot() {
  var settings = window.navigator.mozSettings;
  var hotspotSettingsSection =
      document.getElementById('hotspot-settings-section');

  // If this is the first time that the Hotspot settings are looked
  // at, the password will be set to null since that is hardcoded in
  // the build. If that is the case then we generate a random but
  // friendly password.

  function generateHotspotPassword() {
    var words = ['alberta', 'amsterdam', 'ankara',
                 'auckland', 'belfast', 'berlin',
                 'boston', 'calgary', 'caracas',
                 'chicago', 'dakar', 'delhi',
                 'dubai', 'dublin', 'houston',
                 'jakarta', 'lagos', 'lima',
                 'madrid', 'moscow',
                 'mumbai', 'newyork', 'osaka',
                 'oslo', 'paris', 'porto',
                 'santiago', 'saopaulo', 'seattle',
                 'stockholm', 'sydney', 'taipei',
                 'tokyo', 'toronto'];
    var password = words[Math.floor(Math.random() * words.length)];
    for (var i = 0; i < 4; i++) {
      password += Math.floor(Math.random() * 10);
    }
    return password;
  }

  var lock = settings.createLock();
  var req = lock.get('tethering.wifi.security.password');
  req.onsuccess = function onTetheringPasswordSuccess() {
    var pwd = req.result['tethering.wifi.security.password'];
    if (!pwd) {
      pwd = generateHotspotPassword();
      lock.set({ 'tethering.wifi.security.password': pwd });
    }
  };

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
