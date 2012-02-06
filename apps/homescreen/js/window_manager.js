/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

function getApplicationManager() {
  return Gaia.WindowManager;
}

(function() {
  var _lastWindowId = 0;
  var _statusBarHeight = null;
  
  Gaia.Window = function(app) {
    var documentElement = document.documentElement;
    var id = this._id = ++_lastWindowId;
    
    if (_statusBarHeight === null)
      _statusBarHeight = document.getElementById('statusbar').offsetHeight;
    
    var element = this.element = document.createElement('iframe');
    element.id = 'window_' + id;
    element.className = 'appWindow';
    element.style.width = documentElement.clientWidth + 'px';
    element.style.height = documentElement.clientHeight - _statusBarHeight + 'px';
    
    this.app = app;
    
    Gaia.WindowManager.add(this);
    
    var taskElement = this.taskElement = Gaia.TaskManager.add(app, id);
  };

  Gaia.Window.prototype = {
    _isActive: false,
    setActive: function _Gaia_Window_setActive(isActive) {
      if (isActive === this._isActive)
        return;
      
      this._isActive = isActive;
      
      var element = this.element;
      var classList = element.classList;
      
      if (isActive)
        classList.add('active');
      else
        classList.remove('active');
    },
    focus: function _Gaia_Window_focus(onCompleteCallback) {
      if (this._isActive)
        return;
      
      var self = this;
      var element = this.element;
      var classList = element.classList;
      var windowSprite = new Gaia.WindowSprite(this);
      
      windowSprite.add();
      self.setActive(true);
      
      windowSprite.element.addEventListener('transitionend', function _focus_transitionend_handler(evt) {
        windowSprite.remove();
        
        element.focus();
        element.contentWindow.postMessage({
          message: 'visibilitychange',
          url: self.app.url,
          hidden: false
        }, '*');
        
        Gaia.WindowManager.setActive(true);
        
        if (onCompleteCallback)
          onCompleteCallback();
      });
      
      document.body.offsetHeight;
      windowSprite.setActive(true);
    },
    blur: function _Gaia_Window_blur(onCompleteCallback) {
      if (!this._isActive)
        return;
      
      var self = this;
      var element = this.element;
      var classList = element.classList;
      var windowSprite = new Gaia.WindowSprite(this);
      
      windowSprite.setActive(true);
      windowSprite.add();
      
      Gaia.WindowManager.setActive(false);
      
      windowSprite.element.addEventListener('transitionend', function _blur_transitionend_handler(evt) {
        self.setActive(false);
        windowSprite.remove();
        
        element.blur();
        element.contentWindow.postMessage({
          message: 'visibilitychange',
          url: self.app.url,
          hidden: true
        }, '*');
        
        window.top.focus();
        
        if (onCompleteCallback)
          onCompleteCallback();
      });
      
      document.body.offsetHeight;
      windowSprite.setActive(false);
    },
    _id: 0,
    get id() {
      return this._id;
    },
    _app: null,
    get app() {
      return this._app;
    },
    set app(value) {
      this._app = value;
      this.element.src = value.url;
    },
    element: null,
    taskElement: null
  };
})();

Gaia.WindowSprite = function(win) {
  this.win = win;
  
  var element = this.element = document.createElement('div');
  element.className = 'windowSprite';
  element.style.width = win.element.style.width;
  element.style.height = win.element.style.height;
  element.style.background = '-moz-element(#window_' + win.id + ') no-repeat';
};

Gaia.WindowSprite.prototype = {
  element: null,
  win: null,
  _isActive: false,
  setActive: function _Gaia_WindowSprite_setActive(isActive) {
    if (isActive === this._isActive)
      return;
    
    this._isActive = isActive;
    
    var element = this.element;
    var classList = element.classList;
    
    if (isActive)
      classList.add('active');
    else
      classList.remove('active');
  },
  add: function _Gaia_WindowSprite_add() {
    document.body.appendChild(this.element);
  },
  remove: function _Gaia_WindowSprite_remove() {
    document.body.removeChild(this.element);
  }
};

