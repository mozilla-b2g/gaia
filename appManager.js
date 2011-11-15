/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

if (!Gaia) { var Gaia = {}; }

(function() {
  var runningApps = [];
  
  Gaia.AppManager = {
  
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
        name: 'Calendar',
        icons: {
          size_128: 'images/Calendar.png'
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
        name: 'YouTube',
        icons: {
          size_128: 'images/YouTube.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Calculator',
        icons: {
          size_128: 'images/Calculator.png'
        },
        url: 'data:text/html,<font color="blue">Hello</font>'
      }, {
        name: 'Books',
        icons: {
          size_128: 'images/Books.png'
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
      }];
    },
  
    getRunningApps: function() { return runningApps; },
    
    getAppInstance: function(url) {
      for (var i = 0; i < runningApps.length; i++) {
        if (runningApps[i].url === url) {
          return runningApps[i];
        }
      }
      
      return null;
    },
  
    launch: function(url) {
      var appInstance = Gaia.AppManager.getAppInstance(url);
      var appWindow;
      
      // App is already running, set focus to the existing instance.
      if (appInstance) {
        appWindow = appInstance.window;
        appWindow.removeAttribute('hidden');
      }
      
      // App is not yet running, create a new instance.
      else {
        appWindow = document.createElement('iframe');
        appWindow.className = 'appWindow';
        appWindow.src = url;
        
        WindowManager.windows.appendChild(appWindow);
        
        runningApps.push({
          url: url,
          window: appWindow
        });
      }
      
      var animationCompleteHandler = function() {
        window.removeEventListener('animationend', animationCompleteHandler, false);
        
        appWindow.classList.remove('animateOpening');
        appWindow.focus();

        var appOpenEvent = document.createEvent('UIEvents');
        
        appOpenEvent.initUIEvent('appopen', true, true, appWindow.contentWindow, 0);
        window.dispatchEvent(appOpenEvent);
      };
      
      window.addEventListener('animationend', animationCompleteHandler, false);
      
      appWindow.classList.add('animateOpening');
      
      WindowManager.windows.removeAttribute('hidden');
      
      return appWindow;
    },
  
    kill: function(url) {
      for (var i = 0; i < runningApps.length; i++) {
        if (runningApps[i].url === url) {
          WindowManager.windows.removeChild(runningApps[i].window);
          runningApps.splice(i, 1);
          break;
        }
      }   
    }
  
  };
})();
