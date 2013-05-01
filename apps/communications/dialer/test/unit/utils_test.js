'use strict';

requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/js/utils.js');

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('dialer/utils', function() {
  var realPhoneMatcher;

  var MockContacts;

  // Mock the mozL10n api for the Utils class
  navigator.mozL10n = {
    get: function get(key) {
      return key;
    }
  };
  var subject;
  var number = '555-555-555-555';

  suiteSetup(function() {
    // FIXME workaround for Bug 867421
    MockContacts = MockContactsForDialer;
    subject = Utils;
  });

  suite('Utility library', function() {
    test('#additional info WITHOUT carrier', function(done) {
      MockContacts.mCarrier = null; // No carrier
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        assert.equal(MockContacts.mType + ', ' + number, additionalInfo);
        done();
      });
    });

    test('#additional info WITH carrier', function(done) {
      MockContacts.mCarrier = 'carrier'; // Carrier value
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        assert.equal(MockContacts.mType + ', ' +
          MockContacts.mCarrier, additionalInfo);
        done();
      });
    });
  });
});
