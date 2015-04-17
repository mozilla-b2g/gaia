/* global DUMP */
/* global SettingsHelper */
/* global wakeUpFindMyDevice */
/* global Notification */
/* global MozActivity */
/* global IAC_API_WAKEUP_REASON_ENABLED_CHANGED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */
/* global IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED */

'use strict';

const FMD_MAX_REGISTRATION_RETRIES = 5;
const FMD_ENABLE_FAILURE_NOTIFICATION_TAG = 'findmydevice.enable-failed';

// Open settings at the findmydevice section
var FMDOpenSettings = function() {
  var activity = new MozActivity(
      {
        name : 'configure',
        data : {
          target : 'device',
          section: 'findmydevice'
        }
      });
  activity.onerror = function (e) {
    DUMP('There was a problem opening settings: '+e);
  };
};

// ensure resent notifications are closed properly
var FMDCloseNotifications = function() {
  Notification.get().then(function(notifications) {
    notifications.forEach(function(notification) {
      if (!notification) {
        return;
      }

      // ignore notification unrelated to Find My Device
      var tag = notification.tag;
      if (!tag || !tag.startsWith(FMD_ENABLE_FAILURE_NOTIFICATION_TAG)) {
        return;
      }

      // reissue the notification
      notification.close();
    });
  });
};

function onRetryCountChanged(event) {
  // Make sure a notification is displayed if the retry count is exceeded
  var fmdEnabledHelper = SettingsHelper('findmydevice.enabled');
  if (event.settingValue >= FMD_MAX_REGISTRATION_RETRIES) {
    fmdEnabledHelper.set(false);

    var _ = navigator.mozL10n.get;
    var icon = 'style/find_my_device/images/findMyDevice.png';
    var title = _('unable-to-connect');
    var body = _('tap-to-check-settings');

    var notification = new Notification(title,
      {
        body:body,
        icon:icon,
        tag: FMD_ENABLE_FAILURE_NOTIFICATION_TAG
      });

    notification.onclick = function(evt) {
      FMDOpenSettings();
      notification.close();
    };
  }
}

function onGeoEnabledChanged(event) {
  // invalidate registration so we can report to the server
  // whether tracking is enabled or not, which depends on
  // geolocation
  wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_STALE_REGISTRATION);
}

function onLockscreenClosed(event) {
  if (event.detail && event.detail.activity &&
      'record' === event.detail.activity.name) {
    // Let's make sure we won't start FMD when user triggers Camera from
    // the lockscreen.
    return;
  }

  // clear the lockscreen lock message
  var lockMessageHelper = SettingsHelper('lockscreen.lock-message');
  lockMessageHelper.set('');

  // stop the ringer if it's currently being rung
  wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
}

function onFMDEnabledChange(enabled) {
  if (enabled) {
    navigator.mozSettings.addObserver('findmydevice.retry-count',
      onRetryCountChanged);
    navigator.mozSettings.addObserver('geolocation.enabled',
      onGeoEnabledChanged);
    window.addEventListener('lockscreen-appclosed', onLockscreenClosed);
  } else {
    navigator.mozSettings.removeObserver('findmydevice.retry-count',
      onRetryCountChanged);
    navigator.mozSettings.removeObserver('geolocation.enabled',
      onGeoEnabledChanged);
    window.removeEventListener('lockscreen-appclosed', onLockscreenClosed);
  }
}

// Only attach listeners if FMD is enabled (bug 1062558)
var fmdEnabledSetting = SettingsHelper('findmydevice.enabled');
fmdEnabledSetting.get(onFMDEnabledChange);

// We always need to listen for this settings change
navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
  onFMDEnabledChange(event.settingValue);
  // make sure Find My Device is registered if it's enabled,
  // and that it notifies the server if disabled
  wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
});

window.addEventListener('mozFxAccountsUnsolChromeEvent', function(event) {
  if (!event || !event.detail) {
    return;
  }

  var eventName = event.detail.eventName;
  var loggedInHelper = SettingsHelper('findmydevice.logged-in');
  DUMP('findmydevice received ' + eventName + ' FxA event in the System app');

  // We need to persist FxA login state in `findmydevice.logged-in` settings,
  // but only launch findmydevice when it's enabled.
  if (eventName === 'onlogin' || eventName === 'onverified') {
    loggedInHelper.set(true);
    fmdEnabledSetting.get(function(enabled) {
      if (enabled) {
        wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGIN);
      }
    });
  } else if (eventName === 'onlogout') {
    loggedInHelper.set(false);
    fmdEnabledSetting.get(function(enabled) {
      if (enabled) {
        wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGOUT);
      }
    });
  }
});

// ensure resent notifications are handled correctly
window.navigator.mozSetMessageHandler('notification', function(message) {
  if (!message.clicked) {
    return;
  } else {
    if (message.tag &&
      message.tag.startsWith(FMD_ENABLE_FAILURE_NOTIFICATION_TAG)) {
      FMDOpenSettings();
      FMDCloseNotifications();
    }
  }
});
