/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

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
    return (uo1.protocol === uo2.protocol &&
            uo1.host === uo2.host &&
            uo1.hostname === uo2.hostname &&
            uo1.port === uo2.port &&
            uo1.pathname === uo2.pathname &&
            /* ignore .search.  Should we also ignore .hash? */
            uo1.hash === uo2.hash);
  },

  installedApps: null,

  loadInstalledApps: function(callback) {
    if (this.installedApps) {
      callback(this.installedApps);
      return;
    }

    this.installedApps = [];

    var self = this;

    var lang = document.mozL10n.language.code;

    navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
      var apps = e.target.result;
      var cache = [];
      apps.forEach(function(app) {
        var manifest = app.manifest;

        if (!manifest) {
          console.warn('malformed manifest for ' + app.origin);
          return;
        }

        // localized manifest?
        if (manifest.locales && manifest.locales[lang]) {
          var loc = manifest.locales[lang];
          for (var k in loc)
            manifest[k] = loc[k];
        }

        var icon = manifest.icons ? app.origin + manifest.icons['120'] : '';

        // Even if the icon is stored by the offline cache, trying to load it
        // will fail because the cache is used only when the application is
        // opened.
        // So when an application is installed its icon is inserted into
        // the offline storage database - and retrieved later when the
        // homescreen is used offline. (TODO)
        // So we try to look inside the database for the icon and if it's
        // empty an icon is loaded by the homescreen - this is the case
        // of pre-installed apps that does not have any icons defined
        // in offline storage.
        if (icon && !window.localStorage.getItem(icon))
          icon = '.' + manifest.icons['120'];

        var orientation = "";
        // We only allow those values for orientation in manifest.
        if (manifest.orientation == "portrait-primary" ||
            manifest.orientation == "portrait-secondary" ||
            manifest.orientation == "landscape-primary" ||
            manifest.orientation == "landscape-secondary") {
          orientation = manifest.orientation;
        }

        var url = app.origin + manifest.launch_path;

        cache.push({
          name: manifest.name,
          url: url,
          icon: icon,
          fullscreen: manifest.fullscreen || false,
          orientation: orientation,
          hackKillMe: manifest.hackKillMe || false
        });
      });

      self.installedApps = cache;
      callback(cache);
    };
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

  // TODO
  // This is currently used in src/b2g/chrome/content/webapi.js file
  // There isn't any reason for any other code to use it, and we should
  // get rid of it when we can.
  // See bug 736628: https://bugzilla.mozilla.org/show_bug.cgi?id=736628
  get foregroundWindow() {
    return WindowManager.getAppFrame(WindowManager.getDisplayedApp());
  }
};
