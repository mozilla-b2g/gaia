/* global homescreenLauncher, System, LazyLoader, LandingAppLauncher */

'use strict';
(function(exports) {
  const LANDING_APP_WINDOW_URL = '/js/landing_app_window.js';
  const LANDING_APP_LAUNCHER_URL = '/js/landing_app_launcher.js';

  /**
   * TVHomescreenWindowManager manages the show/hide of HomescreenWindow and
   * HomescreenLauncher instances.
   *
   * @class TVHomescreenWindowManager
   * @requires HomescreenLauncher
   * @requires System
   */
  function TVHomescreenWindowManager() {}

  TVHomescreenWindowManager.prototype = {
    DEBUG: false,
    _ftuDone: false,
    _activityCount: 0,
    CLASS_NAME: 'HomescreenWindowManager',

    /**
     * Homescreen Window Manager depends on the ready state of homescreen
     * launcher. It is ready only when all of the homescreen launchers are
     * ready.
     *
     * @access public
     * @memberOf TVHomescreenWindowManager.prototype
     * @type {boolean}
     */
    get ready() {
      return homescreenLauncher.ready && this.landingAppLauncher &&
             this.landingAppLauncher.ready;
    },

    debug: function hwm_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * HomescreenWindowManager starts to listen the event it cares.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    start: function hwm_start() {
      var self = this;
      LazyLoader.load([LANDING_APP_WINDOW_URL, LANDING_APP_LAUNCHER_URL],
        function() {
          console.log('trying to start landingAppLauncher');
          self.landingAppLauncher = new window.LandingAppLauncher();
          self.landingAppLauncher.start();
          self._activeHome = self.landingAppLauncher;
          if (self._ftuSkipped) {
            self.landingAppLauncher.getHomescreen().setVisible(true);
          }
        });
      window.addEventListener('appswitching', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('open-app', this);
      window.addEventListener('webapps-launch', this);
      window.addEventListener('appopened', this);
      window.addEventListener('activityopened', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('landingappopened', this);
    },

    /**
     * HomescreenWindowManager stop to listen the event it cares.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    stop: function hwm_stop() {
      this.landingAppLauncher.stop();
      window.removeEventListener('appswitching', this);
      window.removeEventListener('ftuskip', this);
      window.removeEventListener('open-app', this);
      window.removeEventListener('webapps-launch', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('activityopened', this);
    },

    handleEvent: function hwm_handleEvent(evt) {
      switch(evt.type) {
        case 'appswitching':
          this.getHomescreen().showFadeOverlay();
          this.getHomescreen().fadeOut();
          break;
        case 'ftuskip':
          this._ftuSkipped = true;
          if (this.ready) {
            this.getHomescreen().setVisible(!System.locked);
          }
          break;
        case 'open-app':
        case 'webapps-launch':
          var detail = evt.detail;
          console.log('trying to ' + evt.type + ': ' + detail.manifestURL);
          if (detail.manifestURL === homescreenLauncher.manifestURL ||
              detail.manifestURL === this.landingAppLauncher.manifestURL) {
            this.launchHomescreen(evt, detail.manifestURL);
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            evt.preventDefault();
          }
          break;
        case 'appopened':
          var detail = evt.detail;
          if (detail.isHomescreen) {
            this._activeHome = ('LandingAppWindow' === detail.CLASS_NAME) ?
                                 this.landingAppLauncher : homescreenLauncher;
          } else {
            // If we don't have _activeHome that means ftu is opened, we need to
            // make sure landing app is the one after ftu.
            if (this._activeHome) {
              this._activeHome.getHomescreen().ensure(true);
              this._activeHome.getHomescreen().setVisible(false);
              this._activeHome.getHomescreen().close('immediate');
              this._activeHome = null;
            }
          }
          break;
        case 'homescreenopened':
          var detail = evt.detail;
          if (detail.CLASS_NAME === 'LandingAppWindow') {
            homescreenLauncher.getHomescreen().ensure(true);
            homescreenLauncher.getHomescreen().showFadeOverlay();
          } else {
            this.landingAppLauncher.getHomescreen().ensure(true);
            this.landingAppLauncher.getHomescreen().hideFadeOverlay();
          }
          break;
        case 'activityopened':
          if (this._activeHome) {
            this._activityCount++;
          }
          break;
        case 'activityclosed':
          if (this._activeHome) {
            this._activityCount--;
          }
          break;
      }
    },

    publish: function awm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    launchHomescreen: function launchHomescreen(evt, manifestURL) {
      console.log('trying to launch home: ' + manifestURL);
      if (!this.landingAppLauncher.hasLandingApp) {
        // cal getHomescreen to ensure it.
        this.getHomescreen();
        return;
      }

      if (this._activeHome) {
        if (this._activeHome.manifestURL !== manifestURL) {
          // in homeA trying to switch to homeB
          
          this.publish('home');
        } else {
          // cal getHomescreen to ensure it.
          this.getHomescreen();
        }
      } else if (homescreenLauncher.manifestURL === manifestURL) {
        // in appX trying to switch to home
        this.publish('home');
      }
      // We don't support appX trying to switch to landing app
    },

    /**
     * getHomescreen returns the homescreen app window based on if it is
     * triggered by home event.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    getHomescreen: function getHomescreen(isHomeEvent) {
      if (!exports.homescreenLauncher || !exports.homescreenLauncher.ready ||
          !this.landingAppLauncher || !this.landingAppLauncher.ready) {
        return null;
      }

      if (this.landingAppLauncher.hasLandingApp) {

        // use landing app launcher as first home launcher
        if (!this._activeHome) {
          // If this._activeHome is null, the active app is normal app. We need
          // to show normal homescreen app.
          this._activeHome = homescreenLauncher;
        } else if (isHomeEvent) {
          // If press home when one home app active, we need to swap the
          // launcher.
          if (this._activityCount > 0) {
            // If we have activity on top of home, we need to ensure it to close
            // all of them.
            this._activeHome.getHomescreen().ensure(true);
          }
          this._activeHome.getHomescreen().setVisible(false);
          this._activeHome.getHomescreen().close('immediate');
          // If we have activity on top of home, we always normal home
          this._activeHome = this._activityCount > 0 || 
                             this._activeHome === this.landingAppLauncher ?
                                   homescreenLauncher : this.landingAppLauncher;
          this._activityCount = 0;
        }
      } else if (!this._activeHome) {
        // If we don't have landing app, we need to initialize active home as
        // homescreen launcher.
        this._activeHome = homescreenLauncher;
      }

      var home  = this._activeHome.getHomescreen(true);
      if (isHomeEvent) {
        home.ensure(true);
      }
      return home;
    }
  };

  exports.HomescreenWindowManager = TVHomescreenWindowManager;
}(window));
