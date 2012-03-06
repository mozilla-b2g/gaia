/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  new Homescreen();

  LockScreen.init();
  LockScreen.update(function fireHomescreenReady() {
    ScreenManager.turnScreenOn();

    var touchables = [
      document.getElementById('notificationsScreen'),
      document.getElementById('statusbar')
    ];
    new NotificationScreen(touchables);

    new MessagesListener();
    new TelephonyListener();

    window.parent.postMessage('homescreenready', '*');
  });
}

var LockScreen = {
  get overlay() {
    delete this.overlay;
    return this.overlay = document.getElementById('lockscreen');
  },

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
    if (!settings)
      return;

    var request = settings.get('lockscreen.enabled');
    request.addEventListener('success', (function onsuccess(evt) {
      var enabled = request.result.value !== 'false';
      if (enabled) {
        this.lock(true);
      } else {
        this.unlock(true);
      }

      if (callback)
        setTimeout(callback, 0);
    }).bind(this));

    request.addEventListener('error', (function onerror(evt) {
      this.lock(true);
      if (callback)
        setTimeout(callback, 0);
    }).bind(this));
  },

  lock: function lockscreen_lock(instant) {
    var style = this.overlay.style;
    if (instant) {
      style.MozTransition = style.MozTransform = '';
    } else {
      style.MozTransition = '-moz-transform 0.2s linear';
      style.MozTransform = 'translateY(0)';
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('locked', true, true, null);
    window.dispatchEvent(evt);
  },

  unlock: function lockscreen_unlock(instant) {
    var offset = '-100%';

    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(' + offset + ')';

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('unlocked', true, true, null);
    window.dispatchEvent(evt);
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

        ScreenManager.toggleScreen();
        if (screen.mozEnabled)
          this.update();

        e.preventDefault();
        e.stopPropagation();
        break;

      default:
        return;
    }
    e.preventDefault();
  }

};


NotificationScreen.prototype = {
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
  onTouchStart: function(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.onTouchMove({ pageY: e.pageY + 32 });
  },
  onTouchMove: function(e) {
    var dy = -(this.startY - e.pageY);
    if (this.locked)
      dy += this.screenHeight;
    dy = Math.min(this.screenHeight, dy);

    var style = this.touchables[0].style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },
  onTouchEnd: function(e) {
    var dy = -(this.startY - e.pageY);
    var offset = Math.abs(dy);
    if ((!this.locked && offset > this.screenHeight / 4) ||
        (this.locked && offset < 10))
      this.lock();
    else
      this.unlock();
  },
  unlock: function() {
    var style = this.touchables[0].style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    this.locked = false;
  },
  lock: function(dy) {
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
    title = 'No SIM card';
  } else if (!conn.connected) {
    title = 'Connecting...';
  } else {
    title = conn.operator || '';
    if (conn.roaming) {
      title += ' (roaming)';
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

    var currentWindow = WindowManager.getForegroundWindow();
    var url = currentWindow ? currentWindow.application.url : document.URL;
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
  handleEvent: function kh_handleEvent(evt) {
    if (!screen.mozEnabled)
      return;

    switch (evt.keyCode) {
      case evt.DOM_VK_PAGE_UP:
        SoundManager.changeVolume(1);
        break;

      case evt.DOM_VK_PAGE_DOWN:
        SoundManager.changeVolume(-1);
        break;

      case evt.DOM_VK_CONTEXT_MENU:
        SourceView.toggle();
        break;

      case evt.DOM_VK_F6:
        document.location.reload();
        break;
    }
  }
};

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
    screen.mozEnabled = false;

    this.preferredBrightness = screen.mozBrightness;
    screen.mozBrightness = 0.0;
  },

  turnScreenOn: function lockscreen_turnScreenOn() {
    screen.mozEnabled = true;

    screen.mozBrightness = this.preferredBrightness;

    updateClock();
    updateBattery();
    updateConnection();
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

  var notifications = document.getElementById('notifications');
  notifications.addEventListener('click', function notificationClick(evt) {
    if (!notifications.dataset.sender)
      return;

    while (notifications.hasChildNodes())
      notifications.removeChild(notifications.firstChild);
    notifications.classList.add('hidden');

    var sender = notifications.dataset.sender;
    WindowManager.launch('../sms/sms.html?sender=' + sender);
  });

  function showMessage(sender, body) {
    while (notifications.hasChildNodes())
      notifications.removeChild(notifications.firstChild);

    var notification = document.createElement('div');
    notification.className = 'notification';

    var title = document.createElement('div');
    title.textContent = sender;

    var message = document.createElement('div');
    message.textContent = body;

    notification.appendChild(title);
    notification.appendChild(message);
    notifications.appendChild(notification);

    notifications.dataset.sender = sender;

    notifications.classList.remove('hidden');
  }


  messages.addEventListener('received', function received(evt) {
    var message = evt.message;
    showMessage(message.sender, message.body);
  });

  notifications.classList.add('hidden');
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
        call.onstatechange = function () {
          call.oncallschanged = null;
          ringtonePlayer.pause();
          window.clearInterval(vibrateInterval);
        };
      }
    });

    var url = '../dialer/dialer.html';
    var launchFunction = function launchDialer() {
      WindowManager.launch(url);
    };

    var appWindow = WindowManager.getForegroundWindow();
    if (appWindow && (appWindow.application.name != 'Dialer')) {
      WindowManager.closeForegroundWindow();
      appWindow.element.addEventListener('transitionend', function closed() {
        appWindow.element.removeEventListener('transitionend', closed);

        launchFunction();
      });
    } else {
      launchFunction();
    }
  });
};

