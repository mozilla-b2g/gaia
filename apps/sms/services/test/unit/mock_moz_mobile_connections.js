/*exported MockMozMobileConnections */

// The real navigator.mozMobileConnections is not a real array
'use strict';

var MockMozMobileConnections = {
  0: {
    iccId: 'SIM 1',
    addEventListener: () => {},
    removeEventListener: () => {},
    data: {
      state: 'searching'
    }
  },
  1: {
    iccId: 'SIM 2',
    addEventListener: () => {},
    removeEventListener: () => {},
    data: {
      state: 'searching'
    }
  },
  length: 2
};
