'use strict';

var MockTelephonyHelper = {
  number: null,

  call: function call(number) {
    this.number = number;
  }
};
