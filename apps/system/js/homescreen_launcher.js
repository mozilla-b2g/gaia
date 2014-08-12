'use strict';
/* global SettingsListener, HomescreenWindow,
          TrustedUIManager, BaseModule, System */
(function(exports) {
  /**
   * HomescreenLauncher is responsible for launching the homescreen window
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
   * @requires HomescreenWindow
   * @requires System
   * @requires BaseModule
   */
  var HomescreenLauncher = function() {
  };

  /**
   * Fired when homescreen launcher detect 'homescreen.manifestURL' changed
   * @event HomescreenLauncher#homescreen-changed
   */
  /**
   * Fired when homescreen launcher is done retriving 'homescreen.manifestURL'
   * @event HomescreenLauncher#homescreen-ready
   */

  HomescreenLauncher.prototype = Object.create(BaseModule.prototype, {
    /**
     * Homescreen launcher is ready or not. Homescreen launcher is ready
     * only when it is done retrieving 'homescreen.manifestURL'
     * from settings DB.
     *
     * @access public
     * @memberOf HomescreenLauncher.prototype
     * @type {boolean}
     */
    ready: {
      configurable: false,
      get: function() { return this._ready; }
    }
  });
  HomescreenLauncher.prototype.constructor = HomescreenLauncher;
  HomescreenLauncher.EVENTS = [
    'appopening',
    'trusteduihide',
    'trusteduishow',
    'applicationready',
    'cardviewbeforeshow',
    'cardviewbeforeclose',
    'shrinking-start',
    'shrinking-stop',
    'software-button-enabled',
    'software-button-disabled'
  ];
  HomescreenLauncher.IMPORTS = [
    'js/homescreen_window.js'
  ];

  var prototype = {
    name: 'HomescreenLauncher',

    _currentManifestURL: '',

    _instance: undefined,

    _ready: false,

    /**
     * Origin of homescreen.
     *
     * @access public
     * @memberOf HomescreenLauncher.prototype
     * @type {string}
     */
    get origin() {
      // We don't really care the origin of homescreen,
      // and it may change when we swap the homescreen app.
      // So we use a fixed string here.
      // XXX: We shall change WindowManager to use manifestURL
      // to identify an app.
      // See http://bugzil.la/913323
      return 'homescreen';
    },

    _fetchSettings: function hl_fetchSettings() {
      var that = this;
      SettingsListener.observe('homescreen.manifestURL', '',
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
              that._instance = new HomescreenWindow(value);
              // Dispatch 'homescreen is changed' event.
              window.dispatchEvent(new CustomEvent('homescreen-changed'));
            } else {
              that._instance.ensure();
            }
          }
          that._ready = true;
          window.dispatchEvent(new CustomEvent('homescreen-ready'));
        });
    },

    /**
     * Start process
     * ![Homescreen launch process](http://i.imgur.com/JZ1ibkc.png)
     *
     * @memberOf HomescreenLauncher.prototype
     */
    _start: function hl_start() {
      if (System && System.applicationReady) {
        this._fetchSettings();
      } else {
        window.addEventListener('applicationready', this);
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
      window.removeEventListener('applicationready', this);
      this._currentManifestURL = '';
    },

    _handle_trusteduishow: function() {
      this.getHomescreen(true).toggle(true);
      this.getHomescreen(true).fadeIn();
    },

    _handle_trusteduihide: function() {
      this.getHomescreen().toggle(false);
    },

    _handle_appopening: function(evt) {
      // Fade out homescreen if the opening app is landscape.
      if (evt.detail.rotatingDegree === 90 ||
          evt.detail.rotatingDegree === 270) {
        this.getHomescreen().fadeOut();
      }
    },

    _handle_appopened: function(evt) {
      // XXX: Remove the dependency in trustedUI rework.
      if (!TrustedUIManager.hasTrustedUI(evt.detail.origin)) {
        this.getHomescreen().fadeOut();
      }
    },

    _handle_keyboardchange: function() {
      this.getHomescreen().fadeOut();
    },

    _handle_cardviewbeforeshow: function() {
      this.getHomescreen().fadeOut();
    },

    _handle_cardviewbeforeclose: function() {
      this.getHomescreen().fadeIn();
    },

    '_handle_shrinking-start': function() {
      this.getHomescreen().hideFadeOverlay();
    },

    '_handle_shrinking-stop': function() {
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
        this._instance = new HomescreenWindow(this._currentManifestURL);
        return this._instance;
      } else {
        if (ensure) {
          this._instance.ensure();
        }
        return this._instance;
      }
    }
  };
  BaseModule.mixin(HomescreenLauncher.prototype, prototype);

  exports.HomescreenLauncher = HomescreenLauncher;
}(window));
