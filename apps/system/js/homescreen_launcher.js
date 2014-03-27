'use strict';
/* global Applications, SettingsListener, HomescreenWindow, TrustedUIManager */
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
   * @requires Applications
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

  HomescreenLauncher.prototype = {
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
        return this;
      }

      this._started = true;
      if (Applications.ready) {
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
      window.addEventListener('cardviewbeforeshow', this);
      window.addEventListener('cardviewbeforeclose', this);
      return this;
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
      window.removeEventListener('cardviewbeforeshow', this);
      window.removeEventListener('cardviewbeforeclose', this);
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
          this.getHomescreen().toggle(true);
          this.getHomescreen().fadeIn();
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
        case 'cardviewbeforeshow':
          // Fade out the homescreen before showing the cards view to avoid
          // having it bleed through during the transition animation.
          this.getHomescreen().fadeOut();
          break;
        case 'cardviewbeforeclose':
          // Fade homescreen back in before the cards view closes.
          this.getHomescreen().fadeIn();
          break;
      }
    },

    /**
     * Get instance of homescreen window singleton
     *
     * @memberOf HomescreenLauncher.prototype
     * @returns {HomescreenWindow} Instance of homescreen window singleton, or
     *                             null if HomescreenLauncher is not ready
     */
    getHomescreen: function hl_getHomescreen() {
      if (this._currentManifestURL === '') {
        console.warn('HomescreenLauncher: not ready right now.');
        return null;
      }
      if (typeof this._instance == 'undefined') {
        this._instance = new HomescreenWindow(this._currentManifestURL);
        return this._instance;
      } else {
        this._instance.ensure();
        return this._instance;
      }
    }
  };

  exports.HomescreenLauncher = HomescreenLauncher;
}(window));
