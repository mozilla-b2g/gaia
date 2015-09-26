define(function(require, exports, module) {
'use strict';

var BridgeListener = require('bridge_listener');

module.exports = new BridgeListener({
  pending: false,
  startEvent: 'expandStart',
  completeEvent: 'expandComplete',
  events: [
    'expandStart',
    'expandComplete'
  ]
});

});
