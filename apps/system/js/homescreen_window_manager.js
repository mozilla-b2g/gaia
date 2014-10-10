/* global homescreenLauncher, Service */

'use strict';
(function(exports) {
  /**
   * HomescreenWindowManager manages the show/hide of HomescreenWindow and
   * HomescreenLauncher instances.
   *
   * @class HomescreenWindowManager
   * @requires HomescreenLauncher
   * @requires Service
   */
  function HomescreenWindowManager() {}

  HomescreenWindowManager.prototype = {
    DEBUG: false,
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
      return homescreenLauncher.ready;
    },

    debug: function hwm_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + Service.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * HomescreenWindowManager starts to listen the event it cares.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    start: function hwm_start() {
      window.addEventListener('appswitching', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('open-app', this);
      window.addEventListener('webapps-launch', this);
    },

    /**
     * HomescreenWindowManager stop to listen the event it cares.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    stop: function hwm_stop() {
      window.removeEventListener('appswitching', this);
      window.removeEventListener('ftuskip', this);
      window.removeEventListener('open-app', this);
      window.removeEventListener('webapps-launch', this);
    },

    handleEvent: function hwm_handleEvent(evt) {
      switch(evt.type) {
        case 'appswitching':
          this.getHomescreen().fadeOut();
          break;
        case 'ftuskip':
          // XXX: There's a race between lockscreenWindow and homescreenWindow.
          // If lockscreenWindow is instantiated before homescreenWindow,
          // we should not display the homescreen here.
          if (Service.locked) {
            this.getHomescreen().setVisible(false);
          }
          break;
        case 'open-app':
        case 'webapps-launch':
          var detail = evt.detail;
          if (detail.manifestURL === homescreenLauncher.manifestURL) {
            this.getHomescreen();
            evt.stopImmediatePropagation();
          }
          break;
      }
    },

    /**
     * getHomescreen returns the homescreen app window based on if it is
     * triggered by home event.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    getHomescreen: function getHomescreen(isHomeEvent) {
      if (!exports.homescreenLauncher || !exports.homescreenLauncher.ready) {
        return null;
      }
      var home  = homescreenLauncher.getHomescreen(true);
      if (isHomeEvent) {
        home.ensure(true);
      }
      return home;
    }
  };

  exports.HomescreenWindowManager = HomescreenWindowManager;
}(window));
