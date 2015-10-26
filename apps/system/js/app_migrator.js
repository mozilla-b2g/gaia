'use strict';
/* global Service */

/**
  The app migrator is in charge of migrating app data between releases
 */

(function(exports) {

  const HOMESCREEN_MANIFEST =
    'app://homescreen.gaiamobile.org/manifest.webapp';

  const VERTICALHOME_PREFS_STORE = 'vertical_preferences_store';

  const MIGRATION_PREF = 'migrated';

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

        // Migrate to new home screen if migration hasn't already been
        // performed.
        navigator.getDataStores(VERTICALHOME_PREFS_STORE).then(
          stores => {
            if (stores.length < 1) {
              console.error('Error opening verticalhome prefs datastore');
              return;
            }

            var migrate = () => {
              navigator.mozApps.getSelf().onsuccess = e => {
                var app = e.target.result;
                if (!app) {
                  console.error('Error retrieving app object');
                  return;
                }

                app.connect('verticalhome-migrate').then(ports => {
                  ports.forEach(port => {
                    port.postMessage({ action: 'migrate',
                                       manifestURL: HOMESCREEN_MANIFEST });
                  });
                }, e => {
                  console.error('Error communicating with verticalhome', e);
                });
              };
            };

            stores[0].get(MIGRATION_PREF).then(
              migrated => {
                if (!migrated) {
                  migrate();
                }
              }, e => {
                console.error('Error getting verticalhome migration pref', e);
              });
          });
      }
    }
  };
  exports.AppMigrator = AppMigrator;

})(window);
