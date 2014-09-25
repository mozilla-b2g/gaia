/* exported MockSystem */
'use strict';
var MockSystem = {
  mPublishEvents: {},
  mObservers: {},
  addObserver: function(name, context) {
    if (!this.mObservers[name]) {
      this.mObservers[name] = [];
    }
    if (this.mObservers.indexOf(context) < 0) {
      this.mObservers.push(context);
    }
  },
  removeObserver: function(name, context) {
    this.mObservers[name] &&
    this.mObservers[name].splice(this.mObservers.indexOf(context), 1);
  },
  mTeardown: function() {
    this.mObservers = {};
  },
  set: function(notifier) {
  },
  get: function(name) {

  },
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
