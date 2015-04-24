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
  isScoConnected: function() {},
  sendMediaMetaData: function() {},
  sendMediaPlayStatus: function() {},
  onhfpstatuschanged: null,
  onscostatuschanged: null,
  ona2dpstatuschanged: null,
  onpairedstatuschanged: null,
  onrequestmediaplaystatus: null
};

var MockBluetoothHelper = function() {
  return MockBluetoothHelperInstance;
};
