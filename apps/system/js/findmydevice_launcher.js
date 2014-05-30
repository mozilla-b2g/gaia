/* global SettingsHelper */

'use strict';

function wakeUpFindMyDevice() {
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('findmydevice-wakeup');
  };
}

navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
  if (event.settingValue === true) {
    // make sure Find My Device is registered if it's enabled
    wakeUpFindMyDevice();
  }
});

window.addEventListener('will-unlock', function(event) {
  var helper = SettingsHelper('lockscreen.lock-message');
  helper.set('');
});
