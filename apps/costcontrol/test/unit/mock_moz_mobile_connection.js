'use strict';

var MockMozMobileConnection = function(state) {
  if (!state.iccInfo) {
    state.iccInfo = {
      iccid: 'TEST_ICCID'
    };
  }
  return state;
};
