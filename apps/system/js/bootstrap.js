/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  LockScreen.init();
  StatusBar.init();
  KeyHandler.init();
  SleepMenu.init();

  Applications.rebuild(function start(apps) {
    // FIXME Loop over all the registered activities from the applications
    //       list and start up the first application found registered for
    //       the HOME activity.
    var host = document.location.host;
    var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var homescreenURL = 'http://homescreen.' + domain;
    document.getElementById('homescreen').src = homescreenURL;

    ScreenManager.turnScreenOn();
  });
}

var SoundManager = {
  currentVolume: 5,
  changeVolume: function soundManager_changeVolume(delta) {
    var volume = this.currentVolume + delta;
    this.currentVolume = volume = Math.max(0, Math.min(10, volume));

    var notification = document.getElementById('volume');
    var classes = notification.classList;
    if (volume == 0) {
      classes.add('vibration');
    } else {
      classes.remove('vibration');
    }

    var steps = notification.children;
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume)
        step.classList.add('active');
      else
        step.classList.remove('active');
    }

    classes.add('visible');
    if (this._timeout)
      window.clearTimeout(this._timeout);

    this._timeout = window.setTimeout(function hideSound() {
      classes.remove('visible');
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

  init: function sm_init() {
    window.addEventListener('click', SleepMenu, true);
    window.addEventListener('keyup', SleepMenu, true);
  },

  show: function sm_show() {
    this.element.classList.add('visible');
  },

  hide: function sm_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function sm_handleEvent(evt) {
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
            var settings = window.navigator.mozSettings;
            if (settings)
              settings.getLock().set({ 'phone.ring.incoming': false});

            document.getElementById('silent').hidden = true;
            document.getElementById('normal').hidden = false;
            break;
          case 'normal':
            var settings = window.navigator.mozSettings;
            if (settings)
              settings.getLock().set({'phone.ring.incoming': true});

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

/* === Source View === */
var SourceView = {
  get viewer() {
    return document.getElementById('appViewsource');
  },

  get active() {
    return !this.viewer ? false : this.viewer.style.visibility === 'visible';
  },

  show: function sv_show() {
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
    if (!url)
      // Assume the home screen is the visible app.
      url = window.location.toString();
    viewsource.src = 'view-source: ' + url;
    viewsource.style.visibility = 'visible';
  },

  hide: function sv_hide() {
    var viewsource = this.viewer;
    if (viewsource) {
      viewsource.style.visibility = 'hidden';
      viewsource.src = 'about:blank';
    }
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

/* === KeyHandler === */
var KeyHandler = {
  kRepeatTimeout: 700,
  kRepeatRate: 100,

  _timer: 0,
  repeatKey: function kh_repeatKey(actionCallback) {
    actionCallback();

    clearTimeout(this._timer);
    this._timer = window.setTimeout((function volumeTimeout() {
      actionCallback();
      this._timer = setInterval(function volumeInterval() {
        actionCallback();
      }, this.kRepeatRate);
    }).bind(this), this.kRepeatTimeout);
  },

  init: function kh_init() {
    window.addEventListener('keydown', this);
    window.addEventListener('keyup', this);
  },

  handleEvent: function kh_handleEvent(evt) {
    if (!navigator.mozPower.screenEnabled)
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


/* === Screen Manager === */
var ScreenManager = {
  preferredBrightness: 0.5,
  toggleScreen: function lockscreen_toggleScreen() {
    if (navigator.mozPower.screenEnabled)
      this.turnScreenOff();
    else
      this.turnScreenOn();
  },

  turnScreenOff: function lockscreen_turnScreenOff() {
    if (!navigator.mozPower.screenEnabled)
      return false;

    navigator.mozPower.screenEnabled = false;

    this.preferredBrightness = navigator.mozPower.screenBrightness;
    navigator.mozPower.screenBrightness = 0.0;

    StatusBar.refresh();
    return true;
  },

  turnScreenOn: function lockscreen_turnScreenOn() {
    if (navigator.mozPower.screenEnabled)
      return false;

    navigator.mozPower.screenEnabled = true;

    navigator.mozPower.screenBrightness = this.preferredBrightness;

    StatusBar.refresh();
    return true;
  }
};

// XXX This crap should live in webapi.js for compatibility
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


var Applications = {
  installedApps: [],
  rebuild: function a_rebuild(callback) {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.origin] = app;
      });

      if (callback)
        callback();
    };
  },

  getByOrigin: function a_getByOrigin(origin) {
    return this.installedApps[origin];
  },

  handleEvent: function a_handleEvent(evt) {
    var detail = evt.detail;
    if (detail.type !== 'webapps-ask-install')
      return;

    // This is how we say yes or no to the request after the user decides
    var self = this;
    function sendResponse(id, allow) {
      self.rebuild();

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        id: id,
        type: allow ? 'webapps-install-granted' : 'webapps-install-denied'
      });
      window.dispatchEvent(event);
    }

    var app = detail.app;
    if (document.location.toString().indexOf(app.installOrigin) == 0) {
      sendResponse(detail.id, true);
      return;
    }

    var name = app.manifest.name;
    var locales = app.manifest.locales;
    if (locales && locales[lang] && locales[lang].name)
      name = locales[lang].name;

    var str = document.mozL10n.get('install', {
      'name': name, 'origin': app.origin
    });
    requestPermission(str, function() { sendResponse(detail.id, true); },
                           function() { sendResponse(detail.id, false); });
  }
};

window.addEventListener('mozChromeEvent', Applications);


