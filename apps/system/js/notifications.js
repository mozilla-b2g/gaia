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
  TOASTER_TIMEOUT: 900,
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  _notification: null,
  _containerWidth: null,
  _toasterTimeout: null,

  get container() {
    delete this.container;
    return this.container = document.getElementById('notifications-container');
  },

  get toaster() {
    delete this.toaster;
    return this.toaster = document.getElementById('notification-toaster');
  },

  get toasterIcon() {
    delete this.toasterIcon;
    return this.toasterIcon = document.getElementById('toaster-icon');
  },
  get toasterTitle() {
    delete this.toasterTitle;
    return this.toasterTitle = document.getElementById('toaster-title');
  },
  get toasterDetail() {
    delete this.toasterDetail;
    return this.toasterDetail = document.getElementById('toaster-detail');
  },

  init: function ns_init() {
    window.addEventListener('mozChromeEvent', this);
    ['tap', 'mousedown', 'swipe'].forEach(function(evt) {
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

  swipe: function ns_swipe(evt) {
    var detail = evt.detail;
    var distance = detail.start.screenX - detail.end.screenX;
    var fastEnough = Math.abs(detail.vx) > this.TRANSITION_SPEED;
    var farEnough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    if (!(farEnough || fastEnough)) {
      // Werent far or fast enough to delete, restore
      var time = Math.abs(distance) / this.TRANSITION_SPEED;
      var transition = '-moz-transform ' + time + 'ms linear';

      var notificationNode = this._notification;
      notificationNode.style.MozTransition = transition;
      notificationNode.style.MozTransform = 'translateX(0px)';
      notificationNode.style.opacity = 1;
      delete this._notification;
      return;
    }

    var speed = Math.max(Math.abs(detail.vx), 1.8);
    var time = (this._containerWidth - Math.abs(distance)) / speed;
    var offset = detail.direction === 'right' ?
      this._containerWidth : -this._containerWidth;

    this._notification.style.MozTransition = '-moz-transform ' +
      time + 'ms linear';
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

      this.toasterIcon.src = detail.icon;
    }

    var title = document.createElement('div');
    title.textContent = detail.title;
    notificationNode.appendChild(title);

    this.toasterTitle.textContent = detail.title;

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = detail.text;
    notificationNode.appendChild(message);

    this.toasterDetail.textContent = detail.text;

    this.container.appendChild(notificationNode);
    new GestureDetector(notificationNode).startDetecting();

    // Notification toast
    this.toaster.classList.add('displayed');

    if (this._toasterTimeout)
      clearTimeout(this._toasterTimeout);

    this._toasterTimeout = setTimeout((function() {
      this.toaster.classList.remove('displayed');
      this._toasterTimeout = null;
    }).bind(this), this.TOASTER_TIMEOUT);
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
