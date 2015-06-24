// used by the pendingManager to notify the views about the sync status (since
// the sync actually happens inside the worker)
define(function(require, exports, module) {
'use strict';

var BridgeListener = require('bridge_listener');

module.exports = new BridgeListener({
  pending: false,
  startEvent: 'syncStart',
  completeEvent: 'syncComplete',
  events: [
    'syncStart',
    'syncComplete',
    'syncOffline',
    'syncError'
  ]
});

});
