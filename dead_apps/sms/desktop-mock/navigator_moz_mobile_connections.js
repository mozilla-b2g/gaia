'use strict';

(function(window) {
 
if (navigator.mozMobileConnections) {
  console.error('navigator.mozMobileConnections exists!');
  return;
}

navigator.mozMobileConnections = {
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

}(window));
