requireApp('communications/dialer/js/utils.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('dialer/utils', function() {
  var realL10n;
  var subject;
  var number = '555-555-555-555';

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return 'prefix-' + key;
      }
    };
    subject = Utils;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Utility library', function() {
    test('#additional info WITHOUT carrier', function(done) {
      MockContacts.mCarrier = null; // No carrier
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        assert.equal('prefix-' + MockContacts.mType + ', ' +
                     number, additionalInfo);
        done();
      });
    });

    test('#additional info WITH carrier', function(done) {
      MockContacts.mCarrier = 'carrier'; // Carrier value
      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        assert.equal('prefix-' + MockContacts.mType + ', ' +
          MockContacts.mCarrier, additionalInfo);
        done();
      });
    });

    test('should not translate custom types', function(done) {
      this.sinon.stub(navigator.mozL10n, 'get')
        .withArgs('totally custom').returns('');
      MockContacts.mCarrier = 'carrier';
      MockContacts.mType = 'totally custom';

      MockContacts.findByNumber(number, function(contact, matchingTel) {
        var additionalInfo = subject.getPhoneNumberAdditionalInfo(matchingTel,
          contact, number);
        assert.equal('totally custom, ' +
          MockContacts.mCarrier, additionalInfo);
        done();
      });
    });
  });
});
