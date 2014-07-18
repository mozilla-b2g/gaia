/* global DUMP */
/* global SettingsHelper */
/* global wakeUpFindMyDevice */
/* global IAC_API_WAKEUP_REASON_ENABLED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */

'use strict';

const FIND_MY_DEVICE_RETRIES = 5;

navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
  if (event.settingValue === true) {
    // make sure Find My Device is registered if it's enabled
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_ENABLED);
  }
});

navigator.mozSettings.addObserver('findmydevice.retry-count', function(event) {
  var _ = navigator.mozL10n.get;
  if (event.settingValue >= FIND_MY_DEVICE_RETRIES) {

    // TODO: load the icon
    var icon = null;
    var title = _('unable-to-connect');
    var body = _('tap-to-check-settings');

    var notification = new Notification(title, {body:body, icon:icon});
    notification.onclick = function(evt) {
      var openSettings = new MozActivity(
        {
          name : "configure",
          data : {
            target : "device",
          section: "findmydevice"
          }
        });
      SettingsHelper('findmydevice.enabled').set(false);
      evt.target.close();
    };
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
