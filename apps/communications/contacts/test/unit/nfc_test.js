'use strict';

/* global MockMozNfc */
/* global contacts */
/* global MocksHelper */
/* global Contacts */
/* global fb */

require('/shared/test/unit/mocks/mock_moz_nfc.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');

if (!window.contacts) {
  window.contacts = null;
}

var mocksHelperForNFC = new MocksHelper([
  'fb', 'Contacts', 'LazyLoader'
]);
mocksHelperForNFC.init();

suite('NFC', function() {
  var realMozNfc;

  suiteSetup(function(done) {
    requireApp(
      'communications/contacts/test/unit/mock_contacts.js',
      function() {
        realMozNfc = window.navigator.mozNfc;
        window.navigator.mozNfc = MockMozNfc;
        mocksHelperForNFC.suiteSetup();

        requireApp('communications/contacts/js/nfc.js', done);
      }
    );
  });

  suiteTeardown(function() {
    mocksHelperForNFC.suiteTeardown();
    window.navigator.mozNfc = realMozNfc;
  });

  test('onpeerready is null on start', function() {
    assert.isNull(navigator.mozNfc.onpeerready);
  });

  test('onpeerready set when startListening() fire', function() {
    contacts.NFC.startListening();
    assert.equal(typeof navigator.mozNfc.onpeerready, 'function');
  });

  test('onpeerready is null when stopListening() fire', function() {
    contacts.NFC.stopListening();
    assert.isNull(navigator.mozNfc.onpeerready);
  });

  test('Facebook contact should not be shared', function() {
    var spy = this.sinon.spy(Contacts, 'showStatus');
    fb.setIsFbContact(true);
    contacts.NFC.startListening();
    navigator.mozNfc.onpeerready(
      {
        details: 'random'
      }
    );
    sinon.assert.called(spy, 'showStatus');
  });

});
