'use strict';

require(['config/require'], function() {
  // Bluetooth API version detect
  require(['modules/bluetooth/version_detector'], function(versionDetector) {
    var version = versionDetector.getVersion();
    if (version === 1) {
      // load pair manager with version 1
      require(['deviceList'], function() {
        require(['transfer'], function() {
        });
        console.log('[startup_transfer]: ' + 
                    'Load deviceList module completely.');
      });
    } else if (version === 2) {
      // TODO: Load new script for transfer/device with API version 2.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1121909
      console.log('[startup_transfer]: ' + 
                  'Load new script for transfer/device with API version 2.');
    }
  });
});
