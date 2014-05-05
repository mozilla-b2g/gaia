/* exported MockActivityWindowManager */

'use strict';

(function(exports) {
  var MockActivityWindowManager = function() {
    this._lastActivity = null;
    this._activeActivity = null;
    this._activities = [];
    return this;
  };

  MockActivityWindowManager.prototype = {
    getActiveWindow: function() {
      return this._activeActivity;
    },
    start: function() {
      // not implemented.
    },
    stop: function() {
      // not implemented.
    },
    launchActivity: function() {
      // not implemented.
    },
    handleEvent: function() {
      // not implemented.
    },
    mTeardown: function macwf_mTeardown() {
      this._lastActivity = null;
      this._activeActivity = null;
      this._activities = [];
    }
  };

  exports.MockActivityWindowManager = MockActivityWindowManager;
}(window));
