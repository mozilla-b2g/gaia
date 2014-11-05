/* exported MockBluetoothHelper, MockBluetoothHelperInstance */

'use strict';

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
  getPairedDevices: function() {},
  getAddress: function() {},
  setPairingConfirmation: function() {},
  setPinCode: function() {},
  setPasskey: function() {},
  onhfpstatuschanged: null,
  onscostatuschanged: null,
  onpairedstatuschanged: null
};

var MockBluetoothHelper = function() {
  return MockBluetoothHelperInstance;
};
