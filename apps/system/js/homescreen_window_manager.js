/* global BaseModule */

'use strict';
(function(exports) {
  /**
   * HomescreenWindowManager manages the show/hide of HomescreenWindow and
   * HomescreenLauncher instances.
   *
   * @class HomescreenWindowManager
   * @requires BaseModule
   */
  function HomescreenWindowManager() {}
  HomescreenWindowManager.EVENTS = [
    'appswitching',
    'open-app',
    'webapps-launch'
  ];
  HomescreenWindowManager.SUB_MODULES = [
    'HomescreenLauncher'
  ];
  HomescreenWindowManager.STATES = [
    'ready',
    'getHomescreen'
  ];

  BaseModule.create(HomescreenWindowManager, {
    DEBUG: false,
    name: 'HomescreenWindowManager',

    /**
     * Homescreen Window Manager depends on the ready state of homescreen
     * launcher. It is ready only when all of the homescreen launchers are
     * ready.
     *
     * @access public
     * @memberOf HomescreenWindowManager.prototype
     * @type {boolean}
     */
    ready: function() {
      return this.homescreenLauncher && this.homescreenLauncher.ready;
    },

    _handle_appswitching: function() {
      this.getHomescreen().fadeOut();
    },

    '_handle_open-app': function(evt) {
      this._handle_launch_homescreen(evt);
    },
    '_handle_webapps-launch': function(evt) {
      this._handle_launch_homescreen(evt);
    },
    _handle_launch_homescreen: function(evt) {
      var detail = evt.detail;
      if (this.homescreenLauncher &&
          detail.manifestURL === this.homescreenLauncher.manifestURL) {
        this.getHomescreen();
        evt.stopImmediatePropagation();
      }
    },

    /**
     * getHomescreen returns the homescreen app window based on if it is
     * triggered by home event.
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    getHomescreen: function getHomescreen(isHomeEvent) {
      if (!this.homescreenLauncher) {
        return null;
      }
      var home  = this.homescreenLauncher.getHomescreen(true);
      if (isHomeEvent) {
        home.ensure(true);
      }
      return home;
    }
  });
}());
