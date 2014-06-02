/* exported MockMozBluetooth, MockBTAdapter */

'use strict';

(function(window) {

  var MockBTAdapter = {
    answerWaitingCall: function mba_answerWaitingCall() {},
    ignoreWaitingCall: function mba_ignoreWaitingCall() {},
    toggleCalls: function mba_toggleCalls() {},
    getConnectedDevices: function mba_getConnectedDevices() {},
    connectSco: function mba_connectSco() {},
    disconnectSco: function mba_disconnectSco() {},
    setPairingConfirmation: function mba_setPairingConfirmation() {},
    setPinCode: function mba_setPinCode() {},
    setPasskey: function mba_setPasskey() {},

    onscostatuschanged: null
  };

  var mAdapterRequest = {
    result: MockBTAdapter,
    onsuccess: null,
    onerror: null
  };

  function mmb_getDefaultAdapter() {
    return mAdapterRequest;
  }

  function mmb_triggerOnGetAdapterSuccess() {
    if (mAdapterRequest.onsuccess) {
      mAdapterRequest.onsuccess();
    }
  }

  window.MockMozBluetooth = {
    getDefaultAdapter: mmb_getDefaultAdapter,
    triggerOnGetAdapterSuccess: mmb_triggerOnGetAdapterSuccess
  };

  window.MockBTAdapter = MockBTAdapter;

})(window);