Gaia.WindowManager = {
  init: function() {
    window.addEventListener('home', this);
    window.addEventListener('message', this);
  },
  handleEvent: function(evt) {
    switch (evt.type) {
      case 'message':
        if (evt.data === 'appclose')
          this.closeForegroundWindow();
        break;
      case 'home':
        this.closeForegroundWindow();
        break;
      default:
        break;
    }
  },
  _isActive: false,

  // Sets the WindowManager active/inactive. The WindowManager must be active
  // for the foreground Window to be visible. When inactive, the Windows can
  // still be used to get images used for the TaskManager and the minimize and
  // maximize animations.
  setActive: function _Gaia_WindowManager_setActive(isActive) {
    if (isActive === this._isActive)
      return;
  
    this._isActive = isActive;
  
    // Set all windows to be inactive.
    var windows = this.windows;
    for (var i = 0, length = windows.length; i < length; i++)
      if (windows[i] !== this._foregroundWindow)
        windows[i].setActive(false);
  
  
    var container = this.container;
    var classList = container.classList;
  
    if (isActive)
      classList.add('active');
    else
      classList.remove('active');
  },
  get container() {
    delete this.container;
    return this.container = document.getElementById('windows');
  },
  windows: [],
  getWindowByApp: function _Gaia_WindowManager_getWindowByApp(app) {
    var windows = this.windows;
    for (var i = 0, length = windows.length; i < length; i++)
      if (windows[i].app === app)
        return windows[i];
  
    return null;
  },
  add: function _Gaia_WindowManager_add(win) {
    this.windows.push(win);
    this.container.appendChild(win.element);
  },
  remove: function _Gaia_WindowManager_remove(win) {
    var windows = this.windows;
    for (var i = 0, length = windows.length; i < length; i++) {
      if (windows[i] === win) {
        this.container.removeChild(win.element);
        windows.splice(i, 1);
        return;
      }
    }
  },
  _foregroundWindow: null,
  getForegroundWindow: function _Gaia_WindowManager_getForegroundWindow() {
    return this._foregroundWindow;
  },
  setForegroundWindow: function _Gaia_WindowManager_setForegroundWindow(win, onCompleteCallback) {
    // If the specified Window is already the foreground Window, do nothing.
    if (this._foregroundWindow === win)
      return;
  
    // If a valid Window has been specified, set the WindowManager to be
    // active and focus the new foreground Window.
    if (win) {
      win.focus(function _focus_callback() {
        if (onCompleteCallback)
          onCompleteCallback();
      });
    }
  
    // If no Window was specified, blur the previous foreground Window and set
    // the WindowManager to be inactive once the blurring is complete.
    else {
      this._foregroundWindow.blur(function _blur_callback() {
        if (onCompleteCallback)
          onCompleteCallback();
      });
    }
  
    this._foregroundWindow = win;
  },
  closeForegroundWindow: function _Gaia_WindowManager_closeForegroundWindow(onCompleteCallback) {
    var foregroundWindow = this._foregroundWindow;
    var app = foregroundWindow.app;

    if (!foregroundWindow || !app)
      return;

    var win = this.getWindowByApp(app);
  
    this.setForegroundWindow(null, (function() {
      var appcloseEvent = document.createEvent('CustomEvent');
      appcloseEvent.initCustomEvent('appclose', true, true, app.name);
      win.element.dispatchEvent(appcloseEvent);
      
      if (onCompleteCallback)
        onCompleteCallback();
    }).bind(this));
  },
  launch: function _Gaia_WindowManager_launch(url) {
    var app = Gaia.AppManager.getInstalledAppForURL(url);
    var win = this.getWindowByApp(app);


    // App is already running, set focus to the existing instance.
    if (win) {
      this.setForegroundWindow(win);
      Gaia.TaskManager.sendToFront(win.id);
    } else {
      win = new Gaia.Window(app);

      this.foregroundWindow = win.element;
      var appWillOpenEvent = document.createEvent('CustomEvent');
      appWillOpenEvent.initCustomEvent('appwillopen', true, true, app.name);
      win.element.dispatchEvent(appWillOpenEvent);

      this.setForegroundWindow(win, function() {
        var appopenEvent = document.createEvent('CustomEvent');
        appopenEvent.initCustomEvent('appopen', true, true, app.name);
        window.dispatchEvent(appopenEvent);
      });
    }

    return win;
  },
  kill: function _Gaia_WindowManager_kill(url) {
    var app = Gaia.AppManager.getInstalledAppForURL(url);
    var win = this.getWindowByApp(app);
  
    if (win)
      Gaia.WindowManager.remove(win);
  }
};

(function() {
  var onLoadHandler = function(evt) {
    window.removeEventListener('load', onLoadHandler);
    Gaia.WindowManager.init();
  };
  
  window.addEventListener('load', onLoadHandler);
})();
