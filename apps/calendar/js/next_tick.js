define(function(require, exports, module) {
'use strict';

var NEXT_TICK = 'calendar-next-tick';

var nextTickStack = [];

/**
 * Very similar to node's nextTick.
 * Much faster then setTimeout.
 */
module.exports = function(callback) {
  nextTickStack.push(callback);
  window.postMessage(NEXT_TICK, '*');
};

/**
 * next tick inspired by http://dbaron.org/log/20100309-faster-timeouts.
 */
window.addEventListener('message', (event) => {
  if (event.source === window && event.data === NEXT_TICK) {
    event.stopPropagation();
    if (nextTickStack.length) {
      (nextTickStack.shift())();
    }
  }
});

});
