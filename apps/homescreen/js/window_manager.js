/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function WindowSprite(win) {
  var element = this.element = document.createElement('div');
  element.className = 'windowSprite';
  element.style.width = win.element.style.width;
  element.style.height = win.element.style.height;
  element.style.background = '-moz-element(#window_' + win.id + ') no-repeat';
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

  var offsetHeight = document.getElementById('statusbar').offsetHeight;
  var documentElement = document.documentElement;
  element.style.width = documentElement.clientWidth + 'px';
  element.style.height = documentElement.clientHeight - offsetHeight + 'px';

  this.application = application;
  this.id = id;
}

Window.prototype = {
  element: null,

  _loaded: false,

  show: function window_show() {
    this.element.classList.add('active');
  },

  hide: function window_hide() {
    this.element.classList.remove('active');
  },

  focus: function window_focus(callback) {
    if (this.element.classList.contains('active'))
      return;

    var sprite = new WindowSprite(this);
    sprite.add();
    this.show();

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
      this.element.mozRequestFullScreen();
    }

    document.body.offsetHeight;
    sprite.setActive(true);
  },

  blur: function window_blur(callback) {
    if (!this.element.classList.contains('active'))
      return;

    var sprite = new WindowSprite(this);
    sprite.setActive(true);
    sprite.add();

    var blur = function(evt) {
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
    };
    sprite.element.addEventListener('transitionend', blur.bind(this));

    if (this.application.fullscreen) {
      document.mozCancelFullScreen();
    }

    document.body.offsetHeight;
    sprite.setActive(false);
  }
};

function getApplicationManager() {
  return WindowManager;
}

var WindowManager = {
  init: function wm_init() {
    window.addEventListener('home', this);
    window.addEventListener('message', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
  },

  get container() {
    delete this.container;
    return this.container = document.getElementById('windows');
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
      case 'appopen':
        this.container.classList.add('active');
        break;
      case 'appwillclose':
        this.container.classList.remove('active');
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
    if (oldWindow === newWindow)
      return;
    this._foregroundWindow = newWindow;

    newWindow.focus((function focusCallback() {
      this._fireEvent(newWindow.element, 'appopen', newWindow.name);
    }).bind(this));
  },

  closeForegroundWindow: function wm_closeForegroundWindow() {
    var foregroundWindow = this._foregroundWindow;
    if (!foregroundWindow)
      return;

    this._fireEvent(foregroundWindow.element, 'appwillclose', name);

    var oldWindow = this._foregroundWindow;
    this._foregroundWindow = null;

    oldWindow.blur((function blurCallback() {
      this._fireEvent(foregroundWindow.element, 'appclose');
    }).bind(this));
  },

  _lastWindowId: 0,
  launch: function wm_launch(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    var name = application.name;

    var applicationWindow = this.getWindowByApp(application);
    if (applicationWindow) {
      Gaia.AppManager.foregroundWindow = applicationWindow.element;
      TaskManager.sendToFront(applicationWindow.id);
    } else {
      applicationWindow = new Window(application, ++this._lastWindowId);
      this.add(applicationWindow);

      // To be compatible with the upstream webapi.js file,
      // foregroundWindow should be set on the AppManager...
      Gaia.AppManager.foregroundWindow = applicationWindow.element;

      this._fireEvent(applicationWindow.element, 'appwillopen', name);
      TaskManager.add(application, applicationWindow.id);
    }

    this.setForegroundWindow(applicationWindow);
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
    evt.initCustomEvent(type, true, false, details || null);
    target.dispatchEvent(evt);
  }
};

window.addEventListener('load', function wm_loadHandler(evt) {
  window.removeEventListener('load', wm_loadHandler);
  WindowManager.init();
});

