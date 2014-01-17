/* exported MockAirplaneModeHelper */
'use strict';

var MockAirplaneModeHelper = {
  _enabled: false,
  _status: 'disabled',
  _callbacks: [],
  setEnabled: function(enabled) {
    if (enabled) {
      this._status = 'enabled';
    }
    else {
      this._status = 'disabled';
    }
    this._enabled = enabled;
  },
  // mock with your own status
  getStatus: function() {
    return this._status;
  },
  addEventListener: function(callback) {
    this._callbacks.push(callback);
  }
};
