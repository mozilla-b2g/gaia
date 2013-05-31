'use strict';

var MockMozMobileConnection = function(state) {
  state = state || {};

  if (!state.iccInfo) {
    state.iccInfo = {
      iccid: 'TEST_ICCID'
    };
  }

  if (!state.voice) {
    state.voice = {
    };
  }

  if (!state.data) {
    state.data = {
      network: {
        shortName: 'TestNetName',
        longName: 'Testing Network Name'
      }
    };
  }

  return state;
};
