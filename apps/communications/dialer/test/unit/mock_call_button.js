/* exported MockCallButton */

'use strict';

var MockCallButtonSingleton = {
  mIsInitialized: false,
  makeCall: function() {

  },
  _phoneNumberGetter: null
};

var MockCallButton = function(button, phoneNumberGetter,
 callCallback, settings) {
  MockCallButtonSingleton.mIsInitialized = true;
  MockCallButtonSingleton._phoneNumberGetter = phoneNumberGetter;

  return MockCallButtonSingleton;
};

