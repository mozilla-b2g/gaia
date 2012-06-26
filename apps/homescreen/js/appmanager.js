
'use strict';

var ApplicationMock = function(app, entry_point, 
        origin, manifest, manifestURL, 
        receips, installOrigin, installTime) {
  this.app = app;
  this.entry_point = entry_point;
  this.origin = origin;
  this.manifest = manifest;
  this.manifestURL = manifestURL;
  this.receips = receips;
  this.installOrigin = installOrigin;
  this.installTime = installTime;
  this.manifest.use_manifest = true;
};

ApplicationMock.prototype = {
  launch: function(startPoint) {
    this.app.launch(this.entry_point + this.manifest.launch_path);
  },

  uninstall: function() {
    this.app.uninstall();
  }
};

var Applications = (function() {
  var installedApps = {};

  var callbacks = [];

  var installer = navigator.mozApps.mgmt;
  installer.getAll().onsuccess = function onSuccess(e) {
    var apps = e.target.result;
    apps.forEach(function parseApp(app) {
      if (app.manifest.icons) {
        /*
        * If the manifest contains entry points, iterate over them
        * and add a fake app object for each one.
        */
        if (app.manifest.entry_points) {
          for (var i in app.manifest.entry_points) {
            if (!app.manifest.entry_points[i].hasOwnProperty('icons')) {
              continue;
            }
            
            var alternativeOrigin = app.origin + '/' + i;
            var manifest = {};
            //Clone the manifest
            for(var j in app.manifest) {
              manifest[j] = app.manifest[j];
            }
            //Delete the locales, this is not translated yet
            delete manifest.locales;
            manifest.name = app.manifest.entry_points[i].name;
            manifest.launch_path = app.manifest.entry_points[i].path;
            manifest.icons = app.manifest.entry_points[i].icons;
            manifest.origin = alternativeOrigin;
            var newApp = new ApplicationMock(app, i,
              alternativeOrigin, manifest, app.manifestURL, app.receips,
              app.installOrigin, app.installTime);
              
            installedApps[alternativeOrigin] = newApp;
          }
        } else {
          installedApps[app.origin] = app;
        }
      }
    });

    callbacks.forEach(function(callback) {
      if (callback.type == 'ready') {
        callback.callback(installedApps);
      }
    });
  };

  installer.onuninstall = function uninstall(event) {
    var app = event.application;
    delete installedApps[app.origin];

    callbacks.forEach(function(callback) {
      if (callback.type == 'uninstall') {
        callback.callback(app);
      }
    });
  };

  installer.oninstall = function install(event) {
    var app = event.application;
    if (!installedApps[app.origin]) {
      installedApps[app.origin] = app;

      var icon = getIcon(app.origin);
      // No need to put data: URIs in the cache
      if (icon && icon.indexOf('data:') == -1) {
        try {
          window.applicationCache.mozAdd(icon);
        } catch (e) {}
      }

      callbacks.forEach(function(callback) {
        if (callback.type == 'install') {
          callback.callback(app);
        }
      });
    }
  };

  /*
   * Returns all installed applications
   */
  function getAll() {
    return installedApps;
  };

  function addEventListener(type, callback) {
    callbacks.push({ type: type, callback: callback });
  };

  // Look up the app object for a specified app origin
  function getByOrigin(origin) {
    var app = installedApps[origin];
    if (app) {
      return app;
    }

    // XXX We are affected by the port!

    // Trailing '/'
    var trimmedOrigin = origin.slice(0, origin.length - 1);
    return installedApps[trimmedOrigin];
  };

  /*
   *  Returns installed apps
   */
  function getInstalledApplications() {
    var ret = {};

    for (var i in installedApps) {
      ret[i] = installedApps[i];
    }

    return ret;
  };

  /*
   *  Returns the origin for an apllication
   *
   *  {Object} Moz application
   *
   */
  function getOrigin(app) {
    return app.origin;
  };

  /*
   *  Returns the manifest that describes the app
   *
   *  {String} App origin
   *
   */
  function getManifest(origin) {
    var app = getByOrigin(origin);
    return app ? app.manifest : null;
  };

  // Core applications should be flagged at some point. Not sure how?
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  var coreApplications = [
    'dialer', 'sms', 'settings', 'camera', 'gallery', 'browser',
    'contacts', 'music', 'clock', 'email', 'fm', 'calculator',
    'calendar', 'video', 'fm'
  ];

  coreApplications = coreApplications.map(function mapCoreApp(name) {
    return 'http://' + name + '.' + domain;
  });

  coreApplications.push('https://marketplace-dev.allizom.org');

  /*
   *  Returns true if it's a core application
   *
   *  {String} App origin
   *
   */
  function isCore(origin) {
    return coreApplications.indexOf(origin) !== -1;
  };

  var deviceWidth = document.documentElement.clientWidth;

  /*
   *  Returns the size of the icon
   *
   *  {Array} Sizes orderer largest to smallest
   *
   */
  function getIconSize(sizes) {
    return sizes[(deviceWidth < 480) ? sizes.length - 1 : 0];
  }

  /*
   *  Returns an icon given an origin
   *
   *  {String} App origin
   *
   */
  function getIcon(origin) {
    var manifest = getManifest(origin);
    if (!manifest) {
      return null;
    }

    if ('_icon' in manifest) {
      return manifest._icon;
    }

    // Get all sizes orderer largest to smallest
    var icons = manifest.icons;
    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });
    sizes.sort(function(x, y) { return y - x; });

    // If the icons is not fully-qualifed URL, add the origin of the
    // application to it (technically, manifests are supposed to
    // have those). Otherwise return the url directly as it could be
    // a data: url.
    var icon = icons[getIconSize(sizes)];
    if (icon.indexOf('data:') !== 0) {
      icon = origin + icon;
    }

    return manifest._icon = icon;
  }

  /*
   *  Localize the app name
   *
   *  {String} App origin
   *
   */
  function getName(origin) {
    var manifest = getManifest(origin);
    if (!manifest) {
      return null;
    }

    if ('locales' in manifest) {
      var locale = manifest.locales[navigator.language];
      if (locale && locale.name) {
        return locale.name;
      }
    }

    return manifest.name;
  }

  function launch(origin, params) {
    var app = getByOrigin(origin);
    if (!app) {
      return;
    }

    app.launch(params);
  }

  return {
    launch: launch,
    isCore: isCore,
    addEventListener: addEventListener,
    getAll: getAll,
    getByOrigin: getByOrigin,
    getOrigin: getOrigin,
    getName: getName,
    getIcon: getIcon,
    getManifest: getManifest,
    getInstalledApplications: getInstalledApplications
  };
})();
