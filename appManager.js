/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var runningApps = [];

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

    get screen() {
      delete this.screen;
      return this.screen = document.getElementById('screen');
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
            if (this.screen.classList.contains('animateTaskManagerOpen')) {
              this.screen.classList.remove('animateTaskManagerOpen');
              this.screen.classList.add('animateTaskManagerClose');
            } else {
              this.screen.classList.remove('animateTaskManagerClose');
              this.screen.classList.add('animateTaskManagerOpen');
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
        url: 'data:text/html,<font color="blue">Hello</font>'
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
        var newWindow = document.createElement('iframe');
        var foregroundWindow = this.foregroundWindow = newWindow;
        foregroundWindow.className = 'appWindow';
        foregroundWindow.src = url;

        this.windowsContainer.appendChild(foregroundWindow);

        runningApps.push({
          url: url,
          window: foregroundWindow
        });
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

