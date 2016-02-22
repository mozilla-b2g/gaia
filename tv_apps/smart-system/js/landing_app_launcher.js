'use strict';
/* global applications, SettingsCache, LandingAppWindow,
          HomescreenLauncher */
(function(exports) {
  /**
   * LandingAppLauncher is responsible for launching the landing app window
   * instance and make sure it's a singleton.
   *
   * @class LandingAppLauncher
   * @requires HomescreenLauncher
   * @requires LandingAppWindow
   */
  var LandingAppLauncher = function() {
  };

  LandingAppLauncher.prototype = Object.create(HomescreenLauncher.prototype);
  LandingAppLauncher.prototype.contructor = LandingAppLauncher;
  LandingAppLauncher.prototype.name = 'LandingAppLauncher';
  LandingAppLauncher.prototype.EVENT_PREFIX = 'landing-app-';

  LandingAppLauncher.prototype._settingsKey = 'landing_app.manifestURL';

  Object.defineProperty(LandingAppLauncher, 'hasLandingApp', {
    get: function lal_hasLandingApp() {
      return !!this._checkManifestURL();
    }
  });

  LandingAppLauncher.prototype._checkManifestURL = function(manifestURL) {
    return !!applications.getByManifestURL(manifestURL ||
                                           this._currentManifestURL);
  };

  LandingAppLauncher.prototype._fetchSettings = function lal_fetchSettings() {
    var that = this;
    SettingsCache.observe(this._settingsKey, '',
      // XXX: After landing of bug 976986, we should write a deregister
      // function of onRetrievingHomescreenManifestURL
      // see https://bugzilla.mozilla.org/show_bug.cgi?id=976998
      function onRetrievingHomescreenManifestURL(value) {
        var previousManifestURL = that._currentManifestURL;
        that._currentManifestURL = value;

        if (typeof(that._instance) !== 'undefined') {
          if (previousManifestURL !== '' &&
              previousManifestURL !== that._currentManifestURL) {
            that._instance.kill();
            that._instance = new LandingAppWindow(value);
            // Dispatch 'homescreen is changed' event.
            // Landing app is a kind of homescreen, we use homescreen-changed
            // event to notify app_window_manager to reload homescreen.
            that.publish('changed');
          } else {
            that._instance.ensure();
          }
        }
        if (!that._checkManifestURL()) {
          console.warn('We enable landing app but without defining it?');
        }
        that._ready = true;
        that.publish('ready');
      });
  };

  /**
   * Get instance of homescreen window singleton
   *
   * @memberOf LandingAppLauncher.prototype
   * @params {Boolean} ensure Ensure the homescreen app is alive.
   * @returns {LandingAppWindow} Instance of homescreen window singleton, or
   *                             null if LandingAppLauncher is not ready
   */
  LandingAppLauncher.prototype.getHomescreen = function(ensure) {
    if (!this.hasLandingApp) {
      console.warn('LandingAppLauncher: do not have a landing app.');
      return null;
    }
    if (typeof this._instance == 'undefined') {
      this._instance = new LandingAppWindow(this._currentManifestURL);
      return this._instance;
    } else {
      if (ensure) {
        this._instance.ensure();
      }
      return this._instance;
    }
  };

  exports.LandingAppLauncher = LandingAppLauncher;
}(window));
