'use strict';
/* global VersionHelper, LazyLoader, BrowserMigrator */

/**
  The app migrator is in charge of migrating app data between releases
 */

(function(exports) {

  var AppMigrator = function AppMigrator() {
  };

  AppMigrator.prototype = {

    start: function() {
      // Probably should not happen, but just to be safe we early exit in case
      // we get a second migrate message.
      if (this.migrating) {
        return;
      }

      var self = this;
      VersionHelper.getVersionInfo().then(function(versionInfo) {
        if (versionInfo.isUpgrade()) {
          LazyLoader.load('js/migrators/browser_migrator.js',
                          (function loaded() {
                            var bm = new BrowserMigrator();
                            bm.runMigration();
                          }));
          self.migrating = true;
        }
      });
    }
  };
  exports.AppMigrator = AppMigrator;

})(window);