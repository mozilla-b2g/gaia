console.time("mock_mobile_operator.js");
'use strict';
/* exported MockMobileOperator */

var MockMobileOperator = {
  userFacingInfo: function mmo_userFacingInfo(mobileConnection) {
    return {
      'operator': this.mOperator,
      'carrier': this.mCarrier,
      'region': this.mRegion
    };
  },

  mOperator: '',
  mCarrier: '',
  mRegion: '',

  mTeardown: function() {
    this.mOperator = this.mCarrier = this.mRegion = '';
  }
};
console.timeEnd("mock_mobile_operator.js");
