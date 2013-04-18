'use strict';

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
