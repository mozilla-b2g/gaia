kFontStep = 4;

var MockKeypadManager = {
  phoneNumber: '',
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
  lastCalled: '15555555555',
  updatePhoneNumber: function khm_updatePhoneNumber(number) {
    this._phoneNumber = number;
  },
  makeCall: function makeCall() {
    if (this.mOnMakeCall) {
      if (this._phoneNumber) {
        this.lastCalled = this._phoneNumber;
      }
      this.mOnMakeCall(this._phoneNumber);
    }
  },
  fetchLastCalled: function() {
    this._phoneNumber = this.lastCalled;
  }
};
