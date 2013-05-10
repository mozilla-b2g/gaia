/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function appCacheIcons() {
  // Caching the icon for notification if appCache is in effect
  var appCache = window.applicationCache;
  if (!appCache)
    return;

  var addIcons = function addIcons(app) {
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

  init: function ns_init() {
    window.addEventListener('mozChromeEvent', this);
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
    ['tap', 'mousedown', 'swipe'].forEach(function(evt) {
      this.container.addEventListener(evt, this);
      this.toaster.addEventListener(evt, this);
    }, this);

    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;

    window.addEventListener('utilitytrayshow', this);
    window.addEventListener('unlock', this.clearLockScreen.bind(this));
    window.addEventListener('mozvisibilitychange', this);
    window.addEventListener('appopen', this.handleAppopen.bind(this));

    this._sound = 'style/notifications/ringtones/notifier_exclamation.ogg';

    var self = this;
    SettingsListener.observe('notification.ringtone', '', function(value) {
      self._sound = value;
    });
  },

  handleEvent: function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeEvent':
        var detail = evt.detail;
        if (detail.type !== 'desktop-notification')
          return;

        this.addNotification(detail);
        break;
      case 'tap':
        var target = evt.target;
        this.tap(target);
        break;
      case 'mousedown':
        this.mousedown(evt);
        break;
      case 'swipe':
        this.swipe(evt);
        break;
      case 'utilitytrayshow':
        this.updateTimestamps();
        StatusBar.updateNotificationUnread(false);
        break;
      case 'mozvisibilitychange':
        //update timestamps in lockscreen notifications
        if (!document.mozHidden) {
          this.updateTimestamps();
        }
        break;
    }
  },

  handleAppopen: function ns_handleAppopen(evt) {
    var manifestURL = evt.detail.manifestURL,
        selector = '[data-manifest-u-r-l="' + manifestURL + '"]';

    var nodes = this.container.querySelectorAll(selector);

    for (var i = nodes.length - 1; i >= 0; i--) {
      this.closeNotification(nodes[i]);
    }
  },

  // Swipe handling
  mousedown: function ns_mousedown(evt) {
    if (!evt.target.dataset.notificationID)
      return;

    evt.preventDefault();
    this._notification = evt.target;
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

    this._notification.classList.add('disappearing');

    var notification = this._notification;
    this._notification = null;

    var toaster = this.toaster;
    var self = this;
    notification.addEventListener('transitionend', function trListener() {
      notification.removeEventListener('transitionend', trListener);

      self.closeNotification(notification);

      if (notification != toaster)
        return;

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
  },

  tap: function ns_tap(notificationNode) {
    var notificationID = notificationNode.dataset.notificationID;

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'desktop-notification-click',
      id: notificationID
    });
    window.dispatchEvent(event);

    this.removeNotification(notificationNode.dataset.notificationID, false);

    if (notificationNode == this.toaster) {
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

  addNotification: function ns_addNotification(detail) {
    var notificationNode = document.createElement('div');
    notificationNode.className = 'notification';

    notificationNode.dataset.notificationID = detail.id;
    notificationNode.dataset.manifestURL = detail.manifestURL;

    if (detail.icon) {
      var icon = document.createElement('img');
      icon.src = detail.icon;
      notificationNode.appendChild(icon);
      this.toasterIcon.src = detail.icon;
      this.toasterIcon.hidden = false;
    } else {
      this.toasterIcon.hidden = true;
    }

    var time = document.createElement('span');
    var timestamp = new Date();
    time.classList.add('timestamp');
    time.dataset.timestamp = timestamp;
    time.textContent = this.prettyDate(timestamp);
    notificationNode.appendChild(time);

    var title = document.createElement('div');
    title.textContent = detail.title;
    notificationNode.appendChild(title);

    this.toasterTitle.textContent = detail.title;

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = detail.text;
    notificationNode.appendChild(message);

    this.toasterDetail.textContent = detail.text;

    this.container.insertBefore(notificationNode,
      this.container.firstElementChild);
    new GestureDetector(notificationNode).startDetecting();

    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    if (typeof(ScreenManager) !== 'undefined' &&
      !ScreenManager.screenEnabled) {
      ScreenManager.turnScreenOn();
    }

    this.updateStatusBarIcon(true);

    // Notification toaster
    if (this.lockscreenPreview || !LockScreen.locked) {
      this.toaster.dataset.notificationID = detail.id;

      this.toaster.classList.add('displayed');
      this._toasterGD.startDetecting();

      if (this._toasterTimeout)
        clearTimeout(this._toasterTimeout);

      this._toasterTimeout = setTimeout((function() {
        this.toaster.classList.remove('displayed');
        this._toasterTimeout = null;
        this._toasterGD.stopDetecting();
      }).bind(this), this.TOASTER_TIMEOUT);
    }

    // Adding it to the lockscreen if locked and the privacy setting
    // does not prevent it.
    if (typeof(LockScreen) !== 'undefined' &&
        LockScreen.locked && this.lockscreenPreview) {
      var lockScreenNode = notificationNode.cloneNode(true);
      this.lockScreenContainer.insertBefore(lockScreenNode,
                               this.lockScreenContainer.firstElementChild);
    }

    if (!this.silent) {
      var ringtonePlayer = new Audio();
      ringtonePlayer.src = this._sound;
      ringtonePlayer.mozAudioChannelType = 'notification';
      ringtonePlayer.play();
      window.setTimeout(function smsRingtoneEnder() {
        ringtonePlayer.pause();
        ringtonePlayer.src = '';
      }, 2000);
    }

    if (this.vibrates) {
      if (document.mozHidden) {
        window.addEventListener('mozvisibilitychange', function waitOn() {
          window.removeEventListener('mozvisibilitychange', waitOn);
          navigator.vibrate([200, 200, 200, 200]);
        });
      } else {
        navigator.vibrate([200, 200, 200, 200]);
      }
    }

    return notificationNode;
  },

  closeNotification: function ns_closeNotification(notificationNode) {
    var notificationID = notificationNode.dataset.notificationID;

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'desktop-notification-close',
      id: notificationID
    });
    window.dispatchEvent(event);

    this.removeNotification(notificationNode.dataset.notificationID);
  },

  removeNotification: function ns_removeNotification(notificationID) {
    var notifSelector = '[data-notification-i-d="' + notificationID + '"]';
    var notificationNode = this.container.querySelector(notifSelector);
    var lockScreenNotificationNode =
      this.lockScreenContainer.querySelector(notifSelector);

    if (notificationNode)
      notificationNode.parentNode.removeChild(notificationNode);

    if (lockScreenNotificationNode)
      lockScreenNotificationNode.parentNode
        .removeChild(lockScreenNotificationNode);
    this.updateStatusBarIcon();
  },

  clearAll: function ns_clearAll() {
    while (this.container.firstElementChild) {
      this.closeNotification(this.container.firstElementChild);
    }
  },

  clearLockScreen: function ns_clearLockScreen() {
    while (this.lockScreenContainer.firstElementChild) {
      var element = this.lockScreenContainer.firstElementChild;
      this.lockScreenContainer.removeChild(element);
    }
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

NotificationScreen.init();

SettingsListener.observe(
    'lockscreen.notifications-preview.enabled', true, function(value) {

  NotificationScreen.lockscreenPreview = value;
});

SettingsListener.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value != 0);
});

SettingsListener.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
