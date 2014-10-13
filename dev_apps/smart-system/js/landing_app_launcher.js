'use strict';
/* global applications, SettingsListener, LandingAppWindow, TrustedUIManager */
(function(exports) {
  /**
   * LandingAppLauncher is responsible for launching the landing app window
   * instance and make sure it's a singleton.
   *
   * Every extermal modules should use
   * <code>window.homescreenLauncher.getHomescreen()</code>
   * to access the homescreen window instance. Since window.homescreenLauncher
   * should be instantiated and started in bootstrap.js
   *
   * @example
   * var home = HomescreenLauncher.getHomescreen();
   * home.open(); // Do the open animation.
   *
   * @class HomescreenLauncher
   * @requires module:TrustedUIManager
   * @requires module:Applications
   * @requires module:SettingsListener
   * @requires LandingAppWindow
   * @requires Applications
   */
  var LandingAppLauncher = function() {
  };

  /**
   * Fired when homescreen launcher detect 'homescreen.manifestURL' changed
   * @event HomescreenLauncher#homescreen-changed
   */
  /**
   * Fired when homescreen launcher is done retriving 'homescreen.manifestURL'
   * @event HomescreenLauncher#homescreen-ready
   */


  LandingAppLauncher.prototype = {
    _settingsKey: 'landing_app.manifestURL',

    _currentManifestURL: '',

    _instance: undefined,

    _started: false,

    _ready: false,

    /**
     * Homescreen launcher is ready or not. Homescreen launcher is ready
     * only when it is done retrieving 'homescreen.manifestURL'
     * from settings DB.
     *
     * @access public
     * @memberOf HomescreenLauncher.prototype
     * @type {boolean}
     */
    get ready() {
      return this._ready;
    },

    get hasLandingApp() {
      return !!this._currentManifestURL;
    },

    /**
     * manifest URL of homescreen.
     *
     * @access public
     * @memberOf HomescreenLauncher.prototype
     * @type {string}
     */
    get manifestURL() {
      return this._currentManifestURL;
    },

    _fetchSettings: function hl_fetchSettings() {
      var that = this;
      SettingsListener.observe(this._settingsKey, '',
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
              window.dispatchEvent(new CustomEvent('homescreen-changed'));
            } else {
              that._instance.ensure();
            }
          }
          if (!that._currentManifestURL) {
            console.warn('We enable landing app but without defining it?');
          }
          that._ready = true;
          window.dispatchEvent(new CustomEvent('landing-app-ready'));
        });
    },

    _onAppReady: function hl_onAppReady() {
      window.removeEventListener('applicationready', this._onAppReady);
      this._fetchSettings();
    },

    /**
     * Start process
     * ![Homescreen launch process](http://i.imgur.com/JZ1ibkc.png)
     *
     * @memberOf HomescreenLauncher.prototype
     */
    start: function hl_start() {
      if (this._started) {
        return;
      }
      this._started = true;
      if (applications.ready) {
        this._fetchSettings();
      } else {
        window.addEventListener('applicationready',
          this._onAppReady.bind(this));
      }
      window.addEventListener('trusteduishow', this);
      window.addEventListener('trusteduihide', this);
      window.addEventListener('appopening', this);
      window.addEventListener('appopened', this);
      window.addEventListener('keyboardchange', this);
      window.addEventListener('software-button-enabled', this);
      window.addEventListener('software-button-disabled', this);
    },

    /**
     * Stop process
     *
     * @memberOf HomescreenLauncher.prototype
     */
    stop: function hl_stop() {
      if (typeof(this._instance) !== 'undefined') {
        // XXX: After landing of bug 976986, we should move action of
        // cleaing _instance into a deregister function of
        // onRetrievingHomescreenManifestURL
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=976998
        this._instance.kill();
        this._instance = undefined;
      }
      this._currentManifestURL = '';
      window.removeEventListener('appopening', this);
      window.removeEventListener('trusteduihide', this);
      window.removeEventListener('trusteduishow', this);
      window.removeEventListener('applicationready', this._onAppReady);
      window.removeEventListener('software-button-enabled', this);
      window.removeEventListener('software-button-disabled', this);
      this._started = false;
    },

    /**
     * General event handler interface.
     *
     * @param  {DOMEvent} evt The event.
     * @type {boolean}
     */
    handleEvent: function hl_handleEvent(evt) {
      switch (evt.type) {
        case 'trusteduishow':
          this.getHomescreen(true).toggle(true);
          this.getHomescreen(true).fadeIn();
          break;
        case 'trusteduihide':
          this.getHomescreen().toggle(false);
          break;
        case 'appopening':
          // Fade out homescreen if the opening app is landscape.
          if (evt.detail.rotatingDegree === 90 ||
              evt.detail.rotatingDegree === 270) {
            this.getHomescreen().fadeOut();
          }
          break;
        case 'appopened':
          // XXX: Remove the dependency in trustedUI rework.
          if (!TrustedUIManager.hasTrustedUI(evt.detail.origin)) {
            this.getHomescreen().fadeOut();
          }
          break;
        case 'keyboardchange':
          // Fade out the homescreen, so that it won't be seen when showing/
          // hiding/switching keyboard.
          this.getHomescreen().fadeOut();
          break;
        case 'software-button-enabled':
        case 'software-button-disabled':
          var homescreen = this.getHomescreen();
          homescreen && homescreen.resize();
          break;
      }
    },

    /**
     * Get instance of homescreen window singleton
     *
     * @memberOf HomescreenLauncher.prototype
     * @params {Boolean} ensure Ensure the homescreen app is alive.
     * @returns {LandingAppWindow} Instance of homescreen window singleton, or
     *                             null if HomescreenLauncher is not ready
     */
    getHomescreen: function hl_getAppWindow(ensure) {
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
    }
  };

  exports.LandingAppLauncher = LandingAppLauncher;
}(window));
