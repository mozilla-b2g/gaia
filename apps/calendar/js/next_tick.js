(function(exports) {
'use strict';

/**
 * Constants
 */
var NEXT_TICK = 'calendar-next-tick';

/**
 * Private state
 */
var nextTickStack = [];

/**
 * Very similar to node's nextTick.
 * Much faster then setTimeout.
 */
exports.nextTick = function(callback) {
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

}(Calendar));
