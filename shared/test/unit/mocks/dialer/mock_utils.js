'use strict';
/* exported MockUtils */

var MockUtils = {
  mCalledPrettyDate: false,
  mCalledSetHeaderDate: false,
  mCalledGetDayDate: false,
  mCalledGetPhoneNumberPrimaryInfo: false,
  mCalledGetPhoneNumberAdditionalInfo: false,

  prettyDate: function ut_prettyDate(time) {
    this.mCalledPrettyDate = true;
  },

  setHeaderDate: function ut_headerDate(elem, time) {
    this.mCalledSetHeaderDate = true;
    elem.textContent = time;
  },

  getDayDate: function re_getDayDate(timestamp) {
    this.mCalledGetDayDate = true;
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },

  getPhoneNumberAdditionalInfo:
  function getPhoneNumberAdditionalInfo(matchingTel) {
    return {
      id: matchingTel.type,
      args: {
        carrier: matchingTel.carrier
      }
    };
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

  prettyDuration: function(node, duration, l10nPrefix) {},
  isPhoneType: function(type) {}
};

