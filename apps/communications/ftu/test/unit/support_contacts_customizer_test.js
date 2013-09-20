'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('communications/ftu/test/unit/mock_icc_helper.js');
requireApp('communications/ftu/js/variant.js');
requireApp('communications/ftu/js/customizers/support_contacts_customizer.js');

var mocksHelperForVariant = new MocksHelper(['IccHelper', 'LazyLoader']);

mocksHelperForVariant.init();
suite('variant > support contacts customization', function() {
  const TEST_NETWORK_MCC = 214;
  const TEST_NETWORK_MNC = 7;

  const SUPPORT_CONTACTS_KEYS_VALUES = [
    {
      key: 'support.onlinesupport.title',
      value: 'Mozilla Support'
    },
    {
      key: 'support.onlinesupport.href',
      value: 'http://test.mozilla.org/support'
    },
    {
      key: 'support.callsupport1.title',
      value: 'Call Support (Primary)'
    },
    {
      key: 'support.callsupport1.href',
      value: 'tel:14155550001'
    },
    {
      key: 'support.callsupport2.title',
      value: 'Call Support (Secondary)'
    },
    {
      key: 'support.callsupport2.href',
      value: 'tel:14155550002'
    }
  ];

  var realSettings;
  var mocksHelper = mocksHelperForVariant;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    mocksHelper.suiteSetup();

    MockIccHelper.mProps['iccInfo'] = {
      mcc: TEST_NETWORK_MCC,
      mnc: TEST_NETWORK_MNC
    };
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    mocksHelper.suiteTeardown();
  });

  test('verify mcc/mnc', function() {
    // Init the VariantManager.
    VariantManager.init();
    // Make sure we ended up with the correct MCC/MNC pair.
    assert.equal(VariantManager.mcc_mnc, '214-007');
  });

  function setObservers(keyValues, observer, remove) {
    if (remove === undefined) {
      remove = false;
    }

    if (remove) {
      keyValues.forEach(function(data) {
        MockNavigatorSettings.removeObserver(data.key, this);
      }, observer.bound);
      observer.bound = null;
    }
    else {
      observer.bound = observer.func.bind(observer);
      keyValues.forEach(function(data) {
        MockNavigatorSettings.addObserver(data.key, this);
      }, observer.bound);
    }
  }

  suite(' load setting contacts > ', function() {
    var realCustomizationFile;
    var testCustomizationFile = '/ftu/test/unit/resources/customization.json';

    setup(function() {
      realCustomizationFile = VariantManager.customizationFile;
      VariantManager.customizationFile = testCustomizationFile;
    });

    teardown(function() {
      VariantManager.customizationFile = realCustomizationFile;
    });

    test('load and set support contacts from json', function(done) {


      var observer = {
        bound: null,
        expected: SUPPORT_CONTACTS_KEYS_VALUES.length,
        seen: 0,
        func: function(event) {
          SUPPORT_CONTACTS_KEYS_VALUES.forEach(function(data) {
            if (data.key == event.settingName) {
              assert.equal(
                event.settingValue,
                data.value,
                'Wrong Data setting value'
              );
              ++this.seen;
            }
          }, this);

          if (this.seen == this.expected) {
            setObservers(SUPPORT_CONTACTS_KEYS_VALUES, this, true);
            done();
          }
        }
      };

      // Set our observers.
      setObservers(SUPPORT_CONTACTS_KEYS_VALUES, observer);

      // Init the VariantManager. This will trigger the support contacts
      // settings to be updated with the values from our JSON file.
      SupportContactsCustomizer.init();
      VariantManager.init();
    });
  });
});
