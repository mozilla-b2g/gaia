/*
 *  Module: Application Manager.
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *
 *
*/

if(typeof owdAppManager === 'undefined') {
  (function() {
  'use strict';

  window.owdAppManager = {};

  var installedApps = {};

  var callbacksOnAppsReady = [], callbacksOnInstall = [];

  var nonInstalledApps = ['http://system.gaiamobile.org',
                          'http://homescreen.gaiamobile.org',
                          'http://homescreentef.gaiamobile.org',
                          'http://test-agent.gaiamobile.org',
                          'http://uitest.gaiamobile.org',
                          'http://keyboard.gaiamobile.org'];

  navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
      var apps = e.target.result;
      apps.forEach(function(app) {
        if (nonInstalledApps.indexOf(app.origin) === -1) {
          installedApps[app.origin] = app;
        }
      });
      callbacksOnAppsReady.forEach(function(callback) {
        callback(installedApps);
      });
    };

  navigator.mozApps.mgmt.onuninstall = function uninstall(event) {
      var newapp = event.application;
      delete installedApps[newapp.origin];
   };

  navigator.mozApps.mgmt.oninstall = function install(event) {
    var newapp = event.application;

    installedApps[newapp.origin] = newapp;

    callbacksOnInstall.forEach(function(callback) {
      callback(newapp);
    });
  };

  document.documentElement.lang = 'en-US';

  SettingsListener.getPropertyValue('language.current', function(lang) {
    if (lang && lang.length > 0) {
      document.documentElement.lang = lang;
    }
  });

  /*
   * Returns all installed applications
   */
  owdAppManager.getAll = function() {
    return installedApps;
  };

  owdAppManager.addEventListener = function(type, callback) {
    if (type === 'appsready') {
      callbacksOnAppsReady.push(callback);
    } else if (type === 'oninstall') {
      callbacksOnInstall.push(callback);
    }
  };

  // Look up the app object for a specified app origin
  owdAppManager.getByOrigin = function (origin) {
    var ret = installedApps[origin];

    // Trailing '/'
    if(typeof ret === 'undefined') {
      var theor = origin.slice(0,origin.length - 1);

      window.console.log('The origin: ',theor);

      ret = installedApps[theor];
    }

    return ret;
  };

  /*
   *  Returns the origin for an apllication
   *
   *  {Object} Moz application
   *
   */
  owdAppManager.getOrigin = function(app) {
    return app.origin;
  };

  /*
   *  Returns the manifest that describes the app
   *
   *  {String} App origin
   *
   */
  owdAppManager.getManifest = function(origin) {
    var ret = null;

    var app = this.getByOrigin(origin);

    if (app) {
      ret = app.manifest;
    }

    return ret;
  };

  // This is a cool hack ;) The idea is to set this info in the manifest
  var aux = ['dialer', 'sms', 'settings', 'camera', 'gallery', 'browser',
             'market', 'comms', 'music', 'clock', 'email'];
  var coreApps = [];
  for (var i = 0; i < aux.length; i++) {
    coreApps.push('http://' + aux[i] + '.gaiamobile.org');
  }
  aux = [];

  /*
   *  Returns true if it's a core application
   *
   *  {String} App origin
   *
   */
  owdAppManager.isCore = function(origin) {
    /*return this.getManifest(origin).core;*/
    if (coreApps.indexOf(origin) !== -1) {
      return true;
    } else {
      return false;
    }
  };

  /*
   *  Returns an icon given an origin
   *
   *  {String} App origin
   *
   */
  owdAppManager.getIcon = function(origin) {

    var manifest = this.getManifest(origin);

    var ret = manifest.targetIcon;

    if (!ret) {
      ret = 'http://' + document.location.host + '/resources/images/Unknown.png';

      var icons = manifest.icons;

      if (icons) {
        if ('120' in icons) {
          ret = icons['120'];
        } else {
          // Get all sizes
          var sizes = Object.keys(icons).map(parseInt);
          // Largest to smallest
          sizes.sort(function(x, y) { return y - x; });
          ret = icons[sizes[0]];
        }
      }

      // If the icons is a fully-qualifed URL, leave it alone
      // (technically, manifests are not supposed to have those)
      // Otherwise, prefix with the app origin
      if (ret.indexOf(':') === -1) {
        // XXX it looks like the homescreen can't load images from other origins
        // so use the ones from the url host for now
        // icon = app.origin + icon;
        ret = 'http://' + document.location.host + ret;
      }

      manifest.targetIcon = ret;
    }

    return ret;
  }

  /*
   *  Localize the app name
   *
   *  {String} App origin
   *
   */
  owdAppManager.getName = function(origin) {
    var ret = null;

    var manifest = this.getManifest(origin);

    if (manifest) {
      ret = manifest.name;

      var locales = manifest.locales;
      if (locales) {
        var locale = locales[document.documentElement.lang]
        if (locale && locale.name) {
          ret = locale.name;
        }
      }
    }

    return ret;
  }

  function paramsAsString(params) {
    var output = [];

    for(var x in params) {
      output.push(x + '=' + params[x]);
    }

    return '?' + output.join('&')
  }

  owdAppManager.launch = function(origin,params) {
    var app = this.getByOrigin(origin);

    if(app) {
      app.launch(paramsAsString(params));
    }
  }

  owdAppManager.close = function(origin) {
    owdAppManager.launch(origin,{close:'1'});
  }

  })();
}
