'use strict';

var MockBTAdapter = {
  answerWaitingCall: function mba_answerWaitingCall() {},
  ignoreWaitingCall: function mba_ignoreWaitingCall() {},
  toggleCalls: function mba_toggleCalls() {},
  getConnectedDevices: function mba_getConnectedDevices() {},
  connectSco: function mba_connectSco() {},
  disconnectSco: function mba_disconnectSco() {},

  onscostatuschanged: null
};

var MockMozBluetooth = {
  _mAdapterRequest: {
    result: MockBTAdapter
  },

  getDefaultAdapter: function mmb_getDefaultAdapter() {
    return this._mAdapterRequest;
  },

  // MockEvents Trigger
  triggerOnGetAdapterSuccess: function mmb_triggerAdapterRequestSuccess() {
    if (this._mAdapterRequest.onsuccess) {
      this._mAdapterRequest.onsuccess();
    }
  }
};
