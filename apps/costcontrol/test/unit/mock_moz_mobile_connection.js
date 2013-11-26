'use strict';

var MockMozMobileConnection = function(state) {
  state = state || {};

  if (!state.voice) {
    state.voice = {
      connected: true,
      relSignalStrength: 50
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
