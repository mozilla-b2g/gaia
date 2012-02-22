/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function WindowSprite(win) {
  var element = this.element = document.createElement('div');
  element.className = 'windowSprite';
  element.style.width = win.element.style.width;
  element.style.height = win.element.style.height;
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
    document.body.removeChild(this.element);
  }
};

var _statusBarHeight = null;

function Window(application, id) {
  var element = this.element = document.createElement('iframe');
  element.setAttribute('mozallowfullscreen', 'true');
  element.setAttribute('mozbrowser', 'true');
  element.id = 'window_' + id;
  element.className = 'appWindow';

  this.application = application;
  this.id = id;
  this.resize();
}

Window.prototype = {
  element: null,

  _active: false,
  _loaded: false,
  setActive: function window_setActive(active) {
    if (this._active === active)
      return;

    var classes = this.element.classList;
    classes.toggle('active');
    this._active = active;
  },

  focus: function window_focus(callback) {
    if (this._active)
      return;

    this.resize();

    var sprite = new WindowSprite(this);
    sprite.add();
    this.setActive(true);

    var focus = function(evt) {
      sprite.remove();

      var element = this.element;
      if (!this._loaded) {
        element.src = this.application.url;
        this._loaded = true;
      }
      element.focus();
      element.contentWindow.postMessage({
        message: 'visibilitychange',
        url: this.application.url,
        hidden: false
      }, '*');

      if (callback)
        callback();
    };
    sprite.element.addEventListener('transitionend', focus.bind(this));

    if (this.application.fullscreen) {
      document.getElementById('screen').classList.add('fullscreen');
    }

    document.body.offsetHeight;
    sprite.setActive(true);
  },

  blur: function window_blur(callback) {
    if (!this._active)
      return;

    var sprite = new WindowSprite(this);
    sprite.setActive(true);
    sprite.add();

    var blur = function(evt) {
      this.setActive(false);
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
    };
    sprite.element.addEventListener('transitionend', blur.bind(this));

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

    document.body.offsetHeight;
    sprite.setActive(false);
  },

  resize: function window_resize() {
    var element = this.element;
    // NOTE: for the moment, orientation only works when fullscreen because of a
    // too dirty hack...
    if (this.application.fullscreen && this.application.orientation) {
      var width = this.element.style.width;
      element.style.width = this.element.style.height;
      element.style.height = width;

      element.classList.add(this.application.orientation);
    } else {
      var documentElement = document.documentElement;
      element.style.width = documentElement.clientWidth + 'px';

      var height = documentElement.clientHeight;
      if (!this.application.fullscreen) {
        height -= document.getElementById('statusbar').offsetHeight;
      }
      element.style.height = height + 'px';
    }
  }
};

function getApplicationManager() {
  return WindowManager;
}

var WindowManager = {
  init: function wm_init() {
    window.addEventListener('home', this);
    window.addEventListener('message', this);
    window.addEventListener('locked', this);
    window.addEventListener('unlocked', this);
    window.addEventListener('resize', this);
  },

  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case 'message':
        if (evt.data == 'appclose')
          this.closeForegroundWindow();
        break;
      case 'home':
        this.closeForegroundWindow();
        break;
      case 'locked':
        if (this._foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.remove('fullscreen');
        }
        break;
      case 'unlocked':
        if (this._foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.add('fullscreen');
        }
        break;
      case 'resize':
        this._foregroundWindow.resize();
        break;
    }
  },


  // Sets the WindowManager active/inactive. The WindowManager must be active
  // for the foreground Window to be visible. When inactive, the Windows can
  // still be used to get images used for the TaskManager and the minimize and
  // maximize animations.
  setActive: function wm_setActive(active) {
    var classes = this.container.classList;
    if (classes.contains('active') === active)
      return;
    classes.toggle('active');
  },

  get container() {
    delete this.container;
    return this.container = document.getElementById('windows');
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

  setForegroundWindow: function wm_setForegroundWindow(newWindow, callback) {
    var oldWindow = this._foregroundWindow;
    if (oldWindow === newWindow)
      return;
    this._foregroundWindow = newWindow;

    if (newWindow) {
      newWindow.focus(function() {
        WindowManager.setActive(true);
        if (callback)
          callback();
      });
      return;
    }

    this.setActive(false);
    oldWindow.blur(callback);
  },

  closeForegroundWindow: function wm_closeForegroundWindow(callback) {
    var foregroundWindow = this._foregroundWindow;
    if (!foregroundWindow)
      return;

    this.setForegroundWindow(null, (function() {
      this._fireEvent(foregroundWindow.element, 'appclose');
      if (callback)
        callback();
    }).bind(this));
  },

  _lastWindowId: 0,
  launch: function wm_launch(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    var name = application.name;

    var applicationWindow = this.getWindowByApp(application);
    if (applicationWindow) {
      Gaia.AppManager.foregroundWindow = applicationWindow.element;
      Gaia.TaskManager.sendToFront(applicationWindow.id);
    } else {
      applicationWindow = new Window(application, ++this._lastWindowId);
      this.add(applicationWindow);

      // To be compatible with the upstream webapi.js file,
      // foregroundWindow should be set on the AppManager...
      Gaia.AppManager.foregroundWindow = applicationWindow.element;

      this._fireEvent(applicationWindow.element, 'appwillopen', name);
      Gaia.TaskManager.add(application, applicationWindow.id);
    }

    this.setForegroundWindow(applicationWindow, (function() {
      this._fireEvent(applicationWindow.element, 'appopen', name);
    }).bind(this));

    return applicationWindow;
  },

  kill: function wm_kill(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    var applicationWindow = this.getWindowByApp(application);

    if (!applicationWindow)
      return;

    var name = application.name;
    this._fireEvent(applicationWindow.element, 'appkill', name);
    this.remove(applicationWindow);
  },

  _fireEvent: function wm_fireEvent(target, type, details) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(type, true, true, details || null);
    target.dispatchEvent(evt);
  }
};

window.addEventListener('load', function wm_loadHandler(evt) {
  window.removeEventListener('load', wm_loadHandler);
  WindowManager.init();
});

