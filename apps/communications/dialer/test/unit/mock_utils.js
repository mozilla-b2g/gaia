var MockUtils = {
  mCalledPrettyDate: false,
  mCalledHeaderDate: false,
  mCalledGetDayDate: false,
  mCalledGetPhoneNumberPrimaryInfo: false,
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

  getPhoneNumberPrimaryInfo: function getPhoneNumberPrimaryInfo(matchingTel,
    contact) {
    this.mCalledGetPhoneNumberPrimaryInfo = true;
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
    this.mCalledGetPhoneNumberPrimaryInfo = false;
    this.mCalledGetPhoneNumberAdditionalInfo = false;
  },

  getPhoneNumberPrimaryInfo: function ut_getPhoneNumberPrimaryInfo(matchingTel,
    contact) {
    this.mCalledGetPhoneNumberPrimaryInfo = true;
    if (contact) {
      if (contact.name && String(contact.name) !== '') {
        return contact.name;
      } else if (contact.org && String(contact.org) !== '') {
        return contact.org;
      }
    }
    if (matchingTel) {
      return matchingTel.value;
    }
    return null;
  }
};

