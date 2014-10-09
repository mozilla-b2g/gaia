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
    this.notificationsContainer =
      document.getElementById('notifications-container');
    this.container =
      document.getElementById('desktop-notifications-container');
    this.toaster = document.getElementById('notification-toaster');
    this.toasterIcon = document.getElementById('toaster-icon');
    this.toasterTitle = document.getElementById('toaster-title');
    this.toasterDetail = document.getElementById('toaster-detail');

    ['tap', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel'].
      forEach(function(evt) {
        this.container.addEventListener(evt, this);
        this.toaster.addEventListener(evt, this);
      }, this);

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;

    window.addEventListener('utilitytrayshow', this);
    // Since UI expect there is a slight delay for the opened notification.
    window.addEventListener('visibilitychange', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('appforeground',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('appopened',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_firefox.opus';

    this.ringtoneURL = new SettingsURL();

    var self = this;
    SettingsListener.observe('notification.ringtone', '', function(value) {
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
      case 'tap':
        var target = evt.target;
        this.tap(target);
        break;
      case 'touchstart':
        this.touchstart(evt);
        break;
      case 'touchmove':
        this.touchmove(evt);
        break;
      case 'touchend':
        this.touchend(evt);
        break;
      case 'touchcancel':
        this.touchcancel(evt);
        break;
      case 'wheel':
        this.wheel(evt);
      case 'utilitytrayshow':
        this.updateTimestamps();
        break;
      case 'visibilitychange':
        //update timestamps in lockscreen notifications
        if (!document.hidden) {
          this.updateTimestamps();
        }
        break;
      case 'ftuopen':
        this.toaster.removeEventListener('tap', this);
        break;
      case 'ftudone':
        this.toaster.addEventListener('tap', this);
        break;
      case 'desktop-notification-resend':
        this.resendExpecting = evt.detail.number;
        if (this.resendExpecting) {
          this.isResending = true;
        }
        break;
    }
  },

  // TODO: Remove this when we ditch mozNotification (bug 952453)
  clearDesktopNotifications: function ns_handleAppopen(evt) {
    var manifestURL = evt.detail.manifestURL,
        selector = '[data-manifest-u-r-l="' + manifestURL + '"]';

    var nodes = this.container.querySelectorAll(selector);

    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].dataset.obsoleteAPI === 'true') {
        this.closeNotification(nodes[i]);
      }
    }
  },

  cancelSwipe: function ns_cancelSwipe() {
    var notification = this._notification;
    this._notification = null;

    // If the notification has been moved, animate it back to its original
    // position.
    if (this._touchPosX) {
      notification.addEventListener('transitionend',
        function trListener() {
          notification.removeEventListener('transitionend', trListener);
          notification.classList.remove('snapback');
        });
      notification.classList.add('snapback');
    }

    notification.style.transform = '';
  },

  // Swipe handling
  touchstart: function ns_touchstart(evt) {
    if (evt.touches.length !== 1) {
      if (this._touching) {
        this._touching = false;
        this.cancelSwipe();
      }
      return;
    }

    var target = evt.touches[0].target;
    if (!target.dataset.notificationId)
      return;

    this._notification = target;
    this._containerWidth = this.container.clientWidth;
    this._touchStartX = evt.touches[0].pageX;
    this._touchStartY = evt.touches[0].pageY;
    this._touchPosX = 0;
    this._touching = true;
    this._isTap = true;
  },

  touchmove: function ns_touchmove(evt) {
    if (!this._touching) {
      return;
    }

    var touchDiffY = evt.touches[0].pageY - this._touchStartY;

    // The notification being touched is the toast
    if (this._notification.classList.contains('displayed')) {
      this._touching = false;
      if (touchDiffY < 0)
        this.closeToast();
      return;
    }

    if (evt.touches.length !== 1 ||
        (this._isTap && Math.abs(touchDiffY) >= this.SCROLL_THRESHOLD)) {
      this._touching = false;
      this.cancelSwipe();
      return;
    }

    evt.preventDefault();

    this._touchPosX = evt.touches[0].pageX - this._touchStartX;
    if (Math.abs(this._touchPosX) >= this.TAP_THRESHOLD) {
      this._isTap = false;
    }
    if (!this._isTap) {
      this._notification.style.transform =
        'translateX(' + this._touchPosX + 'px)';
    }
  },

  touchend: function ns_touchend(evt) {
    if (!this._touching) {
      return;
    }

    evt.preventDefault();
    this._touching = false;

    if (this._isTap) {
      var event = new CustomEvent('tap', {
        bubbles: true,
        cancelable: true
      });
      this._notification.dispatchEvent(event);
      this._notification = null;
      return;
    }

    if (Math.abs(this._touchPosX) >
        this._containerWidth * this.TRANSITION_FRACTION) {
      if (this._touchPosX < 0) {
        this._notification.classList.add('left');
      }
      this.swipeCloseNotification();
    } else {
      this.cancelSwipe();
    }
  },

  touchcancel: function ns_touchcancel(evt) {
    if (this._touching) {
      evt.preventDefault();
      this._touching = false;
      this.cancelSwipe();
    }
  },

  wheel: function ns_wheel(evt) {
    if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaX) {
      this._notification = evt.target;
      this.swipeCloseNotification();
    }
  },

  tap: function ns_tap(node) {
    var notificationId = node.dataset.notificationId;
    var notificationNode = this.container.querySelector(
      '[data-notification-id="' + notificationId + '"]');

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-click',
      id: notificationId
    });
    window.dispatchEvent(event);

    window.dispatchEvent(new CustomEvent('notification-clicked', {
      detail: {
        id: notificationId
      }
    }));

    // Desktop notifications are removed when they are clicked (see bug 890440)
    if (notificationNode.dataset.type === 'desktop-notification' &&
        notificationNode.dataset.obsoleteAPI === 'true') {
      this.closeNotification(notificationNode);
    }

    if (node == this.toaster) {
      this.closeToast();
    } else {
      UtilityTray.hide();
    }
  },

  updateTimestamps: function ns_updateTimestamps() {
    var timestamps = document.getElementsByClassName('timestamp');
    for (var i = 0, l = timestamps.length; i < l; i++) {
      timestamps[i].textContent =
        this.prettyDate(new Date(timestamps[i].dataset.timestamp));
    }
  },

  /**
   * Display a human-readable relative timestamp.
   */
  prettyDate: function prettyDate(time) {
    var date;
    if (navigator.mozL10n) {
      date = navigator.mozL10n.DateTimeFormat().fromNow(time, true);
    } else {
      date = time.toLocaleFormat();
    }
    return date;
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

    return notificationNode;
  },

  swipeCloseNotification: function ns_swipeCloseNotification() {
    var notification = this._notification;
    this._notification = null;

    var toaster = this.toaster;
    var self = this;
    notification.addEventListener('transitionend', function trListener() {
      notification.removeEventListener('transitionend', trListener);

      self.closeNotification(notification);

      if (notification != toaster) {
        return;
      }

      // Putting back the toaster in a clean state for the next notification
      toaster.style.display = 'none';
      setTimeout(function nextLoop() {
        toaster.style.MozTransition = '';
        toaster.style.MozTransform = '';
        toaster.classList.remove('displayed');
        toaster.classList.remove('disappearing');

        setTimeout(function nextLoop() {
          toaster.style.display = 'block';
        });
      });
    });

    notification.classList.add('disappearing');
    notification.style.transform = '';
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
  if ('mozSettings' in navigator && navigator.mozSettings) {
    var key = 'notifications.resend';
    var req = navigator.mozSettings.createLock().get(key);
    req.onsuccess = function onsuccess() {
      var resendEnabled = req.result[key] || false;
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
    };
  }
});

NotificationScreen.init();

SettingsListener.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value == 0);
});

SettingsListener.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
