
'use strict';

var ApplicationMock = function(app, launchPath, alternativeOrigin) {
  this.app = app;
  this.entry_point = launchPath;
  this.origin = alternativeOrigin;
  //Clone the manifest
  this.manifest = {};
  for (var field in app.manifest) {
    this.manifest[field] = app.manifest[field];
  }

  var entryPoint = app.manifest.entry_points[launchPath];
  this.manifest.name = entryPoint.name;
  this.manifest.launch_path = entryPoint.launch_path;
  this.manifest.icons = entryPoint.icons;
  this.manifest.origin = alternativeOrigin;

  this.manifestURL = app.manifestURL;
  this.receipts = app.receipts;
  this.installOrigin = app.installOrigin;
  this.installTime = app.installTime;

  this.manifest.use_manifest = true;
};

ApplicationMock.prototype = {
  launch: function _launch(startPoint) {
    this.app.launch(this.entry_point);
  },

  uninstall: function _uninstall() {
    this.app.uninstall();
  }
};

var Applications = (function() {
  var installedApps = {};

  var callbacks = [], ready = false;

  var installer = navigator.mozApps.mgmt;
  installer.getAll().onsuccess = function onSuccess(e) {
    var apps = e.target.result;
    apps.forEach(function parseApp(app) {
      var manifest = app.manifest;
      if (!manifest ||
          (isCore(app) && manifest.launch_path === undefined)) {
        return;
      }

      // and add a fake app object for each one.
      var entryPoints = manifest.entry_points;
      if (!entryPoints) {
        installedApps[app.origin] = app;
        return;
      }

      for (var launchPath in entryPoints) {
        if (!entryPoints[launchPath].hasOwnProperty('icons'))
          continue;

        var alternativeOrigin = app.origin + '/' + launchPath;
        var newApp = new ApplicationMock(app, launchPath, alternativeOrigin);
        installedApps[alternativeOrigin] = newApp;
      }
    });

    ready = true;

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
    var applications = [];
    for (var app in installedApps) {
      applications.push(installedApps[app]);
    }
    return applications;
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

  /*
   *  Returns true if it's a core application
   *
   *  {Object} Moz application
   *
   */
  function isCore(app) {
    return !app.removable;
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
    if (!icons) {
      return 'style/images/default.png';
    }

    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });
    sizes.sort(function(x, y) { return y - x; });

    // If the icons is not fully-qualifed URL, add the origin of the
    // application to it (technically, manifests are supposed to
    // have those). Otherwise return the url directly as it could be
    // a data: url.
    var icon = icons[getIconSize(sizes)];
    if ((icon.indexOf('data:') !== 0) &&
        (icon.indexOf('http://') !== 0) &&
        (icon.indexOf('https://') !== 0)) {
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
      var locale = manifest.locales[document.documentElement.lang];
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

  function isReady() {
    return ready;
  }

  function installBookmark(bookmark) {
    if (!installedApps[bookmark.origin]) {
      installedApps[bookmark.origin] = bookmark;

      var icon = getIcon(bookmark.origin);
      // No need to put data: URIs in the cache
      if (icon && icon.indexOf('data:') == -1) {
        try {
          window.applicationCache.mozAdd(icon);
        } catch (e) {}
      }

      callbacks.forEach(function(callback) {
        if (callback.type == 'install') {
          callback.callback(bookmark);
        }
      });
    }
  }

  function addBookmark(bookmark) {
    if (!installedApps[bookmark.origin]) {
      installedApps[bookmark.origin] = bookmark;
    }
  }

  function deleteBookmark(bookmark) {
    if (installedApps[bookmark.origin]) {
      delete installedApps[bookmark.origin];
    }
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
    getInstalledApplications: getInstalledApplications,
    isReady: isReady,
    addBookmark: addBookmark,
    deleteBookmark: deleteBookmark,
    installBookmark: installBookmark
  };
})();
