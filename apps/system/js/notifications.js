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
  TOASTER_TIMEOUT: 1200,
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  _notification: null,
  _containerWidth: null,
  _toasterTimeout: null,
  _toasterGD: null,

  get container() {
    delete this.container;
    return this.container = document.getElementById('notifications-container');
  },

  get lockScreenContainer() {
    delete this.lockScreenContainer;

    var id = 'notifications-lockscreen-container';
    return this.lockScreenContainer = document.getElementById(id);
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

  get clearAllButton() {
    delete this.clearAllButton;
    return this.clearAllButton = document.getElementById('notification-clear');
  },

  init: function ns_init() {
    window.addEventListener('mozChromeEvent', this);

    this._toasterGD = new GestureDetector(this.toaster);
    ['tap', 'mousedown', 'swipe'].forEach(function(evt) {
      this.container.addEventListener(evt, this);
      this.toaster.addEventListener(evt, this);
    }, this);

    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));

    window.addEventListener('utilitytrayshow', this);
    window.addEventListener('unlock', this.clearLockScreen.bind(this));
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
        StatusBar.updateNotificationUnread(false);
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

    this.updateStatusBarIcon(true);

    // Adding it to the lockscreen if locked
    if (LockScreen.locked) {
      var lockScreenNode = notificationNode.cloneNode(true);
      this.lockScreenContainer.insertBefore(lockScreenNode,
                               this.lockScreenContainer.firstElementChild);
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

    notificationNode.parentNode.removeChild(notificationNode);
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
    StatusBar.updateNotification(this.container.children.length);

    if (unread)
      StatusBar.updateNotificationUnread(true);
  }
};

NotificationScreen.init();
