/* global SharedComponents, Template */
'use strict';

require('/views/shared/js/shared_components.js');

suite('SharedComponents >', function() {
  setup(function() {
    loadBodyHTML('/index.html');
  });

  suite('phoneDetails >', function() {
    test('localized correctly', function() {
      var phoneDetails = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile'
      }).toDocumentFragment();

      assert.equal(
        phoneDetails.querySelector('.phone-type').getAttribute('data-l10n-id'),
        'Mobile'
      );

      assert.equal(
        phoneDetails.querySelector('.phone-type-separator')
          .getAttribute('data-l10n-id'),
        'phone-type-separator'
      );

      assert.equal(
        phoneDetails.querySelector('.phone-carrier-separator')
          .getAttribute('data-l10n-id'),
        'phone-carrier-separator'
      );
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
      var phoneDetails = SharedComponents.phoneDetails({
        number: '1'
      }).toDocumentFragment();

      assert.isNull(phoneDetails.querySelector('.has-phone-type'));
      assert.isNull(phoneDetails.querySelector('.has-phone-carrier'));
      assert.equal(
        phoneDetails.querySelector('.phone-number').textContent, '1'
      );
    });

    test('no phone carrier', function() {
      var phoneDetails = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile'
      }).toDocumentFragment();

      assert.isNotNull(phoneDetails.querySelector('.has-phone-type'));
      assert.isNull(phoneDetails.querySelector('.has-phone-carrier'));
      assert.equal(
        phoneDetails.querySelector('.phone-number').textContent, '1'
      );
      assert.equal(
        phoneDetails.querySelector('.phone-type').textContent, 'Mobile'
      );
    });

    test('no phone type, but with carrier', function() {
      var phoneDetails = SharedComponents.phoneDetails({
        number: '1',
        carrier: 'MTS'
      }).toDocumentFragment();

      assert.isNull(phoneDetails.querySelector('.has-phone-type'));
      assert.isNotNull(phoneDetails.querySelector('.has-phone-carrier'));
      assert.equal(
        phoneDetails.querySelector('.phone-number').textContent, '1'
      );
      assert.equal(
        phoneDetails.querySelector('.phone-carrier').textContent, 'MTS'
      );
    });

    test('with phone type and carrier', function() {
      var phoneDetails = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile',
        carrier: 'MTS'
      }).toDocumentFragment();

      assert.isNotNull(phoneDetails.querySelector('.has-phone-type'));
      assert.isNotNull(phoneDetails.querySelector('.has-phone-carrier'));
      assert.equal(
        phoneDetails.querySelector('.phone-number').textContent, '1'
      );
      assert.equal(
        phoneDetails.querySelector('.phone-type').textContent, 'Mobile'
      );
      assert.equal(
        phoneDetails.querySelector('.phone-carrier').textContent, 'MTS'
      );
    });

    test('with interpolation options', function() {
      this.sinon.spy(Template.prototype, 'prepare');

      var interpolationOptions = {
        safe: ['number']
      };

      SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile',
        carrier: 'MTS'
      }, interpolationOptions);

      sinon.assert.calledWithMatch(
        Template.prototype.prepare,
        sinon.match.any,
        interpolationOptions
      );
    });
  });
});
