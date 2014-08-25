/* exported MockAirplaneMode */
'use strict';

var MockAirplaneMode = {
  _enabled: undefined,
  get enabled() {
    return this._enabled;
  },
  set enabled(v) {
    this._enabled = v;
    return v;
  }
};
