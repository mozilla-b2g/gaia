var MockKeypadManager = {
  formatPhoneNumber:
    function khm_formatPhoneNumber(ellipsisSide) {
    this.mFormatPhoneNumberCalled = true;
  },
  mFormatPhoneNumberCalled: false,
  mTearDown: function khm_tearDown() {
    this.mFormatPhoneNumberCalled = false;
  }
};
