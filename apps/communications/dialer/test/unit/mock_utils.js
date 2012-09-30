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
    matchingTel, associatedContact) {
    this.mCalledGetPhoneNumberAdditionalInfo = true;

    return matchingTel.value % 2 == 0 ? matchingTel.value : undefined;
  },

  mTearDown: function tearDown() {
    this.mCalledPrettyDate = false;
    this.mCalledHeaderDate = false;
    this.mCalledGetDayDate = false;
    this.mCalledGetPhoneNumberAdditionalInfo = false;
  }
};

