var MockKeypadManager = {
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
  }
};
