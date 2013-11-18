'use strict';

(function() {

   var eventHandler = [];
   var iccInfo = {
     mcc: null,
     mnc: null
   };

  function mnmt_fireEvent(aType, aMcc, aMnc) {
    iccInfo.mcc = aMcc;
    iccInfo.mnc = aMnc;
    if (eventHandler && eventHandler[aType]) {
      eventHandler[aType]();
    }
    iccInfo.mcc = null;
    iccInfo.mnc = null;
  }

  function mnmt_addEventListener(aType, aHandler) {
    eventHandler[aType] = aHandler;
  }

  function mnmt_removeEventListener(aType, aHandler) {
    eventHandler[aType] = null;
  }

  var MockIccHelper = {
    iccInfo: iccInfo,

    addEventListener: mnmt_addEventListener,
    removeEventListener: mnmt_removeEventListener,
    fireEvent: mnmt_fireEvent
  };

  window.MockIccHelper = MockIccHelper;
})();
