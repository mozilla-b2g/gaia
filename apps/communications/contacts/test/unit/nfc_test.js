'use strict';

/* global MockMozNfc, contacts, MocksHelper, fb,
          MockMozNDEFRecord, mozContact, NfcUtils */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_nfc.js');
require('/shared/js/contact2vcard.js');
require('/shared/js/setImmediate.js');
require('/shared/js/nfc_utils.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');

if (!window.contacts) {
  window.contacts = null;
}

var mocksHelperForNFC = new MocksHelper([
  'fb', 'Contacts', 'LazyLoader', 'mozContact'
]);
mocksHelperForNFC.init();

suite('NFC', function() {
  var realMozNfc;
  var realUtils;
  var realMozNDEFRecord;
  var nfcUtils;

  suiteSetup(function(done) {
    requireApp(
      'communications/contacts/test/unit/mock_contacts.js',
      function() {
        realUtils = window.utils;
        realMozNfc = window.navigator.mozNfc;
        window.navigator.mozNfc = MockMozNfc;

        realMozNDEFRecord = window.MozNDEFRecord;
        window.MozNDEFRecord = MockMozNDEFRecord;

        window.utils = {};
        window.utils.status = {
          show: function() {}
        };

        mocksHelperForNFC.suiteSetup();
        requireApp('communications/contacts/js/nfc.js', done);
      }
    );
    nfcUtils = new NfcUtils();
  });

  suiteTeardown(function() {
    mocksHelperForNFC.suiteTeardown();
    window.navigator.mozNfc = realMozNfc;
    window.MozNDEFRecord = realMozNDEFRecord;
    window.utils = realUtils;
  });

  teardown(function() {
    fb.setIsFbContact(false);
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
    var spy = this.sinon.spy(window.utils.status, 'show');
    fb.setIsFbContact(true);
    contacts.NFC.startListening();
    navigator.mozNfc.onpeerready(
      {
        peer: MockMozNfc.MockNFCPeer
      }
    );
    sinon.assert.called(spy);
  });

  // Bug 1013845
  test('Shares diacritic characters correctly', function(done) {
    var realSendNDEF = MockMozNfc.MockNFCPeer.sendNDEF;

    var contact = new mozContact({
      name: ['firefox'],
      givenName: ['الثعلب النار 火狐狸 firefox']
    });

    var english = [102, 105, 114, 101, 102, 111, 120];
    var chinese = [231, 129, 171, 231, 139, 144, 231, 139, 184];
    var arabic = [216, 167, 217, 132, 216, 171, 216, 185, 217, 132, 216,
                  168, 32, 216, 167, 217, 132, 217, 134, 216, 167, 216, 177];
    var space = 32;
    var name = arabic.concat(space).concat(chinese)
                .concat(space).concat(english);

    MockMozNfc.MockNFCPeer.sendNDEF = function(records) {
      MockMozNfc.MockNFCPeer.sendNDEF = realSendNDEF;

      var header = 'BEGIN:VCARD\nVERSION:3.0\nn:;';
      var payload = records[0].payload;

      var pos = header.length + 2;
      var actual = payload.subarray(pos, pos + name.length);
      assert.isTrue(nfcUtils.equalArrays(actual, name));

      done();
      return Promise.resolve();
    };

    contacts.NFC.startListening(contact);
    MockMozNfc.onpeerready({peer: MockMozNfc.MockNFCPeer});
  });

});
