'use strict';
/* global HomescreenWindow, BaseModule */
(function() {
  /**
   * HomescreenLauncher is responsible for launching the homescreen window
   * instance and make sure it's a singleton.
   *
   * Every extermal modules should use
   * <code>Service.query('getHomescreen')</code>
   * to access the homescreen window instance.
   *
   * @example
   * var home = Service.query('getHomescreen');
   * home.open(); // Do the open animation.
   *
   * @class HomescreenLauncher
   * @requires HomescreenWindow
   */
  var HomescreenLauncher = function() {
  };

  HomescreenLauncher.EVENTS = [
    'appopening',
    'appopened',
    'keyboardchange',
    'shrinking-start',
    'shrinking-stop',
    'software-button-enabled',
    'software-button-disabled'
  ];

  HomescreenLauncher.SETTINGS = [
    'homescreen.manifestURL'
  ];

  HomescreenLauncher.SERVICES = [
    'launch'
  ];

  /**
   * Fired when homescreen launcher detect 'homescreen.manifestURL' changed
   * @event HomescreenLauncher#homescreen-changed
   */
  /**
   * Fired when homescreen launcher is done retriving 'homescreen.manifestURL'
   * @event HomescreenLauncher#homescreen-ready
   */
  BaseModule.create(HomescreenLauncher, {
    name: 'HomescreenLauncher',

    _currentManifestURL: '',

    EVENT_PREFIX: 'homescreen-',

    _instance: undefined,

    '_observe_homescreen.manifestURL': function(value) {
      var previousManifestURL = this._currentManifestURL;
      this._currentManifestURL = value;
      if (typeof(this._instance) !== 'undefined') {
        if (previousManifestURL !== '' &&
            previousManifestURL !== this._currentManifestURL) {
          this._instance.kill();
          this._instance = new HomescreenWindow(value);
          // Dispatch 'homescreen is changed' event.
          this.publish('changed');
        } else {
          this._instance.ensure();
        }
      }
    },

    /**
     * Stop process
     *
     * @memberOf HomescreenLauncher.prototype
     */
    _stop: function hl_stop() {
      if (typeof(this._instance) !== 'undefined') {
        // XXX: After landing of bug 976986, we should move action of
        // cleaing _instance into a deregister function of
        // onRetrievingHomescreenManifestURL
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=976998
        this._instance.kill();
        this._instance = undefined;
      }
      this._currentManifestURL = '';
    },

    _handle_appopening: function(evt) {
      // Fade out homescreen if the opening app is landscape.
      if (evt.detail.rotatingDegree === 90 ||
          evt.detail.rotatingDegree === 270) {
        this.getHomescreen().fadeOut();
      }
    },

    _handle_appopened: function(evt) {
      this.getHomescreen().fadeOut();
    },

    _handle_keyboardchange: function(evt) {
      // Fade out the homescreen, so that it won't be seen when showing/
      // hiding/switching keyboard.
      this.getHomescreen().fadeOut();
    },

    '_handle_shrinking-start': function(evt) {
      // To hide the homescreen overlay while we set the background behind
      // it due to the shrinking UI.
      this.getHomescreen().hideFadeOverlay();
    },

    '_handle_shrinking-stop': function(evt) {
      // To resume the homescreen after shrinking UI is over.
      this.getHomescreen().showFadeOverlay();
    },

    '_handle_software-button-enabled': function() {
      var homescreen = this.getHomescreen();
      homescreen && homescreen.resize();
    },

    '_handle_software-button-disabled': function() {
      var homescreen = this.getHomescreen();
      homescreen && homescreen.resize();
    },

    /**
     * This service will be requested by Launcher.
     * @param  {String} manifestURL The manifest URL of homescreen
     * @param  {Boolean} openOnStart If this is true,
     *                               we will open the window right away
     */
    launch: function(manifestURL, openOnStart) {
      return new Promise((resolve) => {
        this._currentManifestURL = manifestURL;
        this.getHomescreen();
        this._instance.element.addEventListener('_loaded', function loaded(){
          this._instance.element.removeEventListener('_loaded', loaded);
          resolve();
        }.bind(this));
        openOnStart && this._instance.open();
      });
    },

    /**
     * Get instance of homescreen window singleton
     *
     * @memberOf HomescreenLauncher.prototype
     * @params {Boolean} ensure Ensure the homescreen app is alive.
     * @returns {HomescreenWindow} Instance of homescreen window singleton, or
     *                             null if HomescreenLauncher is not ready
     */
    getHomescreen: function hl_getHomescreen(ensure) {
      if (this._currentManifestURL === '') {
        console.warn('HomescreenLauncher: not ready right now.');
        return null;
      }
      if (typeof this._instance == 'undefined') {
        this._instance = new window.HomescreenWindow(this._currentManifestURL);
        return this._instance;
      } else {
        if (ensure) {
          this._instance.ensure(true);
        }
        return this._instance;
      }
    }
  });
}());
