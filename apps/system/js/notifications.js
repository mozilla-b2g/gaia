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
  get container() {
    delete this.container;
    return this.container = document.getElementById('notifications-container');
  },

  init: function ns_init() {
    window.addEventListener('mozChromeEvent', function notificationListener(e) {
      var detail = e.detail;
      switch (detail.type) {
        case 'desktop-notification':
          NotificationScreen.addNotification(detail);

          StatusBar.updateNotification(true);
          break;

        case 'permission-prompt':
          // XXX Needs to implements more UI but for now let's allow stuffs
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('mozContentEvent', true, true, {
            type: 'permission-allow',
            id: detail.id
          });
          window.dispatchEvent(event);
          break;
      }
    });

    var self = this;
    var notifications = this.container;
    notifications.addEventListener('click', function notificationClick(evt) {
      var target = evt.target;
      var closing = false;

      // Handling the close button
      if (target.classList.contains('close')) {
        closing = true;
        target = target.parentNode;
      }

      var notificationID = target.dataset.notificationID

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        type: 'desktop-notification-' + (closing ? 'close' : 'click'),
        id: notificationID
      });
      window.dispatchEvent(event);

      self.removeNotification(target);

      // And hide the Utility Tray
      if (!closing) {
        UtilityTray.hide(true);
      }
    });
  },

  addNotification: function ns_addNotification(detail) {
    var notifications = this.container;

    var notification = document.createElement('div');
    notification.className = 'notification';

    notification.dataset.notificationID = detail.id;

    if (detail.icon) {
      var icon = document.createElement('img');
      icon.src = detail.icon;
      notification.appendChild(icon);
    }

    var title = document.createElement('div');
    title.textContent = detail.title;
    notification.appendChild(title);

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = detail.text;
    notification.appendChild(message);

    var close = document.createElement('a');
    close.className = 'close';
    notification.appendChild(close);

    notifications.appendChild(notification);
  },

  removeNotification: function ns_removeNotification(notification) {
    notification.parentNode.removeChild(notification);

    // Hiding the notification indicator in the status bar
    // if this is the last desktop notification
    var notifSelector = 'div[data-type="desktop-notification"]';
    var desktopNotifications = this.container.querySelectorAll(notifSelector);
    if (desktopNotifications.length == 0) {
      StatusBar.updateNotification(false);
    }
  }
};

NotificationScreen.init();

