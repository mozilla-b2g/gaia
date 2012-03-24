/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var _ = document.mozL10n.get;


// The appscreen is the main part of the homescreen: the part that
// displays icons that launch all of the installed apps.
var appscreen;

function startup() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;
  document.dir = lang.direction;

  appscreen = new AppScreen();

  LockScreen.init();
  LockScreen.update(function fireHomescreenReady() {
    ScreenManager.turnScreenOn();

    var touchables = [
      document.getElementById('notifications-screen'),
      document.getElementById('statusbar')
    ];

    NotificationScreen.init(touchables);

    new MessagesListener();
    new TelephonyListener();

    window.parent.postMessage('homescreenready', '*');
  });

  updateClock();
  updateBattery();
  updateConnection();

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
}

var LockScreen = {
  get overlay() {
    delete this.overlay;
    return this.overlay = document.getElementById('lockscreen');
  },

  locked: true,

  init: function lockscreen_init() {
    var events = ['touchstart', 'touchmove', 'touchend', 'keydown', 'keyup'];
    AddEventHandlers(LockScreen.overlay, this, events);

    // TODO We don't really want to unlock the homescreen here
    var telephony = navigator.mozTelephony;
    if (telephony) {
      telephony.addEventListener('incoming', (function incoming(evt) {
        this.unlock(true);
      }).bind(this));
    }
  },

  update: function lockscreen_update(callback) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      this.lock(true, callback);
      return;
    }

    var request = settings.get('lockscreen.enabled');
    request.addEventListener('success', (function onsuccess(evt) {
      var enabled = request.result.value !== 'false';
      if (enabled) {
        this.lock(true, callback);
      } else {
        this.unlock(true, callback);
      }
    }).bind(this));

    request.addEventListener('error', (function onerror(evt) {
      this.lock(true, callback);
    }).bind(this));
  },

  lock: function lockscreen_lock(instant, callback) {
    var style = this.overlay.style;

    if (this.locked) {
      if (instant) {
        style.MozTransition = style.MozTransform = '';
      } else {
        style.MozTransition = '-moz-transform 0.2s linear';
      }
      style.MozTransform = 'translateY(0)';
      if (callback)
        setTimeout(callback, 0, true);
      return;
    }

    this.locked = true;
    if (instant) {
      style.MozTransition = style.MozTransform = '';
    } else {
      style.MozTransition = '-moz-transform 0.2s linear';
      style.MozTransform = 'translateY(0)';
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('locked', true, true, null);
    window.dispatchEvent(evt);

    // Wait for paint before firing callback
    if (!callback)
      return;

    var afterPaintCallback = function afterPaint() {
      window.removeEventListener('MozAfterPaint', afterPaintCallback);
      callback(true);
    };
    window.addEventListener('MozAfterPaint', afterPaintCallback);
  },

  unlock: function lockscreen_unlock(instant, callback) {
    var offset = '-100%';
    var style = this.overlay.style;

    if (!this.locked) {
      if (instant) {
        style.MozTransition = style.MozTransform = '';
      } else {
        style.MozTransition = '-moz-transform 0.2s linear';
      }
      style.MozTransform = 'translateY(' + offset + ')';
      if (callback)
        setTimeout(callback, 0, false);
      return;
    }

    this.locked = false;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(' + offset + ')';

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('unlocked', true, true, null);
    window.dispatchEvent(evt);

    if (callback)
      setTimeout(callback, 0, false);
  },

  onTouchStart: function lockscreen_touchStart(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.moving = true;
  },

  onTouchMove: function lockscreen_touchMove(e) {
    if (this.moving) {
      var dy = Math.min(0, -(this.startY - e.pageY));
      var style = this.overlay.style;
      style.MozTransition = '';
      style.MozTransform = 'translateY(' + dy + 'px)';
    }
  },

  onTouchEnd: function lockscreen_touchend(e) {
    if (this.moving) {
      this.moving = false;
      var dy = Math.min(0, -(this.startY - e.pageY));
      if (dy > -window.innerHeight / 4)
        this.lock();
      else
        this.unlock();
    }
  },

  handleEvent: function lockscreen_handleEvent(e) {
    switch (e.type) {
      case 'touchstart':
        this.onTouchStart(e.touches[0]);
        this.overlay.setCapture(false);
        break;

      case 'touchmove':
        this.onTouchMove(e.touches[0]);
        break;

      case 'touchend':
        this.onTouchEnd(e.changedTouches[0]);
        document.releaseCapture();
        break;

      case 'keydown':
        if (e.keyCode != e.DOM_VK_SLEEP || !screen.mozEnabled)
          return;

        this._timeout = window.setTimeout(function() {
          SleepMenu.show();
        }, 1500);
        break;

      case 'keyup':
        if (e.keyCode != e.DOM_VK_SLEEP || SleepMenu.visible)
          return;
        window.clearTimeout(this._timeout);

        if (screen.mozEnabled) {
          this.update(function lockScreenCallback() {
            ScreenManager.turnScreenOff();
          });
        } else {
          // XXX: screen could be turned off by idle service instead of us.
          // Update the lockscreen again when turning the screen on.
          // (home screen would still flash when USB is plugged in)
          this.update(function lockScreenCallback() {
            ScreenManager.turnScreenOn();
          });
          //ScreenManager.turnScreenOn();
        }

        e.preventDefault();
        e.stopPropagation();
        break;

      default:
        return;
    }
    e.preventDefault();
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

  init: function ns_init(touchables) {
    this.touchables = touchables;
    this.attachEvents(touchables);
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

  addNotification: function ns_addNotification(type, sender, body) {
    var notifications = document.getElementById('notifications-container');
    // First look if there is already one message from the same
    // source. If there is one, let's aggregate them.
    var children = notifications.querySelectorAll('div[data-type="' + type + '"]');
    for (var i = 0; i < children.length; i++) {
      var notification = children[i];
      if (notification.dataset.sender != sender)
        continue;

      var unread = parseInt(notification.dataset.count) + 1;
      var msg = (type == 'sms') ?
        _('unreadMessages', { n: unread }) : _('missedCalls', { n: unread });
      notification.lastElementChild.textContent = msg;
      return;
    }

    var notification = document.createElement('div');
    notification.className = 'notification';
    notification.dataset.type = type;
    notification.dataset.sender = sender;
    notification.dataset.count = 1;

    var title = document.createElement('div');
    title.textContent = sender;

    notification.appendChild(title);

    var message = document.createElement('div');
    message.textContent = body;
    notification.appendChild(message);

    notifications.appendChild(notification);
  },

  removeNotifications: function ns_removeNotifications(type) {
    var notifications = document.getElementById('notifications-container');
    var children = notifications.querySelectorAll('div[data-type="' + type + '"]');
    for (var i = children.length - 1; i >= 0; i--) {
      var notification = children[i];
      notification.parentNode.removeChild(notification);
    }
  }
};



// Update the clock and schedule a new update if appropriate
function updateClock() {
  if (!screen.mozEnabled)
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
  setTimeout(updateClock, (59 - sec) * 1000);
}

function updateBattery() {
  var battery = window.navigator.mozBattery;
  if (!battery)
    return;

  // If the display is off, there is nothing to do here
  if (!screen.mozEnabled) {
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


function updateConnection() {
  var conn = window.navigator.mozMobileConnection;
  if (!conn) {
    return;
  }

  if (!screen.mozEnabled) {
    conn.removeEventListener('cardstatechange', updateConnection);
    conn.removeEventListener('connectionchange', updateConnection);
    return;
  }

  // Update the operator name / SIM status.
  var title = '';
  if (conn.cardState == 'absent') {
    title = _('noSimCard');
  } else if (!conn.connected) {
    title = _('connecting');
  } else {
    if (conn.roaming) {
      title = _('roaming', { operator: (conn.operator || '') });
    } else {
      title = conn.operator || '';
    }
  }
  document.getElementById('titlebar').textContent = title;

  // Update the signal strength bars.
  var signalElements = document.querySelectorAll('#signal > span');
  for (var i = 0; i < 4; i++) {
    var haveSignal = (i < conn.bars);
    var el = signalElements[i];
    if (haveSignal) {
      el.classList.add('haveSignal');
    } else {
      el.classList.remove('haveSignal');
    }
  }

  conn.addEventListener('cardstatechange', updateConnection);
  conn.addEventListener('connectionchange', updateConnection);
}

var SoundManager = {
  currentVolume: 5,
  changeVolume: function soundManager_changeVolume(delta) {
    activePhoneSound = true;

    var volume = this.currentVolume + delta;
    this.currentVolume = volume = Math.max(0, Math.min(10, volume));

    var notification = document.getElementById('volume');
    if (volume == 0) {
      notification.classList.add('vibration');
    } else {
      notification.classList.remove('vibration');
    }

    var steps = notification.children;
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume)
        step.classList.add('active');
      else
        step.classList.remove('active');
    }

    notification.classList.add('visible');
    if (this._timeout)
      window.clearTimeout(this._timeout);

    this._timeout = window.setTimeout(function hideSound() {
      notification.classList.remove('visible');
    }, 3000);
  }
};

var SleepMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('sleep');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  show: function sleepmenu_show() {
    this.element.classList.add('visible');
  },

  hide: function sleepmenu_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function sleepmenu_handleEvent(evt) {
    if (!this.visible)
      return;

    switch (evt.type) {
      case 'click':
        var action = evt.target.dataset.value;
        switch (action) {
          case 'airplane':
            // XXX There is no API for that yet
            break;
          case 'silent':
            activePhoneSound = false;

            var settings = window.navigator.mozSettings;
            settings.set('phone.ring.incoming', 'false');

            document.getElementById('silent').hidden = true;
            document.getElementById('normal').hidden = false;
            break;
          case 'normal':
            activePhoneSound = true;

            var settings = window.navigator.mozSettings;
            settings.get('phone.ring.incoming', 'true');

            document.getElementById('silent').hidden = false;
            document.getElementById('normal').hidden = true;
            break;
          case 'restart':
            navigator.mozPower.reboot();
            break;
          case 'power':
            navigator.mozPower.powerOff();
            break;
        }
        this.hide();
        break;

      case 'keyup':
        if (evt.keyCode == evt.DOM_VK_ESCAPE ||
            evt.keyCode == evt.DOM_VK_HOME) {

            this.hide();
            evt.preventDefault();
            evt.stopPropagation();
         }
        break;
    }
  }
};
window.addEventListener('click', SleepMenu, true);
window.addEventListener('keyup', SleepMenu, true);

function SettingListener(name, callback) {
  var update = function update() {
    var request = navigator.mozSettings.get(name);

    request.addEventListener('success', function onsuccess(evt) {
      callback(request.result.value);
    });
  };

  window.addEventListener('message', function settingChange(evt) {
    if (evt.data != name)
      return;
    update();
  });

  update();
}

/* === Source View === */
var SourceView = {
  get viewer() {
    return document.getElementById('appViewsource');
  },

  get active() {
    return !this.viewer ? false : this.viewer.style.visibility === 'visible';
  },

  show: function sv_show(url) {
    var viewsource = this.viewer;
    if (!viewsource) {
      var style = '#appViewsource { ' +
                  '  position: absolute;' +
                  '  top: -moz-calc(10%);' +
                  '  left: -moz-calc(10%);' +
                  '  width: -moz-calc(80% - 2 * 15px);' +
                  '  height: -moz-calc(80% - 2 * 15px);' +
                  '  visibility: hidden;' +
                  '  margin: 15px;' +
                  '  background-color: white;' +
                  '  opacity: 0.92;' +
                  '  color: black;' +
                  '  z-index: 9999;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      viewsource = document.createElement('iframe');
      viewsource.id = 'appViewsource';
      document.body.appendChild(viewsource);

      window.addEventListener('locked', this);
    }

    var url = WindowManager.getDisplayedApp();
    viewsource.src = 'view-source: ' + url;
    viewsource.style.visibility = 'visible';
  },

  hide: function sv_hide() {
    if (this.viewer)
      this.viewer.style.visibility = 'hidden';
  },

  toggle: function sv_toggle() {
    this.active ? this.hide() : this.show();
  },

  handleEvent: function sv_handleEvent(evt) {
    switch (evt.type) {
      case 'locked':
        this.hide();
        break;
    }
  }
};

/* === Debug GridView === */
var GridView = {
  get grid() {
    return document.getElementById('debug-grid');
  },

  get visible() {
    return this.grid && this.grid.style.display === 'block';
  },

  hide: function gv_hide() {
    if (this.grid)
      this.grid.style.display = 'none';
  },

  show: function gv_show() {
    var grid = this.grid;
    if (!grid) {
      var style = '#debug-grid {' +
                  '  position: absolute;' +
                  '  top: 0;' +
                  '  left: 0;' +
                  '  display: none;' +
                  '  width: 480px;' +
                  '  height: 800px;' +
                  '  background: url(images/grid.png);' +
                  '  z-index: 20002;' +
                  '  opacity: 0.2;' +
                  '  pointer-events: none;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      grid = document.createElement('div');
      grid.id = 'debug-grid';

      document.body.appendChild(grid);
    }

    grid.style.display = 'block';
  },

  toggle: function gv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

new SettingListener('debug.grid.enabled', function(value) {
  value == 'true' ? GridView.show() : GridView.hide();
});

/* === Wallpapers === */
new SettingListener('homescreen.wallpaper', function(value) {
  var home = document.getElementById('home');
  home.style.background = 'url(style/themes/default/backgrounds/' + value + ')';
});

/* === Ring Tone === */
new SettingListener('homescreen.ring', function(value) {
  var player = document.getElementById('ringtone-player');
  player.src = 'style/ringtones/' + value;
});

var activePhoneSound = true;
new SettingListener('phone.ring.incoming', function(value) {
  activePhoneSound = (value === 'true');
});

/* === Vibration === */
var activateVibration = false;
new SettingListener('phone.vibration.incoming', function(value) {
  activateVibration = (value === 'true');
});

/* === KeyHandler === */
var KeyHandler = {
  kRepeatTimeout: 700,
  kRepeatRate: 100,

  repeatKey: function kh_repeatKey(actionCallback) {
    actionCallback();
    clearTimeout(this._timer);
    this._timer = setTimeout((function volumeTimeout() {
      actionCallback();
      this._timer = setInterval(function volumeInterval() {
        actionCallback();
      }, this.kRepeatRate);
    }).bind(this), this.kRepeatTimeout);
  },

  handleEvent: function kh_handleEvent(evt) {
    if (!screen.mozEnabled)
      return;

    switch (evt.type) {
      case 'keydown':
        switch (evt.keyCode) {
          case evt.DOM_VK_PAGE_UP:
            this.repeatKey((function repeatKeyCallback() {
              if (SoundManager.currentVolume == 10) {
                clearTimeout(this._timer);
                return;
              }
              SoundManager.changeVolume(1);
            }).bind(this));
            break;

          case evt.DOM_VK_PAGE_DOWN:
            this.repeatKey((function repeatKeyCallback() {
              if (SoundManager.currentVolume == 0) {
                clearTimeout(this._timer);
                return;
              }
              SoundManager.changeVolume(-1);
            }).bind(this));
            break;
        }
        break;
      case 'keyup':
        switch (evt.keyCode) {
          case evt.DOM_VK_PAGE_UP:
          case evt.DOM_VK_PAGE_DOWN:
            clearTimeout(this._timer);
            break;

          case evt.DOM_VK_CONTEXT_MENU:
            SourceView.toggle();
            break;

          case evt.DOM_VK_F6:
            document.location.reload();
            break;
        }
        break;
    }
  }
};

window.addEventListener('keydown', KeyHandler);
window.addEventListener('keyup', KeyHandler);

/* === Screen Manager === */
var ScreenManager = {
  preferredBrightness: 0.5,
  toggleScreen: function lockscreen_toggleScreen() {
    if (screen.mozEnabled)
      this.turnScreenOff();
    else
      this.turnScreenOn();
  },

  turnScreenOff: function lockscreen_turnScreenOff() {
    if (!screen.mozEnabled)
      return false;

    screen.mozEnabled = false;

    this.preferredBrightness = screen.mozBrightness;
    screen.mozBrightness = 0.0;

    updateClock();
    updateBattery();
    updateConnection();

    return true;
  },

  turnScreenOn: function lockscreen_turnScreenOn() {
    if (screen.mozEnabled)
      return false;

    screen.mozEnabled = true;

    screen.mozBrightness = this.preferredBrightness;

    updateClock();
    updateBattery();
    updateConnection();

    return true;
  }
};

new SettingListener('screen.brightness', function(value) {
  ScreenManager.preferredBrightness = screen.mozBrightness = parseFloat(value);
});

/* === MessagesListener === */
var MessagesListener = function() {
  var messages = navigator.mozSms;
  if (!messages)
    return;

  var notifications = document.getElementById('notifications-container');
  notifications.addEventListener('click', function notificationClick(evt) {
    var notification = evt.target;
    var sender = notification.dataset.sender;
    var type = notification.dataset.type;
    if ((type != 'sms') || (!sender))
      return;

    NotificationScreen.unlock(true);
    WindowManager.launch('../sms/sms.html?sender=' + sender);
  });

  var hasMessages = document.getElementById('state-messages');
  function showMessage(sender, body) {
    hasMessages.dataset.visible = 'true';

    NotificationScreen.addNotification('sms', sender, body);
  }

  messages.addEventListener('received', function received(evt) {
    var message = evt.message;
    showMessage(message.sender, message.body);
  });

  window.addEventListener('appopen', function onAppOpen(evt) {
    // If the sms application is opened, just delete all messages
    // notifications
    var applicationURL = evt.detail.url;
    if (!/^\.\.\/sms\/sms\.html/.test(applicationURL))
      return;

    delete hasMessages.dataset.visible;
    NotificationScreen.removeNotifications('sms');
  });
};

/* === TelephoneListener === */
var TelephonyListener = function() {
  var telephony = navigator.mozTelephony;
  if (!telephony)
    return;

  telephony.addEventListener('incoming', function incoming(evt) {
    ScreenManager.turnScreenOn();

    var vibrateInterval = 0;
    if (activateVibration) {
      vibrateInterval = window.setInterval(function vibrate() {
        try {
          navigator.mozVibrate([200]);
        } catch (e) {}
      }, 600);
    }

    var ringtonePlayer = document.getElementById('ringtone-player');
    if (activePhoneSound) {
      ringtonePlayer.play();
    }

    telephony.calls.forEach(function(call) {
      if (call.state == 'incoming') {
        call.onstatechange = function() {
          call.oncallschanged = null;
          ringtonePlayer.pause();
          window.clearInterval(vibrateInterval);
        };
      }
    });

    WindowManager.launch('../dialer/dialer.html');
  });

  // Handling the missed call notification
  var hasMissedCalls = document.getElementById('state-calls');

  window.addEventListener('message', function settingChange(evt) {
    if ((evt.data) && (typeof(evt.data) != 'string') &&
        (evt.data.type) && (evt.data.type == 'missed-call')) {

      hasMissedCalls.dataset.visible = 'true';
      NotificationScreen.addNotification('call', evt.data.sender, 'Missed call');
    }
  });

  window.addEventListener('appopen', function onAppOpen(evt) {
    // If the dialer application is opened, just delete all messages
    // notifications
    var applicationURL = evt.detail.url;
    if (!/^\.\.\/dialer\/dialer\.html/.test(applicationURL))
      return;

    delete hasMissedCalls.dataset.visible;
    NotificationScreen.removeNotifications('call');
  });

  var notifications = document.getElementById('notifications-container');
  notifications.addEventListener('click', function notificationClick(evt) {
    var notification = evt.target;
    var sender = notification.dataset.sender;
    var type = notification.dataset.type;
    if (type != 'call')
      return;

    NotificationScreen.unlock(true);
    WindowManager.launch('../dialer/dialer.html?choice=recents');
  });
};

/* === AppScreen === */
function AppScreen() {
  this.installedApps = {};
  var appscreen = this;

  navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
    var apps = e.target.result;
    apps.forEach(function(app) {
      appscreen.installedApps[app.origin] = app;
    });
    appscreen.build();
  };

  // Listen for app installation requests
  window.addEventListener('mozChromeEvent', function(e) {
    if (e.detail.type === 'webapps-ask-install') {

      var app = e.detail.app;

      // FIXME: Localize the app name from the manifest
      // and use document.mozL10n.get() to localize the entire message
      var message = 'Do you want to install ' +
        app.manifest.name + ' from ' + app.origin + '?';

      requestPermission(message,
                        function() { sendResponse(e.detail.id, true); },
                        function() { sendResponse(e.detail.id, false); });
    }

    // This is how we say yes or no to the request after the user decides
    function sendResponse(id, allow) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        id: id,
        type: allow ? 'webapps-install-granted' : 'webapps-install-denied'
      });
      window.dispatchEvent(event);
    }
  });

  // Listen for app installations and rebuild the appscreen when we get one
  navigator.mozApps.mgmt.oninstall = function(event) {
    var newapp = event.application;
    appscreen.installedApps[newapp.origin] = newapp;
    appscreen.build(true);
  };

  // Do the same for uninstalls
  navigator.mozApps.mgmt.onuninstall = function(event) {
    var newapp = event.application;
    delete appscreen.installedApps[newapp.origin];
    appscreen.build(true);
  };

  window.addEventListener('resize', function() {
    appscreen.grid.update();
  });
}

