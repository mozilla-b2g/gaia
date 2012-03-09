/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The WindowSprite object is used to apply an animation effect when
// the window is opened/closed.
function WindowSprite(win) {
  var element = this.element = document.createElement('div');
  element.className = 'windowSprite';

  if (win.application.fullscreen)
    element.classList.add('fullscreen');
}

WindowSprite.prototype = {
  setActive: function ws_setActive(active) {
    var classes = this.element.classList;
    if (classes.contains('active') === active)
      return;

    classes.toggle('active');
  },

  add: function ws_add() {
    document.body.appendChild(this.element);
  },

  remove: function ws_remove() {
    if (!this.element.parentNode)
      return;

    document.body.removeChild(this.element);
  },

  crossFade: function ws_crossFade() {
    var afterCrossFade = (this.remove).bind(this);

    // Wait for 50ms for iframe to be painted.
    var element = this.element;
    window.setTimeout(function() {
      element.addEventListener('transitionend', afterCrossFade);
      element.classList.add('crossFade');
    }, 50);
  }
};


// The AppWindow object is a wrapper around an iframe that loads
// the actual application.
function fireWindowEvent(appWindow, type) {
  var application = appWindow.application;
  var details = {
    'id': appWindow.id,
    'name': application.name,
    'url': application.url,
    'hackKillMe': application.hackKillMe
  };

  var evt = document.createEvent('CustomEvent');
  evt.initCustomEvent(type, true, false, details);
  appWindow.element.dispatchEvent(evt);
}


function AppWindow(application, id) {
  var element = this.element = document.createElement('iframe');
  element.id = 'window_' + id;
  element.className = 'appWindow';
  element.setAttribute('mozallowfullscreen', 'true');

  // TODO: Some of the applications requite a special access to the
  //       homescreen. This is all bad and should be removed as soon
  //       as possible. 'Dialer', 'Camera' and 'Messages' will be fixed
  //       by Intents and 'Settings' will be fixed by when the regular
  //       Settings API will land.
  var exceptions = ['Dialer', 'Settings', 'Camera', 'Messages'];
  if(exceptions.indexOf(application.name) == -1) {
    element.setAttribute('mozbrowser', 'true');
  }

  this.application = application;
  this.id = id;

  this.resize();
}

AppWindow.prototype = {
  element: null,

  show: function window_show() {
    this.element.classList.add('active');
  },

  hide: function window_hide() {
    this.element.classList.remove('active');
  },

  _loaded: false,
  focus: function window_focus(callback) {
    if (this.element.classList.contains('active'))
      return;

    this.resize();

    var sprite = new WindowSprite(this);
    sprite.add();
    this.show();

    var focus = (function(evt) {
      sprite.element.removeEventListener('transitionend', focus);

      sprite.crossFade();

      var url = this.application.url;
      var element = this.element;
      if (!this._loaded) {
        this._loaded = true;
        element.src = url;

        window.addEventListener('message', function waitForAppReady(evt) {
          if (evt.data !== 'appready')
            return;

          window.removeEventListener('message', waitForAppReady);
          element.contentWindow.postMessage({
            message: 'visibilitychange',
            url: element.src,
            hidden: false
          }, '*');
        });
      } else {
        element.contentWindow.postMessage({
          message: 'visibilitychange',
          url: url,
          hidden: false
        }, '*');
      }
      element.focus();
      fireWindowEvent(this, 'appfocus');

      if (callback)
        callback();
    }).bind(this);
    sprite.element.addEventListener('transitionend', focus);

    if (this.application.fullscreen) {
      document.getElementById('screen').classList.add('fullscreen');
    }

    document.body.offsetHeight; // Trigger layout; not a no-op

    sprite.setActive(true);
  },

  blur: function window_blur(callback) {
    if (!this.element.classList.contains('active'))
      return;

    var sprite = new WindowSprite(this);
    sprite.setActive(true);
    sprite.add();

    var blur = (function(evt) {
      sprite.element.removeEventListener('transitionend', blur);
      this.hide();
      sprite.remove();

      var element = this.element;
      element.blur();
      element.contentWindow.postMessage({
        message: 'visibilitychange',
        url: this.application.url,
        hidden: true
      }, '*');

      window.top.focus();

      if (callback)
        callback();
    }).bind(this);
    sprite.element.addEventListener('transitionend', blur);

    if (this.application.fullscreen) {
      document.getElementById('screen').classList.remove('fullscreen');
    }

    // NOTE: for the moment, orientation only works when fullscreen because of a
    // too dirty hack...
    if (this.application.fullscreen && this.application.orientation) {
      var width = this.element.style.width;
      this.element.style.width = this.element.style.height;
      this.element.style.height = width;
    }

    document.body.offsetHeight;  // Trigger layout; not a no-op.

    sprite.setActive(false);
  },

  resize: function window_resize() {
    var element = this.element;
    var documentElement = document.documentElement;
    // NOTE: for the moment, orientation only works when fullscreen because of a
    // too dirty hack...
    if (this.application.fullscreen && this.application.orientation) {
      var width = this.element.style.width;
      element.style.width = documentElement.clientHeight + 'px';
      element.style.height = documentElement.clientWidth + 'px';

      element.classList.add(this.application.orientation);
    } else {
      element.style.width = documentElement.clientWidth + 'px';

      var height = documentElement.clientHeight;
      if (!this.application.fullscreen) {
        height -= document.getElementById('statusbar').offsetHeight;
      }
      element.style.height = height + 'px';
    }
  }
};

