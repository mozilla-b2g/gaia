/* global MockL10n, SharedComponents, Template */
'use strict';

require('/js/shared_components.js');
require('/test/unit/mock_l10n.js');

suite('SharedComponents >', function() {
  var nativeMozL10n = navigator.mozL10n;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  setup(function() {
    loadBodyHTML('/index.html');
  });

  suite('phoneDetails >', function() {
    var phoneTypeSeparator = '#',
        phoneCarrierSeparator = '@',
        translatedPhoneType = 'PhoneTypeTranslated';

    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'get', function get(key) {
        switch(key) {
          case 'phone-type-separator':
            return phoneTypeSeparator;
          case 'phone-carrier-separator':
            return phoneCarrierSeparator;
          case 'Mobile':
            return translatedPhoneType;
          default:
            return key;
        }
      });

      this.sinon.stub(navigator.mozL10n, 'translate', function(element) {
        var nodesToTranslate = element.querySelectorAll('[data-l10n-id]');

        Array.forEach(nodesToTranslate, function(node) {
          node.textContent = navigator.mozL10n.get(node.dataset.l10nId);
        });
      });
    });

    test('no phone details passed', function() {
      assert.throws(function() {
        SharedComponents.phoneDetails();
      });

      assert.throws(function() {
        SharedComponents.phoneDetails(null, {});
      });
    });

    test('no phone type, no phone carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;
      navigator.mozL10n.translate(node);

      assert.isNull(node.querySelector('.has-phone-type'));
      assert.isNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(
        node.textContent.trim(),
        phoneTypeSeparator + '1' + phoneCarrierSeparator
      );
    });

    test('no phone carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;
      navigator.mozL10n.translate(node);

      assert.isNotNull(node.querySelector('.has-phone-type'));
      assert.isNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(
        node.querySelector('.phone-type').textContent,
        translatedPhoneType
      );
      assert.equal(
        node.textContent.trim(),
        translatedPhoneType + phoneTypeSeparator + '1' + phoneCarrierSeparator
      );
    });

    test('no phone type, but with carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        carrier: 'MTS'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;
      navigator.mozL10n.translate(node);

      assert.isNull(node.querySelector('.has-phone-type'));
      assert.isNotNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(node.querySelector('.phone-carrier').textContent, 'MTS');
      assert.equal(
        node.textContent.trim(),
        phoneTypeSeparator + '1' + phoneCarrierSeparator + 'MTS'
      );
    });

    test('with phone type and carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile',
        carrier: 'MTS'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;
      navigator.mozL10n.translate(node);

      assert.isNotNull(node.querySelector('.has-phone-type'));
      assert.isNotNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(
        node.querySelector('.phone-type').textContent,
        translatedPhoneType
      );
      assert.equal(node.querySelector('.phone-carrier').textContent, 'MTS');
      assert.equal(
        node.textContent.trim(),
        translatedPhoneType + phoneTypeSeparator + '1' +
          phoneCarrierSeparator + 'MTS'
      );
    });

    test('with interpolation options', function() {
      this.sinon.spy(Template.prototype, 'interpolate');

      var interpolationOptions = {
        safe: ['number']
      };

      SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile',
        carrier: 'MTS'
      }, interpolationOptions);

      sinon.assert.calledWithMatch(
        Template.prototype.interpolate,
        sinon.match.any,
        interpolationOptions
      );
    });
  });
});