// Look up the app object for a specified app origin
AppScreen.prototype.getAppByOrigin = function getAppByOrigin(origin) {
  return this.installedApps[origin];
};

// Populate the appscreen with icons. The constructor automatically calls this.
// But we also call it when new apps are installed or when the locale changes.
AppScreen.prototype.build = function(rebuild) {
  var startpage = 0;

  if (rebuild) {
    // FIXME: the commented code below is not working for me.
    // After the screen is rebuilt each gesture generates multiple events
    // and the uninstall dialog does not behave right
    // So here I'm trying something more heavy handed to blow away
    // the event listeners:

    // Remember the page we're on so that after rebuild we can stay there.
    startpage = this.grid.currentPage;

    document.getElementById('home').innerHTML =
      '<div id="apps"></div><div id="dots"></div><div id="shortcuts"></div>';

    /*
    // We're rebuilding the app screen, not creating it for the first time,
    // so first we've got to get rid of the old
    var container = document.getElementById('apps');

    // This undoes code in the IconGrid() construtor.
    // FIXME: kind of ugly to have to put this here.
    RemoveEventHandlers(container,
                        this.grid,
                        ['touchstart', 'touchmove', 'touchend']);

    container.innerHTML = "";
    document.getElementById('dots').innerHTML = "";
    */
  }

  // Create the widgets
  this.grid = new IconGrid('apps');
  this.grid.dots = new Dots('dots', 'apps');

  // The current language for localizing app names
  var lang = document.mozL10n.language.code;

  for (var origin in this.installedApps) {
    var app = this.installedApps[origin];

    // Most apps will host their own icons at their own origin.
    // But for apps that are bookmarks to other sites, the icons
    // should probably be a data:// URL.  So take the icon from the
    // manifest, and if it is an absolute URL, leave it alone.
    // Otherwise, put the app origin in front of it.
    // If no icon is defined we'll get this undefined one.
    var icon = 'http://homescreen.gaiamobile.org/style/icons/Unknown.png';
    if (app.manifest.icons) {
      if ('120' in app.manifest.icons) {
        icon = app.manifest.icons['120'];
      }
      else {
        // Get all sizes
        var sizes = Object.keys(app.manifest.icons).map(parseInt);
        // Largest to smallest
        sizes.sort(function(x, y) { return y - x; });
        icon = app.manifest.icons[sizes[0]];
      }
    }

    // If the icons is a fully-qualifed URL, leave it alone
    // (technically, manifests are not supposed to have those)
    // Otherwise, prefix with the app origin
    if (icon.indexOf(':') == -1) {
      icon = app.origin + icon;
    }

    // Localize the app name
    var name = app.manifest.name;
    if (app.manifest.locales &&
        app.manifest.locales[lang] &&
        app.manifest.locales[lang].name)
      name = app.manifest.locales[lang].name;

    this.grid.add(icon, name, origin);
  }

  this.grid.update();
  this.grid.setPage(startpage);
};

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = {
    active: false,
    startX: 0,
    startY: 0,
    timer: null,
    initialTarget: null
  };
}

