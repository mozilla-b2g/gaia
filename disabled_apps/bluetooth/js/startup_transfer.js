'use strict';

require(['config/require'], function() {
  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function btst_debug(msg) {
      console.log('--> [startup_transfer]: ' + msg);
    };
  }

  require(['modules/transfer_manager'], function(TransferManager) {
    debug('Load transfer manager with API version 2. Loaded!!');
    navigator.mozL10n.once(() => TransferManager.init());
  });
});
