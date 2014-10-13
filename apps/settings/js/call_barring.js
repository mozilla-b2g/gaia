/* exported CallBarring */

'use strict';

var CallBarring = (function() {

  var _mobileConnection = null,
      _voiceServiceClassMask = null;


  /**
   * Initialize the Call Barring panel.
   * BAOC: Barring All Outgoing Calls
   * BOIC: Barring Outgoing International Calls
   * BOICexHC: Barring Outgoing International Calls Except to Home Country
   * BAIC: Barring All Incoming Calls
   * BAICr: Barring All Incoming Calls in Roaming
   */
  function _initCallBarring(options) {
    if (!options) {
      console.error('Call Barring options missing');
      return;
    }

    _mobileConnection = options.mobileConnection;
    _voiceServiceClassMask = options.voiceServiceClassMask;

    var inputBaoc =
      document.querySelector('#li-cb-baoc .checkbox-label input');
    var inputBoic =
      document.querySelector('#li-cb-boic .checkbox-label input');
    var inputBoicExhc =
      document.querySelector('#li-cb-boic-exhc .checkbox-label input');
    var inputBaic =
      document.querySelector('#li-cb-baic .checkbox-label input');
    var inputBaicR =
      document.querySelector('#li-cb-baic-r .checkbox-label input');

    // disabled the inputs as we don't want interaction yet
    inputBaoc.disabled =
      inputBoic.disabled =
      inputBoicExhc.disabled =
      inputBaic.disabled =
      inputBaicR.disabled = true;
  }


  return {
    init: _initCallBarring
  };
})();
