'use strict';

require(['config/require'], function() {
  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function btsp_debug(msg) {
      console.log('--> [startup_pair]: ' + msg);
    };
  }

  require(['modules/pair_manager'], function(PairManager) {
    debug('Load pair manager with API version 2. Loaded!!');
    navigator.mozL10n.once(() => PairManager.init());
  });
});
