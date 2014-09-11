/* exported MockSystem */
'use strict';
var MockSystem = {
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  currentTime: function() {
    return Date.now();
  },
  slowTransition: false,
  publish: function(eventName, detail) {
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  },
  locked: false,
  runningFTU: false,
  getAPI: function() {
    return null;
  },
  lazyLoad: function() {

  },
  lowerCapital: function(s) {
    return s;
  },
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp'
};
