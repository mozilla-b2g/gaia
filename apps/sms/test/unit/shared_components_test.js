/* global SharedComponents, Template */
'use strict';

require('/js/shared_components.js');

suite('SharedComponents >', function() {
  setup(function() {
    loadBodyHTML('/index.html');
  });

  suite('phoneDetails >', function() {
    test('localized correctly', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile'
      });

      var node = document.createElement('div');
      node.innerHTML = phoneDetailsMarkup;

      assert.equal(
        node.querySelector('.phone-type').getAttribute('data-l10n-id'),
        'Mobile'
      );

      assert.equal(
        node.querySelector('.phone-type-separator')
          .getAttribute('data-l10n-id'),
        'phone-type-separator'
      );

      assert.equal(
        node.querySelector('.phone-carrier-separator')
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
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;

      assert.isNull(node.querySelector('.has-phone-type'));
      assert.isNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
    });

    test('no phone carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;

      assert.isNotNull(node.querySelector('.has-phone-type'));
      assert.isNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(node.querySelector('.phone-type').textContent, 'Mobile');
    });

    test('no phone type, but with carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        carrier: 'MTS'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;

      assert.isNull(node.querySelector('.has-phone-type'));
      assert.isNotNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(node.querySelector('.phone-carrier').textContent, 'MTS');
    });

    test('with phone type and carrier', function() {
      var phoneDetailsMarkup = SharedComponents.phoneDetails({
        number: '1',
        type: 'Mobile',
        carrier: 'MTS'
      });

      var node = document.createElement('div');

      node.innerHTML = phoneDetailsMarkup;

      assert.isNotNull(node.querySelector('.has-phone-type'));
      assert.isNotNull(node.querySelector('.has-phone-carrier'));
      assert.equal(node.querySelector('.phone-number').textContent, '1');
      assert.equal(node.querySelector('.phone-type').textContent, 'Mobile');
      assert.equal(node.querySelector('.phone-carrier').textContent, 'MTS');
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
