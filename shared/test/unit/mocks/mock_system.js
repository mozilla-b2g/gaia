/* exported MockSystem */
'use strict';
var MockSystem = {
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  slowTransition: false,
  publish: function(eventName, detail) {
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  },
  locked: false,
  runningFTU: false,
  fullscreenMode: true,
  topMostAppWindow: null,
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp'
};
