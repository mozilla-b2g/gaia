'use strict';
/* exported MockKeypadManager */

var MockKeypadManager = {
  _phoneNumber: '',
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
  phoneNumber: function phoneNumber() {
    return this._phoneNumber;
  },
  fetchLastCalled: function() {
    this._phoneNumber = this.lastCalled;
  }
};
