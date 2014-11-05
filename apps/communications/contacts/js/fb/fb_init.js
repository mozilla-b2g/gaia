'use strict';

/* global utils */

var fb = window.fb || {};
var config = window.config || {};

if (typeof fb.init === 'undefined') {
  (function() {
    var initialized = false;
    var initializing = false;
    var EV_FB_INIT = 'fb_init_initialized';

    fb.isEnabled = false;

    fb.init = function(callback) {
      if (initialized) {
        callback();
        return;
      }

      if (initializing) {
        document.addEventListener(EV_FB_INIT, function handler(e) {
          initializing = false;
          document.removeEventListener(EV_FB_INIT, handler);
          callback();
        });
        return;
      }

      initializing = true;
      utils.config.load('/contacts/config.json').then(
        function cLoaded(configData) {
          if (configData.facebookEnabled === true) {
            fb.isEnabled = true;
          }

          fb.operationsTimeout = config.operationsTimeout =
                                                  configData.operationsTimeout;
          fb.logLevel = configData.logLevel || 'none';
          fb.syncPeriod = configData.facebookSyncPeriod || 24;
          fb.testToken = configData.testToken;

          initialized = true;

          document.dispatchEvent(new CustomEvent(EV_FB_INIT));

          callback();
      }, function loadError(err) {
          console.error('Error while loading config.json', err);
      });
    };
  })();
}