// How long do you have to hold your finger still over an icon
// before triggering an uninstall rather than a launch.
DefaultPhysics.HOLD_INTERVAL = 1000;
// How many pixels can you move your finger before a tap becomes
// a flick or a pan?
DefaultPhysics.SMALL_MOVE = 20;
// How long can your finger be on the screen before a flick becomes a pan?
DefaultPhysics.FLICK_TIME = 200;

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    touchState.active = true;
    touchState.startTime = e.timeStamp;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;

    // If this timer triggers and the user hasn't moved their finger
    // then this is a hold rather than a tap.
    touchState.timer = setTimeout(this.onHoldTimeout.bind(this),
                                  DefaultPhysics.HOLD_INTERVAL);

    // For tap and hold gestures, we keep track of what icon
    // the touch started on. Even if it strays slightly into another
    // nearby icon, the initial touch is probably what the user wanted.
    touchState.initialTarget = e.target;
  },

  onTouchMove: function(e) {
    var touchState = this.touchState;

    // If we move more than a small amount this is not a hold, so
    // cancel the timer if it is still running
    if (touchState.timer &&
        (Math.abs(touchState.startX - e.pageX) > DefaultPhysics.SMALL_MOVE ||
         Math.abs(touchState.startX - e.pageX) > DefaultPhysics.SMALL_MOVE)) {
      clearTimeout(touchState.timer);
      touchState.timer = null;
    }

    if (!touchState.active)
      return;

    this.iconGrid.pan(-(touchState.startX - e.pageX));
    e.stopPropagation();
  },

  onTouchEnd: function(e) {
    var touchState = this.touchState;

    // If the timer hasn't triggered yet, cancel it before it does
    if (touchState.timer) {
      clearTimeout(touchState.timer);
      touchState.timer = null;
    }

    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;
    if (document.dir == 'rtl')
      dir = -dir;

    var quick = (e.timeStamp - touchState.startTime <
                 DefaultPhysics.FLICK_TIME);
    var small = Math.abs(diffX) <= DefaultPhysics.SMALL_MOVE;

    var flick = quick && !small;
    var tap = small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap(touchState.initialTarget);
      iconGrid.setPage(currentPage, 0);
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else { // drag
      if (Math.abs(diffX) < window.innerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
  },

  // Triggered if the user holds their finger on the screen for
  // DefaultPhysics.HOLD_INTERVAL ms without moving more than
  // DefaultPhyiscs.SMALL_MOVE pixels horizontally or vertically
  onHoldTimeout: function() {
    var touchState = this.touchState;
    touchState.timer = null;
    touchState.active = false;
    this.iconGrid.hold(touchState.initialTarget);
  }
};

var Mouse2Touch = {
  'mousedown': 'touchstart',
  'mousemove': 'touchmove',
  'mouseup': 'touchend'
};

var Touch2Mouse = {
  'touchstart': 'mousedown',
  'touchmove': 'mousemove',
  'touchend': 'mouseup'
};

var ForceOnWindow = {
  'touchmove': true,
  'touchend': true
};

function AddEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.addEventListener(name, {
      handleEvent: function(e) {
        if (Mouse2Touch[e.type]) {
          var original = e;
          e = {
            type: Mouse2Touch[original.type],
            target: original.target,
            touches: [original],
            preventDefault: function() {
              original.preventDefault();
            }
          };
          e.changedTouches = e.touches;
        }
        return listener.handleEvent(e);
      }
    }, true);
  }
}

function RemoveEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.removeEventListener(name, listener);
  }
}

function IconGrid(containerId) {
  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.icons = [];
  this.currentPage = 0;
  this.physics = new DefaultPhysics(this);

  // install event handlers
  var events = ['touchstart', 'touchmove', 'touchend'];
  AddEventHandlers(this.container, this, events);
}

IconGrid.prototype = {
  add: function(iconUrl, label, action) {
    var icons = this.icons;
    var icon = { iconUrl: iconUrl, label: label, action: action };
    icon.index = icons.length;
    icons.push(icon);
  },

  remove: function(icon) {
    this.icons.splice(icon.index);
  },

  // reflow the icon grid
  update: function() {
    var container = this.container;
    var icons = this.icons;

    // get pages divs
    var pages = [];
    var rule = '#' + this.containerId + '> .page';
    var children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      pages[element.id] = element;
    }

    // get icon divs
    var iconDivs = [];

    rule = '#' + this.containerId + '> .page > .icon';
    children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      iconDivs[element.id] = element;
    }

    // issue #723 - The calculation of the width/height of the icons
    // should be dynamic and not harcoded like that. The reason why it
    // it is done like that at this point is because there is no icon
    // when the application starts and so there is nothing to calculate
    // against.
    container.style.minHeight = container.style.maxHeight = '';
    var iconHeight = 196;
    var iconWidth = 132;

    var rect = container.getBoundingClientRect();
    var rows = Math.max(1, Math.floor(rect.height / iconHeight));
    var columns = Math.max(1, Math.floor(rect.width / iconWidth));

    var targetHeight = iconHeight * rows + 'px';
    container.style.minHeight = container.style.maxHeight = targetHeight;

    // adjust existing pages and create new ones as needed
    var itemsPerPage = rows * columns;
    var pageCount = Math.ceil(icons.length / itemsPerPage);
    for (var n = 0; n < pageCount; n++) {
      var page = pages[n];
      if (page)
        continue;

      page = document.createElement('div');
      page.id = n;
      page.className = 'page';
      container.appendChild(page);

      pages[n] = page;
    }

    // remove pages we don't need
    for (var key in pages) {
      if (key >= pageCount) {
        container.removeChild(pages[key]);
        pages[key] = null;
      }
    }


    // adjust existing icons and create new ones as needed
    var iconsCount = icons.length;
    for (var n = 0; n < iconsCount; ++n) {
      var icon = icons[n];

      var iconDiv = iconDivs[n];
      if (!iconDiv) { // missing icon
        iconDiv = document.createElement('div');
        iconDiv.id = n;
        iconDiv.className = 'icon';
        iconDiv.style.backgroundImage = 'url("' + icon.iconUrl + '")';
        iconDiv.dataset.url = icon.action;

        var centerDiv = document.createElement('div');
        centerDiv.className = 'img';
        iconDiv.appendChild(centerDiv);

        var labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        iconDiv.appendChild(labelDiv);

        if (labelDiv.textContent != icon.label)
          labelDiv.textContent = icon.label;

        iconDivs[n] = iconDiv;
      }

      var pageOfIcon = Math.floor(n / itemsPerPage);
      pages[pageOfIcon].appendChild(iconDiv);
    }

    // remove icons we don't need
    for (var key in iconDivs) {
      if (key > iconsCount) {
        iconDivs[key].parentNode.removeChild(iconDivs[key]);
        iconDivs[key] = null;
      }
    }

    // update paginator, if we have one
    var dots = this.dots;
    if (dots)
      dots.update(this.currentPage);
  },

  pan: function(x, duration) {
    var pages = this.container.childNodes;
    var currentPage = this.currentPage;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];

      var calc = (document.dir == 'ltr') ?
        (n - currentPage) + '00% + ' + x + 'px' :
        (currentPage - n) + '00% - ' + x + 'px';

      var style = page.style;
      style.MozTransform = 'translateX(-moz-calc(' + calc + '))';
      style.MozTransition = duration ? ('all ' + duration + 's ease;') : '';
    }
  },

  setPage: function(number, duration) {
    var pages = this.container.childNodes;
    if (number < 0)
      number = 0;
    if (number >= pages.length)
      number = pages.length - 1;
    this.currentPage = number;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];
      var style = page.style;
      var p = (document.dir == 'ltr') ? (n - number) : (number - n);
      style.MozTransform = 'translateX(' + p + '00%)';
      style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
    }
    var dots = this.dots;
    if (dots)
      dots.update(number);
  },
  tap: function(target) {
    WindowManager.launch(target.dataset.url);
  },
  hold: function(target) {
    var app = appscreen.getAppByOrigin(target.dataset.url);

    // FIXME: localize this message
    requestPermission('Do you want to uninstall ' + app.manifest.name + '?',
                      function() { app.uninstall(); });
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
      physics.onTouchStart(e.touches[0]);
      break;
    case 'touchmove':
      physics.onTouchMove(e.touches[0]);
      break;
    case 'touchend':
      document.releaseCapture();
      physics.onTouchEnd(e.changedTouches[0]);
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};

function Dots(containerId, gridId) {
  this.containerId = containerId;
  this.gridId = gridId;
  this.container = document.getElementById(containerId);
  this.grid = document.getElementById(gridId);
}

Dots.prototype = {
  update: function(current) {
    var container = this.container;
    var grid = this.grid;

    var numPages = grid.childNodes.length;

    // Add additional dots if needed.
    while (container.childNodes.length < numPages) {
      var dot = document.createElement('div');
      dot.className = 'dot';
      container.appendChild(dot);
    }

    // Remove excess dots.
    while (container.childNodes.length > numPages)
      container.removeChild(container.childNodes[0]);

    // Set active/inactive state.
    var childNodes = container.childNodes;
    for (var n = 0; n < numPages; ++n) {
      var dot = childNodes[n];
      if (n == current) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    }
  }
};

window.addEventListener('localized', startup);
