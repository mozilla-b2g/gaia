/* exported MockMozBluetooth, MockBTAdapter */

'use strict';

(function(window) {

  var MockBTAdapter = {
    answerWaitingCall: function mba_answerWaitingCall() {},
    ignoreWaitingCall: function mba_ignoreWaitingCall() {},
    toggleCalls: function mba_toggleCalls() {},
    getConnectedDevices: function mba_getConnectedDevices() {},
    getPairedDevices: function mba_getPairedDevices() {},
    connect: function mba_connect() {},
    connectSco: function mba_connectSco() {},
    disconnectSco: function mba_disconnectSco() {},
    setPairingConfirmation: function mba_setPairingConfirmation() {},
    setPinCode: function mba_setPinCode() {},
    setPasskey: function mba_setPasskey() {},
    confirmReceivingFile: function mba_confirmReceivingFile() {},
    sendFile: function mba_sendFile() {},
    stopSendingFile: function mba_stopSendingFile() {},
    pair: function mba_pair() {},

    onscostatuschanged: null,
    ona2dpstatuschanged: null
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
    ondisabled: function mmb_ondisabled() {},
    enabled: true
  };

  window.MockBTAdapter = MockBTAdapter;

})(window);
