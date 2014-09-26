'use strict';
/* exported MockUtils */

var MockUtils = {
  mCalledPrettyDate: false,
  mCalledHeaderDate: false,
  mCalledGetDayDate: false,
  mCalledGetPhoneNumberPrimaryInfo: false,
  mCalledGetPhoneNumberAdditionalInfo: false,
  mCalledGetPhoneNumberAndType: false,

  prettyDate: function ut_prettyDate(time) {
    this.mCalledPrettyDate = true;
  },

  headerDate: function ut_headerDate(time) {
    this.mCalledHeaderDate = true;
  },

  getDayDate: function re_getDayDate(timestamp) {
    this.mCalledGetDayDate = true;
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },

  getPhoneNumberAdditionalInfo: function getPhoneNumberAdditionalInfo(
                                                                matchingTel) {
    this.mCalledGetPhoneNumberAdditionalInfo = true;
    var result = matchingTel.type;
    var carrier = matchingTel.carrier;
    if (carrier) {
      result += ', ' + carrier;
    }
    return result;
  },

  addEllipsis: function ut_addEllipsis() {},

  getNextFontSize: function ut_getNextFontSize(view, fakeView, maxFontSize,
    minFontSize, fontStep) {
    return maxFontSize;
  },

  mTearDown: function tearDown() {
    this.mCalledPrettyDate = false;
    this.mCalledHeaderDate = false;
    this.mCalledGetDayDate = false;
    this.mCalledGetPhoneNumberPrimaryInfo = false;
    this.mCalledGetPhoneNumberAdditionalInfo = false;
    this.mCalledGetPhoneNumberAndType = false;
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
  },

  getPhoneNumberAndType: function ut_getPhoneNumberAndType(matchingTel) {
    this.mCalledGetPhoneNumberAndType = true;
    return matchingTel.type + ', ' + matchingTel.value;
  },

  prettyDuration: function(node, duration, l10nPrefix) {}
};

