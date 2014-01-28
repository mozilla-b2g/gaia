'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');
requireApp('communications/ftu/js/resources.js');
requireApp('communications/ftu/js/variant.js');
requireApp('communications/shared/test/unit/mocks/mock_icc_helper.js');


var mocksHelperForVariant = new MocksHelper(['IccHelper', 'LazyLoader']);
mocksHelperForVariant.init();
mocksHelperForVariant.attachTestHelpers();
suite(' Customizer > ', function() {
  const TEST_NETWORK_MCC = 214;
  const TEST_NETWORK_MNC = 7;
  var baseDir = '/ftu/test/unit';
  var customizationFullPath, realSettings;
  var customizationList = {
    '214-007': {
        'support_contacts': '/ftu/test/unit/resources/support_contacts.json',
        'wallpaper': '/resources/wallpaper.jpg',
        'default_contacts': '/resources/contacts.json',
        'ringtone': '/resources/ringtone.opus'
    }
  };

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockIccHelper.mProps['iccInfo'] = {
      mcc: TEST_NETWORK_MCC,
      mnc: TEST_NETWORK_MNC
    };
    customizationFullPath = baseDir + VariantManager.CUSTOMIZATION_FILE;
    VariantManager.init();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    MockIccHelper.mProps['iccInfo'] = null;
  });

  test(' normalize ', function() {
    assert.equal(VariantManager.normalizeCode('7'), '007');
    assert.equal(VariantManager.normalizeCode('07'), '007');
    assert.equal(VariantManager.normalizeCode('007'), '007');
  });

  test(' getMccMnc ', function() {
    assert.equal(VariantManager.getMccMnc(), '214-007');
  });

  test(' dispatchCustomizationEvents ', function(done) {
    var eventsDispatched = {};
    var eventsToDispatch = customizationList['214-007'];
    window.addEventListener('customization', function customizer(event) {
      var setting = event.detail.setting;
      var value = event.detail.value;
      // Check that the value is the expected
      assert.equal(value, eventsToDispatch[setting]);
      // Check that we have only one event dispatched per setting
      if (eventsDispatched[setting]) {
        assert.ok(false, 'The settting ' + setting +
          ' was dispatched several times.');
        done();
        return;
      }
      eventsDispatched[setting] = true;
      // Check that the number of events dispatched is the expected
      if (Object.keys(eventsToDispatch).length ==
          Object.keys(eventsDispatched).length) {
        window.removeEventListener('customization', customizer);
        done();
      }
    });
    VariantManager.dispatchCustomizationEvents(customizationList);
  });
});
