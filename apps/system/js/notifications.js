/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function appCacheIcons() {
  // Caching the icon for notification if appCache is in effect
  var appCache = window.applicationCache;
  if (!appCache)
    return;

  var addIcons = function addIcons(app) {
    if (!app.manifest)
      return;
    var icons = app.manifest.icons;
    if (icons) {
      Object.keys(icons).forEach(function iconIterator(key) {
        var url = app.origin + icons[key];
        appCache.mozAdd(url);
      });
    }
  };

  var removeIcons = function removeIcons(app) {
    var icons = app.manifest.icons;
    if (icons) {
      Object.keys(icons).forEach(function iconIterator(key) {
        var url = app.origin + icons[key];
        appCache.mozRemove(url);
      });
    }
  };

  window.addEventListener('applicationinstall', function bsm_oninstall(evt) {
    addIcons(evt.detail.application);
  });

  window.addEventListener('applicationuninstall', function bsm_oninstall(evt) {
    removeIcons(evt.detail.application);
  });
}());

var NotificationScreen = {
  TOASTER_TIMEOUT: 5000,
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  _notification: null,
  _containerWidth: null,
  _toasterTimeout: null,
  _toasterGD: null,

  lockscreenPreview: true,
  silent: false,
  vibrates: true,
  isResending: false,
  resendReceived: 0,
  resendExpecting: 0,

  init: function ns_init() {
    window.addEventListener('mozChromeNotificationEvent', this);
    this.container =
      document.getElementById('desktop-notifications-container');
    this.lockScreenContainer =
      document.getElementById('notifications-lockscreen-container');
    this.toaster = document.getElementById('notification-toaster');
    this.toasterIcon = document.getElementById('toaster-icon');
    this.toasterTitle = document.getElementById('toaster-title');
    this.toasterDetail = document.getElementById('toaster-detail');
    this.clearAllButton = document.getElementById('notification-clear');

    this._toasterGD = new GestureDetector(this.toaster);
    ['tap', 'touchstart', 'swipe', 'wheel'].forEach(function(evt) {
      this.container.addEventListener(evt, this);
      this.toaster.addEventListener(evt, this);
    }, this);

    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;

    window.addEventListener('utilitytrayshow', this);
    window.addEventListener('lockscreen-appclosed',
      this.clearLockScreen.bind(this));
    window.addEventListener('visibilitychange', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('appforeground',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('appopened',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_exclamation.ogg';

    this.ringtoneURL = new SettingsURL();

    // set up the media playback widget, but only if |MediaPlaybackWidget| is
    // defined (we don't define it in tests)
    if (typeof MediaPlaybackWidget !== 'undefined') {
      this.mediaPlaybackWidget = new MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'}
      );
    }

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
      case 'swipe':
        this.swipe(evt);
        break;
      case 'wheel':
        this.wheel(evt);
      case 'utilitytrayshow':
        this.updateTimestamps();
        StatusBar.updateNotificationUnread(false);
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

  // Swipe handling
  touchstart: function ns_touchstart(evt) {
    var target = evt.touches[0].target;
    if (!target.dataset.notificationId)
      return;

    evt.preventDefault();
    this._notification = target;
    this._containerWidth = this.container.clientWidth;
  },

  swipe: function ns_swipe(evt) {
    var detail = evt.detail;
    var distance = detail.start.screenX - detail.end.screenX;
    var fastEnough = Math.abs(detail.vx) > this.TRANSITION_SPEED;
    var farEnough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    // We only remove the notification if the swipe was
    // - left to right
    // - far or fast enough
    if ((distance > 0) ||
        !(farEnough || fastEnough)) {
      // Werent far or fast enough to delete, restore
      delete this._notification;
      return;
    }

    this.swipeCloseNotification();
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
      this.toaster.classList.remove('displayed');
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

  updateToaster: function ns_updateToaster(detail, type, dir) {
    if (detail.icon) {
      this.toasterIcon.src = detail.icon;
      this.toasterIcon.hidden = false;
    } else {
      this.toasterIcon.hidden = true;
    }

    this.toaster.dataset.notificationId = detail.id;
    this.toaster.dataset.type = type;
    this.toasterTitle.textContent = detail.title;
    this.toasterTitle.lang = detail.lang;
    this.toasterTitle.dir = dir;

    this.toasterDetail.textContent = detail.text;
    this.toasterDetail.lang = detail.lang;
    this.toasterDetail.dir = dir;
  },

  addNotification: function ns_addNotification(detail) {
    // LockScreen window may not opened while this singleton got initialized.
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');
    var notificationNode = document.createElement('div');
    notificationNode.className = 'notification';
    notificationNode.setAttribute('role', 'link');

    notificationNode.dataset.notificationId = detail.id;
    notificationNode.dataset.obsoleteAPI = 'false';
    if (typeof detail.id === 'string' &&
        detail.id.indexOf('app-notif-') === 0) {
      notificationNode.dataset.obsoleteAPI = 'true';
    }
    var type = notificationNode.dataset.type = detail.type ||
                                              'desktop-notification';
    notificationNode.dataset.manifestURL = detail.manifestURL || '';

    if (detail.icon) {
      var icon = document.createElement('img');
      icon.src = detail.icon;
      icon.setAttribute('role', 'presentation');
      notificationNode.appendChild(icon);
    }

    var time = document.createElement('span');
    var timestamp = detail.timestamp ? new Date(detail.timestamp) : new Date();
    time.classList.add('timestamp');
    time.dataset.timestamp = timestamp;
    time.textContent = this.prettyDate(timestamp);
    notificationNode.appendChild(time);

    var dir = (detail.bidi === 'ltr' ||
               detail.bidi === 'rtl') ?
          detail.bidi : 'auto';

    var title = document.createElement('div');
    title.classList.add('title');
    title.textContent = detail.title;
    notificationNode.appendChild(title);
    title.lang = detail.lang;
    title.dir = dir;

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = detail.text;
    notificationNode.appendChild(message);
    message.lang = detail.lang;
    message.dir = dir;

    var notifSelector = '[data-notification-id="' + detail.id + '"]';
    var oldNotif = this.container.querySelector(notifSelector);
    if (oldNotif) {
      // The whole node cannot be replaced because CSS animations are re-started
      oldNotif.replaceChild(title, oldNotif.querySelector('.title'));
      oldNotif.replaceChild(message, oldNotif.querySelector('.detail'));
      oldNotif.replaceChild(time, oldNotif.querySelector('.timestamp'));
      var oldIcon = oldNotif.querySelector('img');
      if (icon) {
        oldIcon ? oldIcon.src = icon.src : oldNotif.insertBefore(icon,
                                                           oldNotif.firstChild);
      } else if (oldIcon) {
        oldNotif.removeChild(oldIcon);
      }
      oldNotif.dataset.type = type;
      notificationNode = oldNotif;
    } else {
      this.container.insertBefore(notificationNode,
          this.container.firstElementChild);
    }

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-show',
      id: detail.id
    });
    window.dispatchEvent(event);

    new GestureDetector(notificationNode).startDetecting();

    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    if (typeof(ScreenManager) !== 'undefined' &&
      !ScreenManager.screenEnabled) {
      // bug 915236: disable turning on the screen for email notifications
      if (detail.manifestURL.indexOf('email.gaiamobile.org') === -1) {
        ScreenManager.turnScreenOn();
      }
    }

    this.updateStatusBarIcon(true);

    var notify = !('noNotify' in detail);
    // Notification toaster
    if (notify) {
      this.updateToaster(detail, type, dir);
      if (this.lockscreenPreview || !window.System.locked) {
        this.toaster.classList.add('displayed');
        this._toasterGD.startDetecting();

        if (this._toasterTimeout) {
          clearTimeout(this._toasterTimeout);
        }

        this._toasterTimeout = setTimeout((function() {
          this.toaster.classList.remove('displayed');
          this._toasterTimeout = null;
          this._toasterGD.stopDetecting();
        }).bind(this), this.TOASTER_TIMEOUT);
      }
    }

    // Adding it to the lockscreen if locked and the privacy setting
    // does not prevent it.
    if (System.locked && this.lockscreenPreview) {
      var lockScreenNode = notificationNode.cloneNode(true);

      // First we try and find an existing notification with the same id.
      // If we have one, we'll replace it. If not, we'll create a new node.
      var oldLockScreenNode =
        this.lockScreenContainer.querySelector(notifSelector);
      if (oldLockScreenNode) {
        this.lockScreenContainer.replaceChild(
          lockScreenNode,
          oldLockScreenNode
        );
      }
      else {
        this.lockScreenContainer.insertBefore(
          lockScreenNode,
          this.lockScreenContainer.firstElementChild
        );
      }

      // when we have notifications, show bgcolor from wallpaper
      // remove the simple gradient at the same time
      window.lockScreen.maskedBackground.style.backgroundColor =
        window.lockScreen.maskedBackground.dataset.wallpaperColor;

      window.lockScreen.maskedBackground.classList.remove('blank');
    }

    if (notify && !this.isResending) {
      if (!this.silent) {
        var ringtonePlayer = new Audio();
        ringtonePlayer.src = this._sound;
        ringtonePlayer.mozAudioChannelType = 'notification';
        ringtonePlayer.play();
        window.setTimeout(function smsRingtoneEnder() {
          ringtonePlayer.pause();
          ringtonePlayer.removeAttribute('src');
          ringtonePlayer.load();
        }, 2000);
      }

      if (this.vibrates && !document.hidden) {
        navigator.vibrate([200, 200, 200, 200]);
      }
    }

    // must be at least one notification now
    this.clearAllButton.disabled = false;

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
  },

  closeNotification: function ns_closeNotification(notificationNode) {
    var notificationId = notificationNode.dataset.notificationId;
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-close',
      id: notificationId
    });
    window.dispatchEvent(event);
    this.removeNotification(notificationId);
  },

  removeNotification: function ns_removeNotification(notificationId) {
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    var notificationNode = this.container.querySelector(notifSelector);
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');
    if (this.lockScreenContainer) {
      var lockScreenNotificationNode =
        this.lockScreenContainer.querySelector(notifSelector);
    }

    if (notificationNode)
      notificationNode.parentNode.removeChild(notificationNode);

    if (lockScreenNotificationNode) {
      var lockScreenNotificationParentNode =
        lockScreenNotificationNode.parentNode;
      lockScreenNotificationParentNode.removeChild(lockScreenNotificationNode);
      // if we don't have any notifications, remove the bgcolor from wallpaper
      // and use the simple gradient
      if (!lockScreenNotificationParentNode.firstElementChild) {
        window.lockScreen.maskedBackground.style.backgroundColor =
          'transparent';
        window.lockScreen.maskedBackground.classList.add('blank');
      }
    }
    this.updateStatusBarIcon();

    if (!this.container.firstElementChild) {
      // no notifications left
      this.clearAllButton.disabled = true;
    }
  },

  clearAll: function ns_clearAll() {
    while (this.container.firstElementChild) {
      this.closeNotification(this.container.firstElementChild);
    }
  },

  clearLockScreen: function ns_clearLockScreen() {
    // The LockScreenWindow may not be instantiated yet.
    if (!this.lockScreenContainer) {
      return;
    }
    while (this.lockScreenContainer.firstElementChild) {
      var element = this.lockScreenContainer.firstElementChild;
      this.lockScreenContainer.removeChild(element);
    }
    // remove the bgcolor from wallpaper,
    // and use the simple gradient
    window.lockScreen.maskedBackground.style.backgroundColor = 'transparent';
    window.lockScreen.maskedBackground.classList.add('blank');
  },

  updateStatusBarIcon: function ns_updateStatusBarIcon(unread) {
    var nbTotalNotif = this.container.children.length +
      this.externalNotificationsCount;
    StatusBar.updateNotification(nbTotalNotif);

    if (unread)
      StatusBar.updateNotificationUnread(true);
  },

  incExternalNotifications: function ns_incExternalNotifications() {
    this.externalNotificationsCount++;
    this.updateStatusBarIcon(true);
  },

  decExternalNotifications: function ns_decExternalNotifications() {
    this.externalNotificationsCount--;
    if (this.externalNotificationsCount < 0) {
      this.externalNotificationsCount = 0;
    }
    this.updateStatusBarIcon();
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

SettingsListener.observe(
    'lockscreen.notifications-preview.enabled', true, function(value) {

  NotificationScreen.lockscreenPreview = value;
});

SettingsListener.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value == 0);
});

SettingsListener.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
