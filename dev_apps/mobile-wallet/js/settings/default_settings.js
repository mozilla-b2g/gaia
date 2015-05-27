'use strict';

/* globals AID */
/* exported DEFAULTS, SIM_REFRESH, SIM_UPDATE */

(function(exports) {

  const DEFAULTS = {
    PIN: false,
    FASTPAY: true,
    CRS_AID: AID.CRS,
    UICC_AID: AID.UICC,
    PIN_P2: '0E',
    PIN_VALUE: '0000'
  };

  // settings properties which trigger sim data refresh on change
  const SIM_REFRESH = ['crsAid'];
  // settings properties which trigger SIMAccessManager update
  const SIM_UPDATE = ['crsAid', 'uiccAid', 'pinP2'];

  const PIN_DEFAULTS = {
    MAX_PIN_ATTEMPTS: 3,
    MAX_PUK_ATTEMPTS: 10,
    PIN_LEN: 4,
    MAX_SIM_PIN_LEN: 8,
    PIN_PADDING: 255
  };

  exports.DEFAULTS = DEFAULTS;
  exports.SIM_REFRESH = SIM_REFRESH;
  exports.SIM_UPDATE = SIM_UPDATE;
  exports.PIN_DEFAULTS = PIN_DEFAULTS;

}((typeof exports === 'undefined') ? window : exports));