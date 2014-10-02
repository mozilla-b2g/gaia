'use strict';
/* global NfcURI */

requireApp('browser/js/nfc.js');

var realMozNfc;

suite('NfcURI', function() {

  suiteSetup(function() {
    realMozNfc = window.navigator.mozNfc;
    window.navigator.mozNfc = {
      onpeerready: null
    };
  });

  suiteTeardown(function() {
    window.navigator.mozNfc - realMozNfc;
  });

  test('startListening()', function() {
    NfcURI.startListening();
    assert.equal(window.navigator.mozNfc.onpeerready,
      NfcURI.handlePeerConnectivity);
  });

  test('stopListening()', function() {
    NfcURI.stopListening();
    assert.equal(window.navigator.mozNfc.onpeerready, null);
  });

});