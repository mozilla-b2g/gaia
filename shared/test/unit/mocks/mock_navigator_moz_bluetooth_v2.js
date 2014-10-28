/* exported MockMozBluetooth, MockBTAdapter */

'use strict';

(function(window) {

  // refer to http://dxr.mozilla.org/mozilla-central/source/
  // dom/webidl/BluetoothAdapter2.webidl
  var MockBTAdapter = {
    answerWaitingCall: function mba_answerWaitingCall() {},
    ignoreWaitingCall: function mba_ignoreWaitingCall() {},
    toggleCalls: function mba_toggleCalls() {},
    getConnectedDevices: function mba_getConnectedDevices() {},
    connectSco: function mba_connectSco() {},
    disconnectSco: function mba_disconnectSco() {},
    enable: function mba_enable() {},
    disable: function mba_disable() {},

    onscostatuschanged: null
  };

  var mEventListeners = [];

  function mmb_defaultAdapter() {
    return MockBTAdapter;
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

  // refer to http://dxr.mozilla.org/mozilla-central/source/
  // dom/webidl/BluetoothManager2.webidl
  window.MockMozBluetooth = {
    defaultAdapter: mmb_defaultAdapter(),
    addEventListener: mmb_addEventListener,
    triggerEventListeners: mmb_triggerEventListeners,
    onattributechanged: function mmb_onattributechanged() {},
    getAdapters: function mmb_getAdapters() {}
  };

  window.MockBTAdapter = MockBTAdapter;

})(window);
