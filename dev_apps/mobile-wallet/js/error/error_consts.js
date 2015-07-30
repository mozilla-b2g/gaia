'use strict';

/* exported ERRORS */
(function(exports) {

  const ERRORS = {
    SIM: {
      NOT_IDLE: 'Wrong sim access state.',
      ACCESS_FAILED: 'Failed to enable SIM access.',
      NO_READER: 'No reader with SE present.',
      APPLETS_FAILURE: 'Failed to get applets data.',
      PIN_FAILURE: 'Failed to issue PIN command.',
    },

    GLOBAL: {
      NO_API: 'No Secure Element API present.',
      NO_SIM: 'No SIM present.',
      SIM_FAILURE: 'SIM failure.',
      UNKNOWN: 'Unknown error.'
    }
  };

  exports.ERRORS = ERRORS;
}((typeof exports === 'undefined') ? window : exports));
