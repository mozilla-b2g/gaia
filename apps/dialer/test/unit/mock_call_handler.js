/* exported MockCallHandler */

'use strict';

var MockCallHandler = {
  _lastCall: null,

  init: function() {},
  call: function call(number) {
    this._lastCall = number;
  }
};
