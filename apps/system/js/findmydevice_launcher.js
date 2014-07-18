/* global DUMP */
/* global SettingsHelper */
/* global wakeUpFindMyDevice */
/* global Notification */
/* global MozActivity */
/* global IAC_API_WAKEUP_REASON_ENABLED_CHANGED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */

'use strict';

const FIND_MY_DEVICE_RETRIES = 5;
const FIND_MY_DEVICE_TAG = 'findmydevice.enable-failed';

navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
  // make sure Find My Device is registered if it's enabled,
  // and that it notifies the server if disabled
  wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
});

navigator.mozSettings.addObserver('findmydevice.retry-count', function(event) {
  var _ = navigator.mozL10n.get;
  if (event.settingValue >= FIND_MY_DEVICE_RETRIES) {

    var icon = 'style/find_my_device/images/findMyDevice.png';
    var title = _('unable-to-connect');
    var body = _('tap-to-check-settings');

    var notification = new Notification(title,
      {
        body:body,
        icon:icon,
        tag: FIND_MY_DEVICE_TAG
      });
    notification.onclick = function(evt) {
      var activity = new MozActivity(
        {
          name : 'configure',
          data : {
            target : 'device',
            section: 'findmydevice'
          }
        });
      activity.onerror = function (e) {
        DUMP('There was a problem starting settings: '+e);
      };
      SettingsHelper('findmydevice.enabled').set(false);
      notification.close();
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
  var loggedInHelper = SettingsHelper('findmydevice.logged-in');
  DUMP('findmydevice received ' + eventName + ' FxA event in the System app');
  if (eventName === 'onlogin' || eventName === 'onverified') {
    loggedInHelper.set(true);
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGIN);
  } else if (eventName === 'onlogout') {
    loggedInHelper.set(false);
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGOUT);
  }
});

// ensure notifications are cleaned up on startup
function cleanupOldNotifications() {
  Notification.get().then(function(notifications) {
    notifications.forEach(function(notification) {
      if (!notification) {
        return;
      }

      // ignore notification unrelated to Find My Device
      var tag = notification.tag;
      if (!tag || !tag.startsWith(FIND_MY_DEVICE_TAG)) {
        return;
      }

      // clean up the notification
      notification.close();
    });
  });
}

cleanupOldNotifications();
