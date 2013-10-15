'use strict';

var MockBluetoothHelper = function() {
  return MockBluetoothHelperInstance;
};

var MockBluetoothHelperInstance = {
  answerWaitingCall: function() {},
  ignoreWaitingCall: function() {},
  toggleCalls: function() {},
  onscostatuschanged: null
};
