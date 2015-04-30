/* global DUMP */
/* global SettingsHelper */
/* global wakeUpFindMyDevice */
/* global Notification */
/* global MozActivity */
/* global Service */
/* global LazyLoader */
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

function FMDNotifications () {}

FMDNotifications.prototype = {

  handleSystemMessageNotification: function(message) {
    FMDOpenSettings();
    this.closeSystemMessageNotification(message);
  },

  closeSystemMessageNotification: function(msg) {
    Notification.get({ tag: msg.tag }).then(notifs => {
      notifs.forEach(notif => {
        if (notif.tag) {
          // Close notification with the matching tag
          if (notif.tag === msg.tag) {
            notif.close && notif.close();
          }
        } else {
          // If we have notification without a tag, check on the body
          if (notif.body === msg.body) {
            notif.close && notif.close();
          }
        }
      });
    });
  },
};

var FMDNotificationsHandler = new FMDNotifications();

function FMDInit() {
  Service.request('handleSystemMessageNotification',
                  'findmydevice', FMDNotificationsHandler);

  navigator.mozSettings.addObserver('findmydevice.enabled', function(event) {
    // make sure Find My Device is registered if it's enabled,
    // and that it notifies the server if disabled
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
  });

  var fmdEnabledHelper = SettingsHelper('findmydevice.enabled');
  navigator.mozSettings.addObserver('findmydevice.retry-count',
    function(event) {
      // Make sure a notification is displayed if the retry count is exceeded
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
            tag: FMD_ENABLE_FAILURE_NOTIFICATION_TAG,
            data: {
              systemMessageTarget: 'findmydevice'
            }
          });

        notification.onclick = function(evt) {
          FMDOpenSettings();
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

  var lockMessageHelper = SettingsHelper('lockscreen.lock-message');
  window.addEventListener('lockscreen-request-unlock', function(event) {
    if (event.detail && event.detail.activity &&
        'record' === event.detail.activity.name) {
      // Let's make sure we won't start FMD when user triggers Camera from
      // the lockscreen.
      return;
    }

    // clear the lockscreen lock message
    lockMessageHelper.set('');

    // stop the ringer if it's currently being rung
    wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
  });

  var loggedInHelper = SettingsHelper('findmydevice.logged-in');
  window.addEventListener('mozFxAccountsUnsolChromeEvent', function(event) {
    if (!event || !event.detail) {
      return;
    }

    var eventName = event.detail.eventName;
    DUMP('findmydevice received ' + eventName + ' FxA event in the System app');
    if (eventName === 'onlogin' || eventName === 'onverified') {
      loggedInHelper.set(true);
      wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGIN);
    } else if (eventName === 'onlogout') {
      loggedInHelper.set(false);
      wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_LOGOUT);
    }
  });
}

window.FindmydeviceLauncher = function() {};
window.FindmydeviceLauncher.prototype.start = function() {
  return LazyLoader.load(['shared/js/findmydevice_iac_api.js'])
    .then(function() {
      FMDInit();
    });
};
