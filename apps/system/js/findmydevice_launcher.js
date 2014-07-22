/* global DUMP */
/* global SettingsHelper */
/* global wakeUpFindMyDevice */
/* global IAC_API_WAKEUP_REASON_ENABLED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */

'use strict';

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

window.addEventListener('lockscreen-appclosing', function(event) {
  var helper = SettingsHelper('lockscreen.lock-message');
  helper.set('');
});

window.addEventListener('mozFxAccountsUnsolChromeEvent', function(event) {
  if (!event || !event.detail) {
    return;
  }

  var eventName = event.detail.eventName;
  DUMP('findmydevice received ' + eventName + ' FxA event in the System app');
  if (eventName === 'onlogin' || eventName === 'onverified') {
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGIN);
  } else if (eventName === 'onlogout') {
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGOUT);
  }
});
