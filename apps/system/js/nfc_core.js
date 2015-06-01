/* exported NfcCore */
/* global BaseModule */
'use strict';

(function() {
  var NfcCore = function(nfc) {
    this.nfc = nfc;
  };

  NfcCore.SUB_MODULES = [
    'NfcManager',
    'NfcHandler'
  ];
  /**
   * @class NfcCore
   */
  BaseModule.create(NfcCore, {
    name: 'NfcCore'
  });
}());
