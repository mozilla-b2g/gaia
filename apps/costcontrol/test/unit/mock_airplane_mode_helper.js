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
  addEventListener: function(eventName, callback) {
    this._callbacks.push(callback);
  },
  removeEventListener: function(eventName, callback) {
    var index = this._callbacks.indexOf(callback);
    if (index >= 0) {
      this._callbacks.splice(index, 1);
    }
  },
  triggerEventListeners: function(status) {
    this._status = status;
    this._callbacks.forEach(function(callback) {
      (typeof callback === 'function') && callback(status);
    });
  }
};
