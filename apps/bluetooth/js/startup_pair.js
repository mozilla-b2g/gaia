/* global console */

'use strict';

require(['config/require'], function() {
  // Bluetooth API version detect
  require(['modules/bluetooth/version_detector'], function(versionDetector) {
    var version = versionDetector.getVersion();
    if (version === 1) {
      // load pair manager with version 1
      require(['modules/pair_manager'], function(PairManager) {
        navigator.mozL10n.once(() => PairManager.init());
      });
    } else if (version === 2) {
      // TODO: Load pair manager with API version 2.
      console.log('[startup_pair]: ' + 
                  'Load pair manager with API version 2.');
    }
  });
});
