'use strict';

require(['config/require'], function() {
  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btsp_debug(msg) {
      console.log('--> [startup_pair]: ' + msg);
    };
  }

  // Bluetooth API version detect
  Debug('config/require loaded..');
  require(['modules/bluetooth/version_detector'], function(versionDetector) {
    var version = versionDetector.getVersion();
    if (version === 1) {
      // load pair manager with version 1
      Debug('Load pair manager with API version 1.');
      require(['modules/pair_manager_v1'], function(PairManager) {
        navigator.mozL10n.once(() => PairManager.init());
      });
    } else if (version === 2) {
      // TODO: Load pair manager with API version 2.
      Debug('Load pair manager with API version 2.');
      require(['modules/pair_manager'], function(PairManager) {
        Debug('Load pair manager with API version 2. Loaded!!');
        navigator.mozL10n.once(() => PairManager.init());
      });
    }
  });
});
