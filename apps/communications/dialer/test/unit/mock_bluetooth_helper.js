'use strict';

var MockBluetoothHelper = function() {
  return MockBluetoothHelperInstance;
};

var MockBluetoothHelperInstance = {
  profiles: {
    'HFP': 0x111E,
    'A2DP': 0x110D
  },
  answerWaitingCall: function() {},
  ignoreWaitingCall: function() {},
  toggleCalls: function() {},
  getConnectedDevicesByProfile: function() {},
  connectSco: function() {},
  disconnectSco: function() {},
  onhfpstatuschanged: null,
  onscostatuschanged: null
};
