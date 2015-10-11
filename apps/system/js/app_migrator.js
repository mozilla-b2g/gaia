'use strict';
/* global Service */

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
      if (Service.query('justUpgraded')) {
        self.migrating = true;
      }
    }
  };
  exports.AppMigrator = AppMigrator;

})(window);
