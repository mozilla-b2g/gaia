var MockUtils = {
  mCalledPrettyDate: false,
  mCalledHeaderDate: false,
  mCalledGetDayDate: false,
  mCalledGetPhoneNumberAdditionalInfo: false,

  prettyDate: function ut_prettyDate(time) {
    this.mCalledPrettyDate = true;
  },

  headerDate: function ut_headerDate(time) {
    this.mCalledHeaderDate = true;
  },

  getDayDate: function re_getDayDate(timestamp) {
    this.mCalledGetDayDate = true;
  },

  getPhoneNumberAdditionalInfo: function getPhoneNumberAdditionalInfo(
    phoneNumber, associatedContact) {
    this.mCalledGetPhoneNumberAdditionalInfo = true;

    return phoneNumber % 2 == 0 ? phoneNumber : undefined;
  },

  mTearDown: function tearDown() {
    this.mCalledPrettyDate = false;
    this.mCalledHeaderDate = false;
    this.mCalledGetDayDate = false;
    this.mCalledGetPhoneNumberAdditionalInfo = false;
  }
};
