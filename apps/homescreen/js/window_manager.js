/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function WindowSprite(win) {
  var element = this.element = document.createElement('div');
  if (win.application.fullscreen) {
    element.className = 'windowSprite fullscreen';
  } else {
    element.className = 'windowSprite';
  }
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
    // XXX: wait for 50ms for iframe to be painted.
    // setTimeout(0) is used to escape the current event firing.
    setTimeout((function () {
      this.element.addEventListener('transitionend', afterCrossFade);
      this.element.classList.add('crossFade');
    }).bind(this), 50);
  }
};

var _statusBarHeight = null;

function Window(application, id) {
  var element = this.element = document.createElement('iframe');
  element.setAttribute('mozallowfullscreen', 'true');

  // TODO: a platform fix will come
  var exceptions = ['Dialer', 'Settings', 'Camera'];
  if(exceptions.indexOf(application.name) == -1) {
    element.setAttribute('mozbrowser', 'true');
  }
  element.id = 'window_' + id;
  element.className = 'appWindow';

  this.application = application;
  this.id = id;
  this.resize();
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
        element.src = url;
        this._loaded = true;

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

      if (callback)
        callback();
    }).bind(this);
    sprite.element.addEventListener('transitionend', focus);

    if (this.application.fullscreen) {
      document.getElementById('screen').classList.add('fullscreen');
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

    document.body.offsetHeight;
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
  },

  enabled: true,

  get container() {
    delete this.container;
    return this.container = document.getElementById('windows');
  },

  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case 'keyup':
        switch (evt.keyCode) {
          case evt.DOM_VK_HOME:
            ScreenManager.turnScreenOn();
            if (this.enabled)
              this.closeForegroundWindow();
            break;
          case evt.DOM_VK_ESCAPE:
            if (this.enabled && !evt.defaultPrevented) {
              if (TaskManager.isActive()) {
                TaskManager.hide();
              } else if (IMEManager.targetWindow) {
                IMEManager.hideIME();
              } else {
                this.closeForegroundWindow();
              }
              evt.preventDefault();
            }
            break;
        }
        break;
      case 'message':
        if (!this.enabled)
          return;
        if (evt.data == 'appclose')
          this.closeForegroundWindow();
        break;
      case 'home':
        if (!this.enabled)
          return;
        this.closeForegroundWindow();
        break;
      case 'appopen':
        this.container.classList.add('active');
        break;
      case 'appwillclose':
        this.container.classList.remove('active');
        break;
      case 'locked':
        if (this._foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.remove('fullscreen');
        }
        this.enabled = false;
        break;
      case 'unlocked':
        if (this._foregroundWindow.application.fullscreen) {
          document.getElementById('screen').classList.add('fullscreen');
        }
        this.enabled = true;
        break;
      case 'resize':
        if (!this._foregroundWindow)
          return;
        this._foregroundWindow.resize();
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
      this._fireEvent(newWindow.element, 'appopen', newWindow.name);
    }).bind(this));
  },

  closeForegroundWindow: function wm_closeForegroundWindow() {
    var foregroundWindow = this._foregroundWindow;
    if (!foregroundWindow || this._isInTransition)
      return;

    this._fireEvent(foregroundWindow.element, 'appwillclose', name);

    var oldWindow = this._foregroundWindow;
    this._foregroundWindow = null;
    this._isInTransition = true;

    oldWindow.blur((function blurCallback() {
      this._isInTransition = false;
      this._fireEvent(foregroundWindow.element, 'appclose');
      if (oldWindow.application.hackKillMe) {
        // waiting for the closing transition to end before removing the iframe from dom
        oldWindow.element.addEventListener('transitionend', function waitToKill() {
          oldWindow.element.removeEventListener('transitionend', waitToKill);
          TaskManager.remove(oldWindow.application, oldWindow.id);
        });
      }
    }).bind(this));
  },

  _lastWindowId: 0,
  launch: function wm_launch(url) {
    var application = Gaia.AppManager.getInstalledAppForURL(url);
    if (!application)
      return;

    var name = application.name;

    // getInstalledAppForURL will return an object with the URL stripped
    // so let's set it back to default
    application.url = url;

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

