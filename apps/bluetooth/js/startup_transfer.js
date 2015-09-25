'use strict';

require(['config/require'], function() {
  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function btst_debug(msg) {
      console.log('--> [startup_transfer]: ' + msg);
    };
  }

  // Bluetooth API version detect
  require(['modules/bluetooth/version_detector'], function(versionDetector) {
    var version = versionDetector.getVersion();
    if (version === 1) {
      // load pair manager with version 1
      require(['deviceList'], function() {
        require(['transfer'], function() {
        });
        debug('Load deviceList module completely.');
      });
    } else if (version === 2) {
      debug('Load script for share activity with API version 2.');
      require(['modules/transfer_manager'], function(TransferManager) {
        debug('Load transfer manager with API version 2. Loaded!!');
        navigator.mozL10n.once(() => TransferManager.init());
      });
    }
  });
});
