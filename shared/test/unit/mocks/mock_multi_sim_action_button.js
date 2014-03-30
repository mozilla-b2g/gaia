/* exported MockMultiSimActionButton */

'use strict';

var MockMultiSimActionButtonSingleton = {
  mIsInitialized: false,
  performAction: function() {

  },
  _phoneNumberGetter: null
};

var MockMultiSimActionButton =
  function(button, callCallback, settings, phoneNumberGetter) {
  MockMultiSimActionButtonSingleton.mIsInitialized = true;
  MockMultiSimActionButtonSingleton._phoneNumberGetter = phoneNumberGetter;

  return MockMultiSimActionButtonSingleton;
};

