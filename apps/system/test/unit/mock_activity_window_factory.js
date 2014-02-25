/* exported MockActivityWindowFactory */

'use strict';

(function(exports) {
  var MockActivityWindowFactory = function() {
    this._lastActivity = null;
    this._activeActivity = null;
    this._activities = [];
    return this;
  };

  MockActivityWindowFactory.prototype = {
    getActiveWindow: function() {
      return this._activeActivity;
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

  exports.MockActivityWindowFactory = MockActivityWindowFactory;
}(window));
