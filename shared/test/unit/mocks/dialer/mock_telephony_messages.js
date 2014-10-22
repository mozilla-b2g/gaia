console.time("mock_telephony_messages.js");
'use strict';

/* exported MockTelephonyMessages */

var MockTelephonyMessages = {
  REGULAR_CALL: 0,
  NO_NETWORK: 1,
  EMERGENCY_ONLY: 2,

  displayMessage: function() {},
  handleError: function() {},
  notifyBusyLine: function() {}
};
console.timeEnd("mock_telephony_messages.js");
