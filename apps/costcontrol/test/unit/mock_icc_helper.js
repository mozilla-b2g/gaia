'use strict';

var MockIccHelper = function(state) {
  return {
    addEventListener: function icch_addEventListener(event, handler) {},

    get enabled() {
      return true;
    },

    get cardState() {
      return state;
    }
  };
};
