/* exported MockCallButton */

'use strict';

var MockCallButton = {
  init: function(button, phoneNumberGetter) {
    this._phoneNumberGetter = phoneNumberGetter;
  },
  makeCall: function() { }
};
