'use strict';

/* exported MockSystemICC */
function MockSystemICC(iccManager) {
  return {
    onresponse: function() {},
    _iccManager: iccManager,
    getSIMNumber: function() {
      return 1;
    },
    responseSTKCommand: function(message, response) {
      this.onresponse(message, response);
    },

    calculateDurationInMS: function icc_calculateDurationInMS(timeUnit,
      timeInterval) {
      var timeout = timeInterval;
      switch (timeUnit) {
        case this._iccManager.STK_TIME_UNIT_MINUTE:
          timeout *= 3600000;
          break;
        case this._iccManager.STK_TIME_UNIT_SECOND:
          timeout *= 1000;
          break;
        case this._iccManager.STK_TIME_UNIT_TENTH_SECOND:
          timeout *= 100;
          break;
      }
      return timeout;
    },

    confirm: function icc_confirm(stkMessage, message, timeout, callback) {
      callback(true);   // User accepted the message
    },

    hideView: function() {},

    isViewActive: function() {},

    addPendingMessage: function(message) {},

    canProcessMessage: function(message) {
      return true;
    }
  };
}

MockSystemICC.mTeardown = function() {
};
