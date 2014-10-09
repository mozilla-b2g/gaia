/* exported MockSystem */
'use strict';
var MockSystem = {
  lowerCapital: function() {
    return 'a';
  },
  lazyLoad: function() {},
  register: function() {},
  unregister: function() {},
  request: function() {},
  query: function() {},
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  currentTime: function() {},
  slowTransition: false,
  publish: function(eventName, detail) {
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  },
  locked: false,
  runningFTU: false,
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp'
};
