/* exported MockAirplaneModeHelper */
'use strict';

var MockAirplaneModeHelper = {
  _enabled: false,
  _status: 'disabled',
  _callbacks: [],
  setEnabled: function(enabled) {
    this._status = enabled ? 'enabled' : 'disabled';
    this._enabled = enabled;
  },
  ready: function(cb) {
    if (cb) {
      cb();
    }
  },
  //  Mock with your own status setting mocks' property _status
  getStatus: function() {
    return this._status;
  },
  addEventListener: function(callback) {
    this._callbacks.push(callback);
  }
};
