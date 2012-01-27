/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {

  Gaia.AppManager = {
    _makeUrlObject: function GAM_makeUrlObject(u) {
      var a = document.createElement('a');
      a.href = u;
      return a;
    },

    // Return true iff the strings u1 and u2 are equal up the first
    // occurrence of '?', which is assumed to be the start of a URL
    // query string and ignored.
    _urlsEqualToQueryString: function GAM_urlsEqualToQueryString(u1, u2) {
      var uo1 = this._makeUrlObject(u1);
      var uo2 = this._makeUrlObject(u2);
      return (uo1.protocol === uo2.protocol
              && uo1.host === uo2.host
              && uo1.hostname === uo2.hostname
              && uo1.port === uo2.port
              && uo1.pathname === uo2.pathname
              /* ignore .search.  Should we also ignore .hash? */
              && uo1.hash === uo2.hash);
    },

    _runningApps: [],

    get runningApps() {
      return this._runningApps;
    },

    init: function() {
      window.addEventListener('home', this);
      window.addEventListener('message', this);

      this._closeButtonImage = new Image();
      this._closeButtonImage.src = 'style/images/close.png';
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'message':
          if (evt.data != 'appclose')
            return;
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

    installedApps: [],

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

    getInstalledAppForURL: function(url) {
      var installedApps = this.installedApps;
      for (var i = 0; i < installedApps.length; i++) {
        var installedApp = installedApps[i];
        if (this._urlsEqualToQueryString(installedApp.url, url))
          return installedApp;
      }

      return null;
    },

    getAppInstance: function(url) {
      var runningApps = this._runningApps;
      for (var i = 0; i < runningApps.length; i++) {
        var runningApp = runningApps[i];
        if (this._urlsEqualToQueryString(runningApp.url, url))
          return runningApp;
      }
      return null;
    },

    launch: function(url) {
      var app = this.getInstalledAppForURL(url);
      var gaiaWindow = Gaia.WindowManager.getWindowByApp(app);

      // App is already running, set focus to the existing instance.
      if (gaiaWindow) {
        Gaia.WindowManager.setForegroundWindow(gaiaWindow);
        Gaia.TaskManager.sendToFront(gaiaWindow.id);
      } else {
        gaiaWindow = new Gaia.Window(app);
        Gaia.WindowManager.setForegroundWindow(gaiaWindow, function() {
          var appopenEvent = document.createEvent('CustomEvent');
          appopenEvent.initCustomEvent('appopen', true, true, app.name);
          window.dispatchEvent(appopenEvent);
        });

        this._runningApps.push({
          name: app.name,
          id: gaiaWindow.id,
          url: url,
          window: gaiaWindow
        });
      }

      return gaiaWindow;
    },

    close: function() {
      var gaiaWindow = Gaia.WindowManager.getForegroundWindow();
      var app = gaiaWindow.app;

      if (!gaiaWindow || !app)
        return;
      
      Gaia.WindowManager.setForegroundWindow(null, function() {
        var appcloseEvent = document.createEvent('CustomEvent');
        appcloseEvent.initCustomEvent('appclose', true, true, app.name);
        window.dispatchEvent(appcloseEvent);
      });
    },

    kill: function(url) {
      var app = this.getInstalledAppForURL(url);
      var gaiaWindow = Gaia.WindowManager.getWindowByApp(app);
      
      if (gaiaWindow) {
        Gaia.WindowManager.remove(gaiaWindow);
      }
      
      var runningApps = this._runningApps;
      for (var i = 0, length = runningApps.length; i < length; i++) {
        if (runningApps[i].url === url) {
          runningApps.splice(i, 1);
          return;
        }
      }
    }
  };

})();

