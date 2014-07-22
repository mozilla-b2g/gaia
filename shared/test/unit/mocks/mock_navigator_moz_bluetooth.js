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

  var mEventListeners = [];

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

  function mmb_addEventListener(type, callback) {
    mEventListeners.push({
      type: type,
      callback: callback
    });
  }

  function mmb_triggerEventListeners(type) {
    mEventListeners.forEach(function(eventListener) {
      if (eventListener.type === type) {
        eventListener.callback();
      }
    });
  }


  window.MockMozBluetooth = {
    addEventListener: mmb_addEventListener,
    triggerEventListeners: mmb_triggerEventListeners,
    getDefaultAdapter: mmb_getDefaultAdapter,
    triggerOnGetAdapterSuccess: mmb_triggerOnGetAdapterSuccess,
    ondisabled: function mmb_ondisabled() {}
  };

  window.MockBTAdapter = MockBTAdapter;

})(window);
