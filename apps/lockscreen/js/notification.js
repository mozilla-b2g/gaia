/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

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
  configs: null,

  init: function ns_init() {
    this.lockScreenContainer =
      document.getElementById('notifications-lockscreen-container');

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;

    // The `LockScreen` would broadcast this event and we'll handle it.
    // There would be an IAC message for System app as well.
    window.addEventListener('unlock', this.clearLockScreen.bind(this));
    window.addEventListener('visibilitychange', this);
    window.addEventListener('request-add-notification', this);
    window.addEventListener('request-close-notification', this);

    this._sound = 'style/notifications/ringtones/notifier_exclamation.ogg';

    this.ringtoneURL = new SettingsURL();

    var self = this;
    SettingsListener.observe('notification.ringtone', '', function(value) {
      self._sound = self.ringtoneURL.set(value);
    });
  },

  handleEvent: function ns_handleEvent(evt) {
    console.log('(II) notificaiton receive event: ', evt.type);
    switch (evt.type) {
      case 'request-add-notification':
        this.addNotification(evt.detail);
        break;
      case 'request-close-notification':
        this.removeNotification(evt.detail.id);
        break;
      case 'visibilitychange':
        //update timestamps in lockscreen notifications
        if (!document.hidden) {
          this.updateTimestamps();
        }
        break;
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
    var notify = !('noNotify' in detail);

    // LockScreen window may not opened while this singleton got initialized.
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');
    var notificationNode = document.createElement('div');
    notificationNode.className = 'notification';

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
      notificationNode.appendChild(icon);
    }

    var time = document.createElement('span');
    var timestamp = new Date();
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

    if (this.lockscreenPreview) {
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
    }
    return notificationNode;
  },

  closeNotification: function ns_closeNotification(notificationNode) {
    var notificationId = notificationNode.dataset.notificationId;
    this.removeNotification(notificationNode.dataset.notificationId);
  },

  removeNotification: function ns_removeNotification(notificationId) {
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');
    var lockScreenNotificationNode =
      this.lockScreenContainer.querySelector(notifSelector);

    if (lockScreenNotificationNode)
      lockScreenNotificationNode.parentNode
        .removeChild(lockScreenNotificationNode);
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
  }
};

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
