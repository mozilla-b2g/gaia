/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var runningApps = [];

  Gaia.AppManager = {
    _foregroundWindows: [],
    _isTaskManagerOpen: false,
    _appIdCounter: 0,

    set foregroundWindow(win) {
      this._foregroundWindows.push(win);
    },

    get foregroundWindow() {
      var foregroundWindows = this._foregroundWindows;
      var count = foregroundWindows.length;
      for (var i = count; i > 0; i--) {
        if (foregroundWindows[i - 1].hasAttribute('hidden'))
          foregroundWindows.pop();
      }

      count = foregroundWindows.length;
      if (!count)
        return null;

      return foregroundWindows[count - 1];
    },

    get screen() {
      delete this.screen;
      return this.screen = document.getElementById('screen');
    },

    get isTaskManagerOpen() {
      return this._isTaskManagerOpen;
    },

    get taskManager() {
      delete this.taskManager;
      var element = document.getElementById('taskManager');
      var list = element.getElementsByTagName('ul')[0];
      element.add = function(id) {
        var item = document.createElement('li');
        item.id = 'task_' + id;
        item.setAttribute('style', 'background: -moz-element(#app_' + id + ') no-repeat');
        list.appendChild(item);
        return item;
      };
      element.remove = function(id) {
        var item = list.getElementById('task_' + id);
        list.removeChild(item);
      };
      return this.taskManager = element;
    },

    get windowsContainer() {
      delete this.windowsContainer;
      var element = document.getElementById('windows');
      element.show = function() {
        element.classList.add('active');
      };
      element.hide = function() {
        element.classList.remove('active');
      };
      element.createWindow = (function(url) {
        var documentElement = document.documentElement;
        var iframe = document.createElement('iframe');
        var id = this._appIdCounter++;
        iframe.className = 'appWindow';
        iframe.src = url;
        iframe.id = 'app_' + id;
        iframe.style.width = documentElement.clientWidth + 'px';
        iframe.style.height = documentElement.clientHeight - 24 + 'px';
        iframe.task = this.taskManager.add(id);
        element.appendChild(iframe);
        return iframe;
      }).bind(this);
      return this.windowsContainer = element;
    },

    init: function() {
      window.addEventListener('keypress', this);
      window.addEventListener('home', this);
      window.addEventListener('message', this);

      this._closeButtonImage = new Image();
      this._closeButtonImage.src = 'style/images/close.png';
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keypress':
          if (evt.keyCode != evt.DOM_VK_ESCAPE)
            return;

          if (this.isTaskManagerOpen)
            this.closeTaskManager();
          else
            this.openTaskManager();
            
          evt.preventDefault();
          break;
        case 'message':
          this.close();
          break;
        case 'home':
          this.close();
          break;
        default:
          throw new Error('Unhandled event in AppManager');
          break;
      }
    },

    openTaskManager: function() {
      this._isTaskManagerOpen = true;
      this.taskManager.classList.add('active');
      
      for (var i = 0; i < runningApps.length; i++)
        runningApps[i].window.classList.add('active');
    },

    closeTaskManager: function() {
      this._isTaskManagerOpen = false;
      this.taskManager.classList.remove('active');
      
      for (var i = 0; i < runningApps.length; i++)
        runningApps[i].window.classList.remove('active');
    },

    getInstalledApps: function(callback) {
      var homescreenOrigin = document.location.protocol + '//' +
                             document.location.host +
                             document.location.pathname;
      homescreenOrigin = homescreenOrigin.replace(/[a-zA-Z.0-9]+$/, '');


      var self = this;
      window.navigator.mozApps.enumerate(function enumerateApps(apps) {
        var cache = [];
        apps.forEach(function(app) {
          var manifest = app.manifest;
          if (app.origin == homescreenOrigin)
            return;

          var icon = manifest.icons ? app.origin + manifest.icons['120'] : '';
          // Even if the icon is stored by the offline cache, trying to load it
          // will fail because the cache is used only when the application is
          // opened.
          // So when an application is installed it's icon is inserted into
          // the offline storage database - and retrieved later when the
          // homescreen is used offline. (TODO)
          // So we try to look inside the database for the icon and if it's
          // empty an icon is loaded by the homescreen - this is the case
          // of pre-installed apps that does not have any icons defined
          // in offline storage.
          if (icon && !window.localStorage.getItem(icon))
            icon = homescreenOrigin + manifest.icons['120'];

          var url = app.origin + manifest.launch_path;
          cache.push({
            name: manifest.name,
            url: url,
            icon: icon
          });
        });

        self.installedApps = cache;
        callback(cache);
      });
    },

    getRunningApps: function() {
      return runningApps;
    },

    getInstalledAppForURL: function(url) {
      var installedApps = this.installedApps;

      for (var i = 0; i < installedApps.length; i++) {
        if (installedApps[i].url == url)
          return installedApps[i];
      }

      return null;
    },

    getAppInstance: function(url) {
      // Compare URLs but ignore the query portion of the url (the part after
      // the ?)
      var query = new RegExp(/\?.*/);
      var currentURL = url.replace(query, '');
      for (var i = 0; i < runningApps.length; i++) {
        var runningApp = runningApps[i];
        if (runningApp.url.replace(query, '') != currentURL)
          continue;

        runningApp.url;
        return runningApp;
      }
      return null;
    },

    getAppInstanceForWindow: function amGetAppInstanceForWindow(window) {
      var length = runningApps.length;
      for (var i = 0; i < runningApps.length; i++) {
        var runningApp = runningApps[i];
        if (runningApp.window == window)
          return runningApp;
      }
      return null;
    },

    launch: function(url) {
      var windowsContainer = this.windowsContainer;
      windowsContainer.show();
      
      var instance = this.getAppInstance(url);
      var state = {
        message: 'visibilitychange',
        url: url,
        hidden: false
      };
      
      // App is already running, set focus to the existing instance.
      if (instance) {
        var foregroundWindow = this.foregroundWindow = instance.window;
        foregroundWindow.contentWindow.postMessage(state, '*');
      } else {
        var app = this.getInstalledAppForURL(url);
        var newWindow = windowsContainer.createWindow(url);
        var foregroundWindow = this.foregroundWindow = newWindow;
        var contentWindow = foregroundWindow.contentWindow;
        contentWindow.addEventListener('load', function appload(evt) {
          contentWindow.removeEventListener('load', appload, true);
          contentWindow.postMessage(state, '*');
        }, true);
        var task = foregroundWindow.task;
        task.addEventListener('click', (function(evt) {
          var _this = this;
          this.closeTaskManager();
          setTimeout(function() {
            _this.launch(url);
          }, 50);
        }).bind(this));

        runningApps.push({
          url: url,
          window: foregroundWindow
        });
      }

      var transitionHandler = function() {
        foregroundWindow.removeEventListener('transitionend', transitionHandler);
        foregroundWindow.focus();

        var openEvent = document.createEvent('UIEvents');
        openEvent.initUIEvent('appopen', true, true, window, 0);
        window.dispatchEvent(openEvent);
      };
      
      foregroundWindow.addEventListener('transitionend', transitionHandler);
      setTimeout(function() {
        foregroundWindow.classList.add('active');
      }, 50);

      return foregroundWindow;
    },

    close: function() {
      var foregroundWindow = this.foregroundWindow;
      
      if (!foregroundWindow)
        return;
      
      var windowsContainer = this.windowsContainer;
      
      var instance = this.getAppInstanceForWindow(foregroundWindow);
      var state = {
        message: 'visibilitychange',
        url: instance.url,
        hidden: true
      };

      var transitionHandler = function() {
        foregroundWindow.removeEventListener('transitionend', transitionHandler);
        foregroundWindow.blur();
        foregroundWindow.contentWindow.postMessage(state, '*');
        windowsContainer.hide();
        window.focus();
      };

      foregroundWindow.addEventListener('transitionend', transitionHandler);
      foregroundWindow.classList.remove('active');
    },

    kill: function(url) {
      for (var i = 0; i < runningApps.length; i++) {
        if (runningApps[i].url === url) {
          this.windowsContainer.removeChild(runningApps[i].window);
          runningApps.splice(i, 1);

          var taskTray = this.taskTray;
          var icon = taskTray.getTrayIconForAppURL(url);

          if (icon)
            taskTray.remove(icon);

          break;
        }
      }
    }
  };
})();

