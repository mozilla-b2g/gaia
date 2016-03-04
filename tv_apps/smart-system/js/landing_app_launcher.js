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

  var proto = LandingAppLauncher.prototype;

  proto._settingsKey = 'landing_app.manifestURL';

  proto.__defineGetter__('hasLandingApp', function lal_hasLandingApp() {
    return !!this._checkManifestURL();
  });

  proto._checkManifestURL = function lal_checkManifestURL(manifestURL) {
    return !!applications.getByManifestURL(manifestURL ||
                                           this._currentManifestURL);
  };

  proto._fetchSettings = function lal_fetchSettings() {
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
            window.dispatchEvent(new CustomEvent('landing-app-changed'));
          } else {
            that._instance.ensure();
          }
        }
        if (!that._checkManifestURL()) {
          console.warn('We enable landing app but without defining it?');
        }
        that._ready = true;
        window.dispatchEvent(new CustomEvent('landing-app-ready'));
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
  proto.getHomescreen = function hl_getAppWindow(ensure) {
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
