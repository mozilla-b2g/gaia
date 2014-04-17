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

window.addEventListener('mozFxAccountsUnsolChromeEvent', function(event) {
  if (!event || !event.detail) {
    return;
  }

  if (event.detail.eventName === 'onlogout') {
    var helper = SettingsHelper('findmydevice.enabled');
    helper.set(false);
  }
});
