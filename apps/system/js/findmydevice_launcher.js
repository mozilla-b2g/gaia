/* global SettingsHelper */

'use strict';

// XXX keep this in sync with apps/findmydevice/js/findmydevice.js
const IAC_API_WAKEUP_REASON_ENABLED = 0;
const IAC_API_WAKEUP_REASON_STALE_REGISTRATION = 1;

function wakeUpFindMyDevice(reason) {
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('findmydevice-wakeup').then(function(ports) {
      ports[0].postMessage(reason);
    });
  };
}

navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
  if (event.settingValue === true) {
    // make sure Find My Device is registered if it's enabled
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_ENABLED);
  }
});

navigator.mozSettings.addObserver('geolocation.enabled', function(event) {
  // invalidate registration so we can report to the server
  // whether tracking is enabled or not, which depends on
  // geolocation
  wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_STALE_REGISTRATION);
});

window.addEventListener('will-unlock', function(event) {
  var helper = SettingsHelper('lockscreen.lock-message');
  helper.set('');
});
