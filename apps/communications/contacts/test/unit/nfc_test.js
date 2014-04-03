'use strict';

/* global MockMozNfc, contacts */

requireApp('communications/contacts/test/unit/mock_mozNfc.js');

if (!window.contacts) {
  window.contacts = null;
}

suite('NFC', function() {
  var realMozNfc;

  suiteSetup(function(done) {
    realMozNfc = window.navigator.mozNfc;
    window.navigator.mozNfc = MockMozNfc;

    requireApp('communications/contacts/js/nfc.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozNfc = realMozNfc;
  });

  test('onpeerready is null on start', function() {
    assert.isNull(navigator.mozNfc.onpeerready);
  });

  test('onpeerready set when startListening() fire', function() {
    contacts.NFC.startListening();
    assert.equal(typeof navigator.mozNfc.onpeerready, 'function');
  });

  test('onpeerready is null when stopLIstening() fire', function() {
    contacts.NFC.stopListening();
    assert.isNull(navigator.mozNfc.onpeerready);
  });

});
