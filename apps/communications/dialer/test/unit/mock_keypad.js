kFontStep = 4;

var MockKeypadManager = {
  maxFontSize: 12,
  minFontSize: 8,
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
