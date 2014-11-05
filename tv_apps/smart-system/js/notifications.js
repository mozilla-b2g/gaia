/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


var NotificationScreen = {
  TOASTER_TIMEOUT: 5000,
  TRANSITION_FRACTION: 0.30,
  TAP_THRESHOLD: 10,
  SCROLL_THRESHOLD: 10,

  _notifications: {},
  _notification: null,
  _containerWidth: null,
  _touchStartX: 0,
  _touchStartY: 0,
  _touchPosX: 0,
  _touching: false,
  _isTap: false,
  _toasterTimeout: null,

  silent: false,
  vibrates: true,
  isResending: false,
  resendReceived: 0,
  resendExpecting: 0,

  /* These applications' notifications will be added in the "priority"
   * notification group
   */
  PRIORITY_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  /* These applications' notifications will not be notified, it means we won't
   * have:
   * - the banner
   * - the vibration
   * - the sound
   */
  SILENT_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  init: function ns_init() {
    window.addEventListener('mozChromeNotificationEvent', this);
    this.toaster = document.getElementById('notification-toaster');
    this.toasterIcon = document.getElementById('toaster-icon');
    this.toasterTitle = document.getElementById('toaster-title');
    this.toasterDetail = document.getElementById('toaster-detail');

    ['click', 'wheel'].forEach(function(evt) {
      this.toaster.addEventListener(evt, this);
    }, this);

    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_firefox.opus';

    this.ringtoneURL = new SettingsURL();

    var self = this;
    SettingsCache.observe('notification.ringtone', '', function(value) {
      self._sound = self.ringtoneURL.set(value);
    });
  },

  handleEvent: function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeNotificationEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'desktop-notification':
            this.addNotification(detail);
            if (this.isResending) {
              this.resendReceived++;
              this.isResending = (this.resendReceived < this.resendExpecting);
            }
            break;
          case 'desktop-notification-close':
            this.removeNotification(detail.id);
            break;
        }
        break;
      case 'click':
        this.click();
        break;
      case 'ftuopen':
        this.toaster.removeEventListener('click', this);
        break;
      case 'ftudone':
        this.toaster.addEventListener('click', this);
        break;
      case 'desktop-notification-resend':
        this.resendExpecting = evt.detail.number;
        if (this.resendExpecting) {
          this.isResending = true;
        }
        break;
    }
  },

  click: function ns_click() {
    // we use displayed class as the flag of showing of toaster
    if (!this.toaster.classList.contains('displayed')) {
      return;
    }
    var notification = this._notifications[this.toaster.dataset.notificationId];
    if (!notification) {
      return;
    }
    // we sends the click to gecko and others
    this.clickNotification(notification.id);

    // Desktop notifications are removed when they are clicked (see bug 890440)
    if (notification.type === 'desktop-notification' &&
        notification.obsoleteAPI === 'true') {
      this.removeNotification(notification.id);
    }
    // we only have toast now, so, try to close the toast.
    this.closeToast();
  },

  clickNotification: function ns_clickNotification(id) {
    // event for gecko
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-click',
      id: id
    });
    window.dispatchEvent(event);
    // event for gaia
    window.dispatchEvent(new CustomEvent('notification-clicked', {
      detail: {
        id: id
      }
    }));
  },

  updateToaster: function ns_updateToaster(detail) {
    if (detail.icon) {
      this.toasterIcon.src = detail.icon;
      this.toasterIcon.hidden = false;
    } else {
      this.toasterIcon.hidden = true;
    }

    this.toaster.dataset.notificationId = detail.id;
    this.toaster.dataset.type = detail.type;
    this.toasterTitle.textContent = detail.title;
    this.toasterTitle.lang = detail.lang;
    this.toasterTitle.dir = detail.dir;

    this.toasterDetail.textContent = detail.text;
    this.toasterDetail.lang = detail.lang;
    this.toasterDetail.dir = detail.dir;
  },

  showToast: function ns_showToast(notification) {
    this.updateToaster(notification);
    this.toaster.classList.add('displayed');

    if (this._toasterTimeout) {
      clearTimeout(this._toasterTimeout);
    }

    this._toasterTimeout = setTimeout((function() {
      this.closeToast();
      this._toasterTimeout = null;
      // We remove notification when toast is hidden. This may need more
      // UX/Visual spec to define the proper way to show notification.
      this.removeNotification(notification.id);
    }).bind(this), this.TOASTER_TIMEOUT);
  },

  playSound: function ns_playSound(behavior) {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = behavior.soundFile || this._sound;
    ringtonePlayer.mozAudioChannelType = 'notification';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.removeAttribute('src');
      ringtonePlayer.load();
    }, 2000);
  },

  vibrate: function ns_vibrate(behavior) {
    var pattern = [200, 200, 200];
    if (behavior.vibrationPattern && behavior.vibrationPattern.length &&
        behavior.vibrationPattern[0] > 0) {
      pattern = behavior.vibrationPattern;
    }

    if (document.hidden) {
      // bug 1030310: disable vibration for the email app when asleep
      // bug 1050023: disable vibration for downloads when asleep
      if (type.indexOf('download-notification-downloading') === -1 &&
          manifestURL.indexOf('email.gaiamobile.org') === -1) {
        window.addEventListener('visibilitychange', function waitOn() {
          window.removeEventListener('visibilitychange', waitOn);
          navigator.vibrate(pattern);
        });
      }
    } else {
      navigator.vibrate(pattern);
    }
  },

  addNotification: function ns_addNotification(detail) {
    var behavior = detail.mozbehavior;
    // keep the notification structure for future implementation.
    var notification = {
      'id': detail.id,
      'manifestURL': detail.manifestURL,
      'behavior': {
        'noclear': behavior.noclear,
        'noscreen': behavior.noscreen,
        'soundFile': behavior.soundFile,
        'vibrationPattern': behavior.vibrationPattern
      },
      'noNotify': detail.noNotify,
      'priority': this.PRIORITY_APPLICATIONS.indexOf(detail.manifestURL)
                  !== -1,
      'obsoleteAPI': typeof detail.id === 'string' &&
                     detail.id.indexOf('app-notif-') === 0,
      'type': detail.type || 'desktop-notification',
      'icon': detail.icon,
      'dir': (detail.bidi === 'ltr' || detail.bidi === 'rtl') ?
             detail.bidi : 'auto',
      'lang': detail.lang,
      'title': detail.title,
      'timestamp': detail.timestamp ? new Date(detail.timestamp) : new Date(),
      'text': detail.text
    }
    this._notifications[notification.id] = notification;

    // Tell gecko that we already show the notification.
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-show',
      id: notification.id
    });
    window.dispatchEvent(event);

    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    if (!behavior.noscreen && typeof(ScreenManager) !== 'undefined' &&
        !ScreenManager.screenEnabled) {
      ScreenManager.turnScreenOn();
    }

    var notify = !(notification.noNotify) &&
      // don't notify for network-alerts notifications
      (this.SILENT_APPLICATIONS.indexOf(notification.manifestURL) === -1);

    // We don't need to show toast, play sould or vibrate when no need to
    // notify.
    if (!notify) {
      return;
    }

    // Notification toaster
    this.showToast(notification);

    if (!this.isResending) {
      // play sound
      if (!this.silent) {
        this.playSound(behavior);
      }
      // vibrate
      if (this.vibrates) {
        this.vibrate(behavior);
      }
    }
  },

  closeToast: function ns_closeToast() {
    this.toaster.classList.remove('displayed');
  },

  removeNotification: function ns_removeNotification(notificationId) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-close',
      id: notificationId
    });
    window.dispatchEvent(event);
    delete this._notifications[notificationId];
  }
};

window.addEventListener('load', function() {
  window.removeEventListener('load', this);
  if (window.SettingsCache) {
    SettingsCache.get('notifications.resend', function onsuccess(value) {
      var resendEnabled = value || false;
      if (!resendEnabled) {
        return;
      }

      var resendCallback = (function(number) {
        window.dispatchEvent(
          new CustomEvent('desktop-notification-resend',
            { detail: { number: number } }));
      }).bind(this);

      if ('mozChromeNotifications' in navigator) {
        navigator.mozChromeNotifications.
          mozResendAllNotifications(resendCallback);
      }
    });
  }
});

NotificationScreen.init();

SettingsCache.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value == 0);
});

SettingsCache.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
