/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var runningApps = [];

  var TaskTray = function(canvas, iconWidth, iconHeight, border) {
    this.canvas = canvas;
    this.iconWidth = iconWidth;
    this.iconHeight = iconHeight;
    this.sceneGraph = new SceneGraph(canvas);
    this.border = border || 0.1;
    this.icons = [];
    this.currentPage = 0;
    this.physics = createPhysicsFor(this);
    this.reflow(canvas.width, canvas.height, 0);

    // Set up event handlers.
    var events = [
      'touchstart', 'touchmove', 'touchend',
      'mousedown', 'mousemove', 'mouseup',
    ];

    events.forEach((function(evt) {
      canvas.addEventListener(evt, this, true);
    }).bind(this));

    window.addEventListener('resize', this, true);
  }

  TaskTray.prototype = {
    add: function(src, label, url) {

      // Create the icon in the tray.
      var icons = this.icons;
      var icon = new Icon(this, icons.length);

      icons.push(icon);

      // Load the image, sprite will be created when image load is complete.
      var img = new Image();
      img.src = src;
      img.label = label;
      img.url = url;
      img.icon = icon;
      img.onload = function() {
        // Update the icon (this will trigger a reflow and a repaint).
        var icon = this.icon;
        icon.update(this, this.label, this.url);
      }

      return icon;
    },

    remove: function(icon) {
      this.icons.splice(icon.index);

      if (icon.sprite)
        sceneGraph.remove(icon.sprite);
    },

    reflow: function(width, height, duration) {
      // Recalculate all the layout information.
      this.containerWidth = width;
      this.containerHeight = height;
      this.panelWidth = this.containerWidth;
      this.pageIndicatorWidth = this.containerWidth;
      this.pageIndicatorHeight = Math.min(Math.max(this.containerHeight * 0.7, 14), 20);
      this.panelHeight = this.containerHeight - this.pageIndicatorHeight;
      this.columns = Math.floor(this.panelWidth / this.iconWidth);
      this.rows = Math.floor(this.panelHeight / this.iconHeight);
      this.itemsPerPage = this.rows * this.columns;
      this.itemBoxWidth = Math.floor(this.panelWidth / this.columns);
      this.itemBoxHeight = Math.floor(this.panelHeight / this.rows);

      // Switch to the right page.
      this.setPage(this.currentPage, duration);

      // Reflow all the icons.
      var icons = this.icons;
      for (var n = 0; n < icons.length; ++n)
        icons[n].reflow(duration);
    },

    getLastPage: function() {
      var itemsPerPage = this.itemsPerPage;
      var lastPage = Math.floor((this.icons.length + (itemsPerPage - 1)) / itemsPerPage);

      if (lastPage > 0)
        --lastPage;

      return lastPage;
    },

    setPage: function(page, duration) {
      page = Math.max(0, page);
      page = Math.min(page, this.getLastPage());
      this.sceneGraph.setViewportTopLeft(this.containerWidth * page, 0, duration);
      this.currentPage = page;
    },

    tap: function(x, y) {
      var screen = document.getElementById('screen');
      var rect = screen.getBoundingClientRect();
      var height = rect.bottom - rect.top - 140;
      
      this.sceneGraph.forHit(
        x, y - height,
        function(sprite) {
          Gaia.AppManager.closeTaskManager();
          Gaia.AppManager.launch(sprite.icon.url);
        });
    },

    handleEvent: function(e) {
      var physics = this.physics;

      switch (e.type) {
        case 'touchstart':
        case 'mousedown':
          this.canvas.setCapture(false);
          physics.onTouchStart(e.touches ? e.touches[0] : e);
          break;
        case 'touchmove':
        case 'mousemove':
          physics.onTouchMove(e.touches ? e.touches[0] : e);
          break;
        case 'touchend':
        case 'mouseup':
          document.releaseCapture();
          physics.onTouchEnd(e.touches ? e.touches[0] : e);
          break;
        case 'resize':
          var canvas = this.canvas;
          var width = canvas.width = window.innerWidth;
          var height = canvas.height = 140;
          this.sceneGraph.blitter.viewportWidth = width;
          this.sceneGraph.blitter.viewportHeight = height;
          this.reflow(width, height, 0);
          break;
        default:
          return;
      }

      e.preventDefault();
    }
  };

  Gaia.AppManager = {
    _foregroundWindows: [],
    
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
        return;
      return foregroundWindows[count - 1];
    },

    get isTaskManagerOpen() {
      return this.screen.classList.contains('animateTaskManagerOpen');
    },

    get screen() {
      delete this.screen;
      return this.screen = document.getElementById('screen');
    },
    
    get taskTray() {
      delete this.taskTray;
      
      var taskManagerContainer = document.getElementById('taskManager');
      var taskManagerRect = taskManagerContainer.getBoundingClientRect();
      var taskTrayCanvas = document.getElementById('taskTrayCanvas');
      
      taskTrayCanvas.width = taskManagerRect.width;
      taskTrayCanvas.height = taskManagerRect.height;
      
      return this.taskTray = new TaskTray(taskTrayCanvas, 120, 120, 0.2);
    },

    get windowsContainer() {
      delete this.windowsContainer;
      return this.windowsContainer = document.getElementById('windows');
    },

    init: function() {
      window.addEventListener('keypress', this);
      window.addEventListener('appclose', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keypress':
          if (evt.keyCode == evt.DOM_VK_ESCAPE) {
            // Open/Close TaskManager
            if (this.isTaskManagerOpen) {
              this.closeTaskManager();
            } else {
              this.openTaskManager();
            }
          }
          break;
        case 'appclose':
          this.close();
          break;
        default:
          throw new Error('Unhandled event in AppManager');
          break;
      }
    },

    openTaskManager: function() {
      var screenClassList = this.screen.classList;
      screenClassList.remove('animateTaskManagerClose');
      screenClassList.add('animateTaskManagerOpen');
    },
    
    closeTaskManager: function() {
      var screenClassList = this.screen.classList;
      screenClassList.remove('animateTaskManagerOpen');
      screenClassList.add('animateTaskManagerClose');
    },

    getInstalledApps: function() {
      // TODO: Query navigator.mozApps for installed app list.
      return [{
        name: 'Phone',
        icons: {
          size_128: 'images/Phone.png'
        },
        url: 'dialer/dialer.html'
      }, {
        name: 'Messages',
        icons: {
          size_128: 'images/Messages.png'
        },
        url: 'sms/sms.html'
      }, {
        name: 'Contacts',
        icons: {
          size_128: 'images/Contacts.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Video',
        icons: {
          size_128: 'images/Video.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Gallery',
        icons: {
          size_128: 'images/Gallery.png'
        },
        url: 'gallery/gallery.html'
      }, {
        name: 'Camera',
        icons: {
          size_128: 'images/Camera.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Maps',
        icons: {
          size_128: 'images/Maps.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Calculator',
        icons: {
          size_128: 'images/Calculator.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Clock',
        icons: {
          size_128: 'images/Clock.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Browser',
        icons: {
          size_128: 'images/Browser.png'
        },
        url: 'browser/browser.html'
      }, {
        name: 'Music',
        icons: {
          size_128: 'images/Music.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Weather',
        icons: {
          size_128: 'images/Weather.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Settings',
        icons: {
          size_128: 'images/Settings.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Stocks',
        icons: {
          size_128: 'images/Stocks.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Market',
        icons: {
          size_128: 'images/Market.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }];
    },

    getRunningApps: function() {
      return runningApps;
    },
    
    getInstalledAppForURL: function(url) {
      var installedApps = this.getInstalledApps();
      
      for (var i = 0; i < installedApps.length; i++) {
        if (installedApps[i].url === url)
          return installedApps[i];
      }
      
      return null;
    },
    
    getAppInstance: function(url) {
      for (var i = 0; i < runningApps.length; i++) {
        if (runningApps[i].url === url)
          return runningApps[i];
      }
      return null;
    },

    launch: function(url) {
      var appInstance = this.getAppInstance(url);

      // App is already running, set focus to the existing instance.
      if (appInstance) {
        var foregroundWindow = this.foregroundWindow = appInstance.window;
        foregroundWindow.removeAttribute('hidden');
        foregroundWindow.contentWindow.Apps.init();
      }

      // App is not yet running, create a new instance.
      else {
        var app = this.getInstalledAppForURL(url);
        var newWindow = document.createElement('iframe');
        var foregroundWindow = this.foregroundWindow = newWindow;
        foregroundWindow.className = 'appWindow';
        foregroundWindow.src = url;

        this.windowsContainer.appendChild(foregroundWindow);

        runningApps.push({
          url: url,
          window: foregroundWindow
        });
        
        if (app) {
          this.taskTray.add(app.icons.size_128, app.name, app.url);
        }
      }

      var animationCompleteHandler = function() {
        window.removeEventListener('animationend', animationCompleteHandler);

        foregroundWindow.classList.remove('animateOpening');
        foregroundWindow.focus();

        var appOpenEvent = document.createEvent('UIEvents');

        appOpenEvent.initUIEvent('appopen', true, true,
                                 foregroundWindow.contentWindow, 0);
        window.dispatchEvent(appOpenEvent);
      };
      window.addEventListener('animationend', animationCompleteHandler);

      foregroundWindow.classList.add('animateOpening');
      this.windowsContainer.removeAttribute('hidden');

      return foregroundWindow;
    },

    close: function() {
      var foregroundWindow = this.foregroundWindow;
      if (!foregroundWindow)
        return;

      var animationCompleteHandler = (function() {
        window.removeEventListener('animationend', animationCompleteHandler);

        foregroundWindow.classList.remove('animateClosing');
        foregroundWindow.blur();
        foregroundWindow.setAttribute('hidden', true);

        var newForegroundWindow = this.foregroundWindow;
        if (newForegroundWindow)
          newForegroundWindow.focus();
        else
          this.windowsContainer.setAttribute('hidden', true);
      }).bind(this);

      window.addEventListener('animationend', animationCompleteHandler);
      foregroundWindow.contentWindow.Apps.uninit();
      foregroundWindow.classList.add('animateClosing');
    },

    kill: function(url) {
      for (var i = 0; i < runningApps.length; i++) {
        if (runningApps[i].url === url) {
          this.windowsContainer.removeChild(runningApps[i].window);
          runningApps.splice(i, 1);
          break;
        }
      }
    }
  };
})();

