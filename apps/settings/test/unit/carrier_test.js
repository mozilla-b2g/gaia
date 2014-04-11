/* globals CarrierSettings, MockL10n */

'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/js/carrier.js');

suite('Carrier settings', function() {
  var realMozL10n;
  var carrierNames;

  function _getHashCode(s) {
    return s.split('').reduce(
      function(a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
  }

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var apnPanel =
      '<div>' +
        '<ul class="apnSettings-list">' +
          '<li>' +
            '<label class="pack-radio">' +
              '<input type="radio" name="defaultApn" value="69952602">' +
              '<span>Carrier</span>' +
            '</label>' +
          '</li>' +
          '<li>' +
            '<label class="pack-radio">' +
              '<input type="radio" name="defaultApn" value="69952601">' +
              '<span>Carrier</span>' +
            '</label>' +
          '</li>' +
          '<li>' +
            '<label class="pack-radio">' +
              '<input type="radio" name="defaultApn" value="69952600">' +
              '<span>Carrier</span>' +
            '</label>' +
          '</li>' +
          '<li class="apnSettings-custom">' +
            '<label class="pack-radio">' +
              '<input type="radio" name="defaultApn" value="_custom_">' +
              '<span data-l10n-id="custom">(custom settings)</span>' +
            '</label>' +
          '</li>' +
        '</ul>';

    // Insert the nodes just inside the body, after its last child.
    document.body.insertAdjacentHTML('beforeend', apnPanel);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    // All the carriers have the same name on purpose.
    carrierNames = ['Carrier', 'Carrier', 'Carrier'];
  });

  suite('Default APNs panel, switchRadioButtons function', function() {
    test('Different APNs with same name are correctly selected', function() {
      var apnList = document.querySelector('.apnSettings-list');

      for (var i = 0; i < carrierNames.length; i++) {
        var name = carrierNames[i];
        var s = name + i;
        var hashCode = _getHashCode(s);

        CarrierSettings.switchRadioButtons(apnList, hashCode);

        var selector = 'input:checked';
        var item = apnList.querySelector(selector);
        assert.equal(hashCode, item.value);
      }
    });
  });
});
