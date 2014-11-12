/* global homescreenLauncher, System, LazyLoader, LandingAppLauncher */

'use strict';
(function(exports) {
  /**
   * HomescreenWindowManager manages the show/hide of HomescreenWindow,
   * HomescreenLauncher instances, LandingAppWindow and LandingAppLauncher.
   *
   * @class HomescreenWindowManager
   * @requires HomescreenLauncher
   * @requires LandingAppLauncher
   * @requires System
   */
  function HomescreenWindowManager() {}

  HomescreenWindowManager.prototype = {
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
     * @memberOf HomescreenWindowManager.prototype
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
      this.landingAppLauncher = new LandingAppLauncher();
      this.landingAppLauncher.start();

      window.addEventListener('appswitching', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('open-app', this);
      window.addEventListener('webapps-launch', this);
      window.addEventListener('appopened', this);
      window.addEventListener('activityopened', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('homescreen-ready', this);
      window.addEventListener('landing-app-ready', this);
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
      window.removeEventListener('homescreenopened', this);
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
            this.getHomescreen().setVisible(true);
          }
          break;
        case 'open-app':
        case 'webapps-launch':
          var detail = evt.detail;
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
          if (detail.manifestURL === FtuLauncher.getFtuManifestURL()) {
            // we don't need to set activeHome as anything if it is ftu.
            break;
          } else if (detail.isHomescreen) {
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
          // Landing app is also a homescreen. We need to which one is opened
          // and show/hide the correct homescreen
          if (detail.CLASS_NAME === 'LandingAppWindow') {
            this.setHomescreenVisible(homescreenLauncher, false);
            this.setHomescreenVisible(this.landingAppLauncher, true);
          } else if (this.landingAppLauncher.hasLandingApp) {
            this.setHomescreenVisible(this.landingAppLauncher, false);
            this.setHomescreenVisible(homescreenLauncher, true);
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
        case 'landing-app-ready':
        case 'homescreen-ready':
          if (this.ready) {
            // remove ready listener when we are ready.
            window.removeEventListener('homescreen-ready', this);
            window.removeEventListener('landing-app-ready', this);

            this.publish('homescreenwindowmanager-ready');
            // The first activeHome is landing app.
            this._activeHome = this.landingAppLauncher.hasLandingApp ?
                               this.landingAppLauncher : homescreenLauncher;
            if (this._ftuSkipped && this.landingAppLauncher.hasLandingApp) {
              // If ftu skipped already got, we need to set landing app as
              // visible
              this.setHomescreenVisible(homescreenLauncher, false);
              this.setHomescreenVisible(this.landingAppLauncher, true);
            }
          }
          break;
      }
    },

    setHomescreenVisible: function hwm_hideActiveHome(launcher, visible) {
      launcher.getHomescreen().ensure(true);
      // We need to show/hide fade overlay to have wallpaper shown correctly.
      if (visible) {
        launcher.getHomescreen().showFadeOverlay();
      } else {
        launcher.getHomescreen().hideFadeOverlay();
      }
      launcher.getHomescreen().setVisible(visible);
    },

    publish: function awm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    launchHomescreen: function launchHomescreen(evt, manifestURL) {
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

    handleHomeEvent: function handleHomeEvent() {
      // If press home when one home app active, we need to swap the
      // launcher.
      if (this._activityCount > 0) {
        // If we have activity on top of home, we need to ensure it to close
        // all of them.
        this._activeHome.getHomescreen().ensure(true);
        if (this._activeHome === this.landingAppLauncher) {
          this._activeHome.getHomescreen().setVisible(false);
          this._activeHome.getHomescreen().close('immediate');
          this._activeHome = homescreenLauncher;
        }
        this._activityCount = 0;
      } else {
        this._activeHome.getHomescreen().setVisible(false);
        this._activeHome.getHomescreen().close('immediate');
        // If we have activity on top of home, we always normal home
        this._activeHome = this._activeHome === this.landingAppLauncher ?
                           homescreenLauncher : this.landingAppLauncher;
      }
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
          this.handleHomeEvent();
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

  exports.HomescreenWindowManager = HomescreenWindowManager;
}(window));
