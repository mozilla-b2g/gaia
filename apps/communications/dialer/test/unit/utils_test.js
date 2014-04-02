requireApp('communications/dialer/js/utils.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
require('/shared/test/unit/mocks/mock_text_utils.js');

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

var mocksHelperForUtils = new MocksHelper([
  'TextUtils'
]).init();

suite('dialer/utils', function() {
  var realL10n;
  var subject;
  var number = '555-555-555-555';

  mocksHelperForUtils.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return 'prefix-' + key;
      },

      language: {
        direction: 'ltr'
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

  suite('Font Size utilities', function() {
    var view;
    var maxWidth = 100;
    var maxFontSize = 40;
    var minFontSize = 10;
    var allowedSizes = [10, 20, 40];
    var parameters = {
      'fontFace': 'Arial',
      'maxWidth': maxWidth,
      'fontSize': {
        'current': 10,
        'allowed': allowedSizes
      }
    };

    function checkFontSize(expected) {
      var fontSize = parseInt(
        view.style.fontSize ||
        window.getComputedStyle(view).fontSize,
      10);

      assert.equal(fontSize, expected);
    }

    setup(function() {
      view = document.createElement('input');
      view.style.width = view.style.height = '100px';
      view.style.overflow = 'hidden';
      document.body.appendChild(view);
    });

    teardown(function() {
      document.body.removeChild(view);
    });

    test('Font Size is set correctly', function() {
      var spy = this.sinon.spy(MockTextUtils, 'getTextInfosFor');
      Utils.adjustTextForElement(view, parameters);
      sinon.assert.calledOnce(spy);

      assert.equal(view.style.fontSize, '1px');
    });

    test('Element has ellipsis on the left', function() {
      view.value = '';
      for (var i = 0; i < 1000; i++) {
        view.value += '0';
      }

      parameters.ellipsisSide = 'begin';
      Utils.adjustTextForElement(view, parameters);
      assert.equal(view.value[0], '\u2026');
    });

    test('Element has ellipsis on the right', function() {
      view.value = '';
      for (var i = 0; i < 1000; i++) {
        view.value += '0';
      }

      parameters.ellipsisSide = 'end';
      Utils.adjustTextForElement(view, parameters);
      assert.equal(view.value[view.value.length - 1], '\u2026');
    });
  });

});