// This function is unused by the homescreen app itself, but is
// currently required by chrome code in b2g/chrome/content/*.js
// Do not delete this function until that dependency is removed.
function getApplicationManager() {
  return WindowManager;
}

var WindowManager = {
  init: function wm_init() {
    window.addEventListener('keyup', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('locked', this);
    window.addEventListener('unlocked', this);
    window.addEventListener('resize', this);

    this.container = document.getElementById('windows');
  },

  enabled: true,

  handleEvent: function wm_handleEvent(evt) {
    var foregroundWindow = this._foregroundWindow;

    switch (evt.type) {
      case 'keyup':
        switch (evt.keyCode) {
          case evt.DOM_VK_HOME:
            ScreenManager.turnScreenOn();
            if (!this.enabled || evt.defaultPrevented || !foregroundWindow)
              return;

            this.closeForegroundWindow();
            evt.preventDefault();
            break;

          case evt.DOM_VK_ESCAPE:
            if (!this.enabled || evt.defaultPrevented || !foregroundWindow)
              return;

              this.closeForegroundWindow();
              evt.preventDefault();
            break;
        }
        break;

      case 'appopen':
        this.container.classList.add('active');
        break;

      case 'appwillclose':
        this.container.classList.remove('active');
        break;

      case 'locked':
        this.enabled = false;
        if (foregroundWindow && foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.remove('fullscreen');
        }
        break;

      case 'unlocked':
        this.enabled = true;
        if (foregroundWindow && foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.add('fullscreen');
        }
        break;

      case 'resize':
        if (foregroundWindow)
          foregroundWindow.resize();
        break;
    }
  },

  windows: [],
  getWindowByApp: function wm_getWindowByApp(app) {
    var windows = this.windows;
    for (var i = 0, length = windows.length; i < length; i++) {
      if (windows[i].application === app)
        return windows[i];
    }

    return null;
  },

  add: function wm_add(win) {
    this.windows.push(win);
    this.container.appendChild(win.element);
  },

  remove: function wm_remove(win) {
    var windows = this.windows;
    for (var i = 0, length = windows.length; i < length; i++) {
      if (windows[i] != win)
        continue;

      this.container.removeChild(win.element);
      windows.splice(i, 1);
      return;
    }
  },

  _foregroundWindow: null,
  getForegroundWindow: function wm_getForegroundWindow() {
    return this._foregroundWindow;
  },

  setForegroundWindow: function wm_setForegroundWindow(newWindow) {
    var oldWindow = this._foregroundWindow;
    if (oldWindow === newWindow || this._isInTransition)
      return;
    this._foregroundWindow = newWindow;
    this._isInTransition = true;

    newWindow.focus((function focusCallback() {
      this._isInTransition = false;
      fireWindowEvent(newWindow, 'appopen');
    }).bind(this));
  },

  closeForegroundWindow: function wm_closeForegroundWindow() {
    var foregroundWindow = this._foregroundWindow;
    if (!foregroundWindow || this._isInTransition)
      return;

    fireWindowEvent(foregroundWindow, 'appwillclose');

    var oldWindow = this._foregroundWindow;
    this._foregroundWindow = null;
    this._isInTransition = true;

    oldWindow.blur((function blurCallback() {
      this._isInTransition = false;

      fireWindowEvent(oldWindow, 'appclose');
    }).bind(this));
  },

  _lastWindowId: 0,
  launch: function wm_launch(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    if (!application)
      return;

    // getInstalledAppForURL will return an object with the URL stripped
    // so let's set it back to default
    application.url = url;

    var applicationWindow = this.getWindowByApp(application);
    if (!applicationWindow) {
      applicationWindow = new AppWindow(application, ++this._lastWindowId);
      this.add(applicationWindow);

      setTimeout(function(self) {
        fireWindowEvent(applicationWindow, 'appwillopen');
      }, 0, this);
    }

    // To be compatible with the upstream webapi.js file,
    // foregroundWindow should be set on the AppManager...
    Gaia.AppManager.foregroundWindow = applicationWindow.element;

    this.setForegroundWindow(applicationWindow);
    return applicationWindow;
  },

  kill: function wm_kill(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    var applicationWindow = this.getWindowByApp(application);
    if (!applicationWindow)
      return;

    fireWindowEvent(applicationWindow, 'appkill');
    this.remove(applicationWindow);
  }
};

window.addEventListener('load', function wm_loadHandler(evt) {
  window.removeEventListener('load', wm_loadHandler);
  WindowManager.init();
});

