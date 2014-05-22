/* exported MockSystem */
'use strict';
var MockSystem = {
  locked: false,
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  slowTransition: false,
  publish: function(eventName, detail) {
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  }
};