/* === Homescreen === */
var Homescreen = function() {
  function populateApps(apps) {
    var rows = Math.ceil((window.innerHeight - 200) / 200);
    var columns = Math.ceil((window.innerWidth - 100) / 150);
    var pages = Math.floor(apps.length / (rows * columns)) + 1;

    var appsGrid = new IconGrid('apps', columns, rows, pages, true);
    var appsGridCount = 0;
    for (var n = 0; n < apps.length; ++n) {
      var app = apps[n];
      appsGrid.add(n, app.icon, app.name, app.url);
    }
    appsGrid.dots = new Dots('dots', 'apps');
    appsGrid.update();

    window.addEventListener('resize', function() {
      appsGrid.update();
    });
  };

  Gaia.AppManager.loadInstalledApps(populateApps);
};

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = { active: false, startX: 0, startY: 0 };
}

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    this.moved = false;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var iconGrid = this.iconGrid;
    var touchState = this.touchState;
    if (touchState.active) {
      var dx = touchState.startX - e.pageX;
      if (dx !== 0) {
        this.moved = this.moved || Math.abs(dx) > 20;
        if (this.moved) {
          iconGrid.pan(-dx);
        }
      }
      e.stopPropagation();
    }
  },
  onTouchEnd: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;

    var quick = (e.timeStamp - touchState.startTime < 200);
    var long = (e.timeStamp - touchState.startTime > 2000);
    var small = Math.abs(diffX) <= 20;

    var flick = quick && !small;
    var tap = !this.moved;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap(e.target);
      iconGrid.setPage(currentPage, 0);
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else {
      if (Math.abs(diffX) < window.innerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
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

function IconGrid(containerId, columns, rows, minPages, showLabels) {
  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.columns = columns || 4;
  this.rows = rows || 3;
  this.minPages = minPages;
  this.showLabels = showLabels;
  this.icons = [];
  this.currentPage = 0;
  this.physics = new DefaultPhysics(this);

  // install event handlers
  var events = ['touchstart', 'touchmove', 'touchend'];
  AddEventHandlers(this.container, this, events);
  AddEventHandlers(window, this, ['resize']);
}

IconGrid.prototype = {
  add: function(slot, iconUrl, label, action) {
    var icons = this.icons;
    var icon = { slot: slot, iconUrl: iconUrl, label: label, action: action };
    icon.index = icons.length;
    icons.push(icon);
  },
  remove: function(icon) {
    this.icons.splice(icon.index);
  },

  // reflow the icon grid
  update: function() {
    var instance = this;
    var containerId = this.containerId;
    var container = this.container;
    var icons = this.icons;

    var rows = Math.ceil((window.innerHeight - 200) / 200);
    var columns = Math.ceil((window.innerWidth - 100) / 150);

    var columns = columns;
    var rows = rows;
    var currentPage = this.currentPage;
    var itemsPerPage = rows * columns;
    var iconWidth = Math.floor(100 / columns);
    var iconHeight = Math.floor(100 / rows);

    // get the page of an icon
    function getIconPage(icon) {
      return Math.floor(icon.slot / itemsPerPage);
    }

    // get the column of an icon
    function getIconColumn(icon) {
      return (icon.slot % itemsPerPage) % columns;
    }

    // get the row of an icon
    function getIconRow(icon) {
      return Math.floor((icon.slot % itemsPerPage) / columns);
    }

    // position a div using transform
    function setPosition(div, x, y) {
      div.style.MozTransform = 'translate(' + x + ',' + y + ')';
    }

    // get page divs
    var elementList = container.childNodes;
    var pageDivs = [];
    for (var n = 0; n < elementList.length; ++n) {
      var element = elementList[n];
      pageDivs[element.id] = element;
    }

    // get icon divs
    var rule = '#' + containerId + '> .page > .icon';
    elementList = document.querySelectorAll(rule);
    var iconDivs = [];
    for (var n = 0; n < elementList.length; ++n) {
      var element = elementList[n];
      iconDivs[element.id] = element;
    }

    // calculate the new number of pages we need
    var pageCount = 0;
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      pageCount = Math.max(getIconPage(icon), pageCount);
    }
    pageCount = Math.max(this.minPages, pageCount + 1);

    // adjust existing pages and create new ones as needed
    for (var n = 0; n < pageCount; ++n) {
      var pageDiv = pageDivs[n];
      if (!pageDiv) { // missing page
        pageDiv = document.createElement('div');
        pageDiv.id = n;
        pageDiv.className = 'page';
        container.appendChild(pageDiv);
        pageDivs[n] = pageDiv;
      }
      setPosition(pageDiv, (n - currentPage) + '00%', 0);
    }

    // remove pages we don't need
    for (var key in pageDivs) {
      if (key >= pageCount) {
        container.removeChild(pageDivs[key]);
        pageDivs[key] = null;
      }
    }

    // adjust existing icons and create new ones as needed
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      var pageOfIcon = getIconPage(icon);
      var iconDiv = iconDivs[n];
      if (!iconDiv) { // missing icon
        iconDiv = document.createElement('div');
        iconDiv.id = n;
        iconDiv.className = 'icon';
        iconDiv.dataset.url = icon.action;

        var centerDiv = document.createElement('div');
        centerDiv.className = 'img';
        iconDiv.appendChild(centerDiv);

        if (this.showLabels) {
          var labelDiv = document.createElement('div');
          labelDiv.className = 'label';
          iconDiv.appendChild(labelDiv);
        }

        pageDivs[pageOfIcon].appendChild(iconDiv);
        iconDivs[n] = iconDiv;
      } else {
        // if icon is on the wrong page, move it
        if (iconDiv.parentNode != pageDivs[pageOfIcon]) {
          iconDiv.parentNode.removeChild(iconDiv);
          pageDivs[pageOfIcon].appendChild(iconDiv);
        }
      }

      iconDiv.style.backgroundImage = 'url(' + icon.iconUrl + ')';

      if (this.showLabels) {
        var label = iconDiv.childNodes[1];
        if (label.textContent != icon.label)
          label.textContent = icon.label;
      }

      // TODO This code is really, really, dirty
      var deltaX = getIconColumn(icon) * 136;
      var deltaY = getIconRow(icon);
      if (window.innerHeight <= 480) {
        deltaY *= 184;
      } else {
        deltaY *= 200;
      }

      setPosition(iconDiv, deltaX + 'px', deltaY + 'px');
    }

    // remove icons we don't need
    for (var key in iconDivs) {
      if (key > icons.length) {
        iconDivs[key].parentNode.removeChild(iconDivs[key]);
        iconDivs[key] = null;
      }
    }

    // update paginator, if we have one
    var dots = this.dots;
    if (dots)
      dots.update(currentPage);
  },
  pan: function(x, duration) {
    var pages = this.container.childNodes;
    var currentPage = this.currentPage;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];

      var calc = (n - currentPage) + '00% + ' + x + 'px';

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
      style.MozTransform = 'translateX(' + (n - number) + '00%)';
      style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
    }
    var dots = this.dots;
    if (dots)
      dots.update(number);
  },
  tap: function(target) {
    WindowManager.launch(target.dataset.url);
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
    case 'resize':
      this.update();
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

function NotificationScreen(touchables) {
  this.touchables = touchables;
  this.attachEvents(this.touchable);
}

