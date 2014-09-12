'use strict';

/* global fb, utils, LazyLoader, DatastoreMigration, ImportStatusData*/
/* exported Migrator */

var Migrator = (function(){
  var start = function start(config) {
    if (!config || !config.fbMigrated) {
      migrateFbContacts();
    }

    if (!config || !config.accessTokenMigrated) {
      migrateFbToken();
    }
  };

  function migrateFbContacts() {
    LazyLoader.load('js/fb/datastore_migrator.js', function() {
      new DatastoreMigration().start();
    });
  }

  function migrateFbToken() {
    LazyLoader.load([
      '/shared/js/contacts/import/import_status_data.js',
    ], function() {
      var STORAGE_KEY = fb.utils.TOKEN_DATA_KEY;

      ImportStatusData.get(STORAGE_KEY).then(function(datastoreToken) {
        if (!datastoreToken) {
          utils.cookie.update({accessTokenMigrated: true});
          window.asyncStorage.getItem(STORAGE_KEY, function(asyncstorageToken) {
            if (asyncstorageToken) {
              ImportStatusData.put(STORAGE_KEY, asyncstorageToken).then(
                  function() {
                window.asyncStorage.removeItem(STORAGE_KEY);
              });
            }
          });
        }
      });

    });
  }

  return {
    start: start
  };
})();
