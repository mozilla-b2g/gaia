'use strict';

/**
 * transitionend is not guaranteed to be async after a layout recalulation.
 * Specifically, a clientHeight read might trigger sync dispatch of
 * transitionend event to listeners, which could end up calling the function
 * that did the clientHeight, but the first call would still be stuck waiting
 * on the clientHeight read to finish. The issue is tracked in bug 1135960. This
 * is a workaround for that, to guarantee async dispatch by using the async
 * nature of promise .then callbacks.
 */
define(function(require, exports, module) {
  return function transitionEnd(node, fn, capturing) {
    function asyncFn(event) {
      Promise.resolve().then(function() {
        fn(event);
      })
      .catch(function(error) {
        console.error(error);
      });
    }
    node.addEventListener('transitionend', asyncFn, capturing);

    // Return the function used with addEventListener to allow the caller of
    // this helper to later call removeEventListener.
    return asyncFn;
  };
});
