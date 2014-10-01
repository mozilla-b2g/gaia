/* global homescreenLauncher, System */

'use strict';
(function(exports) {
  /**
   * HomescreenWindowManager manages the show/hide of HomescreenWindow and
   * HomescreenLauncher instances.
   *
   * @module HomescreenWindowManager
   */
  var HomescreenWindowManager = {
    DEBUG: false,
    CLASS_NAME: 'HomescreenWindowManager',

    get ready() {
      return homescreenLauncher.ready;
    },

    debug: function awm_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    getHomescreenAppWindow: function hwm_getHomescreenAppWindow(activeApp) {
      if (!exports.homescreenLauncher || !exports.homescreenLauncher.ready) {
        return null;
      }
      var home = homescreenLauncher.getHomescreen();
      if (!activeApp || activeApp.isHomescreen) {
        home.ensure(true);
      }

      return home;
    },

    setHomescreenVisible: function hwm_setHomescreenVisible(b) {
      homescreenLauncher.getHomescreen().setVisible(b);
    },

    isHomescreen: function hwm_isHomescreen(origin) {
      return origin == homescreenLauncher.origin;
    }
  };

  exports.HomescreenWindowManager = HomescreenWindowManager;
}(window));
