/* exported MockMozBluetooth, MockBTAdapter */

'use strict';

(function(window) {

  var mAdapterEventListeners = [];

  function mba_addEventListener(type, callback) {
    mAdapterEventListeners.push({
      type: type,
      callback: callback
    });
  }

  function mba_removeEventListener(type, callback) {
    mAdapterEventListeners.forEach(function(item, idx) {
      if (item.type === type && Object.is(item, callback)) {
        mAdapterEventListeners.slice(idx, 1);
      }
    });
  }

  // refer to http://dxr.mozilla.org/mozilla-central/source/
  // dom/webidl/BluetoothAdapter2.webidl
  var MockBTAdapter = {
    answerWaitingCall: function mba_answerWaitingCall() {},
    ignoreWaitingCall: function mba_ignoreWaitingCall() {},
    toggleCalls: function mba_toggleCalls() {},
    getConnectedDevices: function mba_getConnectedDevices() {},
    getPairedDevices: function mba_getPairedDevices() {},
    connect: function mba_connect() {},
    connectSco: function mba_connectSco() {},
    disconnectSco: function mba_disconnectSco() {},
    enable: function mba_enable() {},
    disable: function mba_disable() {},

    onscostatuschanged: null,
    onhfpstatuschanged: null,
    ona2dpstatuschanged: null,
    addEventListener: mba_addEventListener,
    removeEventListener: mba_removeEventListener,
    confirmReceivingFile: function mba_confirmReceivingFile() {},
    sendFile: function mba_sendFile() {},
    stopSendingFile: function mba_stopSendingFile() {},
    pair: function mba_pair() {}
  };

  var mManagerEventListeners = [];

  function mmb_defaultAdapter() {
    return MockBTAdapter;
  }

  function mmb_addEventListener(type, callback) {
    mManagerEventListeners.push({
      type: type,
      callback: callback
    });
  }

  function mmb_removeEventListener(type, callback) {
    mManagerEventListeners.forEach(function(item, idx) {
      if (item.type === type && Object.is(item, callback)) {
        mManagerEventListeners.slice(idx, 1);
      }
    });
  }

  function mmb_triggerEventListeners(type) {
    mManagerEventListeners.forEach(function(eventListener) {
      if (eventListener.type === type) {
        eventListener.callback();
      }
    });
  }

  // refer to http://dxr.mozilla.org/mozilla-central/source/
  // dom/webidl/BluetoothManager2.webidl
  window.MockMozBluetooth = {
    defaultAdapter: mmb_defaultAdapter(),
    addEventListener: mmb_addEventListener,
    removeEventListener: mmb_removeEventListener,
    triggerEventListeners: mmb_triggerEventListeners,
    onattributechanged: function mmb_onattributechanged() {},
    getAdapters: function mmb_getAdapters() {}
  };

  window.MockBTAdapter = MockBTAdapter;

})(window);
