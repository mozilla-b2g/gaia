/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var runningApps = [];

  var TaskIcon = function(taskTray, index) {
    this.taskTray = taskTray;
    this.index = index;
    this.label = '';
    this.url = '';
  };

  TaskIcon.prototype = {
    update: function(img, label, url) {
      this.label = label;
      this.url = url;
      var taskTray = this.taskTray;
      var iconWidth = taskTray.iconWidth;
      var iconHeight = taskTray.iconHeight;
      var border = taskTray.border;
      var sceneGraph = taskTray.sceneGraph;

      // Draw the icon sprite.
      var sprite = this.sprite;
      var createSprite = !sprite;
      if (createSprite) {
        sprite = new Sprite(iconWidth, iconHeight);
        sprite.icon = this;
        this.sprite = sprite;
      }
      var ctx = sprite.getContext2D();
      ctx.drawImage(img, iconWidth * border, iconHeight * border,
                    iconWidth * (1 - border * 2),
                    iconHeight * (1 - border * 2));
      var fontSize = Math.floor(iconHeight * border * 0.6);
      ctx.font = fontSize + 'pt Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'top';
      ctx.fillText(label, iconWidth / 2, iconHeight - iconHeight * border,
                   iconWidth * 0.9);
      if (createSprite)
        sceneGraph.add(sprite);

      // Draw the close button sprite.
      var closeButtonImage = Gaia.AppManager._closeButtonImage;
      var closeButtonSprite = this.closeButtonSprite;
      var createCloseButtonSprite = !closeButtonSprite;
      if (createCloseButtonSprite) {
        closeButtonSprite = new Sprite(32, 32);
        closeButtonSprite.icon = this;
        closeButtonSprite.isCloseButton = true;
        this.closeButtonSprite = closeButtonSprite;
      }
      var closeButtonCTX = closeButtonSprite.getContext2D();
      closeButtonCTX.drawImage(closeButtonImage, 0, 0, 32, 32);
      if (createCloseButtonSprite)
        sceneGraph.add(closeButtonSprite);

      this.reflow();
    },
    // return the X coordinate of the top left corner of a slot
    slotLeft: function() {
      var taskTray = this.taskTray;
      return taskTray.itemBoxWidth * (this.index % taskTray.columns);
    },
    reflow: function(duration) {
      // Position the icon sprites.
      var sprite = this.sprite;
      if (!sprite)
        return;

      var taskTray = this.taskTray;
      var border = taskTray.border;
      var index = this.index;
      var itemsPerPage = taskTray.itemsPerPage;
      var page = Math.floor(index / taskTray.itemsPerPage);
      var x = page * taskTray.containerWidth + this.slotLeft();
      var y = 0;
      sprite.setPosition(x, y, duration);
      sprite.setScale(1, duration);

      // Position the close button sprites.
      var closeButtonSprite = this.closeButtonSprite;
      if (!closeButtonSprite)
        return;

      x += sprite.width * (1 - border * 2);
      y += 20;
      closeButtonSprite.setPosition(x, y, duration);
      closeButtonSprite.setScale(1, duration);
    }
  };

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
      'touchstart', 'touchmove', 'touchend'
    ];

    events.forEach((function(evt) {
      canvas.addEventListener(evt, this, true);
    }).bind(this));

    window.addEventListener('resize', this, true);
  };

  TaskTray.prototype = {
    getTrayIconForAppURL: function taskTrayGetTrayIconForAppURL(url) {
      var icons = this.icons;

      for (var i = 0; i < icons.length; i++) {
        var icon = icons[i];
        if (icon.url === url)
          return icon;
      }

      return null;
    },

    add: function taskTrayAdd(src, label, url) {

      // Create the icon in the tray.
      var icons = this.icons;
      var icon = new TaskIcon(this, icons.length);

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

    remove: function taskTrayRemove(icon) {
      var icons = this.icons;

      icons.splice(icon.index, 1);

      for (var i = 0; i < icons.length; i++)
        icons[i].index = i;

      var sceneGraph = this.sceneGraph;
      if (icon.sprite)
        sceneGraph.remove(icon.sprite);

      if (icon.closeButtonSprite)
        sceneGraph.remove(icon.closeButtonSprite);

      var canvas = this.canvas;
      this.reflow(canvas.width, canvas.height, 0);
    },

    reflow: function taskTrayReflow(width, height, duration) {
      // Recalculate all the layout information.
      this.containerWidth = width;
      this.containerHeight = height;
      this.panelWidth = this.containerWidth;
      this.panelHeight = this.containerHeight;
      this.columns = Math.floor(this.panelWidth / this.iconWidth);
      this.itemsPerPage = this.columns;
      this.itemBoxWidth = Math.floor(this.panelWidth / this.columns);
      this.itemBoxHeight = this.panelHeight;

      // Switch to the right page.
      this.setPage(this.currentPage, duration);

      // Reflow all the icons.
      var icons = this.icons;
      for (var n = 0; n < icons.length; ++n)
        icons[n].reflow(duration);
    },

    getLastPage: function taskTrayGetLastPage() {
      var itemsPerPage = this.itemsPerPage;
      var lastPage =
        Math.floor((this.icons.length + (itemsPerPage - 1)) / itemsPerPage);

      if (lastPage > 0)
        --lastPage;

      return lastPage;
    },

    setPage: function taskTraySetPage(page, duration) {
      page = Math.max(0, page);
      page = Math.min(page, this.getLastPage());
      this.sceneGraph.setViewportTopLeft(this.containerWidth * page,
                                         0, duration);
      this.currentPage = page;
    },

    tap: function taskTrayTap(x, y) {
      var screen = document.getElementById('screen');
      var rect = screen.getBoundingClientRect();
      var height = rect.bottom - rect.top - 140;

      this.sceneGraph.forHit(
        x, y - height,
        function(sprite) {
          // Close button tapped; kill app.
          if (sprite.isCloseButton) {
            Gaia.AppManager.kill(sprite.icon.url);
          }

          // Icon tapped; launch app.
          else {
            Gaia.AppManager.closeTaskManager();
            Gaia.AppManager.launch(sprite.icon.url);
          }
        });
    },

    handleEvent: function taskTrayHandleEvent(e) {
      var physics = this.physics;

      switch (e.type) {
        case 'touchstart':
          this.canvas.setCapture(false);
          physics.onTouchStart(e.touches ? e.touches[0] : e);
          break;
        case 'touchmove':
          physics.onTouchMove(e.touches ? e.touches[0] : e);
          break;
        case 'touchend':
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

      this._closeButtonImage = new Image();
      this._closeButtonImage.src = 'images/close.png';
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
        url: '../dialer/dialer.html'
      }, {
        name: 'Messages',
        icons: {
          size_128: 'images/Messages.png'
        },
        url: '../sms/sms.html'
      }, {
        name: 'Contacts',
        icons: {
          size_128: 'images/Contacts.png'
        },
        url: '../dialer/dialer.html?choice=contact'
      }, {
        name: 'Video',
        icons: {
          size_128: 'images/Video.png'
        },
        url: 'blank.html#video'
      }, {
        name: 'Gallery',
        icons: {
          size_128: 'images/Gallery.png'
        },
        url: '../gallery/gallery.html'
      }, {
        name: 'Camera',
        icons: {
          size_128: 'images/Camera.png'
        },
        url: '../camera/camera.html'
      }, {
        name: 'Maps',
        icons: {
          size_128: 'images/Maps.png'
        },
        url: 'blank.html#maps'
      }, {
        name: 'Calculator',
        icons: {
          size_128: 'images/Calculator.png'
        },
        url: 'blank.html#calculator'
      }, {
        name: 'Clock',
        icons: {
          size_128: 'images/Clock.png'
        },
        url: 'blank.html#clock'
      }, {
        name: 'Browser',
        icons: {
          size_128: 'images/Browser.png'
        },
        url: '../browser/browser.html'
      }, {
        name: 'Music',
        icons: {
          size_128: 'images/Music.png'
        },
        url: 'blank.html#music'
      }, {
        name: 'Weather',
        icons: {
          size_128: 'images/Weather.png'
        },
        url: 'blank.html#weather'
      }, {
        name: 'Settings',
        icons: {
          size_128: 'images/Settings.png'
        },
        url: '../settings/settings.html'
      }, {
        name: 'Stocks',
        icons: {
          size_128: 'images/Stocks.png'
        },
        url: 'blank.html#stocks'
      }, {
        name: 'Market',
        icons: {
          size_128: 'images/Market.png'
        },
        url: 'blank.html#market'
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
      var instance = this.getAppInstance(url);

      var state = {
        url: url,
        hidden: false
      };
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('visibilitychange', true, true, state);

      // App is already running, set focus to the existing instance.
      if (instance) {
        var foregroundWindow = this.foregroundWindow = instance.window;
        foregroundWindow.removeAttribute('hidden');
        foregroundWindow.contentWindow.dispatchEvent(event);
      } else {
        var app = this.getInstalledAppForURL(url);
        var newWindow = document.createElement('iframe');
        var foregroundWindow = this.foregroundWindow = newWindow;
        foregroundWindow.className = 'appWindow';
        foregroundWindow.src = url;

        this.windowsContainer.appendChild(foregroundWindow);

        var contentWindow = foregroundWindow.contentWindow;
        contentWindow.addEventListener('load', function appload(evt) {
          contentWindow.removeEventListener('load', appload, true);
          setTimeout(function () {
            contentWindow.dispatchEvent(event);
          }, 0);
        }, true);

        runningApps.push({
          url: url,
          window: foregroundWindow
        });

        if (app)
          this.taskTray.add(app.icons.size_128, app.name, app.url);
      }

      var animationCompleteHandler = function() {
        window.removeEventListener('animationend', animationCompleteHandler);

        foregroundWindow.focus();

        foregroundWindow.classList.remove('animateOpening');

        var openEvent = document.createEvent('UIEvents');

        openEvent.initUIEvent('appopen', true, true,
                                 foregroundWindow.contentWindow, 0);
        window.dispatchEvent(openEvent);
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

        var instance = this.getAppInstanceForWindow(foregroundWindow);
        var state = {
          url: instance.url,
          hidden: true
        };
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('visibilitychange', true, true, state);
        foregroundWindow.contentWindow.dispatchEvent(event);

        var newForegroundWindow = this.foregroundWindow;
        if (newForegroundWindow)
          newForegroundWindow.focus();
        else {
          this.windowsContainer.setAttribute('hidden', true);
          window.focus();
        }
      }).bind(this);

      window.addEventListener('animationend', animationCompleteHandler);
      foregroundWindow.classList.add('animateClosing');
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

