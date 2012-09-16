var MockKeypadManager = {
  formatPhoneNumber:
    function khm_formatPhoneNumber(mode, ellipsisSide) {
    this.mFormatPhoneNumberCalled = true;
  },
  mFormatPhoneNumberCalled: false,
  mTearDown: function khm_tearDown() {
    this.mFormatPhoneNumberCalled = false;
  }
};
