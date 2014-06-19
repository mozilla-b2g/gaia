'use strict';

(function(exports) {

  var MockMetrics = {
    mApps: {},
    appOpening: function(url) {
      this.mApps[url] = 'opening';
    },
    appClosing: function(url) {
      this.mApps[url] = 'closing';
    },
    appCrashing: function(url) {
      this.mApps[url] = 'crashing';
    },
    appUninstalled: function(url) {
      this.mApps[url] = 'uninstalled';
    },

    mTeardown: function() {
      this.mApps = {};
    }
  };

  exports.MockMetrics = MockMetrics;
}(window));
