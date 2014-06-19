/**
 * Copyright 2012, Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This Notifications is for UtilityTray,
 * which would show notifications on it, and would
 * control the functions like clearing them.
 */
(function(exports) {
  'use strict';
  var Notifications = function() {
    this.TOASTER_TIMEOUT = 5000;
    this.TRANSITION_SPEED = 1.8;
    this.TRANSITION_FRACTION = 0.30;

    this._notification = null;
    this._containerWidth = null;
    this._toasterTimeout = null;
    this._toasterGD = null;

    this.silent = false;
    this.vibrates = true;
    this.isResending = false;
    this.resendReceived = 0;
    this.resendExpecting = 0;

    this.lockscreenPreview = true;
  };

  Notifications.prototype.start =
  function ns_start() {
    window.SettingsListener.observe(
        'lockscreen.notifications-preview.enabled', true, (value) => {
      this.lockscreenPreview = value;
    });

    window.SettingsListener.observe('audio.volume.notification', 7, (value) => {
      this.silent = (value === 0);
    });

    window.SettingsListener.observe('vibration.enabled', true, (value) => {
      this.vibrates = value;
    });

    window.addEventListener('mozChromeNotificationEvent', this);
    this.container =
      document.getElementById('desktop-notifications-container');

    window.addEventListener('notification-add', this);
    window.addEventListener('notification-remove', this);
    window.addEventListener('notification-descrease', this);
    window.addEventListener('notification-increase', this);

    if (window.applicationCache) {
      this.enableIconCache();
    }

    this.toaster = document.getElementById('notification-toaster');
    this.toasterIcon = document.getElementById('toaster-icon');
    this.toasterTitle = document.getElementById('toaster-title');
    this.toasterDetail = document.getElementById('toaster-detail');
    this.clearAllButton = document.getElementById('notification-clear');

    this._toasterGD = new window.GestureDetector(this.toaster);
    ['tap', 'mousedown', 'swipe', 'wheel'].forEach(function(evt) {
      this.container.addEventListener(evt, this);
      this.toaster.addEventListener(evt, this);
    }, this);

    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;

    window.addEventListener('utilitytrayshow', this);
    window.addEventListener('visibilitychange', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('appforeground',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('appopened',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_exclamation.ogg';

    this.ringtoneURL = new window.SettingsURL();

    // set up the media playback widget, but only if |MediaPlaybackWidget| is
    // defined (we don't define it in tests)
    if (typeof MediaPlaybackWidget !== 'undefined') {
      this.mediaPlaybackWidget = new window.MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'}
      );
    }

    window.SettingsListener.observe('notification.ringtone', '', (value) => {
      this._sound = this.ringtoneURL.set(value);
    });
  };

  Notifications.prototype.enableIconCache =
  function ns_enableIconCache() {
    var appCache = window.applicationCache;
    var addIcons = function addIcons(app) {
      if (!app.manifest) {
        return;
      }
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

    window.addEventListener('applicationinstall',
    function bsm_oninstall(evt) {
      addIcons(evt.detail.application);
    });

    window.addEventListener('applicationuninstall',
    function bsm_oninstall(evt) {
      removeIcons(evt.detail.application);
    });
  };

  Notifications.prototype.handleEvent =
  function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'notification-add':
        var onsuccess = evt.detail.onsuccess;
        var notification = this.addNotification(evt.detail);
        if (onsuccess) {
          onsuccess(notification);
        }
        break;
      case 'notification-remove':
        this.removeNotification(evt.detail);
        break;
      case 'notification-descrease':
        this.decExternalNotifications();
        break;
      case 'notification-increase':
        this.incExternalNotifications();
        break;
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
       /* falls through */
      case 'utilitytrayshow':
        this.updateTimestamps();
        window.StatusBar.updateNotificationUnread(false);
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
  };

  // TODO: Remove this when we ditch mozNotification (bug 952453)
  Notifications.prototype.clearDesktopNotifications =
  function ns_handleAppopen(evt) {
    var manifestURL = evt.detail.manifestURL,
        selector = '[data-manifest-u-r-l="' + manifestURL + '"]';

    var nodes = this.container.querySelectorAll(selector);

    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].dataset.obsoleteAPI === 'true') {
        this.closeNotification(nodes[i]);
      }
    }
  };

  // Swipe handling
  Notifications.prototype.touchstart =
  function ns_touchstart(evt) {
    var target = evt.touches[0].target;
    if (!target.dataset.notificationId) {
      return;
    }

    evt.preventDefault();
    this._notification = target;
    this._containerWidth = this.container.clientWidth;
  };

  Notifications.prototype.swipe =
  function ns_swipe(evt) {
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
  };

  Notifications.prototype.wheel =
  function ns_wheel(evt) {
    if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaX) {
      this._notification = evt.target;
      this.swipeCloseNotification();
    }
  };

  Notifications.prototype.tap =
  function ns_tap(node) {
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
      window.UtilityTray.hide();
    }
  };

  Notifications.prototype.updateTimestamps =
  function ns_updateTimestamps() {
    var timestamps = document.getElementsByClassName('timestamp');
    for (var i = 0, l = timestamps.length; i < l; i++) {
      timestamps[i].textContent =
        this.prettyDate(new Date(timestamps[i].dataset.timestamp));
    }
  };

  /**
   * Display a human-readable relative timestamp.
   */
  Notifications.prototype.prettyDate =
  function prettyDate(time) {
    var date;
    if (navigator.mozL10n) {
      date = navigator.mozL10n.DateTimeFormat().fromNow(time, true);
    } else {
      date = time.toLocaleFormat();
    }
    return date;
  };

  Notifications.prototype.updateToaster =
  function ns_updateToaster(detail, type, dir) {
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
  };

  Notifications.prototype.createNotification =
  function ns_createNotification(detail) {
    var icon = null;
    var notificationNode = document.createElement('div');
    notificationNode.className = 'notification';
    notificationNode.setAttribute('role', 'link');
    notificationNode.dataset.notificationId = detail.id;
    notificationNode.dataset.obsoleteAPI = 'false';
    if (typeof detail.id === 'string' &&
        detail.id.indexOf('app-notif-') === 0) {
      notificationNode.dataset.obsoleteAPI = 'true';
    }

    notificationNode.dataset.manifestURL = detail.manifestURL || '';
    notificationNode.dataset.type = detail.type ||
                                'desktop-notification';
    notificationNode.dataset.id = detail.id;
    notificationNode.dataset.bidi = detail.bidi;
    notificationNode.dataset.manifestURL = detail.manifestURL;
    notificationNode.dataset.noNoty = detail.noNoty ? true : false;
    notificationNode.dataset.text = detail.text;
    notificationNode.dataset.lang = detail.lang;

    if (detail.icon) {
      icon = document.createElement('img');
      icon.classList.add('icon');
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
    return notificationNode;
  };

  Notifications.prototype.addNotification =
  function ns_addNotification(detail) {
    var notification = detail;
    if (!(notification instanceof window.HTMLElement)) {
      notification = this.createNotification(detail);
    }
    var dir = (notification.dataset.bidi === 'ltr' ||
               notification.dataset.bidi === 'rtl') ?
          notification.dataset.bidi : 'auto';
    var manifestURL = notification.dataset.manifestURL;
    var noNoty = 'true' === notification.dataset.noNoty;
    var id = notification.dataset.id;
    var lang = notification.dataset.lang;
    var type = notification.dataset.type;
    var text = notification.dataset.text;
    var time = notification.querySelector('.timestamp');
    var title = notification.querySelector('.title');
    var message = notification.querySelector('.detail');
    var icon = notification.querySelector('.icon');
    var notifSelector = '[data-notification-id="' + id + '"]';
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
      notification = oldNotif;
    } else {
      this.container.insertBefore(notification,
          this.container.firstElementChild);
    }

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-show',
      id: id
    });
    window.dispatchEvent(event);

    new window.GestureDetector(notification).startDetecting();

    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    if (typeof(ScreenManager) !== 'undefined' &&
      !window.ScreenManager.screenEnabled) {
      // bug 915236: disable turning on the screen for email notifications
      if (manifestURL.indexOf('email.gaiamobile.org') === -1) {
        window.ScreenManager.turnScreenOn();
      }
    }

    this.updateStatusBarIcon(true);

    var notify = !noNoty;
    // Notification toaster
    if (notify) {
      var toasterDetail = {
        icon: icon ? icon.src : '',
        id: id,
        type: type,
        title: title ? title.textContent : '',
        lang: lang,
        text: text
      };
      this.updateToaster(toasterDetail, type, dir);

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

      if (this.vibrates) {
        if (document.hidden) {
          window.addEventListener('visibilitychange', function waitOn() {
            window.removeEventListener('visibilitychange', waitOn);
            navigator.vibrate([200, 200, 200, 200]);
          });
        } else {
          navigator.vibrate([200, 200, 200, 200]);
        }
      }
    }

    // must be at least one notification now
    this.clearAllButton.disabled = false;

    return notification;
  };

  Notifications.prototype.swipeCloseNotification =
  function ns_swipeCloseNotification() {
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
  };

  Notifications.prototype.closeNotification =
  function ns_closeNotification(notificationNode) {
    var notificationId = notificationNode.dataset.notificationId;
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-close',
      id: notificationId
    });
    window.dispatchEvent(event);
    this.removeNotification(notificationId);
  };

  Notifications.prototype.removeNotification =
  function ns_removeNotification(notificationId) {
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    var notificationNode = this.container.querySelector(notifSelector);
    var lockScreenNotificationNode = null;

    // ^^
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');

    if (this.lockScreenContainer) {
      lockScreenNotificationNode =
        this.lockScreenContainer.querySelector(notifSelector);
    }

    if (notificationNode) {
      notificationNode.parentNode.removeChild(notificationNode);
    }

    // ^^
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
  };

  Notifications.prototype.clearAll =
  function ns_clearAll() {
    while (this.container.firstElementChild) {
      this.closeNotification(this.container.firstElementChild);
    }
  };

  // ^^
  Notifications.prototype.clearLockScreen =
  function ns_clearLockScreen() {
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
  };

  Notifications.prototype.updateStatusBarIcon =
  function ns_updateStatusBarIcon(unread) {
    var nbTotalNotif = this.container.children.length +
      this.externalNotificationsCount;
    window.StatusBar.updateNotification(nbTotalNotif);

    if (unread) {
      window.StatusBar.updateNotificationUnread(true);
    }
  };

  Notifications.prototype.incExternalNotifications =
  function ns_incExternalNotifications() {
    this.externalNotificationsCount++;
    this.updateStatusBarIcon(true);
  };

  Notifications.prototype.decExternalNotifications =
  function ns_decExternalNotifications() {
    this.externalNotificationsCount--;
    if (this.externalNotificationsCount < 0) {
      this.externalNotificationsCount = 0;
    }
    this.updateStatusBarIcon();
  };

  exports.Notifications = Notifications;
  exports.notifications = new Notifications();
  exports.notifications.start();
})(window);
