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
    'getHomescreen'
  ];

  BaseModule.create(HomescreenWindowManager, {
    DEBUG: false,
    name: 'HomescreenWindowManager',

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
     * getHomescreen returns the homescreen app window based and optionally
     * makes sure it's loaded (ensure).
     *
     * @memberOf HomescreenWindowManager.prototype
     */
    getHomescreen: function getHomescreen(ensure) {
      if (!this.homescreenLauncher) {
        return null;
      }
      var home  = this.homescreenLauncher.getHomescreen();
      if (ensure) {
        home.ensure(true);
      }
      return home;
    }
  });
}());
