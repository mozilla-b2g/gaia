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
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.50,

  _notification: null,
  _containerWidth: null,

  get container() {
    delete this.container;
    return this.container = document.getElementById('notifications-container');
  },

  init: function ns_init() {
    window.addEventListener('mozChromeEvent', this);
    ['tap', 'mousedown', 'pan', 'swipe'].forEach(function(evt) {
      this.container.addEventListener(evt, this);
    }, this);
  },

  handleEvent: function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'desktop-notification':
            this.addNotification(detail);

            StatusBar.updateNotification(true);
            break;

          case 'permission-prompt':
            // XXX Needs to implements more UI but for now let's allow stuffs
            // XXX Needs to be moved elsewhere
            var event = document.createEvent('CustomEvent');
            event.initCustomEvent('mozContentEvent', true, true, {
              type: 'permission-allow',
              id: detail.id
            });
            window.dispatchEvent(event);
            break;
        }
        break;
      case 'tap':
        var target = evt.target;
        this.tap(target);
        break;
      case 'mousedown':
        this.mousedown(evt);
        break;
      case 'pan':
        this.pan(evt);
        break;
      case 'swipe':
        this.swipe(evt);
        break;
    }
  },

  // Swipe handling
  mousedown: function ns_mousedown(evt) {
    if (!evt.target.dataset.notificationID)
      return;

    evt.preventDefault();
    this._notification = evt.target;
    this._containerWidth = this.container.clientWidth;

    this._notification.style.MozTransition = '';
    this._notification.style.width = evt.target.parentNode.clientWidth + 'px';
  },

  pan: function ns_pan(evt) {
    var movement = Math.min(this._containerWidth,
                            Math.abs(evt.detail.absolute.dx));
    if (movement > 0) {
      this._notification.style.opacity = 1 - (movement / this._containerWidth);
    }
    this._notification.style.MozTransform = 'translateX(' + evt.detail.absolute.dx + 'px)';
  },

  swipe: function ns_swipe(evt) {
    var distance = evt.detail.start.screenX - evt.detail.end.screenX;
    var fastenough = Math.abs(evt.detail.vx) > this.TRANSITION_SPEED;
    var farenough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    if (!(farenough || fastenough)) {
      // Werent far or fast enough to delete, restore
      var time = Math.abs(distance) / this.TRANSITION_SPEED;
      var transition = '-moz-transform ' + time + 'ms linear';
      this._notification.style.MozTransition = transition;
      this._notification.style.MozTransform = 'translateX(0px)';
      this._notification.style.opacity = 1;
      this._notification = null;
      return;
    }

    var speed = Math.max(Math.abs(evt.detail.vx), 1.8);
    var time = (this._containerWidth - Math.abs(distance)) / speed;
    var offset = evt.detail.direction === 'right' ?
      this._containerWidth : -this._containerWidth;

    this._notification.style.MozTransition = '-moz-transform ' + time + 'ms linear';
    this._notification.style.MozTransform = 'translateX(' + offset + 'px)';
    var self = this;
    this._notification.addEventListener('transitionend', function trListener() {
      self._notification.removeEventListener('transitionend', trListener);

      self.removeNotification(self._notification);
      self._notification = null;
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

    this.removeNotification(notificationNode);

    UtilityTray.hide();
  },

  addNotification: function ns_addNotification(detail) {
    var notificationNode = document.createElement('div');
    notificationNode.className = 'notification';

    notificationNode.dataset.notificationID = detail.id;

    if (detail.icon) {
      var icon = document.createElement('img');
      icon.src = detail.icon;
      notificationNode.appendChild(icon);
    }

    var title = document.createElement('div');
    title.textContent = detail.title;
    notificationNode.appendChild(title);

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = detail.text;
    notificationNode.appendChild(message);

    this.container.appendChild(notificationNode);
    new GestureDetector(notificationNode).startDetecting();
  },

  removeNotification: function ns_removeNotification(notificationNode) {
    // Animating the next notification up
    var nextNotification = notificationNode.nextSibling;
    if (nextNotification) {
      nextNotification.style.MozTransition = '-moz-transform 0.2s linear';
      nextNotification.style.MozTransform = 'translateY(-80px)';

      nextNotification.addEventListener('transitionend', function trWait() {
        nextNotification.removeEventListener('transitionend', trWait);
        nextNotification.style.MozTransition = '';
        nextNotification.style.MozTransform = '';

        notificationNode.parentNode.removeChild(notificationNode);
      });
    } else {
      notificationNode.parentNode.removeChild(notificationNode);

      // Hiding the notification indicator in the status bar
      // if this is the last desktop notification
      var notifSelector = 'div[data-type="desktop-notification"]';
      var desktopNotifications = this.container.querySelectorAll(notifSelector);
      if (desktopNotifications.length == 0) {
        StatusBar.updateNotification(false);
      }
    }
  }
};

NotificationScreen.init();

