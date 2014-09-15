'use strict';
/* global ImportStatusData, LazyLoader, fb, utils, Migrator, fbLoader */
/* exported DeferredActions */

// Methods not related with the list rendering that must be executed after
// render to not damage performance.
var DeferredActions = (function() {
  var config;

  var execute = function execute() {
    config = utils.cookie.load();

    if (!fbLoader.loaded) {
      window.addEventListener('facebookLoaded', doExecute);
      return;
    }

    doExecute();
  };

  var doExecute = function doExecute() {
    window.removeEventListener('facebookLoaded', doExecute);

    checkFacebookSynchronization(config);
    checkVersionMigration(config);
  };

  function checkFacebookSynchronization(config) {
    // Checks if we should set a fb sync alarm when fb sync has been done in ftu
    if (config && config.fbScheduleDone) {
      return;
    }

    LazyLoader.load([
      '/facebook/js/fb_sync.js',
      '/shared/js/contacts/import/import_status_data.js'
    ], performFbSync);
  }

  function performFbSync() {
    var fbutils = fb.utils;

    function neverExecuteAgain() {
      ImportStatusData.remove(fbutils.SCHEDULE_SYNC_KEY);
      utils.cookie.update({fbScheduleDone: true});
      navigator.removeIdleObserver(idleObserver);
      idleObserver = null;
    }

    var idleObserver = {
      time: 3,
      onidle: function onidle() {
        ImportStatusData.get(fbutils.SCHEDULE_SYNC_KEY).then(function(date) {
          if (date) {
            fbutils.setLastUpdate(date, function() {
              var req = fb.sync.scheduleNextSync();
              req.onsuccess = neverExecuteAgain;
              req.onerror = neverExecuteAgain;
            });
          } else {
            neverExecuteAgain();
          }
        });
      }
    };

    navigator.addIdleObserver(idleObserver);
  }

  function checkVersionMigration(config) {
    if (!config || !config.fbMigrated || !config.accessTokenMigrated) {
      LazyLoader.load('js/migrator.js', function() {
        Migrator.start(config);
      });
    }
  }

  return {
    'execute': execute
  };
})();
