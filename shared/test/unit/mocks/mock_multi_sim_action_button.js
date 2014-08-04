/* exported MockMultiSimActionButton */

'use strict';

var MockMultiSimActionButtonSingleton = {
  mIsInitialized: false,
  performAction: function() {

  },
  _phoneNumberGetter: null,
  _click: function() {}
};

var MockMultiSimActionButton =
  function(button, callCallback, settings, phoneNumberGetter) {
  MockMultiSimActionButtonSingleton.mIsInitialized = true;
  MockMultiSimActionButtonSingleton._phoneNumberGetter = phoneNumberGetter;
  button.addEventListener('click', MockMultiSimActionButtonSingleton._click);

  return MockMultiSimActionButtonSingleton;
};

