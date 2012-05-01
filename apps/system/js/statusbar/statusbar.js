/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  init: function sb_init() {
    var touchables = [
      document.getElementById('notifications-screen'),
      document.getElementById('statusbar')
    ];
    NotificationScreen.init(touchables);

    this.refresh();
  },

  refresh: function sb_refresh() {
    updateClock();
    updateBattery();
    updateConnection();
  }
};

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

// Update the clock and schedule a new update if appropriate
function updateClock() {
  if (!navigator.mozPower.screenEnabled)
    return;

  var now = new Date();
  var match = document.getElementsByClassName('time');
  for (var n = 0; n < match.length; ++n) {
    var element = match[n];
    element.textContent = now.toLocaleFormat(element.dataset.format);
  }

  // Schedule another clock update when a new minute rolls around
  var now = new Date();
  var sec = now.getSeconds();
  window.setTimeout(updateClock, (59 - sec) * 1000);
}

function updateBattery() {
  var battery = window.navigator.mozBattery;
  if (!battery)
    return;

  // If the display is off, there is nothing to do here
  if (!navigator.mozPower.screenEnabled) {
    battery.removeEventListener('chargingchange', updateBattery);
    battery.removeEventListener('levelchange', updateBattery);
    battery.removeEventListener('statuschange', updateBattery);
    return;
  }

  var elements = document.getElementsByClassName('battery');
  for (var n = 0; n < elements.length; ++n) {
    var element = elements[n];
    var fuel = element.children[0];
    var level = battery.level * 100;

    var charging = element.children[1];
    if (battery.charging) {
      charging.hidden = false;
      fuel.className = 'charging';
      fuel.style.minWidth = (level / 5.88) + 'px';
    } else {
      charging.hidden = true;

      fuel.style.minWidth = fuel.style.width = (level / 5.88) + 'px';
      if (level <= 10)
        fuel.className = 'critical';
      else if (level <= 30)
        fuel.className = 'low';
      else
        fuel.className = '';
    }
  }

  // Make sure we will be called for any changes to the battery status
  battery.addEventListener('chargingchange', updateBattery);
  battery.addEventListener('levelchange', updateBattery);
  battery.addEventListener('statuschange', updateBattery);
}

function updateConnection(event) {
  var _ = document.mozL10n.get;

  var conn = window.navigator.mozMobileConnection;
  if (!conn) {
    return;
  }
  var voice = conn.voice;
  if (!voice) {
    return;
  }

  if (!navigator.mozPower.screenEnabled) {
    conn.removeEventListener('cardstatechange', updateConnection);
    conn.removeEventListener('voicechange', updateConnection);
    return;
  }

  // Update the operator name / SIM status.
  var title = '';
  if (conn.cardState == 'absent') {
    title = _('noSimCard');
  } else if (!voice.connected) {
    if (voice.emergencyCallsOnly) {
      title = _('emergencyCallsOnly');
    } else {
      title = _('searching');
    }
  } else {
    if (voice.roaming) {
      title = _('roaming', { operator: (voice.operator || '') });
    } else {
      title = voice.operator || '';
    }
  }
  document.getElementById('titlebar').textContent = title;

  // Update the signal strength bars.
  var signalElements = document.querySelectorAll('#signal > span');
  for (var i = 0; i < 4; i++) {
    var haveSignal = (i < voice.relSignalStrength / 25);
    var el = signalElements[i];
    if (haveSignal) {
      el.classList.add('haveSignal');
    } else {
      el.classList.remove('haveSignal');
    }
  }

  conn.addEventListener('cardstatechange', updateConnection);
  conn.addEventListener('voicechange', updateConnection);
}

if ('mozWifiManager' in window.navigator) {
  window.addEventListener('DOMContentLoaded', function() {
    var wifiIndicator = document.getElementById('wifi');
    window.navigator.mozWifiManager.connectionInfoUpdate = function(event) {
      // relSignalStrength should be between 0 and 100
      var level = Math.min(Math.floor(event.relSignalStrength / 20), 4);
      wifiIndicator.className = 'signal-level' + level;
    };
  });
}

