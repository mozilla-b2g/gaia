'use strict';
/* global ImportStatusData, LazyLoader, fb, utils */

// Methods not related with the list rendering that must be executed after
// render to not damage performance.
(function() {
  var init = function init() {
    checkFacebookSynchronization(utils.cookie.load());
  };

  function checkFacebookSynchronization(config) {
    // Checks if we should set a fb sync alarm when fb sync has been done in ftu
    if (config && config.fbScheduleDone) {
      return;
    }

    LazyLoader.load([
      '/facebook/js/fb_sync.js',
      '/shared/js/contacts/import/import_status_data.js',
      '/shared/js/contacts/import/facebook/fb_utils.js'
    ], function() {
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
    });
  }

  init();
})();
