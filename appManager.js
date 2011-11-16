/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var runningApps = [];
  var foregroundWindow;
  
  Gaia.AppManager = {

    get windowsContainer() {
      delete this.windowsContainer;
      return this.windowsContainer = document.getElementById('windows');
    },

    init: function() {
      window.addEventListener('keypress', this);
      window.addEventListener('appclose', this);
      
      // UGLY HACK: Create a dummy text input to be able to set focus back to the main window.
      this.textInput = document.createElement('input');
      this.textInput.id = 'homescreenFocus';
      this.textInput.type = 'text';
      document.body.appendChild(this.textInput);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keypress':
          if (evt.keyCode == evt.DOM_VK_ESCAPE) {
            // TODO: Open TaskManager
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
        foregroundWindow = appInstance.window;
        foregroundWindow.removeAttribute('hidden');
        foregroundWindow.contentWindow.Apps.init();
      }
      
      // App is not yet running, create a new instance.
      else {
        foregroundWindow = document.createElement('iframe');
        foregroundWindow.className = 'appWindow';
        foregroundWindow.src = url;
        
        this.windowsContainer.appendChild(foregroundWindow);
        
        runningApps.push({
          url: url,
          window: foregroundWindow
        });
      }
      
      var animationCompleteHandler = function() {
        window.removeEventListener('animationend', animationCompleteHandler, false);
        
        foregroundWindow.classList.remove('animateOpening');
        foregroundWindow.focus();

        var appOpenEvent = document.createEvent('UIEvents');
        
        appOpenEvent.initUIEvent('appopen', true, true, foregroundWindow.contentWindow, 0);
        window.dispatchEvent(appOpenEvent);
      };
      
      window.addEventListener('animationend', animationCompleteHandler, false);
      
      foregroundWindow.classList.add('animateOpening');
      
      this.windowsContainer.removeAttribute('hidden');
      
      return foregroundWindow;
    },
    
    close: function() {
      if (!foregroundWindow)
        return;
      
      var windowsContainer = this.windowsContainer;
      var textInput = this.textInput;
      
      var animationCompleteHandler = function() {
        window.removeEventListener('animationend', animationCompleteHandler, false);
        
        foregroundWindow.classList.remove('animateClosing');
        textInput.focus();
        
        foregroundWindow.setAttribute('hidden', true);
        windowsContainer.setAttribute('hidden', true);
        
        foregroundWindow = null;
      };

      window.addEventListener('animationend', animationCompleteHandler, false);
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
