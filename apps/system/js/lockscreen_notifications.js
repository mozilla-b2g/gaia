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

'use strict';

/**
 * This LockScreenNotifications is for LockScreen, which would show
 * notifications on it, and would control the functions like clearing
 * them. After we made LockScreen as an app, this file would not exist
 * in System.
 */
(function(exports) {
  var LockScreenNotifications = function() {
    this._notification = null;
    this.lockscreenPreview = true;
  };

  LockScreenNotifications.prototype.start =
  function ns_start() {
    window.SettingsListener.observe(
        'lockscreen.notifications-preview.enabled', true, (value) => {
      this.lockscreenPreview = value;
    });

    window.addEventListener('mozChromeNotificationEvent', this);
    this.container =
      document.getElementById('desktop-notifications-container');

    if (window.applicationCache) {
      this.enableIconCache();
    }

    window.addEventListener('notification-add', this);
    window.addEventListener('notification-remove', this);
    window.addEventListener('mozChromeNotificationEvent', this);

    this.lockScreenContainer =
      document.getElementById('notifications-lockscreen-container');

    window.addEventListener('lockscreen-appclosed',
      this.clearLockScreen.bind(this));
  };

  // Keep it because we need this function when LockScreen
  // become an app.
  LockScreenNotifications.prototype.enableIconCache =
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

  LockScreenNotifications.prototype.handleEvent =
  function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'notification-add':
        this.addNotification(evt.detail);
        break;
      case 'notification-remove':
        this.removeNotification(evt.detail);
        break;
      case 'mozChromeNotificationEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'desktop-notification':
            this.addNotification(detail);
            break;
          case 'desktop-notification-close':
            this.removeNotification(detail.id);
            break;
        }
        break;
      case 'visibilitychange':
        //update timestamps in lockscreen notifications
        if (!document.hidden) {
          this.updateTimestamps();
        }
        break;
    }
  };

  // Swipe handling
  LockScreenNotifications.prototype.mousedown =
  function ns_mousedown(evt) {
    if (!evt.target.dataset.notificationId) {
      return;
    }

    evt.preventDefault();
    this._notification = evt.target;
  };

  LockScreenNotifications.prototype.updateTimestamps =
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
  LockScreenNotifications.prototype.prettyDate =
  function prettyDate(time) {
    var date;
    if (navigator.mozL10n) {
      date = navigator.mozL10n.DateTimeFormat().fromNow(time, true);
    } else {
      date = time.toLocaleFormat();
    }
    return date;
  };

  LockScreenNotifications.prototype.createNotification =
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

  LockScreenNotifications.prototype.addNotification =
  function ns_addNotification(detail) {
    var notification = detail;
    if (!(notification instanceof window.HTMLElement)) {
      notification = this.createNotification(detail);
    }
    if (!this.lockScreenContainer) {
      this.lockScreenContainer =
        document.getElementById('notifications-lockscreen-container');
    }
    var id = notification.dataset.id;
    var notifSelector = '[data-notification-id="' + id + '"]';

    // Adding it to the lockscreen if locked and the privacy setting
    // does not prevent it.
    if (window.System.locked && this.lockscreenPreview) {
      var lockScreenNode = notification;

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
      // Change the UI of LockScreen.
      window.dispatchEvent(new window.Event(
        'lockscreen-notification-occur'));
    }
  };

  LockScreenNotifications.prototype.removeNotification =
  function ns_removeNotification(notificationId) {
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    var lockScreenNotificationNode = null;

    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');

    if (this.lockScreenContainer) {
      lockScreenNotificationNode =
        this.lockScreenContainer.querySelector(notifSelector);
    }

    if (lockScreenNotificationNode) {
      lockScreenNotificationNode.parentNode
        .removeChild(lockScreenNotificationNode);
      // Change the UI of LockScreen.
      window.dispatchEvent(new window.Event(
        'lockscreen-notification-empty'));
    }
  };

  LockScreenNotifications.prototype.clearLockScreen =
  function ns_clearLockScreen() {
    // The LockScreenWindow may not be instantiated yet.
    if (!this.lockScreenContainer) {
      return;
    }
    while (this.lockScreenContainer.firstElementChild) {
      var element = this.lockScreenContainer.firstElementChild;
      this.lockScreenContainer.removeChild(element);
    }
    // Change the UI of LockScreen.
    window.dispatchEvent(new window.Event(
      'lockscreen-notification-empty'));
  };

  exports.LockScreenNotifications = LockScreenNotifications;
})(window);
