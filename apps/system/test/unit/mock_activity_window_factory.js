/* exported MockActivityWindowFactory */

'use strict';

var MockActivityWindowFactory = {
  _lastActivity: null,
  _activeActivity: null,
  _activities: [],
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
