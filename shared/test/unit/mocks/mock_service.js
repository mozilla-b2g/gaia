/* exported MockService */
'use strict';
var MockService = {
  mTeardown: function() {
    this.mQueries = {};
  },
  lowerCapital: function() {
    return 'a';
  },
  lazyLoad: function() {},
  register: function() {},
  unregister: function() {},
  registerState: function() {},
  unregisterState: function() {},
  request: function() {
    return new Promise(function() {});
  },
  query: function(name) {
    return this.mQueries ? this.mQueries[name] : undefined;
  },
  mPublishEvents: {},
  currentTime: function() {},
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
  mockQueryWith: function(name, value) {
    if (!this.mQueries) {
      this.mQueries = {};
    }
    if (arguments.length === 1) {
      return this.mQueries[name];
    } else {
      this.mQueries[name] = value;
    }
  }
};
