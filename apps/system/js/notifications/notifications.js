/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var NotificationScreen = {
  get touchable() {
    return this.touchables[this.locked ? 0 : 1];
  },

  get screenHeight() {
    var screenHeight = this._screenHeight;
    if (!screenHeight) {
      screenHeight = this.touchables[0].getBoundingClientRect().height;
      this._screenHeight = screenHeight;
    }
    return screenHeight;
  },

  get container() {
    delete this.container;
    return this.container = document.getElementById('notifications-container');
  },

  init: function ns_init(touchables) {
    this.touchables = touchables;
    this.attachEvents(touchables);

    window.addEventListener('mozChromeEvent', function notificationListener(e) {
      var detail = e.detail;
      switch (detail.type) {
        case 'desktop-notification':
          NotificationScreen.addNotification('desktop-notification',
                                              detail.title, detail.text,
                                              detail.id);

          var hasNotifications = document.getElementById('state-notifications');
          hasNotifications.dataset.visible = 'true';
          break;

        default:
          // XXX Needs to implements more UI but for now let's allow stuffs
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('mozContentEvent', true, true, {
            type: 'permission-allow',
            id: detail.id
          });
          window.dispatchEvent(event);
          break;

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

      self.removeNotification(target);

      var type = target.dataset.type;
      if (type != 'desktop-notification')
        return;

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        type: closing ?
          'desktop-notification-close' : 'desktop-notification-click',
        id: target.dataset.notificationID
      });
      window.dispatchEvent(event);

      // And hide the notification tray
      if (!closing)
        self.unlock();
    });
  },

  onTouchStart: function ns_onTouchStart(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.onTouchMove({ pageY: e.pageY + 32 });
  },

  onTouchMove: function ns_onTouchMove(e) {
    var dy = -(this.startY - e.pageY);
    if (this.locked)
      dy += this.screenHeight;
    dy = Math.min(this.screenHeight, dy);

    var style = this.touchables[0].style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },

  onTouchEnd: function ns_onTouchEnd(e) {
    var dy = -(this.startY - e.pageY);
    var offset = Math.abs(dy);
    if ((!this.locked && offset > this.screenHeight / 4) ||
        (this.locked && offset < 10))
      this.lock();
    else
      this.unlock();
  },

  unlock: function ns_unlock(instant) {
    var style = this.touchables[0].style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    this.locked = false;
  },

  lock: function ns_lock(dy) {
    var style = this.touchables[0].style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(100%)';
    this.locked = true;
  },

  attachEvents: function ns_attachEvents(view) {
    AddEventHandlers(window, this, ['touchstart', 'touchmove', 'touchend']);
  },

  detachEvents: function ns_detachEvents() {
    RemoveEventHandlers(window, this, ['touchstart', 'touchmove', 'touchend']);
  },

  handleEvent: function(evt) {
    var target = evt.target;
    switch (evt.type) {
    case 'touchstart':
      if (LockScreen.locked)
        return;
      if (target != this.touchable)
        return;
      this.active = true;

      target.setCapture(this);
      this.onTouchStart(evt.touches[0]);
      break;
    case 'touchmove':
      if (!this.active)
        return;

      this.onTouchMove(evt.touches[0]);
      break;
    case 'touchend':
      if (!this.active)
        return;
      this.active = false;

      document.releaseCapture();
      this.onTouchEnd(evt.changedTouches[0]);
      break;
    default:
      return;
    }

    evt.preventDefault();
  },

  addNotification: function ns_addNotification(type, nTitle, body, nID) {
    var notifications = this.container;

    var notification = document.createElement('div');
    notification.className = 'notification';
    notification.dataset.type = type;

    if (type == 'desktop-notification') {
      notification.dataset.notificationID = nID;
    }

    var title = document.createElement('div');
    title.textContent = nTitle;
    notification.appendChild(title);

    var message = document.createElement('div');
    message.classList.add('detail');
    message.textContent = body;
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
      var hasNotifications = document.getElementById('state-notifications');
      delete hasNotifications.dataset.visible;
    }
  },

  removeNotifications: function ns_removeNotifications(type) {
    var notifications = this.container;
    var typeSelector = 'div[data-type="' + type + '"]';
    var children = notifications.querySelectorAll(typeSelector);
    for (var i = children.length - 1; i >= 0; i--) {
      var notification = children[i];
      notification.parentNode.removeChild(notification);
    }
  }
};
