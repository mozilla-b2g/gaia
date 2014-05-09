'use strict';

/* exported MockKeypadManager */

var MockKeypadManager = {
  maxFontSize: 12,
  minFontSize: 8,
  mGetMaxFontSizeCalled: false,
  getMaxFontSize: function khm_getMaxFontSize(isCallWaiting) {
    this.mGetMaxFontSizeCalled = true;
  },
  mGetMinFontSizeCalled: false,
  getMinFontSize: function khm_getMinFontSize(isCallWaiting) {
    this.mGetMinFontSizeCalled = true;
  },
  formatPhoneNumber:
    function khm_formatPhoneNumber(ellipsisSide) {
    this.mFormatPhoneNumberCalled = true;
  },
  mFormatPhoneNumberCalled: false,
  updateAdditionalContactInfo:
    function khm_updateAdditionalContactInfo(ellipsisSide, maxFontSize) {
    this.mUpdateAdditionalContactInfo = true;
  },
  mUpdateAdditionalContactInfo: false,
  mTearDown: function khm_tearDown() {
    this.mFormatPhoneNumberCalled = false;
    this.mUpdateAdditionalContactInfo = false;
  },

  mOnMakeCall: null,
  updatePhoneNumber: function khm_updatePhoneNumber(number) {
    this._phoneNumber = number;
  },
  makeCall: function makeCall() {
    if (this.mOnMakeCall) {
      this.mOnMakeCall(this._phoneNumber);
    }
  }
};
