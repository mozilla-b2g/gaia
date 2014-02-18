'use strict';
/* global Applications, SettingsListener, HomescreenWindow */
(function(exports) {
  var currentManifestURL = '';
  var instance;
  var _inited = false;
  var _ready = false;

  /**
   * HomescreenLauncher is responsible to launch the homescreen window
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
   * @module HomescreenLauncher
   */
  var HomescreenLauncher = function() {
    return this;
  };

  HomescreenLauncher.prototype = {
    get ready() {
      return _ready;
    },

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
      SettingsListener.observe('homescreen.manifestURL', '',
        function onRetrievingHomescreenManifestURL(value) {
          var previousManifestURL = currentManifestURL;
          currentManifestURL = value;
          if (typeof(instance) !== 'undefined') {
            if (previousManifestURL !== '' &&
                previousManifestURL !== currentManifestURL) {
              instance.kill();
              instance = new HomescreenWindow(value);
              // Dispatch 'homescreen is changed' event.
              window.dispatchEvent(new CustomEvent('homescreen-changed'));
            } else {
              instance.ensure();
            }
          }
          _ready = true;
          window.dispatchEvent(new CustomEvent('homescreen-ready'));
        });
    },

    _onAppReady: function hl_onAppReady() {
      window.removeEventListener('applicationready', this._onAppReady);
      this._fetchSettings();
    },

    /**
     * Init process
     * ![Homescreen launch process](http://i.imgur.com/JZ1ibkc.png)
     *
     * @memberOf module:HomescreenLauncher
     */
    start: function hl_start() {
      if (_inited) {
        return this;
      }

      _inited = true;
      if (Applications.ready) {
        this._fetchSettings();
      } else {
        window.addEventListener('applicationready',
          this._onAppReady.bind(this));
      }
      window.addEventListener('trusteduishow', this);
      window.addEventListener('trusteduihide', this);
      window.addEventListener('appopening', this);
      return this;
    },

    stop: function hl_stop() {
      if (typeof(instance) !== 'undefined') {
        instance.kill();
        instance = undefined;
      }
      currentManifestURL = '';
      window.removeEventListener('appopening', this);
      window.removeEventListener('trusteduihide', this);
      window.removeEventListener('trusteduishow', this);
      window.removeEventListener('applicationready', this._onAppReady);
      _inited = false;
    },

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
      }
    },

    getHomescreen: function hl_getHomescreen() {
      if (currentManifestURL === '') {
        console.warn('HomescreenLauncher: not ready right now.');
        return null;
      }
      if (typeof instance == 'undefined') {
        instance = new HomescreenWindow(currentManifestURL);
        return instance;
      } else {
        instance.ensure();
        return instance;
      }
    }
  };

  exports.HomescreenLauncher = HomescreenLauncher;
}(window));
