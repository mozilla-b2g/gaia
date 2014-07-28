'use strict';

/* exported navigationStackShim */

/*
 *
 * This file is a shim for the haidified child views, and will be
 * removed once haidification process will be finished. It sends
 * postMessage to the parent window and together with
 * navigation-shim-recever it allows haidified views to use the same
 * navigation module we used before, without a single change.
 *
 */
function navigationStackShim(currentView) {
  return {
    back: function() {
      window.parent.postMessage('back', location.origin);
    },
    home: function() {
      window.parent.postMessage('home', location.origin);
    }
  };
}
